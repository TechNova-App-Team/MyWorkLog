// ═══ MWL-PASS MODULE ═══
// Freischaltung und Lader fuer den Ausbildungs-Pass. Das ist der EINZIGE Teil des
// Pass, der im Repo und auf Pages liegt.
//
// 🔴 Der Code der Pass-Funktionen (Pruefungs-Check, Mehrere Wochen, Diktieren,
// Pass-Karte) steht NICHT im Repo (pass/ ist gitignored) und nicht auf Pages —
// Wunsch des Nutzers 31.10.2026: „ES DARF niemand an Funktionen kommen, die noch
// nicht draussen sein sollen." Er kommt als Paket vom ai-proxy (/pass/paket), und
// der liefert nur gegen eine Freischaltung, die er selbst signiert hat
// (/pass/freischalten prueft den Code gegen das Secret PASS_CODE).
// Darum ist frei() hier nur eine Vermutung (Ablaufdatum aus dem Token, Signatur
// kann der Browser nicht pruefen) — ein gefaelschtes Token bekommt kein Paket.
//
// Lokal (nur wer pass/ hat): laedt die Dateien direkt aus /pass/ laut
// pass/manifest.json, damit man ohne Hochladen entwickeln kann. Live gibt es
// /pass/ nicht (404) → Weg ueber den Worker.
//
// Laden: <script src="/Assets/js/mwl-pass.js" data-laden> — mit data-laden holt die
// Seite das Paket beim Start, wenn eine Freischaltung da ist (nur /berichtsheft/).
// Ohne (App, /kaufen/) nur frei()/einloesen() fuer Etikett und Kasse.
//
// Seit 01.11.2026 haengt der gekaufte Pass am Supabase-KONTO (Tabelle pass_freischaltungen,
// Entscheidung des Nutzers: keine teilbaren Kaufcodes). Wer angemeldet ist, holt sich das
// Pass-Token still beim Laden (kontoFreischalten) — es gilt 7 Tage und wird vor Ablauf
// erneuert. Ohne Pass merkt sich die Seite das 12 Stunden, damit nicht jeder Seitenaufruf
// eines Kontos ohne Pass den Worker (und GoTrue) fragt. Der Haupt-Code ({code}) bleibt.
//
// Probedurchgang (seit 19.11.2026): „Mehrere Wochen" einmal kostenlos, bis 3 Wochen, nur mit
// Konto (/pass/probe; Grenze je Konto und Netz entscheidet die DB). Das Probe-Token steht
// GETRENNT in mwl_pass_probe und laedt nur das Probepaket (Worker: pass:probe:*), nie das volle.
// frei() bleibt fuer die Probe falsch — sonst hielten Etikett, Thinking-Menue und Pass-Karte
// den Probenutzer fuer einen Pass-Inhaber.

window.MWLPass = (function () {
    'use strict';

    const API = 'https://ai-proxy.myworklog.de';
    const SCHLUESSEL = 'mwl_pass';
    const lokal = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const autoLaden = !!(document.currentScript && document.currentScript.hasAttribute('data-laden'));

    function gespeichert() {
        try { return JSON.parse(localStorage.getItem(SCHLUESSEL) || 'null'); } catch (e) { return null; }
    }
    function frei() {
        const g = gespeichert();
        return !!(g && g.token && g.bis > Date.now());
    }
    function sperren() {
        try { localStorage.removeItem(SCHLUESSEL); } catch (e) {}
        // Vom alten Vorschau-Hash (bis 31.10.2026) nichts liegen lassen
        try { localStorage.removeItem('mwl_vorschau'); } catch (e) {}
    }

    const PROBE = 'mwl_pass_probe';       // { token, bis, fertig } | { grund: 'genutzt' }
    function probeGespeichert() {
        try { return JSON.parse(localStorage.getItem(PROBE) || 'null'); } catch (e) { return null; }
    }
    // Fenster offen und noch nicht losgeschrieben
    function probeAktiv() {
        const p = probeGespeichert();
        return !frei() && !!(p && p.token && p.bis > Date.now() && !p.fertig);
    }
    // Schon verbraucht (geschrieben, Fenster vorbei oder vom Server so gemeldet)
    function probeGenutzt() {
        const p = probeGespeichert();
        return !!(p && (p.fertig || p.grund === 'genutzt' || (p.token && !(p.bis > Date.now()))));
    }
    function probeBeenden() {
        const p = probeGespeichert() || {};
        try { localStorage.setItem(PROBE, JSON.stringify(Object.assign({}, p, { fertig: true }))); } catch (e) {}
    }

    const SB_SCHLUESSEL = 'sb-fouucibowmukxvweratn-auth-token';
    const KEIN_PASS = 'mwl_pass_kein';     // Zeitpunkt der letzten Antwort „kein Pass am Konto“
    const GEPRUEFT = 'mwl_pass_geprueft';  // letzte Antwort des Kontos (für die stündliche Prüfung)
    const angemeldet = () => { try { return !!localStorage.getItem(SB_SCHLUESSEL); } catch (e) { return false; } };
    const kontoId = () => { try { const s = JSON.parse(localStorage.getItem(SB_SCHLUESSEL) || 'null'); return (s && s.user && s.user.id) || ''; } catch (e) { return ''; } };
    // „Kein Pass" gilt nur fuer DAS Konto, das gefragt hat. Bis 21.11.2026 stand hier nur die Uhrzeit:
    // wer erst mit einem Zweitkonto ohne Pass angemeldet war und dann aufs Hauptkonto wechselte, sah
    // 12 h lang keinen Pass, weil die Seite gar nicht mehr nachfragte. Wert: "<user-id>:<ms>";
    // ein alter reiner Zeitstempel zaehlt als fremdes Konto (einmal neu fragen).
    function keinPassSeit() {
        let v = '';
        try { v = localStorage.getItem(KEIN_PASS) || ''; } catch (e) {}
        const i = v.lastIndexOf(':');
        if (i < 0 || v.slice(0, i) !== kontoId()) return 0;
        return Number(v.slice(i + 1)) || 0;
    }

    // Supabase-Zugangstoken. Erst ueber den EINEN Client der Seite (frischt abgelaufene Tokens
    // auf), sonst die gespeicherte Sitzung, solange sie noch gilt. Eine Seite ohne eigenen
    // Client kann MWLPass.tokenQuelle setzen (/kaufen/).
    let tokenQuelle = null;
    async function kontoToken() {
        const ausClient = async (sb) => { const { data } = await sb.auth.getSession(); return (data && data.session && data.session.access_token) || ''; };
        try {
            if (tokenQuelle) return (await tokenQuelle()) || '';
            if (window.BHB2B && typeof BHB2B.client === 'function' && angemeldet()) return await ausClient(await BHB2B.client());
            if (window.cloudSync && cloudSync.client) return await ausClient(cloudSync.client);
        } catch (e) { /* weiter mit der gespeicherten Sitzung */ }
        try {
            const s = JSON.parse(localStorage.getItem(SB_SCHLUESSEL) || 'null');
            if (s && s.access_token && s.expires_at * 1000 > Date.now() + 60000) return s.access_token;
        } catch (e) {}
        return '';
    }
    async function mitKonto(pfad, init = {}) {
        const t = await kontoToken();
        if (!t) return null;
        return fetch(API + pfad, { ...init, headers: { ...(init.headers || {}), Authorization: 'Bearer ' + t } });
    }

    // quelle 'konto' = gekauft und am Konto gespeichert; 'code' = Haupt-Code, schaltet nur DIESES
    // Geraet frei und steht in keiner Tabelle. /kaufen/ darf nur bei 'konto' „aktiv“ sagen.
    function merken(d, quelle) {
        try { localStorage.setItem(SCHLUESSEL, JSON.stringify({ token: d.token, bis: d.bis, passBis: d.passBis || d.bis, quelle })); } catch (e) { return false; }
        try { localStorage.removeItem(KEIN_PASS); } catch (e) {}
        try { localStorage.removeItem('mwl_vorschau'); } catch (e) {}
        return true;
    }
    async function nachFreischalten() {
        if (autoLaden) {
            const geladen = await laden();
            if (!geladen) return { ok: false, fehler: 'paket' };
        }
        // Abzeichen, Mikrofone, Pass-Karte (alle im Paket) hoeren hierauf
        try { window.dispatchEvent(new CustomEvent('mwl-pass-frei')); } catch (e) {}
        return { ok: true };
    }

    // Kasse (Stripe Checkout). → { ok, url } | { ok:false, fehler: 'anmelden'|'test'|'zu'|'netz'|'server' }
    // 'zu' = Worker ohne Stripe-/Service-Schluessel, 'test' = Testbetrieb, nur von localhost.
    async function kasse(dauer) {
        let r;
        try {
            r = await mitKonto('/pass/kasse', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dauer: Number(dauer), sprache: document.documentElement.lang === 'en' ? 'en' : 'de' }),
            });
        } catch (e) { return { ok: false, fehler: 'netz' }; }
        if (!r) return { ok: false, fehler: 'anmelden' };
        const d = await r.json().catch(() => null);
        if (r.status === 401) return { ok: false, fehler: 'anmelden' };
        if (r.status === 503) return { ok: false, fehler: 'zu' };
        if (r.status === 403 && d && d.test) return { ok: false, fehler: 'test' };
        if (!r.ok || !d || !/^https:\/\/checkout\.stripe\.com\//.test(d.url || '')) return { ok: false, fehler: 'server' };
        return { ok: true, url: d.url };
    }

    // Nach der Rueckkehr von Stripe: Zahlung pruefen lassen, Token holen.
    // → { ok, passBis } | { ok:false, fehler: 'anmelden'|'fremd'|'offen'|'kein'|'netz'|'server' }
    async function kaufAbholen(sitzung) {
        let r;
        try { r = await mitKonto('/pass/kauf?sitzung=' + encodeURIComponent(sitzung), { cache: 'no-store' }); }
        catch (e) { return { ok: false, fehler: 'netz' }; }
        if (!r || r.status === 401) return { ok: false, fehler: 'anmelden' };
        const d = await r.json().catch(() => null);
        if (r.status === 403) return { ok: false, fehler: 'fremd' };
        if (r.status === 202) return { ok: false, fehler: 'offen' };
        if (r.status === 404 || r.status === 400) return { ok: false, fehler: 'kein' };
        if (!r.ok || !d || !d.token) return { ok: false, fehler: 'server' };
        if (!merken(d, 'konto')) return { ok: false, fehler: 'speicher' };
        const n = await nachFreischalten();
        return n.ok ? { ok: true, passBis: d.passBis || d.bis } : n;
    }

    // Pass des angemeldeten Kontos auf dieses Geraet holen. → { ok } | { ok:false, fehler: 'anmelden'|'kein'|'netz'|'server' }
    async function kontoFreischalten() {
        let r;
        try {
            r = await mitKonto('/pass/freischalten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        } catch (e) { return { ok: false, fehler: 'netz' }; }
        if (!r || r.status === 401) return { ok: false, fehler: 'anmelden' };
        try { localStorage.setItem(GEPRUEFT, String(Date.now())); } catch (e) {}
        if (r.status === 404) {
            try { localStorage.setItem(KEIN_PASS, kontoId() + ':' + Date.now()); } catch (e) {}
            // Erstattet/zurückgebucht: Konto-Freischaltung auf diesem Gerät sofort wegräumen.
            // Der Haupt-Code ('code') hängt an keinem Konto und bleibt.
            const g = gespeichert();
            if (g && g.quelle === 'konto') {
                sperren();
                try { window.dispatchEvent(new CustomEvent('mwl-pass-weg')); } catch (e) {}
            }
            return { ok: false, fehler: 'kein' };
        }
        const d = await r.json().catch(() => null);
        if (!r.ok || !d || !d.token) return { ok: false, fehler: 'server' };
        if (!merken(d, 'konto')) return { ok: false, fehler: 'speicher' };
        return nachFreischalten();
    }

    // Still beim Laden: angemeldet, aber kein (oder bald ablaufendes) Token → beim Konto nachfragen.
    // Konto-Pass zusätzlich stündlich: lokal lädt die Seite das Paket direkt aus /pass/ und fragt
    // den Server nie — ohne diese Prüfung bliebe ein erstatteter Pass dort bis zum Token-Ablauf.
    function stillErneuern() {
        if (!angemeldet()) return;
        const g = gespeichert();
        let geprueft = 0;
        try { geprueft = Number(localStorage.getItem(GEPRUEFT)) || 0; } catch (e) {}
        const stuendlich = g && g.quelle === 'konto' && Date.now() - geprueft > 3600000;
        if (g && g.token && g.bis - Date.now() > 2 * 86400000 && !stuendlich) return;
        if (!(g && g.token) && Date.now() - keinPassSeit() < 12 * 3600000) return;
        kontoFreischalten().catch(() => {});
    }

    // Probedurchgang holen. → { ok } | { ok:false, fehler: 'anmelden'|'genutzt'|'netz'|'pass'|'offline'|'server'|'paket' }
    // 'netz' = in diesem Netz schon zu viele Proben (nicht: keine Verbindung, das ist 'offline').
    async function probeStarten() {
        if (frei()) return { ok: false, fehler: 'pass' };
        if (probeAktiv()) return (await laden()) ? { ok: true } : { ok: false, fehler: 'paket' };
        let r;
        try { r = await mitKonto('/pass/probe', { method: 'POST' }); }
        catch (e) { return { ok: false, fehler: 'offline' }; }
        if (!r || r.status === 401) return { ok: false, fehler: 'anmelden' };
        const d = await r.json().catch(() => null);
        if (r.status === 409) {
            const g = (d && d.grund) || 'server';
            if (g === 'genutzt') { try { localStorage.setItem(PROBE, JSON.stringify({ grund: 'genutzt' })); } catch (e) {} }
            return { ok: false, fehler: g };
        }
        if (!r.ok || !d || !d.token) return { ok: false, fehler: 'server' };
        try { localStorage.setItem(PROBE, JSON.stringify({ token: d.token, bis: d.bis })); } catch (e) { return { ok: false, fehler: 'server' }; }
        return (await laden()) ? { ok: true } : { ok: false, fehler: 'paket' };
    }

    // Pass-Code gegen den Server pruefen. → { ok, fehler }
    async function einloesen(code) {
        const c = String(code || '').trim();
        if (!c) return { ok: false, fehler: 'leer' };
        let r;
        try {
            r = await fetch(API + '/pass/freischalten', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c }),
            });
        } catch (e) { return { ok: false, fehler: 'netz' }; }
        if (r.status === 403) return { ok: false, fehler: 'falsch' };
        if (!r.ok) return { ok: false, fehler: 'server' };
        const d = await r.json().catch(() => null);
        if (!d || !d.token) return { ok: false, fehler: 'server' };
        if (!merken(d, 'code')) return { ok: false, fehler: 'speicher' };
        return nachFreischalten();
    }

    function skript(text) {
        const s = document.createElement('script');
        s.textContent = text;
        document.head.appendChild(s);    // fuehrt sofort aus
    }
    function stil(text) {
        const s = document.createElement('style');
        s.setAttribute('data-pass', '');
        s.textContent = text;
        document.head.appendChild(s);
    }

    // Lokal: Einzeldateien aus /pass/ (gut zum Debuggen, Zeilen stimmen). Probe: nur m.probe.
    async function lokalLaden(probe) {
        let m;
        try {
            const r = await fetch('/pass/manifest.json', { cache: 'no-store' });
            if (!r.ok) return false;
            m = await r.json();
        } catch (e) { return false; }
        if (probe) m = m.probe || { js: [], css: [] };
        (m.css || []).forEach(f => {
            const l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = '/pass/' + f + '?t=' + Date.now();
            document.head.appendChild(l);
        });
        for (const f of (m.js || [])) {
            await new Promise((ok, nein) => {
                const s = document.createElement('script');
                s.src = '/pass/' + f + '?t=' + Date.now();
                s.onload = ok; s.onerror = nein;
                document.head.appendChild(s);
            });
        }
        return true;
    }

    async function vomServerLaden(probe) {
        const g = probe ? probeGespeichert() : gespeichert();
        const kopf = { Authorization: 'Bearer ' + g.token };
        const [js, css] = await Promise.all([
            fetch(API + '/pass/paket?art=js', { headers: kopf, cache: 'no-store' }),
            fetch(API + '/pass/paket?art=css', { headers: kopf, cache: 'no-store' }),
        ]);
        if (js.status === 401 || css.status === 401) {
            if (probe) { probeBeenden(); return false; }   // Fenster vorbei — der Pass bleibt unberuehrt
            sperren();
            try { window.dispatchEvent(new CustomEvent('mwl-pass-weg')); } catch (e) {}
            return false;
        }
        if (!js.ok || !css.ok) return false;
        stil(await css.text());
        skript(await js.text());
        return true;
    }

    let ladung = null;
    // → Promise<boolean>: true, wenn die Pass-Funktionen jetzt da sind
    function laden() {
        const probe = !frei() && probeAktiv();
        if (!frei() && !probe) return Promise.resolve(false);
        if (!ladung) {
            ladung = (async () => {
                try {
                    if (lokal() && await lokalLaden(probe)) return true;
                    return await vomServerLaden(probe);
                } catch (e) { return false; }
            })().then(ok => { if (!ok) ladung = null; return ok; });
        }
        return ladung;
    }

    // Einstieg fuer Knoepfe im oeffentlichen Teil: mit Pass die Funktion, sonst das Siegel.
    const OEFFNER = {
        pruefcheck: (o) => window.BHPruefbogen && BHPruefbogen.oeffnen(o),
        mehrwochen: (o) => window.BHMehrwochen && BHMehrwochen.oeffnen(o),
        rahmenplan: (o) => window.BHRahmenplan && BHRahmenplan.oeffnen(o),
        wochenvorschlag: (o) => window.BHWochenvorschlag && BHWochenvorschlag.oeffnen(o),
        fachgespraech: (o) => window.BHFachgespraech && BHFachgespraech.oeffnen(o),
    };
    async function oeffnen(name, opt) {
        if ((frei() || (name === 'mehrwochen' && probeAktiv())) && await laden() && OEFFNER[name]) { OEFFNER[name](opt); return; }
        if (window.BHSiegel) BHSiegel.zeigen(name, opt);
    }

    // Fuer Code im Paket, das nach DOMContentLoaded eingespielt wird
    window.mwlBeiStart = (f) => {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f);
        else f();
    };
    // Altname aus der Vorschau-Zeit — Dateien im Paket rufen ihn noch
    window.MWLVorschau = {
        frei, sperren, lokal,
        einloesen: async (code) => (await einloesen(code)).ok,
    };

    if (autoLaden && frei()) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', laden);
        else laden();
    }

    // Bis wann der Pass laeuft (nicht das 7-Tage-Token) — fuer Anzeigen
    const vomKonto = () => { const g = gespeichert(); return !!(g && g.quelle === 'konto' && frei()); };
    const passBis = () => { const g = gespeichert(); return (g && (g.passBis || g.bis)) || 0; };

    // Nach dem Laden der Seite, damit BHB2B / cloudSync schon stehen
    window.addEventListener('load', () => setTimeout(stillErneuern, 1200));

    return {
        frei, vomKonto, einloesen, sperren, laden, oeffnen, lokal, kasse, kaufAbholen, kontoFreischalten, angemeldet, passBis,
        probeAktiv, probeGenutzt, probeStarten, probeBeenden,
        set tokenQuelle(f) { tokenQuelle = typeof f === 'function' ? f : null; },
    };
})();
