// Wetter-Chip am Handy: „mal da, mal weg“ (gemeldet 14.10.2026).
// Laedt die ECHTE components/core/weather.js in einen vm-Kontext mit Attrappen
// (localStorage, fetch, document, Uhr) und prueft:
//   1. Cache 7 h alt + Netz weg + Stundenvorhersage im Cache → Wetter da,
//      Temperatur = Vorhersagewert der laufenden Berliner Stunde.
//   2. Gegenprobe: derselbe Cache OHNE hourly → kein Wetter (altes Verhalten,
//      zeigt, dass Fall 1 wirklich an der Vorhersage haengt).
//   3. Nach drei Fehlschlaegen wird WEITER versucht (bis v8.5.1: Ruhe).
//   4. Der Abruf fordert hourly an (sonst gaebe es nie eine Vorhersage).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../components/core/weather.js', import.meta.url), 'utf8');
let fehler = 0;
const ok = (b, msg) => { console.log((b ? '  ok   ' : '  FAIL ') + msg); if (!b) fehler++; };

function berlinStunde(d = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false })
    .format(d).replace(' ', 'T') + ':00';
}

function kontext({ cache, netz = false }) {
  const store = new Map(Object.entries({
    myworklog_weather_lat: '50.11', myworklog_weather_lon: '8.68', myworklog_weather_city: 'Frankfurt',
    myworklog_weather: JSON.stringify(cache),
  }));
  const timer = [];
  const abrufe = [];
  const ctx = {
    console: { log() {}, error() {}, warn() {} },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    fetch: async (url) => { abrufe.push(url); if (!netz) throw new Error('offline'); return { ok: true, json: async () => ({ current: { temperature_2m: 1, weather_code: 0 } }) }; },
    setTimeout: (fn, ms) => { timer.push({ fn, ms }); return timer.length; },
    clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    AbortController, Intl, Date, JSON, Math, Array, Object, Number, String, Promise, Error,
    window: { addEventListener() {} },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], visibilityState: 'visible', documentElement: { lang: 'de' } },
  };
  vm.createContext(ctx);
  // `let weatherData` auf oberster Ebene landet nicht auf dem Kontext — ein
  // Getter-Anhang am Ende reicht es heraus.
  vm.runInContext(SRC + '\n;globalThis.__w = () => ({ weatherData, retryTimer: _weatherRetryTimer, retryNr: _weatherRetryNr });', ctx);
  return { ctx, timer, abrufe };
}

const jetzt = berlinStunde();
const stunden = [berlinStunde(new Date(Date.now() - 3600e3)), jetzt, berlinStunde(new Date(Date.now() + 3600e3))];
const mitHourly = {
  timestamp: Date.now() - 7 * 3600e3,
  data: {
    cityName: 'Frankfurt',
    current: { temperature_2m: 3, weather_code: 0, relative_humidity_2m: 90, apparent_temperature: 1, wind_speed_10m: 4 },
    hourly: { time: stunden, temperature_2m: [10, 17.4, 12], weather_code: [3, 61, 3], relative_humidity_2m: [70, 55, 60], apparent_temperature: [9, 16, 11], wind_speed_10m: [5, 12, 6] },
  },
};

console.log('1) Cache 7 h alt, offline, mit Stundenvorhersage');
{
  const { ctx } = kontext({ cache: mitHourly });
  await vm.runInContext('getLocationAndWeather()', ctx);
  const { weatherData: w } = ctx.__w();
  ok(!!(w && w.current), 'Wetter ist da (Chip wuerde gezeichnet)');
  ok(w && w.current.temperature_2m === 17.4, 'Temperatur = Vorhersage der laufenden Stunde (17.4), nicht der alte Wert 3 — ist ' + (w && w.current.temperature_2m));
  ok(w && w.current.weather_code === 61, 'Wetterlage aus der Vorhersage (61 = Regen)');
  ok(w && w.ausVorhersage === true, 'als Vorhersage markiert');
}

console.log('2) Gegenprobe: derselbe Cache ohne hourly');
{
  const ohne = JSON.parse(JSON.stringify(mitHourly)); delete ohne.data.hourly;
  const { ctx } = kontext({ cache: ohne });
  await vm.runInContext('getLocationAndWeather()', ctx);
  ok(ctx.__w().weatherData === null, 'kein Wetter — Fall 1 haengt wirklich an der Vorhersage');
}

console.log('3) Versuche hoeren nach dem dritten Fehlschlag nicht auf');
{
  const { ctx, timer } = kontext({ cache: { timestamp: Date.now() - 7 * 3600e3, data: { current: { temperature_2m: 3, weather_code: 0 } } } });
  await vm.runInContext('getLocationAndWeather()', ctx);
  for (let i = 0; i < 4; i++) {
    const t = timer.pop();
    ok(!!t, `Versuch ${i + 2} ist eingeplant` + (t ? ` (nach ${t.ms / 60000} min)` : ''));
    if (!t) break;
    t.fn();
    await new Promise((r) => setImmediate(r));
  }
  ok(ctx.__w().retryNr >= 4, 'Zaehler ueber die alte Grenze von 3 hinaus: ' + ctx.__w().retryNr);
}

console.log('4) Abruf fordert die Stundenvorhersage an');
{
  const { ctx, abrufe } = kontext({ cache: mitHourly, netz: true });
  await vm.runInContext('getLocationAndWeather()', ctx);
  ok(abrufe.length === 1, 'genau ein Abruf');
  ok(abrufe.length === 1 && /[?&]hourly=[^&]*temperature_2m/.test(abrufe[0]) && /[?&]hourly=[^&]*weather_code/.test(abrufe[0]), 'URL enthaelt hourly mit Temperatur und Wettercode');
}

console.log(fehler ? `\n${fehler} FEHLGESCHLAGEN` : '\nalle bestanden');
process.exit(fehler ? 1 : 0);
