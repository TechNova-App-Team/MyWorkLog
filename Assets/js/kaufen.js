// ═══ KAUFEN MODULE ═══
// Kasse für den Ausbildungs-Pass (/kaufen/), Aufbau im Kopf von pages/kaufen/index.html.
// Ansichten: wahl → (Stripe) → fertig | offen | fehler. Der Worker entscheidet, ob verkauft
// wird; die Seite zeigt nur, was er sagt.
(function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const RUECK = 'mwl_kauf_zurueck';   // sessionStorage: ?zurueck= überlebt den Umweg über Stripe nicht

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

    function zeigen(name) {
        document.querySelectorAll('[data-ansicht]').forEach(s => { s.hidden = s.dataset.ansicht !== name; });
        const h = document.querySelector('[data-ansicht="' + name + '"] h1');
        if (h && name !== 'wahl') h.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    }

    const datum = (ms) => new Date(ms).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

    function fertig(r) {
        $('kfCodeWert').textContent = r.code;
        $('kfBis').textContent = datum(r.bis);
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

    async function abholen(sitzung, meldung) {
        const r = await MWLPass.kaufAbholen(sitzung);
        if (r.ok) return fertig(r);
        if (r.fehler === 'offen') { zeigen('offen'); if (meldung) $('kfOffenMeldung').textContent = 'Noch nicht bestätigt. Versuch es später noch einmal.'; return; }
        if (r.fehler === 'kein') return fehler('Zu dieser Zahlung gibt es keinen Pass.', 'Wenn du bezahlt hast, schreib an info@myworklog.de und nenne die Uhrzeit der Zahlung. Du bekommst deinen Code dann von Hand.');
        if (r.fehler === 'paket') return fehler('Bezahlt, aber die Funktionen laden gerade nicht.', 'Dein Pass ist gespeichert. Lade die Seite in ein paar Minuten neu.');
        return fehler('Die Zahlung ließ sich gerade nicht prüfen.', 'Falls du bezahlt hast, ist nichts verloren: Lade diese Seite gleich noch einmal, dann kommt dein Code.');
    }

    function preis() {
        const r = document.querySelector('input[name="dauer"]:checked');
        if (r) $('kfKaufenText').textContent = 'Weiter zur Zahlung · ' + r.dataset.preis + ' €';
    }

    document.addEventListener('DOMContentLoaded', () => {
        $('kfZurueck').href = zurueck;
        preis();
        document.addEventListener('change', (e) => { if (e.target.name === 'dauer') preis(); });

        const sitzung = q.get('sitzung');
        if (sitzung) {
            zeigen('offen');
            $('kfOffenMeldung').textContent = 'Zahlung wird geprüft …';
            abholen(sitzung, false).then(() => { $('kfOffenMeldung').textContent = ''; });
            $('kfNochmal').addEventListener('click', async () => {
                $('kfOffenMeldung').textContent = 'Wird geprüft …';
                await abholen(sitzung, true);
            });
        } else if (q.get('abgebrochen')) {
            fehler('Zahlung abgebrochen.', 'Es wurde nichts abgebucht. Du kannst es jederzeit noch einmal versuchen.');
        } else if (window.MWLPass && MWLPass.frei()) {
            // Schon freigeschaltet: kein zweiter Kauf aus Versehen
            $('kfMeldung').textContent = 'Auf diesem Gerät ist der Pass schon aktiv.' + (MWLPass.code() ? ' Dein Code: ' + MWLPass.code() : '');
        }

        $('kfZurWahl').addEventListener('click', () => {
            history.replaceState(null, '', location.pathname);
            zeigen('wahl');
        });

        const knopf = $('kfKaufen');
        knopf.addEventListener('click', async () => {
            const r = document.querySelector('input[name="dauer"]:checked');
            knopf.disabled = true;
            $('kfMeldung').textContent = 'Die Kasse öffnet sich …';
            const k = await MWLPass.kasse(r ? r.value : 3);
            if (k.ok) { location.assign(k.url); return; }   // Knopf bleibt aus, bis Stripe da ist
            knopf.disabled = false;
            $('kfMeldung').textContent =
                k.fehler === 'zu' || k.fehler === 'test' ? 'Kaufen geht bald. Die Kasse ist noch nicht freigegeben.'
                : k.fehler === 'netz' ? 'Keine Verbindung. Prüf dein Internet und versuch es noch einmal.'
                : 'Die Kasse ist gerade nicht erreichbar. Versuch es in ein paar Minuten noch einmal.';
        });

        $('kfCodeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const m = $('kfCodeMeldung');
            m.textContent = 'Wird geprüft …';
            const r = await MWLPass.einloesen($('kfCode').value);
            if (!r.ok) {
                m.textContent = r.fehler === 'falsch' ? 'Der Code stimmt nicht oder ist abgelaufen.'
                    : r.fehler === 'leer' ? 'Bitte gib deinen Code ein.'
                    : r.fehler === 'netz' ? 'Keine Verbindung zum Server.' : 'Freischalten hat gerade nicht geklappt.';
                return;
            }
            m.textContent = 'Freigeschaltet. Du wirst zurückgebracht …';
            const ziel = new URL(zurueck, location.origin);
            ziel.searchParams.set('pass', 'neu');
            setTimeout(() => location.assign(ziel.pathname + ziel.search), 900);
        });

        $('kfKopieren').addEventListener('click', async () => {
            const b = $('kfKopieren');
            try { await navigator.clipboard.writeText($('kfCodeWert').textContent); b.textContent = 'Kopiert'; }
            catch (e) {
                const sel = window.getSelection(), rg = document.createRange();
                rg.selectNodeContents($('kfCodeWert')); sel.removeAllRanges(); sel.addRange(rg);
                b.textContent = 'Markiert';
            }
            setTimeout(() => { b.textContent = 'Kopieren'; }, 1800);
        });
    });
})();
