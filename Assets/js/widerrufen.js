// ═══ WIDERRUFEN MODULE (/widerrufen/, § 356a BGB) ═══
// Zweiter Schritt der Widerrufsfunktion: „Widerruf bestätigen“ schickt die Erklärung an den
// ai-proxy (POST /widerruf). Bewusst ohne Anmeldung und ohne Pflichtfelder über Name, Vertrag
// und E-Mail hinaus — beides verlangt das Gesetz. Die Quittung auf der Seite ersetzt die
// E-Mail nicht, sie zeigt nur sofort, was eingegangen ist (und lässt sich drucken).
(function () {
    'use strict';

    const API = 'https://ai-proxy.myworklog.de/widerruf';
    const EN = document.documentElement.lang === 'en';
    const T = EN ? {
        pflicht: 'Please fill in this field.',
        email: 'Please enter a valid email address.',
        senden: 'Sending…',
        fehlt: 'Please check the marked fields.',
        netz: 'No connection to our server. Please try again, or send your withdrawal to support@myworklog.de — that counts just the same.',
        mailOk: 'A confirmation of receipt is on its way to {email}.',
        mailSpaeter: 'The email confirmation could not be sent right away; we will send it shortly. Your declaration has been received and is saved.',
    } : {
        pflicht: 'Bitte füllen Sie dieses Feld aus.',
        email: 'Bitte geben Sie eine gültige E-Mail-Adresse an.',
        senden: 'Wird gesendet …',
        fehlt: 'Bitte prüfen Sie die markierten Felder.',
        netz: 'Keine Verbindung zu unserem Server. Bitte versuchen Sie es noch einmal oder schreiben Sie Ihren Widerruf an support@myworklog.de, das gilt genauso.',
        mailOk: 'Eine Eingangsbestätigung ist per E-Mail an {email} unterwegs.',
        mailSpaeter: 'Die Bestätigung per E-Mail ließ sich gerade nicht senden, wir schicken sie in Kürze nach. Ihre Erklärung ist eingegangen und gespeichert.',
    };

    const $ = (id) => document.getElementById(id);
    const FELDER = { name: 'wrFeldName', vertrag: 'wrFeldVertrag', email: 'wrFeldEmail' };

    function feldFehler(feld, text) {
        const box = $(FELDER[feld]);
        if (!box) return;
        box.classList.toggle('is-fehler', !!text);
        let m = box.querySelector('.im-feldfehler');
        if (!text) { if (m) m.remove(); return; }
        if (!m) { m = document.createElement('span'); m.className = 'im-feldfehler'; box.appendChild(m); }
        m.textContent = text;
    }

    function meldung(text) {
        const m = $('wrMeldung');
        m.textContent = text || '';
        m.hidden = !text;
    }

    function pruefen(werte) {
        const fehlt = [];
        if (werte.name.length < 2) fehlt.push('name');
        if (werte.vertrag.length < 3) fehlt.push('vertrag');
        if (!/^[^@ ]+@[^@ ]+[.][^@ .]{2,}$/.test(werte.email)) fehlt.push('email');
        return fehlt;
    }

    function zeigeFehler(fehlt) {
        Object.keys(FELDER).forEach((f) => feldFehler(f, fehlt.includes(f) ? (f === 'email' ? T.email : T.pflicht) : ''));
        if (fehlt.length) {
            const erstes = $({ name: 'wrName', vertrag: 'wrVertrag', email: 'wrEmail' }[fehlt[0]]);
            if (erstes) erstes.focus();
        }
    }

    function quittung(d) {
        const eingang = new Date(d.eingang).toLocaleString(EN ? 'en-GB' : 'de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'long', timeStyle: 'medium' });
        $('wrDVorgang').textContent = d.id;
        $('wrDEingang').textContent = eingang;
        $('wrDName').textContent = d.name;
        $('wrDVertrag').textContent = d.vertrag;
        $('wrDEmail').textContent = d.email;
        $('wrQuittungMail').textContent = d.mail ? T.mailOk.replace('{email}', d.email) : T.mailSpaeter;
        $('wrForm').hidden = true;
        const q = $('wrQuittung');
        q.hidden = false;
        q.focus();
        if (typeof mwlEvent === 'function') mwlEvent('widerruf_erklaert', { mail: !!d.mail });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const form = $('wrForm');
        if (!form) return;
        form.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const werte = {
                name: $('wrName').value.trim(),
                vertrag: $('wrVertrag').value.trim(),
                email: $('wrEmail').value.trim(),
                grund: $('wrGrund').value.trim(),
            };
            const fehlt = pruefen(werte);
            zeigeFehler(fehlt);
            if (fehlt.length) { meldung(T.fehlt); return; }
            meldung('');
            const knopf = $('wrSenden');
            const beschriftung = knopf.textContent;
            knopf.disabled = true;
            knopf.textContent = T.senden;
            try {
                const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(werte) });
                const d = await r.json().catch(() => null);
                if (r.ok && d && d.ok) return quittung(d);
                if (d && Array.isArray(d.fehlt) && d.fehlt.length) { zeigeFehler(d.fehlt); meldung(T.fehlt); }
                else meldung((!EN && d && d.error) || T.netz);   // Server spricht nur Deutsch
            } catch (e) {
                meldung(T.netz);
            } finally {
                knopf.disabled = false;
                knopf.textContent = beschriftung;
            }
        });
    });
})();
