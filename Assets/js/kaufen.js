// ═══ KAUFEN MODULE ═══
// Kasse für den Ausbildungs-Pass (/kaufen/), Aufbau im Kopf von pages/kaufen/index.html.
// Ansichten: wahl → (Stripe) → fertig | offen | fehler. Der Worker entscheidet, ob verkauft
// wird; die Seite zeigt nur, was er sagt. Der Pass hängt am Supabase-Konto.
(function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const EN = document.documentElement.lang === 'en';
    const L = (de, en) => EN ? en : de;
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
    if (!zurueck) zurueck = L('/berichtsheft/', '/en/berichtsheft/');
    const ANMELDEN = L('/', '/en/') + '?cloud=login&back=kaufen';
    const ev = (name, props, opts) => { if (typeof mwlEvent === 'function') mwlEvent(name, props || {}, opts); };

    // Der Pass gilt ab Kauf. Wer im 3. Lehrjahr kauft, braucht nur den Rest: die kleinste passende
    // Laufzeit vorwaehlen, statt 14,99 € als Vorgabe stehen zu lassen. Ein ehrlicher Preis kostet
    // hier ein paar Euro und ist der Grund, warum man den Link weitergibt.
    function ausbildungsEnde() {
        try {
            const p = JSON.parse(localStorage.getItem('pdf_personal_cfg') || 'null');
            const m = p && /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(p.ende || '').trim());
            if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
        } catch (e) {}
        try {
            const d = JSON.parse(localStorage.getItem('tg_pro_data') || 'null');
            const m = d && d.settings && d.settings.ihk && /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d.settings.ihk.end || ''));
            if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
        } catch (e) {}
        return null;
    }
    function vorwaehlen() {
        const ende = ausbildungsEnde();
        if (!ende || ende <= new Date()) return;
        const monate = (ende - new Date()) / (30.44 * 864e5);
        if (monate > 48) return;
        const dauer = monate <= 24 ? 2 : monate <= 36 ? 3 : 4;
        const r = document.querySelector('input[name="dauer"][value="' + dauer + '"]');
        if (!r) return;
        r.checked = true;
        const bis = ende.toLocaleDateString(L('de-DE', 'en-GB'), { month: 'long', year: 'numeric' });
        const h = $('kfVorschlag');
        h.textContent = L('Deine Ausbildung läuft laut deinen Angaben bis ' + bis + '. Dafür reicht „bis ' + dauer + ' Jahre“.',
            'Your apprenticeship runs until ' + bis + ' according to your details. “Up to ' + dauer + ' years” is enough for that.');
        h.hidden = false;
    }

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

    const datum = (ms) => new Date(ms).toLocaleDateString(L('de-DE', 'en-GB'), { day: 'numeric', month: 'long', year: 'numeric' });

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
        if (r.ok) {
            // Neuladen der Dankeseite zaehlt nicht als zweiter Kauf
            let schon = false;
            try { schon = sessionStorage.getItem('mwl_kauf_gezaehlt') === sitzungId; sessionStorage.setItem('mwl_kauf_gezaehlt', sitzungId); } catch (e) {}
            if (!schon) ev('kauf_fertig');
            return fertig(r.passBis);
        }
        if (r.fehler === 'offen') { zeigen('offen'); if (meldung) $('kfOffenMeldung').textContent = L('Noch nicht bestätigt. Versuch es später noch einmal.', 'Not confirmed yet. Try again later.'); return; }
        if (r.fehler === 'anmelden') return fehler(L('Bitte melde dich wieder an.', 'Please sign in again.'), L('Deine Zahlung ist nicht verloren: Sie hängt an dem Konto, mit dem du gekauft hast. Nach der Anmeldung ist der Pass da.', 'Your payment is not lost: it belongs to the account you bought with. The pass is there once you sign in.'));
        if (r.fehler === 'fremd') return fehler(L('Diese Zahlung gehört zu einem anderen Konto.', 'This payment belongs to a different account.'), L('Melde dich mit dem Konto an, mit dem du gekauft hast. Dort ist der Pass freigeschaltet.', 'Sign in with the account you bought with. The pass is active there.'));
        if (r.fehler === 'kein') return fehler(L('Zu dieser Zahlung gibt es keinen Pass.', 'There is no pass for this payment.'), L('Wenn du bezahlt hast, schreib an info@myworklog.de und nenne die Uhrzeit der Zahlung.', 'If you paid, write to info@myworklog.de and mention the time of the payment.'));
        if (r.fehler === 'paket') return fehler(L('Bezahlt, aber die Funktionen laden gerade nicht.', 'Paid, but the features are not loading right now.'), L('Dein Pass ist an deinem Konto gespeichert. Lade die Seite in ein paar Minuten neu.', 'Your pass is saved to your account. Reload this page in a few minutes.'));
        return fehler(L('Die Zahlung ließ sich gerade nicht prüfen.', 'The payment could not be checked right now.'), L('Falls du bezahlt hast, ist nichts verloren: Der Pass wird an deinem Konto freigeschaltet. Lade diese Seite gleich noch einmal.', 'If you paid, nothing is lost: the pass will be activated on your account. Reload this page in a moment.'));
    }

    function preis() {
        const r = document.querySelector('input[name="dauer"]:checked');
        if (!r) return;
        const betrag = EN ? '€' + r.dataset.preis.replace(',', '.') : r.dataset.preis + ' €';
        $('kfKaufenText').textContent = (MWLPass.angemeldet() ? L('Weiter zur Zahlung · ', 'Continue to payment · ') : L('Anmelden und kaufen · ', 'Sign in and buy · ')) + betrag;
    }

    document.addEventListener('DOMContentLoaded', async () => {
        $('kfZurueck').href = zurueck;
        MWLPass.tokenQuelle = async () => { const s = await sitzung(); return s ? s.access_token : ''; };
        vorwaehlen();
        preis();
        document.addEventListener('change', (e) => { if (e.target.name === 'dauer') preis(); });

        $('kfZurWahl').addEventListener('click', () => {
            history.replaceState(null, '', location.pathname);
            zeigen('wahl');
        });

        const knopf = $('kfKaufen');
        knopf.addEventListener('click', async () => {
            const r = document.querySelector('input[name="dauer"]:checked');
            ev('kauf_los', { dauer: r ? +r.value : 0, angemeldet: MWLPass.angemeldet() }, { transport: 'sendBeacon' });
            if (!MWLPass.angemeldet()) { location.assign(ANMELDEN); return; }
            knopf.disabled = true;
            $('kfMeldung').textContent = L('Die Kasse öffnet sich …', 'Opening checkout …');
            const k = await MWLPass.kasse(r ? r.value : 3);
            if (k.ok) { location.assign(k.url); return; }   // Knopf bleibt aus, bis Stripe da ist
            knopf.disabled = false;
            if (k.fehler === 'anmelden') { location.assign(ANMELDEN); return; }
            $('kfMeldung').textContent =
                k.fehler === 'zu' || k.fehler === 'test' ? L('Kaufen geht bald. Die Kasse ist noch nicht freigegeben.', 'Buying opens soon. Checkout is not enabled yet.')
                : k.fehler === 'netz' ? L('Keine Verbindung. Prüf dein Internet und versuch es noch einmal.', 'No connection. Check your internet and try again.')
                : L('Die Kasse ist gerade nicht erreichbar. Versuch es in ein paar Minuten noch einmal.', 'Checkout is not reachable right now. Try again in a few minutes.');
        });

        const sitzungId = q.get('sitzung');
        if (sitzungId) {
            zeigen('offen');
            $('kfOffenMeldung').textContent = L('Zahlung wird geprüft …', 'Checking payment …');
            await abholen(sitzungId, false);
            $('kfOffenMeldung').textContent = '';
            $('kfNochmal').addEventListener('click', async () => {
                $('kfOffenMeldung').textContent = L('Wird geprüft …', 'Checking …');
                await abholen(sitzungId, true);
            });
            return;
        }
        if (q.get('abgebrochen')) {
            ev('kauf_abgebrochen');
            fehler(L('Zahlung abgebrochen.', 'Payment cancelled.'), L('Es wurde nichts abgebucht. Du kannst es jederzeit noch einmal versuchen.', 'Nothing was charged. You can try again at any time.'));
            return;
        }

        ev('kauf_seite', { sprache: EN ? 'en' : 'de' });
        // Wer angemeldet ist: Konto nennen, und wer schon einen Pass hat, nicht ein zweites Mal kaufen lassen
        const s = await sitzung().catch(() => null);
        const konto = $('kfKonto');
        if (s && s.user) {
            konto.textContent = L('Angemeldet als ', 'Signed in as ') + (s.user.email || L('MyWorkLog-Konto', 'MyWorkLog account')) + '.';
            konto.hidden = false;
            // Nur ein Pass AM KONTO zählt — eine Freischaltung per Haupt-Code gilt nur für dieses
            // Gerät und darf das Kaufen nicht verdecken (so passiert 02.11.2026: „aktiv“ ohne Kauf).
            const r = MWLPass.vomKonto() ? { ok: true } : await MWLPass.kontoFreischalten();
            if (r.ok) fertig(MWLPass.passBis());
        } else if (!MWLPass.angemeldet()) {
            konto.textContent = L('Der Pass hängt an deinem MyWorkLog-Konto. Du meldest dich vor dem Bezahlen an oder legst eins an, kostenlos.', 'The pass is tied to your MyWorkLog account. You sign in before paying, or create an account for free.');
            konto.hidden = false;
        }
    });
})();
