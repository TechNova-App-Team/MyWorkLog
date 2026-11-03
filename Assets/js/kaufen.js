// ═══ KAUFEN MODULE ═══
// Kasse für den Ausbildungs-Pass (/kaufen/), Aufbau im Kopf von pages/kaufen/index.html.
// Ansichten: wahl → (Stripe) → fertig | offen | fehler. Der Worker entscheidet, ob verkauft
// wird; die Seite zeigt nur, was er sagt. Der Pass hängt am Supabase-Konto.
(function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const RUECK = 'mwl_kauf_zurueck';   // sessionStorage: ?zurueck= überlebt den Umweg über Stripe und die Anmeldung nicht

    // Akzent der App nachziehen (Pflicht für Standalone-Seiten)
    try {
        const d = JSON.parse(localStorage.getItem('tg_pro_data') || 'null');
        const hex = d && d.settings && d.settings.theme;
        if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) document.documentElement.style.setProperty('--primary', hex);
    } catch (e) {}

    // Nur eigene Pfade als Rücksprung — kein offener Redirect über ?zurueck=//fremd.de
    const eigen = (p) => /^\/(?!\/)[\w\-/]*$/.test(p || '') ? p : '';
    const q = new URLSearchParams(location.search);
    let zurueck = eigen(q.get('zurueck'));
    if (zurueck) { try { sessionStorage.setItem(RUECK, zurueck); } catch (e) {} }
    else { try { zurueck = eigen(sessionStorage.getItem(RUECK)); } catch (e) {} }
    if (!zurueck) zurueck = '/berichtsheft/';
    const ANMELDEN = '/?cloud=login&back=kaufen';

    // Der EINE Supabase-Client dieser Seite — nur, wenn eine Sitzung da ist. Er frischt
    // ein abgelaufenes Zugangstoken auf (wer vor Stunden angemeldet war, hat eins).
    let client = null;
    function sbClient() {
        if (client) return client;
        client = new Promise((fertig) => {
            if (typeof loadSupabase !== 'function' || typeof SUPABASE_CONFIG === 'undefined') return fertig(null);
            loadSupabase(() => {
                try { fertig(window.supabase ? window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY) : null); }
                catch (e) { fertig(null); }
            });
        });
        return client;
    }
    async function sitzung() {
        if (!MWLPass.angemeldet()) return null;
        const sb = await sbClient();
        if (!sb) return null;
        const { data } = await sb.auth.getSession();
        return (data && data.session) || null;
    }

    function zeigen(name) {
        document.querySelectorAll('[data-ansicht]').forEach(s => { s.hidden = s.dataset.ansicht !== name; });
        const h = document.querySelector('[data-ansicht="' + name + '"] h1');
        if (h && name !== 'wahl') h.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    }

    const datum = (ms) => new Date(ms).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

    function fertig(bis) {
        $('kfBis').textContent = datum(bis);
        const ziel = new URL(zurueck, location.origin);
        ziel.searchParams.set('pass', 'neu');
        $('kfWeiter').href = ziel.pathname + ziel.search;
        zeigen('fertig');
    }

    function fehler(titel, text) {
        $('kfFehlerTitel').textContent = titel;
        $('kfFehlerText').textContent = text;
        zeigen('fehler');
    }

    async function abholen(sitzungId, meldung) {
        const r = await MWLPass.kaufAbholen(sitzungId);
        if (r.ok) return fertig(r.passBis);
        if (r.fehler === 'offen') { zeigen('offen'); if (meldung) $('kfOffenMeldung').textContent = 'Noch nicht bestätigt. Versuch es später noch einmal.'; return; }
        if (r.fehler === 'anmelden') return fehler('Bitte melde dich wieder an.', 'Deine Zahlung ist nicht verloren: Sie hängt an dem Konto, mit dem du gekauft hast. Nach der Anmeldung ist der Pass da.');
        if (r.fehler === 'fremd') return fehler('Diese Zahlung gehört zu einem anderen Konto.', 'Melde dich mit dem Konto an, mit dem du gekauft hast. Dort ist der Pass freigeschaltet.');
        if (r.fehler === 'kein') return fehler('Zu dieser Zahlung gibt es keinen Pass.', 'Wenn du bezahlt hast, schreib an info@myworklog.de und nenne die Uhrzeit der Zahlung.');
        if (r.fehler === 'paket') return fehler('Bezahlt, aber die Funktionen laden gerade nicht.', 'Dein Pass ist an deinem Konto gespeichert. Lade die Seite in ein paar Minuten neu.');
        return fehler('Die Zahlung ließ sich gerade nicht prüfen.', 'Falls du bezahlt hast, ist nichts verloren: Der Pass wird an deinem Konto freigeschaltet. Lade diese Seite gleich noch einmal.');
    }

    function preis() {
        const r = document.querySelector('input[name="dauer"]:checked');
        if (!r) return;
        $('kfKaufenText').textContent = (MWLPass.angemeldet() ? 'Weiter zur Zahlung · ' : 'Anmelden und kaufen · ') + r.dataset.preis + ' €';
    }

    document.addEventListener('DOMContentLoaded', async () => {
        $('kfZurueck').href = zurueck;
        MWLPass.tokenQuelle = async () => { const s = await sitzung(); return s ? s.access_token : ''; };
        preis();
        document.addEventListener('change', (e) => { if (e.target.name === 'dauer') preis(); });

        $('kfZurWahl').addEventListener('click', () => {
            history.replaceState(null, '', location.pathname);
            zeigen('wahl');
        });

        const knopf = $('kfKaufen');
        knopf.addEventListener('click', async () => {
            if (!MWLPass.angemeldet()) { location.assign(ANMELDEN); return; }
            const r = document.querySelector('input[name="dauer"]:checked');
            knopf.disabled = true;
            $('kfMeldung').textContent = 'Die Kasse öffnet sich …';
            const k = await MWLPass.kasse(r ? r.value : 3);
            if (k.ok) { location.assign(k.url); return; }   // Knopf bleibt aus, bis Stripe da ist
            knopf.disabled = false;
            if (k.fehler === 'anmelden') { location.assign(ANMELDEN); return; }
            $('kfMeldung').textContent =
                k.fehler === 'zu' || k.fehler === 'test' ? 'Kaufen geht bald. Die Kasse ist noch nicht freigegeben.'
                : k.fehler === 'netz' ? 'Keine Verbindung. Prüf dein Internet und versuch es noch einmal.'
                : 'Die Kasse ist gerade nicht erreichbar. Versuch es in ein paar Minuten noch einmal.';
        });

        const sitzungId = q.get('sitzung');
        if (sitzungId) {
            zeigen('offen');
            $('kfOffenMeldung').textContent = 'Zahlung wird geprüft …';
            await abholen(sitzungId, false);
            $('kfOffenMeldung').textContent = '';
            $('kfNochmal').addEventListener('click', async () => {
                $('kfOffenMeldung').textContent = 'Wird geprüft …';
                await abholen(sitzungId, true);
            });
            return;
        }
        if (q.get('abgebrochen')) {
            fehler('Zahlung abgebrochen.', 'Es wurde nichts abgebucht. Du kannst es jederzeit noch einmal versuchen.');
            return;
        }

        // Wer angemeldet ist: Konto nennen, und wer schon einen Pass hat, nicht ein zweites Mal kaufen lassen
        const s = await sitzung().catch(() => null);
        const konto = $('kfKonto');
        if (s && s.user) {
            konto.textContent = 'Angemeldet als ' + (s.user.email || 'MyWorkLog-Konto') + '.';
            konto.hidden = false;
            // Nur ein Pass AM KONTO zählt — eine Freischaltung per Haupt-Code gilt nur für dieses
            // Gerät und darf das Kaufen nicht verdecken (so passiert 02.11.2026: „aktiv“ ohne Kauf).
            const r = MWLPass.vomKonto() ? { ok: true } : await MWLPass.kontoFreischalten();
            if (r.ok) fertig(MWLPass.passBis());
        } else if (!MWLPass.angemeldet()) {
            konto.textContent = 'Der Pass hängt an deinem MyWorkLog-Konto. Du meldest dich vor dem Bezahlen an oder legst eins an, kostenlos.';
            konto.hidden = false;
        }
    });
})();
