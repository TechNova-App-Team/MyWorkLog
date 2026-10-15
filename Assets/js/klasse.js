// ═══ KLASSE PAGE MODULE ═══
// /klasse/ in drei Zustaenden (body[data-mode]):
//   landing  statischer, crawlbarer Text + Beamer-Demo + Code-Eingabe
//   join     #CODE in der Adresse: Azubi sieht, was eingerichtet wird, und tritt bei
//   cockpit  angemeldete Lehrkraft mit eigenen Klassen (oder #klassen / "Klasse anlegen")
// Logik, die auch die App braucht, liegt in klasse-profil.js (window.MWLKlasse).
// Alle Texte hier laufen ueber L(de, en) — die i18n-Pipeline sieht JS-Text nicht.

(function () {
    'use strict';
    const K = window.MWLKlasse;
    const $ = function (id) { return document.getElementById(id); };
    const EN = document.documentElement.lang === 'en';
    const L = function (de, en) { return EN ? en : de; };
    const BASE = EN ? '/en' : '';
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function ev(name, props) { if (typeof mwlEvent === 'function') mwlEvent(name, props || {}); }
    const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

    // Lucide-Pfade (Originale), Strich aus dem Stylesheet
    const IC = {
        clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
        layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
        map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
        award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
        book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
        plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
        x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
        printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
        projector: '<path d="M5 7 3 5"/><path d="M9 6V3"/><path d="m13 7 2-2"/><circle cx="9" cy="13" r="3"/><path d="M11.83 12H20a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2.17"/><path d="M16 16h2"/>',
        maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
        check: '<path d="M20 6 9 17l-5-5"/>',
        shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
        arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
        alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'
    };
    function svg(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }

    // ── Kleinzeug ─────────────────────────────────────────────────────
    let toastT = 0;
    function toast(msg) {
        let t = document.querySelector('.kl-toast');
        if (!t) { t = document.createElement('div'); t.className = 'kl-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
        t.textContent = msg;
        void t.offsetWidth; t.classList.add('is-in');
        clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('is-in'); }, 2600);
    }
    function joinUrl(code) { return location.origin + BASE + '/klasse/#' + code; }
    function qrInto(el, text, px) {
        if (!el) return;
        el.innerHTML = '';
        if (typeof QRCode === 'undefined') { el.textContent = ''; return; }
        // Die Bibliothek zeichnet in ein Canvas fester Groesse; das CSS skaliert es
        // mit image-rendering: pixelated, also scharf bei jeder Groesse.
        new QRCode(el, { text: text, width: px || 512, height: px || 512, colorDark: '#15151b', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    }
    async function kopieren(text) {
        try { await navigator.clipboard.writeText(text); return true; }
        catch (e) {
            const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            let ok = false; try { ok = document.execCommand('copy'); } catch (x) { ok = false; }
            ta.remove(); return ok;
        }
    }
    const FEHLER = {
        name_ungueltig: ['Bitte einen Namen für die Klasse eingeben (höchstens 60 Zeichen).', 'Please enter a class name (up to 60 characters).'],
        block_ungueltig: ['Ein Block braucht Beginn und Ende, höchstens 60 Tage lang.', 'A block needs a start and end, at most 60 days.'],
        rhythmus_ungueltig: ['Beim Rhythmus fehlt ein Startdatum.', 'A rhythm rule is missing its start date.'],
        pruefung_ungueltig: ['Ein Prüfungstermin ist kein gültiges Datum.', 'An exam date is not valid.'],
        bundesland_ungueltig: ['Unbekanntes Bundesland.', 'Unknown state.'],
        faecher_zu_viele: ['Höchstens 30 Fächer je Klasse.', 'At most 30 subjects per class.'],
        bloecke_zu_viele: ['Höchstens 40 Blöcke je Klasse.', 'At most 40 blocks per class.'],
        zu_viele_klassen: ['Sie haben schon 25 Klassen. Löschen Sie eine alte, um eine neue anzulegen.', 'You already have 25 classes. Delete an old one to create another.'],
        zu_schnell: ['Zu viele Änderungen in kurzer Zeit. Bitte in ein paar Minuten noch einmal.', 'Too many changes at once. Please try again in a few minutes.'],
        text_ungueltig: ['Die Mitteilung ist leer oder länger als 500 Zeichen.', 'The message is empty or longer than 500 characters.'],
        push_abgelehnt: ['Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in den Einstellungen des Browsers bzw. der App und tippe dann noch einmal.', 'Notifications are blocked for this site. Allow them in the browser or app settings, then tap again.'],
        push_nicht_moeglich: ['Dieser Browser kann keine Benachrichtigungen empfangen. Mitteilungen erscheinen beim Öffnen der App.', 'This browser cannot receive notifications. Messages appear when you open the app.'],
        push_ungueltig: ['Das Gerät hat keine gültige Push-Adresse geliefert.', 'The device did not provide a valid push address.'],
        bis_ungueltig: ['Das Ablaufdatum muss heute oder später sein.', 'The expiry date must be today or later.'],
        zu_viele_beitritte: ['Gerade treten sehr viele bei. Bitte in einer Minute noch einmal.', 'A lot of people are joining right now. Please try again in a minute.'],
        offline: ['Keine Verbindung. Bitte prüfen und noch einmal versuchen.', 'No connection. Please check and try again.'],
        nicht_angemeldet: ['Bitte erst anmelden.', 'Please sign in first.']
    };
    function fehlerText(e) {
        const c = (e && (e.code || e.message)) || '';
        const f = FEHLER[c];
        return f ? L(f[0], f[1]) : L('Das hat nicht geklappt. Bitte noch einmal versuchen.', 'That did not work. Please try again.');
    }

    // ── Sitzung (nur Cockpit) ─────────────────────────────────────────
    // Die Sitzung stammt aus der App (gleiche Origin). Ohne Sitzung laden wir die
    // Supabase-Bibliothek gar nicht — Azubis brauchen sie nie.
    function projektRef() { try { return new URL(SUPABASE_CONFIG.URL).hostname.split('.')[0]; } catch (e) { return null; } }
    function hatSitzung() { const r = projektRef(); try { return !!(r && localStorage.getItem('sb-' + r + '-auth-token')); } catch (e) { return false; } }
    let sbPromise = null;
    function sb() {
        if (sbPromise) return sbPromise;
        sbPromise = new Promise(function (ok, fail) {
            if (window.supabase && window.supabase.createClient) return ok();
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            s.onload = ok; s.onerror = function () { fail(new Error('offline')); };
            document.head.appendChild(s);
        }).then(function () { return window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY); })
          .catch(function (e) { sbPromise = null; throw e; });
        return sbPromise;
    }
    async function sitzung() {
        if (!hatSitzung()) return null;
        try { const c = await sb(); const r = await c.auth.getSession(); return (r && r.data && r.data.session) || null; }
        catch (e) { return null; }
    }
    async function call(name, args) {
        const c = await sb();
        const r = await c.rpc(name, args || {});
        if (r.error) { const e = new Error(r.error.message); e.code = r.error.message; throw e; }
        return r.data;
    }

    // ── Gemeinsamer Renderer: die Beitrittskarte ──────────────────────
    // Dieselbe Funktion zeichnet die echte Beitrittsansicht UND das Beispiel auf
    // der Landingpage — die Werbung kann damit nicht von der Wirklichkeit abweichen.
    function itemsHtml(plan, interaktiv) {
        return '<ul class="kl-items">' + plan.map(function (it) {
            const sw = interaktiv && !it.gleich
                ? '<label class="kl-switch"><input type="checkbox" data-item="' + it.id + '" checked aria-label="' + esc(it.titel) + '"><span></span></label>' : '';
            return '<li class="kl-item" data-id="' + it.id + '">' +
                '<span class="kl-item__ic">' + svg(it.icon) + '</span>' +
                '<div><p class="kl-item__t">' + esc(it.titel) + '</p><p class="kl-item__v">' + esc(it.neu) + '</p>' +
                (it.liste ? '<div class="kl-chips">' + it.liste.map(function (f) { return '<span class="kl-chip">' + esc(f) + '</span>'; }).join('') + '</div>' : '') +
                (it.alt ? '<p class="kl-item__alt">' + L('Ersetzt: ', 'Replaces: ') + esc(it.alt) + '</p>' : '') +
                (it.gleich ? '<p class="kl-item__ok">' + L('Schon so eingerichtet', 'Already set up like this') + '</p>' : '') +
                '</div>' + sw + '</li>';
        }).join('') + '</ul>';
    }
    function karteHtml(p, plan, opts) {
        opts = opts || {};
        const meta = [p.schule, p.beruf, p.lehrjahr ? L(p.lehrjahr + '. Lehrjahr', 'Year ' + p.lehrjahr) : ''].filter(Boolean).join(', ');
        const msgs = (p.mitteilungen || []).slice(0, 3);
        return '<div class="kl-shell"><div class="kl-core">' +
            '<header class="kl-join__head">' +
                '<p class="kl-join__k">' + (opts.kopf || L('Einladung in die Klasse', 'Invitation to the class')) + '</p>' +
                '<h1 class="kl-join__name">' + esc(p.name) + '</h1>' +
                (meta ? '<p class="kl-join__meta">' + esc(meta) + '</p>' : '') +
                (p.kontakt ? '<p class="kl-join__meta">' + L('Ansprechperson: ', 'Contact: ') + esc(p.kontakt) + '</p>' : '') +
                '<span class="kl-join__code" translate="no">' + esc(K.codeFmt(p.code)) + '</span>' +
            '</header>' +
            (plan.length ? '<section class="kl-join__sec"><h2 class="kl-join__h">' + L('Das richtet MyWorkLog auf diesem Gerät ein', 'What MyWorkLog sets up on this device') + '</h2>' + itemsHtml(plan, opts.interaktiv) + '</section>' : '') +
            (msgs.length ? '<section class="kl-join__sec"><h2 class="kl-join__h">' + L('Aktuell von deiner Klasse', 'Latest from your class') + '</h2><ul class="kl-msgs">' +
                msgs.map(function (m) { return '<li class="kl-msg">' + esc(m.text) + (m.bis ? '<small>' + L('bis ', 'until ') + esc(K.datum(m.bis, true)) + '</small>' : '') + '</li>'; }).join('') + '</ul></section>' : '') +
            (opts.fuss || '') +
        '</div></div>';
    }
    function settingsLesen() {
        try { const d = JSON.parse(localStorage.getItem('tg_pro_data') || 'null'); return (d && d.settings) || {}; } catch (e) { return {}; }
    }

    // ── Modus umschalten ──────────────────────────────────────────────
    function modus(m) {
        document.body.setAttribute('data-mode', m);
        $('klApp').hidden = m === 'landing';
        window.scrollTo(0, 0);
    }
    function zustandsBild(icon, titel, text, knoepfe, fertig) {
        return '<div class="kl-state"><div class="kl-state__ic' + (fertig ? ' is-done' : '') + '">' + svg(icon) + '</div><h1>' + titel + '</h1>' +
            (text ? '<p>' + text + '</p>' : '') + (knoepfe ? '<div class="kl-cta">' + knoepfe + '</div>' : '') + '</div>';
    }
    const APP_URL = EN ? '/en/' : '/';

    // Mitteilungen der Lehrkraft als Benachrichtigung (seit v8.5.9). Ohne das kamen sie nur
    // an, wenn die App gerade offen war — gemeldet als "kommen nie an".
    function pushKasten(code, stand) {
        const an = stand === 'an';
        return '<div class="kl-push' + (an ? ' is-an' : '') + '" id="klPush"><div class="kl-push__ic">' + svg('bell') + '</div><div class="kl-push__t">' +
            '<b>' + (an ? L('Mitteilungen kommen aufs Handy', 'Messages come to your phone') : L('Mitteilungen aufs Handy', 'Messages to your phone')) + '</b>' +
            '<span>' + (an ? L('Schreibt deine Lehrkraft etwas, bekommst du eine Benachrichtigung, auch wenn die App zu ist.', 'When your teacher writes, you get a notification, even when the app is closed.')
                           : L('Sonst siehst du Nachrichten deiner Lehrkraft erst, wenn du die App öffnest.', 'Otherwise you only see your teacher\u2019s messages when you open the app.')) + '</span>' +
            '<p class="kl-codebar__err" id="klPushErr" role="alert" hidden></p></div>' +
            '<button class="kl-btn' + (an ? '' : ' kl-btn--primary') + ' kl-btn--sm" type="button" id="klPushBtn">' + (an ? L('Ausschalten', 'Turn off') : L('Einschalten', 'Turn on')) + '</button></div>';
    }
    function pushKastenBinden(code) {
        const b = $('klPushBtn'); if (!b) return;
        b.onclick = async function () {
            b.disabled = true;
            const err = $('klPushErr'); err.hidden = true;
            try {
                const an = $('klPush').classList.contains('is-an');
                if (an) await K.pushAus(); else await K.pushAn(code);
                ev('klasse_push', { an: !an });
                $('klPush').outerHTML = pushKasten(code, an ? 'aus' : 'an');
                pushKastenBinden(code);
            } catch (x) { b.disabled = false; err.textContent = fehlerText(x); err.hidden = false; }
        };
    }

    // ══ BEITRITT (Azubi) ══════════════════════════════════════════════
    async function zeigeBeitritt(code) {
        modus('join');
        const app = $('klApp');
        app.innerHTML = '<p class="kl-loading">' + L('Klasse wird geladen …', 'Loading class …') + '</p>';
        let p;
        try { p = await K.laden(code); }
        catch (e) {
            app.innerHTML = zustandsBild('alert', L('Keine Verbindung', 'No connection'),
                L('Die Klasse konnte nicht geladen werden. Prüf deine Verbindung und versuch es noch einmal.', 'The class could not be loaded. Check your connection and try again.'),
                '<button class="kl-btn kl-btn--primary" type="button" id="klRetry"><span>' + L('Noch einmal', 'Try again') + '</span></button>');
            $('klRetry').onclick = function () { zeigeBeitritt(code); };
            return;
        }
        if (!p) {
            app.innerHTML = zustandsBild('alert', L('Diesen Code gibt es nicht', 'This code does not exist'),
                L('Vielleicht vertippt, oder die Lehrkraft hat einen neuen Code erzeugt. Frag nach dem aktuellen Code.', 'Maybe a typo, or your teacher created a new code. Ask for the current one.'),
                '<a class="kl-btn kl-btn--primary" href="' + BASE + '/klasse/#code"><span>' + L('Code eingeben', 'Enter code') + '</span></a>');
            ev('klasse_beitritt', { aktion: 'unbekannt' });
            return;
        }
        const z = K.zustand();
        const mitglied = !!(z && z.code === p.code);
        const aktuell = mitglied && !z.ausstehend && (p.version || 0) <= (z.version || 0);
        document.title = p.name + ' | MyWorkLog';

        if (aktuell) {
            app.innerHTML = '<div class="kl-join">' + karteHtml(p, [], {
                kopf: L('Du bist in dieser Klasse', 'You are in this class'),
                fuss: '<footer class="kl-join__foot"><p class="kl-join__privacy">' + svg('check') + '<span>' + L('Alles ist auf dem neuesten Stand. Ändert die Lehrkraft etwas, fragt die App nach.', 'Everything is up to date. If your teacher changes something, the app will ask.') + '</span></p>' +
                    '<a class="kl-btn kl-btn--primary kl-join__go" href="' + APP_URL + '"><span>' + L('App öffnen', 'Open the app') + '</span><i class="kl-btn__ic">' + svg('arrow') + '</i></a>' +
                    '<p class="kl-join__alt"><button type="button" id="klLeave">' + L('Klasse verlassen', 'Leave class') + '</button></p></footer>'
            }) + '</div>';
            $('klLeave').onclick = function () {
                if (this.dataset.sicher !== '1') { this.dataset.sicher = '1'; this.textContent = L('Wirklich verlassen? Einstellungen bleiben, es kommen keine Updates mehr.', 'Really leave? Settings stay, no more updates.'); return; }
                K.austreten(); ev('klasse_beitritt', { aktion: 'verlassen' }); toast(L('Klasse verlassen', 'Left the class'));
                setTimeout(function () { location.href = BASE + '/klasse/'; }, 600);
            };
            return;
        }
        if (p.geschlossen && !mitglied) {
            app.innerHTML = zustandsBild('alert', L('Diese Klasse ist geschlossen', 'This class is closed'),
                L('Die Lehrkraft nimmt gerade keine neuen Mitglieder auf.', 'Your teacher is not accepting new members right now.'));
            return;
        }

        const plan = K.planen(settingsLesen(), p);
        const offen = plan.filter(function (it) { return !it.gleich; });
        const update = mitglied;
        app.innerHTML = '<div class="kl-join">' + karteHtml(p, plan, {
            interaktiv: true,
            kopf: update ? L('Deine Klasse hat Änderungen', 'Your class has changes') : L('Einladung in die Klasse', 'Invitation to the class'),
            fuss: '<footer class="kl-join__foot">' +
                (update ? '' : '<p class="kl-join__privacy">' + svg('shield') + '<span>' + L('Deine Lehrkraft sieht nur, dass ein Gerät mehr dabei ist. Kein Name, keine Arbeitszeiten, kein Konto nötig.', 'Your teacher only sees that one more device joined. No name, no working hours, no account needed.') + '</span></p>') +
                '<button class="kl-btn kl-btn--primary kl-join__go" type="button" id="klGo"><span id="klGoT">' +
                    (update ? L('Änderungen übernehmen', 'Apply changes') : (offen.length ? L('Beitreten und einrichten', 'Join and set up') : L('Beitreten', 'Join'))) +
                '</span><i class="kl-btn__ic">' + svg('arrow') + '</i></button>' +
                '<p class="kl-join__err" id="klGoErr" role="alert" hidden></p>' +
                (update ? '<p class="kl-join__alt"><a href="' + APP_URL + '">' + L('Später', 'Later') + '</a></p>' : '') +
            '</footer>'
        }) + '</div>';

        // Abgewaehlte Punkte sichtbar abdunkeln
        app.querySelectorAll('input[data-item]').forEach(function (cb) {
            cb.addEventListener('change', function () { cb.closest('.kl-item').classList.toggle('is-off', !cb.checked); });
        });
        $('klGo').onclick = async function () {
            const btn = this; btn.disabled = true;
            const auswahl = plan.filter(function (it) {
                const cb = app.querySelector('input[data-item="' + it.id + '"]');
                return !it.gleich && (!cb || cb.checked);
            }).map(function (it) { return it.id; });
            try {
                if (!update) await K.beitreten(p.code);
                K.vormerken(p, auswahl);
                ev('klasse_beitritt', { aktion: update ? 'update' : 'neu', bereiche: auswahl.length });
                // Hat das Geraet Benachrichtigungen schon erlaubt (z. B. von einer frueheren Klasse),
                // haengt das Abo ohne Rueckfrage an die neue Klasse um.
                const pushVorher = K.pushMoeglich() && Notification.permission === 'granted';
                if (pushVorher) { try { await K.pushAn(p.code); } catch (x) { /* bleibt beim Knopf */ } }
                const pushStand = K.pushMoeglich() ? await K.pushStatus() : 'nicht';
                app.innerHTML = zustandsBild('check',
                    update ? L('Übernommen', 'Applied') : L('Du bist dabei', 'You are in'),
                    auswahl.length ? L('Beim Öffnen richtet die App ' + auswahl.length + (auswahl.length === 1 ? ' Bereich' : ' Bereiche') + ' für dich ein.', 'The app sets up ' + auswahl.length + (auswahl.length === 1 ? ' area' : ' areas') + ' for you when it opens.')
                                   : L('Deine Einstellungen bleiben, wie sie sind.', 'Your settings stay as they are.'),
                    '<a class="kl-btn kl-btn--primary" href="' + APP_URL + '" id="klOpen"><span>' + L('App öffnen', 'Open the app') + '</span><i class="kl-btn__ic">' + svg('arrow') + '</i></a>', true) +
                    (pushStand === 'nicht' ? '' : pushKasten(p.code, pushStand));
                pushKastenBinden(p.code);
            } catch (e) {
                btn.disabled = false;
                const er = $('klGoErr'); er.textContent = fehlerText(e); er.hidden = false;
            }
        };
    }

    // ══ LANDING ═══════════════════════════════════════════════════════
    const DEMO = {
        code: 'K7QPM2XD', name: 'FI 25a', schule: 'Berufsbildende Schule', beruf: 'Fachinformatik', lehrjahr: 1, kontakt: '',
        bundesland: 'NI', schultage: [2, 4], rhythmus: [], bloecke: [], faecher: ['LF1', 'LF2', 'LF3', 'LF4', 'Deutsch', 'Englisch', 'Politik'],
        pruefungen: { ap1: '2027-03-02' }, mitteilungen: [], version: 1
    };
    function demoBloecke() {
        // Ein Beispielblock in der Zukunft, damit "naechster Block" nie in der Vergangenheit steht
        const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7) + 21);
        const iso = function (x) { return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
        const e = new Date(d); e.setDate(e.getDate() + 11);
        return [{ von: iso(d), bis: iso(e) }];
    }
    function sitzePlatz(host, n, spalten) {
        if (!host) return;
        spalten = spalten || 8;
        const total = Math.max(spalten * 4, Math.ceil((n + 1) / spalten) * spalten);
        while (host.children.length < total) host.appendChild(document.createElement('i'));
        [...host.children].forEach(function (s, i) {
            const an = i < n;
            if (an && !s.classList.contains('is-on')) { s.classList.add('is-on', 'is-pop'); setTimeout(function () { s.classList.remove('is-pop'); }, 520); }
            if (!an) s.classList.remove('is-on');
        });
    }
    function landing() {
        modus('landing');
        qrInto($('klDemoQr'), 'https://myworklog.de/klasse/#K7QPM2XD', 272);
        sitzePlatz($('klDemoSeats'), 0);
        const demo = Object.assign({}, DEMO, { bloecke: demoBloecke() });
        $('klWhatDemo').innerHTML = '<div class="kl-join">' + karteHtml(demo, K.planen({}, demo), { interaktiv: true }) + '</div>';
        $('klWhatDemo').querySelectorAll('input').forEach(function (i) { i.tabIndex = -1; });

        // Die Handys der Klasse (Dekoration, deshalb hier gebaut statt im crawlbaren Markup).
        // Sie springen bei diesen Zaehlerstaenden auf "eingerichtet" — so sieht man, wofuer
        // die Zahl auf der Leinwand steht: jedes Geraet ist fertig, ohne Tippen.
        const n1 = demo.bloecke[0];
        const phoneHtml = function (i) {
            return '<div class="kl-ph" style="--i:' + i + '"><div class="kl-ph__scr">' +
                '<div class="kl-ph__scan"><span class="kl-ph__vf"></span><span>' + L('Code scannen', 'Scan code') + '</span></div>' +
                '<div class="kl-ph__done"><span class="kl-ph__ok">' + svg('check') + '</span><p class="kl-ph__t">FI 25a</p>' +
                    '<div class="kl-ph__row"><b>' + L('Berufsschule', 'School') + '</b>' + K.tageText([2, 4], EN) + '</div>' +
                    '<div class="kl-ph__row"><b>' + L('Block', 'Block') + '</b>' + K.datum(n1.von) + '–' + K.datum(n1.bis) + '</div>' +
                    '<div class="kl-ph__row"><b>' + L('Prüfung Teil 1', 'Exam part 1') + '</b>' + K.datum('2027-03-02', true) + '</div>' +
                '</div></div></div>';
        };
        $('klPhones').innerHTML = [0, 1, 2, 3, 4].map(phoneHtml).join('');
        // Reihenfolge, in der die Handys fertig werden (Mitte zuerst wirkt zufaellig genug)
        const FOLGE = [2, 0, 3, 1, 4], SCHWELLE = [3, 8, 13, 18, 23];
        const handys = [...$('klPhones').children];

        // Einmal hochzaehlen, sobald die Buehne zu sehen ist
        const ZIEL = 23;
        let gelaufen = false;
        const stand = function (n) {
            $('klDemoNum').textContent = n; sitzePlatz($('klDemoSeats'), n);
            SCHWELLE.forEach(function (sw, j) { if (n >= sw) handys[FOLGE[j]].classList.add('is-done'); });
        };
        const los = function () {
            if (gelaufen) return; gelaufen = true;
            if (RM.matches) { stand(ZIEL); return; }
            let n = 0;
            const tick = function () {
                n++; stand(n);
                if (n < ZIEL) setTimeout(tick, n < 4 ? 380 : n > ZIEL - 3 ? 460 : 150 + Math.random() * 170);
            };
            setTimeout(tick, 700);
        };
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); los(); } }, { threshold: 0.35 });
            io.observe($('klStage'));
        } else los();

        const form = $('klCodeForm');
        form.onsubmit = function (e) {
            e.preventDefault();
            const c = K.codeNorm($('klCodeIn').value);
            const err = $('klCodeErr');
            if (!c) { err.textContent = L('Der Code hat acht Zeichen, zum Beispiel K7QP-M2XD.', 'The code has eight characters, for example K7QP-M2XD.'); err.hidden = false; return; }
            err.hidden = true;
            location.hash = c;
        };
        // Beim Tippen in Viererbloecke setzen; Verwechsler (O/0, I/1, L) gibt es im Code nicht.
        $('klCodeIn').addEventListener('input', function () {
            const roh = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
            this.value = roh.length > 4 ? roh.slice(0, 4) + '-' + roh.slice(4) : roh;
        });
    }

    // ══ COCKPIT (Lehrkraft) ═══════════════════════════════════════════
    const C = { klassen: [], sel: null, tab: 'profil', stand: {}, poll: 0, form: null, dirty: false, user: null };
    const LEER = { name: '', schule: '', beruf: '', kontakt: '', lehrjahr: 1, bundesland: '', schultage: [], rhythmus: [], bloecke: [], faecher: [], pruefungen: {}, stundenplan: {} };

    async function cockpit(neu) {
        modus('cockpit');
        const app = $('klApp');
        app.innerHTML = '<p class="kl-loading">' + L('Ihre Klassen werden geladen …', 'Loading your classes …') + '</p>';
        const s = await sitzung();
        if (!s) { location.href = '/?cloud=login&back=klasse'; return; }
        C.user = s.user;
        topNavKonto();
        try { C.klassen = await call('klassen_uebersicht') || []; }
        catch (e) { app.innerHTML = zustandsBild('alert', L('Keine Verbindung', 'No connection'), fehlerText(e)); return; }
        if (neu || !C.klassen.length) { C.sel = 'neu'; C.form = JSON.parse(JSON.stringify(LEER)); }
        else if (!C.sel || !C.klassen.some(function (k) { return k.id === C.sel; })) { C.sel = C.klassen[0].id; C.form = null; }
        zeichneCockpit();
    }
    function topNavKonto() {
        const nav = $('klTopNav'); if (!nav || !C.user) return;
        const m = (C.user.user_metadata || {}), name = m.full_name || m.name || C.user.email || '';
        const ini = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(function (x) { return x[0].toUpperCase(); }).join('') || '?';
        nav.innerHTML = '<a class="kl-top__link" href="' + APP_URL + '">' + L('Zur App', 'Open app') + '</a>' +
            '<span class="kl-top__acct" title="' + esc(name) + '"><span class="kl-top__mono">' + esc(ini) + '</span></span>';
    }
    function aktuelleKlasse() { return C.klassen.find(function (k) { return k.id === C.sel; }) || null; }

    function zeichneCockpit() {
        const app = $('klApp');
        const list = C.klassen.map(function (k) {
            return '<li><button type="button" class="kl-li' + (k.geschlossen ? ' is-zu' : '') + '" data-k="' + k.id + '" aria-current="' + (k.id === C.sel) + '">' +
                '<span><span class="kl-li__n">' + esc(k.name) + '</span><span class="kl-li__s">' + esc([k.schule, k.beruf].filter(Boolean).join(', ') || K.codeFmt(k.code)) + '</span></span>' +
                '<span class="kl-li__c" title="' + L('Beigetreten', 'Joined') + '">' + (k.beitritte || 0) + '</span></button></li>';
        }).join('');
        app.innerHTML = '<div class="kl-cock">' +
            '<aside><div class="kl-side__h"><h1>' + L('Ihre Klassen', 'Your classes') + '</h1>' +
                '<button class="kl-btn kl-btn--sm" type="button" id="klNeu">' + svg('plus') + '<span>' + L('Neu', 'New') + '</span></button></div>' +
                (list ? '<ul class="kl-list">' + list + '</ul>' : '<p class="kl-side__empty">' + L('Noch keine Klasse. Rechts legen Sie die erste an.', 'No class yet. Create the first one on the right.') + '</p>') +
            '</aside>' +
            '<section id="klDetail"></section></div>';
        $('klNeu').onclick = function () { if (!verwerfenOk()) return; C.sel = 'neu'; C.form = JSON.parse(JSON.stringify(LEER)); C.dirty = false; zeichneCockpit(); };
        app.querySelectorAll('[data-k]').forEach(function (b) {
            b.onclick = function () { if (!verwerfenOk()) return; C.sel = b.getAttribute('data-k'); C.form = null; C.dirty = false; C.tab = 'profil'; zeichneCockpit(); };
        });
        if (C.sel === 'neu') zeichneNeu(); else zeichneDetail();
    }
    function verwerfenOk() {
        if (!C.dirty) return true;
        return window.confirm(L('Ungespeicherte Änderungen verwerfen?', 'Discard unsaved changes?'));
    }
    window.addEventListener('beforeunload', function (e) { if (C.dirty) { e.preventDefault(); e.returnValue = ''; } });

    function zeichneNeu() {
        const d = $('klDetail');
        d.innerHTML = '<div class="kl-detail__head"><div><h2 class="kl-detail__name">' + L('Neue Klasse', 'New class') + '</h2>' +
            '<p class="kl-detail__sub">' + L('Nur der Name ist Pflicht. Alles andere können Sie später ergänzen.', 'Only the name is required. Everything else can be added later.') + '</p></div></div>' +
            '<form class="kl-form" id="klForm" novalidate></form>';
        formular($('klForm'), C.form, true);
    }

    function zeichneDetail() {
        const k = aktuelleKlasse(); if (!k) return;
        if (!C.form) C.form = profilAus(k);
        const d = $('klDetail');
        const meta = [k.schule, k.beruf, k.lehrjahr ? L(k.lehrjahr + '. Lehrjahr', 'Year ' + k.lehrjahr) : ''].filter(Boolean).join(', ');
        const nMsg = (k.mitteilungen || []).length;
        d.innerHTML =
            '<div class="kl-detail__head"><div><h2 class="kl-detail__name">' + esc(k.name) + (k.geschlossen ? '<span class="kl-badge">' + L('geschlossen', 'closed') + '</span>' : '') + '</h2>' +
                (meta ? '<p class="kl-detail__sub">' + esc(meta) + '</p>' : '') + '</div>' +
                '<div class="kl-detail__acts"><button class="kl-btn kl-btn--primary" type="button" id="klBeamerGo"' + (k.geschlossen ? ' disabled' : '') + '><span>' + L('Beamer-Ansicht', 'Projector view') + '</span><i class="kl-btn__ic">' + svg('projector') + '</i></button></div></div>' +
            '<div class="kl-kpis">' +
                '<div class="kl-kpi"><p class="kl-kpi__l">' + L('Beigetreten', 'Joined') + '</p><p class="kl-kpi__n" id="klKpiN">' + (k.beitritte || 0) + '</p>' +
                    '<p class="kl-kpi__s" id="klKpiS">' + L('Geräte, ohne Namen', 'devices, no names') + '</p><div class="kl-spark" id="klSpark" aria-hidden="true"></div></div>' +
                '<div class="kl-kpi"><div class="kl-share"><div class="kl-share__qr" id="klShareQr"></div><div>' +
                    '<p class="kl-kpi__l">' + L('Code der Klasse', 'Class code') + '</p><p class="kl-share__code" translate="no">' + esc(K.codeFmt(k.code)) + '</p>' +
                    '<div class="kl-share__acts">' +
                        '<button class="kl-btn kl-btn--sm" type="button" id="klCopy">' + svg('copy') + '<span>' + L('Link kopieren', 'Copy link') + '</span></button>' +
                        '<button class="kl-btn kl-btn--sm" type="button" id="klPng">' + svg('download') + '<span>' + L('QR speichern', 'Save QR') + '</span></button>' +
                        '<button class="kl-btn kl-btn--sm" type="button" id="klDruck">' + svg('printer') + '<span>' + L('Aushang', 'Handout') + '</span></button>' +
                    '</div></div></div></div>' +
            '</div>' +
            '<div class="kl-tabs" role="tablist">' +
                tabBtn('profil', L('Klassenprofil', 'Class profile')) + tabBtn('mitteilungen', L('Mitteilungen', 'Messages'), nMsg) + tabBtn('verwaltung', L('Verwaltung', 'Manage')) +
            '</div><div id="klTab"></div>';
        qrInto($('klShareQr'), joinUrl(k.code), 256);
        $('klBeamerGo').onclick = function () { beamer(k); };
        $('klCopy').onclick = async function () { toast(await kopieren(joinUrl(k.code)) ? L('Link kopiert', 'Link copied') : L('Kopieren ging nicht', 'Could not copy')); };
        $('klPng').onclick = function () { qrPng(k); };
        $('klDruck').onclick = function () { drucken(k); };
        d.querySelectorAll('[data-tab]').forEach(function (b) {
            b.onclick = function () { if (C.tab === 'profil' && !verwerfenOk()) return; if (C.tab === 'profil') { C.dirty = false; C.form = profilAus(k); } C.tab = b.getAttribute('data-tab'); zeichneDetail(); };
        });
        zeichneTab(k);
        standLaden(k);
        clearInterval(C.poll);
        C.poll = setInterval(function () { if (!document.hidden && $('klKpiN')) standLaden(k); }, 20000);
    }
    function tabBtn(id, t, n) { return '<button class="kl-tab" type="button" role="tab" data-tab="' + id + '" aria-selected="' + (C.tab === id) + '">' + t + (n ? '<small>' + n + '</small>' : '') + '</button>'; }
    function profilAus(k) {
        return { name: k.name, schule: k.schule || '', beruf: k.beruf || '', kontakt: k.kontakt || '', lehrjahr: k.lehrjahr || 1, bundesland: k.bundesland || '',
            schultage: (k.schultage || []).slice(), rhythmus: JSON.parse(JSON.stringify(k.rhythmus || [])), bloecke: JSON.parse(JSON.stringify(k.bloecke || [])),
            faecher: (k.faecher || []).slice(), pruefungen: Object.assign({}, k.pruefungen || {}), stundenplan: JSON.parse(JSON.stringify(K.planVoll(k.stundenplan))) };
    }

    async function standLaden(k) {
        try {
            const s = await call('klasse_stand', { p_id: k.id });
            C.stand[k.id] = s;
            k.beitritte = s.gesamt;
            const n = $('klKpiN'); if (!n) return;
            n.textContent = s.gesamt;
            const li = document.querySelector('.kl-li[data-k="' + k.id + '"] .kl-li__c'); if (li) li.textContent = s.gesamt;
            $('klKpiS').textContent = (s.heute ? L(s.heute + ' heute, ', s.heute + ' today, ') : '') + L('Geräte, ohne Namen', 'devices, no names');
            // 30 Tage, ein Balken je Tag; Hoehe relativ zum staerksten Tag (der Nenner steht im Titel).
            const tage = {}; (s.verlauf || []).forEach(function (v) { tage[v.tag] = v.n; });
            const max = Math.max.apply(null, [1].concat(Object.values(tage)));
            let html = '';
            for (let i = 29; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                const v = tage[iso] || 0;
                html += '<i class="' + (v ? '' : 'is-null') + '" style="height:' + (v ? Math.max(8, Math.round(v / max * 100)) : 4) + '%" title="' + esc(K.datum(iso)) + ': ' + v + '"></i>';
            }
            $('klSpark').innerHTML = html;
            $('klSpark').title = L('Beitritte je Tag, letzte 30 Tage, höchster Tag: ', 'Joins per day, last 30 days, peak: ') + max;
        } catch (e) { /* Zahl bleibt beim letzten Stand */ }
    }

    function zeichneTab(k) {
        const t = $('klTab');
        if (C.tab === 'profil') { t.innerHTML = '<form class="kl-form" id="klForm" novalidate></form>'; formular($('klForm'), C.form, false); }
        else if (C.tab === 'mitteilungen') mitteilungen(t, k);
        else verwaltung(t, k);
    }

    // ── Profil-Formular (Anlegen und Bearbeiten) ──────────────────────
    const BERUFE = ['Fachinformatiker/in Anwendungsentwicklung', 'Fachinformatiker/in Systemintegration', 'Fachinformatiker/in Daten- und Prozessanalyse',
        'Fachinformatiker/in Digitale Vernetzung', 'Kaufmann/-frau für Büromanagement', 'Industriekaufmann/-frau', 'Kaufmann/-frau im Einzelhandel',
        'Elektroniker/in', 'Mechatroniker/in', 'Industriemechaniker/in', 'Kfz-Mechatroniker/in', 'Medizinische/r Fachangestellte/r'];
    function formular(f, m, neu) {
        const bl = Object.keys(K.BUNDESLAENDER).sort(function (a, b) { return K.BUNDESLAENDER[a].localeCompare(K.BUNDESLAENDER[b], 'de'); });
        const tagBtns = [1, 2, 3, 4, 5, 6].map(function (i) { return '<button type="button" data-tag="' + i + '" aria-pressed="' + (m.schultage.indexOf(i) >= 0) + '">' + K.TAGE[i][EN ? 1 : 0] + '</button>'; }).join('');
        f.innerHTML =
            '<fieldset class="kl-fs"><h3 class="kl-fs__h">' + L('Die Klasse', 'The class') + '</h3><p class="kl-fs__p">' + L('Das sehen Ihre Azubis beim Beitreten.', 'Your trainees see this when they join.') + '</p>' +
                '<div class="kl-grid">' +
                    fld('name', L('Name der Klasse', 'Class name'), m.name, 'FI 25a', 60, true) +
                    fld('schule', L('Schule oder Betrieb', 'School or company'), m.schule, L('BBS Musterstadt', 'Example Vocational School'), 80) +
                    '<label class="kl-field"><span class="kl-label">' + L('Ausbildungsberuf', 'Occupation') + '</span><input class="kl-in" data-f="beruf" maxlength="80" list="klBerufe" value="' + esc(m.beruf) + '" placeholder="' + L('z. B. Fachinformatik', 'e.g. IT specialist') + '"><datalist id="klBerufe">' + BERUFE.map(function (b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist></label>' +
                    fld('kontakt', L('Ansprechperson', 'Contact person'), m.kontakt, L('z. B. Frau Weber', 'e.g. Ms Weber'), 60) +
                    '<div class="kl-field"><span class="kl-label">' + L('Lehrjahr', 'Year of training') + '</span><div class="kl-seg" data-seg="lehrjahr">' + [1, 2, 3, 4].map(function (y) { return '<button type="button" data-v="' + y + '" aria-pressed="' + (m.lehrjahr === y) + '">' + y + '.</button>'; }).join('') + '</div></div>' +
                    '<label class="kl-field"><span class="kl-label">' + L('Bundesland (für Feiertage)', 'State (for public holidays)') + '</span><select class="kl-sel" data-f="bundesland"><option value="">' + L('nicht festlegen', 'not set') + '</option>' +
                        bl.map(function (c) { return '<option value="' + c + '"' + (m.bundesland === c ? ' selected' : '') + '>' + K.BUNDESLAENDER[c] + '</option>'; }).join('') + '</select></label>' +
                '</div></fieldset>' +
            '<fieldset class="kl-fs"><h3 class="kl-fs__h">' + L('Berufsschultage', 'School days') + '</h3><p class="kl-fs__p">' + L('Feste Wochentage, Rhythmus alle paar Wochen oder Blockunterricht, auch gemischt.', 'Fixed weekdays, a rhythm every few weeks or block teaching, also combined.') + '</p>' +
                '<div class="kl-field"><span class="kl-label">' + L('Jede Woche', 'Every week') + '</span><div class="kl-seg" data-seg="tage">' + tagBtns + '</div></div>' +
                '<div class="kl-field" style="margin-top:18px"><span class="kl-label">' + L('Rhythmus (z. B. alle 2 Wochen freitags)', 'Rhythm (e.g. Fridays every 2 weeks)') + '</span><div class="kl-rows" id="klRh"></div>' +
                    '<button class="kl-add" type="button" id="klRhAdd">' + svg('plus') + L('Rhythmus hinzufügen', 'Add rhythm') + '</button></div>' +
                '<div class="kl-field" style="margin-top:18px"><span class="kl-label">' + L('Blockunterricht', 'Block teaching') + '</span><span class="kl-hint">' + L('Jeder Werktag im Block gilt als Schultag. Höchstens 60 Tage je Block.', 'Every weekday in a block counts as a school day. At most 60 days per block.') + '</span><div class="kl-rows" id="klBl"></div>' +
                    '<button class="kl-add" type="button" id="klBlAdd">' + svg('plus') + L('Block hinzufügen', 'Add block') + '</button></div>' +
            '</fieldset>' +
            '<fieldset class="kl-fs"><h3 class="kl-fs__h">' + L('Fächer und Lernfelder', 'Subjects') + '</h3><p class="kl-fs__p">' + L('Werden bei den Azubis ergänzt, vorhandene Fächer und Noten bleiben. Eingabe mit Enter oder Komma.', 'Added on the trainees’ devices; existing subjects and grades stay. Press Enter or comma to add.') + '</p>' +
                '<div class="kl-tags" id="klTags"><input id="klTagIn" maxlength="60" placeholder="' + L('Fach eingeben …', 'Type a subject …') + '" aria-label="' + L('Fach hinzufügen', 'Add subject') + '"></div>' +
                '<div class="kl-quick"><button class="kl-btn kl-btn--sm" type="button" data-quick="lf">' + L('Lernfelder LF1–LF12', 'Learning fields LF1–LF12') + '</button>' +
                    '<button class="kl-btn kl-btn--sm" type="button" data-quick="ab">' + L('Allgemeinbildung', 'General subjects') + '</button></div>' +
            '</fieldset>' +
            '<fieldset class="kl-fs"><h3 class="kl-fs__h">' + L('Stundenplan', 'Timetable') + '</h3><p class="kl-fs__p">' +
                L('Welches Fach in welcher Stunde? Die Berichtsheft-KI Ihrer Azubis schreibt dann über das Fach, das wirklich war, statt eines zu raten. Zählt nur an Schultagen, Doppelstunden sind einfach zwei Zellen.',
                  'Which subject in which lesson? Your trainees’ report book AI then writes about the subject that actually took place instead of guessing. Only counts on school days; a double lesson is simply two cells.') + '</p>' +
                '<div class="kl-plan" id="klPlan"></div>' +
            '</fieldset>' +
            '<fieldset class="kl-fs"><h3 class="kl-fs__h">' + L('Prüfungstermine', 'Exam dates') + '</h3><p class="kl-fs__p">' + L('Erscheinen in der IHK-Ansicht der App mit Countdown.', 'Shown in the app’s IHK view with a countdown.') + '</p>' +
                '<div class="kl-grid">' + dfld('ap1', L('Abschlussprüfung Teil 1', 'Final exam part 1'), m.pruefungen.ap1) + dfld('ap2', L('Abschlussprüfung Teil 2', 'Final exam part 2'), m.pruefungen.ap2) + dfld('anmeldung', L('Anmeldeschluss', 'Registration deadline'), m.pruefungen.anmeldung) + '</div>' +
            '</fieldset>' +
            '<div class="kl-savebar' + (neu ? ' is-dirty' : '') + '"><span class="kl-savebar__t" id="klSaveT">' + (neu ? L('Noch nicht gespeichert', 'Not saved yet') : L('Alles gespeichert', 'All saved')) + '</span>' +
                '<button class="kl-btn kl-btn--primary" type="submit" id="klSave"><span>' + (neu ? L('Klasse anlegen', 'Create class') : L('Speichern', 'Save')) + '</span></button></div>';

        const dirty = function () { C.dirty = true; f.querySelector('.kl-savebar').classList.add('is-dirty'); const t = $('klSaveT'); t.className = 'kl-savebar__t is-dirty'; t.textContent = L('Ungespeicherte Änderungen', 'Unsaved changes'); };
        f.querySelectorAll('[data-f]').forEach(function (i) { i.addEventListener('input', function () { m[i.getAttribute('data-f')] = i.value; dirty(); }); });
        f.querySelectorAll('[data-p]').forEach(function (i) { i.addEventListener('input', function () { if (i.value) m.pruefungen[i.getAttribute('data-p')] = i.value; else delete m.pruefungen[i.getAttribute('data-p')]; dirty(); }); });
        f.querySelector('[data-seg="lehrjahr"]').addEventListener('click', function (e) {
            const b = e.target.closest('button'); if (!b) return;
            m.lehrjahr = +b.getAttribute('data-v');
            this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); dirty();
        });
        f.querySelector('[data-seg="tage"]').addEventListener('click', function (e) {
            const b = e.target.closest('button'); if (!b) return;
            const t = +b.getAttribute('data-tag'), i = m.schultage.indexOf(t);
            if (i >= 0) m.schultage.splice(i, 1); else m.schultage.push(t);
            b.setAttribute('aria-pressed', String(i < 0)); dirty();
        });
        // Rhythmus- und Blockzeilen
        const rh = $('klRh'), blk = $('klBl');
        const zeichneRh = function () {
            rh.innerHTML = m.rhythmus.map(function (r, i) {
                return '<div class="kl-row kl-row--rh" data-i="' + i + '"><select class="kl-sel" data-r="weekday">' + [1, 2, 3, 4, 5, 6].map(function (d) { return '<option value="' + d + '"' + (r.weekday === d ? ' selected' : '') + '>' + K.TAGE_LANG[d][EN ? 1 : 0] + '</option>'; }).join('') + '</select>' +
                    '<select class="kl-sel" data-r="interval">' + [2, 3, 4, 5, 6].map(function (n) { return '<option value="' + n + '"' + (r.interval === n ? ' selected' : '') + '>' + L('alle ' + n + ' W.', 'every ' + n + ' wks') + '</option>'; }).join('') + '</select>' +
                    '<input class="kl-in" type="date" data-r="startDate" value="' + esc(r.startDate || '') + '" aria-label="' + L('ab Datum', 'from date') + '">' +
                    '<button class="kl-x" type="button" data-rm="rh" aria-label="' + L('Entfernen', 'Remove') + '">' + svg('x') + '</button></div>';
            }).join('');
        };
        const zeichneBl = function () {
            blk.innerHTML = m.bloecke.map(function (b, i) {
                return '<div class="kl-row kl-row--bl" data-i="' + i + '"><input class="kl-in" type="date" data-b="von" value="' + esc(b.von || '') + '" aria-label="' + L('Beginn', 'Start') + '"><span class="kl-row__sep">–</span>' +
                    '<input class="kl-in" type="date" data-b="bis" value="' + esc(b.bis || '') + '" aria-label="' + L('Ende', 'End') + '">' +
                    '<button class="kl-x" type="button" data-rm="bl" aria-label="' + L('Entfernen', 'Remove') + '">' + svg('x') + '</button></div>';
            }).join('');
        };
        zeichneRh(); zeichneBl();
        rh.addEventListener('input', function (e) { const row = e.target.closest('[data-i]'); if (!row) return; const r = m.rhythmus[+row.getAttribute('data-i')], k = e.target.getAttribute('data-r'); r[k] = k === 'startDate' ? e.target.value : +e.target.value; dirty(); });
        blk.addEventListener('input', function (e) {
            const row = e.target.closest('[data-i]'); if (!row) return; const b = m.bloecke[+row.getAttribute('data-i')];
            b[e.target.getAttribute('data-b')] = e.target.value;
            // Ende vorbelegen: zwei Schulwochen nach dem Beginn
            if (e.target.getAttribute('data-b') === 'von' && b.von && !b.bis) { const d = new Date(b.von + 'T12:00:00'); d.setDate(d.getDate() + 11); b.bis = d.toISOString().slice(0, 10); zeichneBl(); }
            dirty();
        });
        f.addEventListener('click', function (e) {
            const x = e.target.closest('[data-rm]'); if (!x) return;
            const i = +x.closest('[data-i]').getAttribute('data-i');
            if (x.getAttribute('data-rm') === 'rh') { m.rhythmus.splice(i, 1); zeichneRh(); } else { m.bloecke.splice(i, 1); zeichneBl(); }
            dirty();
        });
        $('klRhAdd').onclick = function () { m.rhythmus.push({ weekday: 5, interval: 2, startDate: K.heuteIso() }); zeichneRh(); dirty(); };
        $('klBlAdd').onclick = function () { m.bloecke.push({ von: '', bis: '' }); zeichneBl(); dirty(); const ins = blk.querySelectorAll('input[data-b="von"]'); if (ins.length) ins[ins.length - 1].focus(); };

        // Faecher als Marken
        const tags = $('klTags'), tin = $('klTagIn');
        let zeichneTags = function () {
            tags.querySelectorAll('.kl-tag').forEach(function (t) { t.remove(); });
            m.faecher.forEach(function (fa, i) {
                const s = document.createElement('span'); s.className = 'kl-tag';
                s.innerHTML = esc(fa) + '<button type="button" data-ti="' + i + '" aria-label="' + esc(fa) + ' ' + L('entfernen', 'remove') + '">' + svg('x') + '</button>';
                tags.insertBefore(s, tin);
            });
        };
        const fachDazu = function (roh) {
            String(roh).split(/[,;\n]/).map(function (s) { return s.trim().slice(0, 60); }).filter(Boolean).forEach(function (t) {
                if (m.faecher.length < 30 && !m.faecher.some(function (x) { return x.toLowerCase() === t.toLowerCase(); })) m.faecher.push(t);
            });
            zeichneTags(); dirty();
        };
        zeichneTags();
        tags.addEventListener('click', function (e) {
            const b = e.target.closest('[data-ti]');
            if (b) { m.faecher.splice(+b.getAttribute('data-ti'), 1); zeichneTags(); dirty(); tin.focus(); return; }
            tin.focus();
        });
        tin.addEventListener('keydown', function (e) {
            if ((e.key === 'Enter' || e.key === ',') && tin.value.trim()) { e.preventDefault(); fachDazu(tin.value); tin.value = ''; }
            else if (e.key === 'Enter') e.preventDefault();
            else if (e.key === 'Backspace' && !tin.value && m.faecher.length) { m.faecher.pop(); zeichneTags(); dirty(); }
        });
        tin.addEventListener('paste', function (e) { const t = (e.clipboardData || window.clipboardData).getData('text'); if (/[,;\n]/.test(t)) { e.preventDefault(); fachDazu(t); } });
        tin.addEventListener('blur', function () { if (tin.value.trim()) { fachDazu(tin.value); tin.value = ''; } });
        f.querySelectorAll('[data-quick]').forEach(function (b) {
            b.onclick = function () {
                fachDazu(b.getAttribute('data-quick') === 'lf'
                    ? 'LF1,LF2,LF3,LF4,LF5,LF6,LF7,LF8,LF9,LF10,LF11,LF12'
                    : L('Deutsch,Englisch,Politik,Wirtschafts- und Sozialkunde,Sport,Religion/Ethik', 'German,English,Politics,Economics and social studies,PE,Religion/Ethics'));
            };
        });

        // Stundenplan (seit v8.5.9): Zeiten + vier Ansichten auf EINEN Plan.
        //   normal = Wochentags-Schluessel oben, b = Woche B im Wechsel, block = Blockwochen,
        //   tage = einzelne Daten. Raster je Ansicht: Zeile = Stunde, Zelle = Fach.
        // m.stundenplan bleibt waehrend der Bearbeitung ROH (eine frisch angelegte, noch leere
        // Woche B muss stehen bleiben) — normalisiert wird erst beim Speichern (planVoll).
        if (!m.stundenplan || typeof m.stundenplan !== 'object') m.stundenplan = {};
        const sp = m.stundenplan;
        const plan = $('klPlan');
        let ansicht = 'normal', tagSel = null;
        const TAGE5 = [1, 2, 3, 4, 5];
        const woche = function () {   // Wochentags-Abbild der aktuellen Ansicht (nur lesen)
            if (ansicht === 'b') return sp.b || {};
            if (ansicht === 'block') return sp.block || {};
            if (ansicht === 'tage') return { 1: (sp.tage || {})[tagSel] || [] };
            return sp;
        };
        const wocheSetzen = function (w) {
            if (ansicht === 'b') { sp.b = Object.assign({ wechsel: (sp.b && sp.b.wechsel) || '' }, w); return; }
            if (ansicht === 'block') { sp.block = w; return; }
            if (ansicht === 'tage') { sp.tage = sp.tage || {}; sp.tage[tagSel] = w[1] || []; return; }
            TAGE5.forEach(function (t) { delete sp[t]; }); Object.assign(sp, w);
        };
        const spalten = function () { return ansicht === 'tage' ? [1] : TAGE5; };
        const zelle = function () {   // z[t][h] = Fach
            const w = K.planNorm(woche()), z = {};
            spalten().forEach(function (t) { z[t] = {}; (w[t] || []).forEach(function (e) { for (let h = e.s; h <= e.b; h++) z[t][h] = e.f; }); });
            return z;
        };
        const ausRaster = function (z) {
            const out = {};
            spalten().forEach(function (t) {
                const liste = []; let lauf = null;
                for (let h = 1; h <= 12; h++) {
                    const fa = z[t][h] || '';
                    if (lauf && fa === lauf.f) { lauf.b = h; continue; }
                    if (lauf) liste.push(lauf);
                    lauf = fa ? { s: h, b: h, f: fa } : null;
                }
                if (lauf) liste.push(lauf);
                if (liste.length) out[t] = liste;
            });
            return out;
        };
        const hoechste = function () {
            let mx = 0;
            const sieh = function (w) { Object.keys(K.planNorm(w)).forEach(function (t) { K.planNorm(w)[t].forEach(function (e) { mx = Math.max(mx, e.b); }); }); };
            sieh(sp); sieh(sp.b); sieh(sp.block); Object.keys(sp.tage || {}).forEach(function (d) { sieh({ 1: sp.tage[d] }); });
            return mx;
        };
        let reihen = Math.max(8, hoechste());
        const naechsterMontag = function () { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
        // Welche Wochentage sind in dieser Ansicht Schultage? (nur fuer die Hervorhebung)
        const schulSpalte = function (t) {
            if (ansicht === 'block' || ansicht === 'tage') return true;
            return m.schultage.indexOf(t) >= 0 || m.rhythmus.some(function (r) { return +r.weekday === t; });
        };
        const ANSICHTEN = [['normal', L('Normale Woche', 'Regular week')], ['b', L('Woche B', 'Week B')], ['block', L('Blockwoche', 'Block week')], ['tage', L('Sondertage', 'Special days')]];
        const zeitZeile = function () {
            const r = sp.raster || {};
            const pausen = (r.pausen || []).map(function (p, i) {
                return '<span class="kl-pz" data-pi="' + i + '"><select class="kl-sel kl-sel--sm" data-pz="nach" aria-label="' + L('Pause nach Stunde', 'Break after lesson') + '">' +
                    Array.from({ length: 11 }, function (_, n) { return '<option value="' + (n + 1) + '"' + (+p.nach === n + 1 ? ' selected' : '') + '>' + L('nach ' + (n + 1) + '.', 'after ' + (n + 1)) + '</option>'; }).join('') + '</select>' +
                    '<input class="kl-in kl-in--min" type="number" min="5" max="90" step="5" data-pz="min" value="' + (+p.min || 15) + '" aria-label="' + L('Minuten', 'minutes') + '"><span class="kl-pz__e">min</span>' +
                    '<button class="kl-x kl-x--sm" type="button" data-pzx="' + i + '" aria-label="' + L('Pause entfernen', 'Remove break') + '">' + svg('x') + '</button></span>';
            }).join('');
            return '<div class="kl-zeit">' +
                '<label class="kl-zeit__f"><span class="kl-label">' + L('1. Stunde beginnt', 'First lesson starts') + '</span><input class="kl-in" type="time" id="klZStart" value="' + esc(r.start || '') + '"></label>' +
                '<label class="kl-zeit__f"><span class="kl-label">' + L('Stundenlänge', 'Lesson length') + '</span><span class="kl-zeit__min"><input class="kl-in kl-in--min" type="number" min="30" max="90" step="5" id="klZDauer" value="' + (r.dauer || 45) + '"' + (r.start ? '' : ' disabled') + '><span class="kl-pz__e">min</span></span></label>' +
                '<div class="kl-zeit__f kl-zeit__p"><span class="kl-label">' + L('Pausen', 'Breaks') + '</span><div class="kl-zeit__pl">' + pausen +
                    '<button class="kl-add kl-add--inline" type="button" id="klPauseAdd"' + (r.start ? '' : ' disabled') + '>' + svg('plus') + L('Pause', 'Break') + '</button></div></div>' +
                '</div>';
        };
        const kopf = function () {
            let h = '<div class="kl-seg kl-plan__ans" role="tablist">' + ANSICHTEN.map(function (a) {
                const voll = a[0] === 'normal' ? !K.planLeer({ 1: sp[1], 2: sp[2], 3: sp[3], 4: sp[4], 5: sp[5] })
                    : a[0] === 'tage' ? Object.keys(sp.tage || {}).some(function (d) { return (sp.tage[d] || []).length; })
                    : Object.keys(K.planNorm(sp[a[0]])).length > 0;
                return '<button type="button" role="tab" data-ans="' + a[0] + '" aria-pressed="' + (ansicht === a[0]) + '">' + a[1] + (voll && a[0] !== 'normal' ? '<i class="kl-plan__dot" aria-hidden="true"></i>' : '') + '</button>';
            }).join('') + '</div>';
            if (ansicht === 'normal') h += '<p class="kl-hint">' + L('Gilt an jedem Schultag dieses Wochentags. Hervorgehoben sind die Tage, die oben als Schultage eingetragen sind, auch die im Rhythmus.', 'Applies on every school day of that weekday. Highlighted are the days set as school days above, including rhythm days.') + '</p>';
            if (ansicht === 'b') {
                h += sp.b
                    ? '<div class="kl-plan__info"><label class="kl-zeit__f"><span class="kl-label">' + L('Eine B-Woche beginnt am', 'A B week starts on') + '</span><input class="kl-in" type="date" id="klBWechsel" value="' + esc(sp.b.wechsel || '') + '"></label>' +
                        '<p class="kl-hint">' + L('Ab dort wechseln sich A (normale Woche) und B jede Woche ab. In B-Wochen gilt nur dieser Plan, z. B. Mittwoch und Donnerstag statt nur Mittwoch.', 'From then on A (regular week) and B alternate weekly. In B weeks only this plan applies, e.g. Wednesday and Thursday instead of only Wednesday.') + '</p>' +
                        '<button class="kl-btn kl-btn--sm" type="button" id="klBWeg">' + L('Woche B entfernen', 'Remove week B') + '</button></div>'
                    : '<div class="kl-plan__leer"><p class="kl-hint">' + L('Für Klassen, deren Wochen sich abwechseln: eine Woche nur Mittwoch, die nächste Mittwoch und Donnerstag. Die normale Woche ist dann Woche A.', 'For classes whose weeks alternate: one week only Wednesday, the next Wednesday and Thursday. The regular week is then week A.') + '</p>' +
                        '<div class="kl-quick"><button class="kl-btn kl-btn--sm" type="button" data-neu="kopie">' + L('Woche B aus der normalen Woche anlegen', 'Create week B from the regular week') + '</button><button class="kl-btn kl-btn--sm" type="button" data-neu="leer">' + L('Leer anlegen', 'Create empty') + '</button></div></div>';
            }
            if (ansicht === 'block') {
                h += '<p class="kl-hint">' + (m.bloecke.length
                    ? L('Gilt an den Tagen in Ihren Blöcken. Ein leerer Wochentag nimmt die normale Woche.', 'Applies on the days of your blocks. An empty weekday falls back to the regular week.')
                    : L('Gilt in Blockwochen. Legen Sie oben unter „Blockunterricht“ die Zeiträume an.', 'Applies in block weeks. Add the periods above under “Block teaching”.')) + '</p>' +
                    (Object.keys(K.planNorm(sp.block)).length ? '' : '<div class="kl-quick"><button class="kl-btn kl-btn--sm" type="button" data-neu="kopie">' + L('Normale Woche übernehmen', 'Copy the regular week') + '</button></div>');
            }
            if (ansicht === 'tage') {
                const tage = Object.keys(sp.tage || {}).sort();
                h += '<p class="kl-hint">' + L('Für einzelne Tage mit anderem Ablauf, z. B. Projekttag oder Prüfungsvorbereitung. Geht vor allen anderen Plänen.', 'For single days with a different schedule, e.g. a project day or exam preparation. Takes precedence over all other plans.') + '</p>' +
                    '<div class="kl-plan__tage">' + tage.map(function (d) {
                        return '<span class="kl-tag' + (d === tagSel ? ' is-an' : '') + '"><button type="button" class="kl-tag__w" data-tag-d="' + d + '">' + K.datum(d, true) + '</button><button type="button" data-tag-x="' + d + '" aria-label="' + L('Tag entfernen', 'Remove day') + '">' + svg('x') + '</button></span>';
                    }).join('') +
                    '<label class="kl-plan__neu"><span class="kl-sr">' + L('Tag hinzufügen', 'Add day') + '</span><input class="kl-in" type="date" id="klTagNeu" min="' + K.heuteIso() + '"></label></div>';
            }
            return h;
        };
        const rasterHtml = function () {
            const z = zelle(), zeiten = K.stundenZeiten(sp.raster), pausen = ((K.rasterNorm(sp.raster) || {}).pausen || []);
            const cols = spalten();
            const opt = function (wert) {
                return '<option value=""></option>' + m.faecher.map(function (fa) { return '<option value="' + esc(fa) + '"' + (fa === wert ? ' selected' : '') + '>' + esc(fa) + '</option>'; }).join('') +
                    (wert && m.faecher.indexOf(wert) < 0 ? '<option value="' + esc(wert) + '" selected>' + esc(wert) + '</option>' : '');
            };
            let html = '<div class="kl-plan__grid' + (cols.length === 1 ? ' kl-plan__grid--1' : '') + (zeiten ? ' mit-zeit' : '') + '" role="table" aria-label="' + L('Stundenplan', 'Timetable') + '"><span></span>' +
                cols.map(function (t) {
                    const titel = ansicht === 'tage' ? K.datum(tagSel, true) : K.TAGE[t][EN ? 1 : 0];
                    return '<span class="kl-plan__kopf' + (schulSpalte(t) ? ' is-schule' : '') + '">' + titel + '</span>';
                }).join('');
            for (let h = 1; h <= reihen; h++) {
                html += '<span class="kl-plan__h">' + h + '.' + (zeiten ? '<small>' + zeiten[h].von + '–' + zeiten[h].bis + '</small>' : '') + '</span>';
                cols.forEach(function (t) {
                    const lab = (ansicht === 'tage' ? K.datum(tagSel, true) : K.TAGE_LANG[t][EN ? 1 : 0]) + ', ' + h + '. ' + L('Stunde', 'lesson');
                    html += '<select class="kl-plan__z' + (z[t][h] ? ' is-voll' : '') + '" data-t="' + t + '" data-h="' + h + '" aria-label="' + esc(lab) + '">' + opt(z[t][h] || '') + '</select>';
                });
                const pa = h < reihen && pausen.filter(function (p) { return p.nach === h; })[0];
                if (pa) html += '<span class="kl-plan__pause">' + L('Pause', 'Break') + ' · ' + pa.min + ' min</span>';
            }
            return html + '</div>' + (reihen < 12 ? '<button class="kl-add" type="button" id="klPlanMehr">' + svg('plus') + L('Weitere Stunde', 'Another lesson') + '</button>' : '');
        };
        const zeichnePlan = function () {
            if (!m.faecher.length) {
                plan.innerHTML = '<p class="kl-hint">' + L('Tragen Sie oben zuerst die Fächer ein, dann können Sie sie hier den Stunden zuordnen.', 'Add subjects above first, then you can assign them to lessons here.') + '</p>';
                return;
            }
            if (ansicht === 'tage' && tagSel && !(sp.tage && tagSel in sp.tage)) tagSel = null;
            if (ansicht === 'tage' && !tagSel) tagSel = Object.keys(sp.tage || {}).sort()[0] || null;
            const zeigeRaster = ansicht === 'normal' || ansicht === 'block' || (ansicht === 'b' && sp.b) || (ansicht === 'tage' && tagSel);
            plan.innerHTML = zeitZeile() + kopf() + (zeigeRaster ? '<div class="kl-plan__scroll">' + rasterHtml() + '</div>' : '');
        };
        const zeitSetzen = function () {
            const st = $('klZStart').value;
            if (!st) { delete sp.raster; return; }
            const alt = sp.raster || {};
            sp.raster = { start: st, dauer: Math.min(90, Math.max(30, +$('klZDauer').value || 45)), pausen: alt.pausen || [] };
        };
        plan.addEventListener('change', function (e) {
            const sel = e.target.closest('select[data-t]');
            if (sel) {
                const z = zelle(); z[+sel.getAttribute('data-t')][+sel.getAttribute('data-h')] = sel.value;
                wocheSetzen(ausRaster(z));
                sel.classList.toggle('is-voll', !!sel.value);
                dirty(); return;
            }
            if (e.target.id === 'klZStart' || e.target.id === 'klZDauer') { zeitSetzen(); zeichnePlan(); dirty(); return; }
            const pz = e.target.closest('[data-pi]');
            if (pz && sp.raster) {
                const p = sp.raster.pausen[+pz.getAttribute('data-pi')];
                if (e.target.getAttribute('data-pz') === 'nach') p.nach = +e.target.value;
                else p.min = Math.min(90, Math.max(5, +e.target.value || 15));
                zeichnePlan(); dirty(); return;
            }
            if (e.target.id === 'klBWechsel' && sp.b) { sp.b.wechsel = e.target.value; dirty(); return; }
            if (e.target.id === 'klTagNeu' && e.target.value) {
                sp.tage = sp.tage || {};
                if (!(e.target.value in sp.tage)) sp.tage[e.target.value] = [];
                tagSel = e.target.value; zeichnePlan(); dirty();
            }
        });
        plan.addEventListener('click', function (e) {
            const b = e.target.closest('button'); if (!b) return;
            if (b.hasAttribute('data-ans')) { ansicht = b.getAttribute('data-ans'); zeichnePlan(); return; }
            if (b.id === 'klPlanMehr') { reihen = Math.min(12, reihen + 1); zeichnePlan(); return; }
            if (b.id === 'klPauseAdd' && sp.raster) {
                const belegt = sp.raster.pausen.map(function (p) { return +p.nach; });
                let n = 2; while (belegt.indexOf(n) >= 0 && n < 11) n++;
                if (belegt.indexOf(n) < 0) sp.raster.pausen.push({ nach: n, min: 15 });
                zeichnePlan(); dirty(); return;
            }
            if (b.hasAttribute('data-pzx') && sp.raster) { sp.raster.pausen.splice(+b.getAttribute('data-pzx'), 1); zeichnePlan(); dirty(); return; }
            if (b.hasAttribute('data-neu')) {
                const kopie = b.getAttribute('data-neu') === 'kopie' ? JSON.parse(JSON.stringify(K.planNorm(sp))) : {};
                if (ansicht === 'b') sp.b = Object.assign({ wechsel: naechsterMontag() }, kopie);
                else if (ansicht === 'block') sp.block = kopie;
                zeichnePlan(); dirty(); return;
            }
            if (b.id === 'klBWeg') { delete sp.b; zeichnePlan(); dirty(); return; }
            if (b.hasAttribute('data-tag-d')) { tagSel = b.getAttribute('data-tag-d'); zeichnePlan(); return; }
            if (b.hasAttribute('data-tag-x')) { delete sp.tage[b.getAttribute('data-tag-x')]; zeichnePlan(); dirty(); }
        });
        zeichnePlan();
        // Faecherliste, Schultage, Rhythmus und Bloecke aendern Auswahl bzw. Hervorhebung im Raster
        const zeichneTagsAlt = zeichneTags;
        zeichneTags = function () { zeichneTagsAlt(); zeichnePlan(); };
        f.querySelector('[data-seg="tage"]').addEventListener('click', function () { setTimeout(zeichnePlan, 0); });
        rh.addEventListener('input', function () { setTimeout(zeichnePlan, 0); });
        f.addEventListener('click', function (e) { if (e.target.closest('#klRhAdd, #klBlAdd, [data-rm]')) setTimeout(zeichnePlan, 0); });

        f.onsubmit = async function (e) {
            e.preventDefault();
            const t = $('klSaveT'), btn = $('klSave');
            if (!String(m.name).trim()) { t.className = 'kl-savebar__t is-err'; t.textContent = fehlerText({ code: 'name_ungueltig' }); f.querySelector('[data-f="name"]').focus(); return; }
            const p = Object.assign({}, m, {
                stundenplan: K.planVoll(m.stundenplan),
                rhythmus: m.rhythmus.filter(function (r) { return r.startDate; }),
                bloecke: m.bloecke.filter(function (b) { return b.von && b.bis; })
            });
            btn.disabled = true;
            try {
                if (neu) {
                    const k = await call('klasse_anlegen', { p: p });
                    k.beitritte = 0; C.klassen.unshift(k); C.sel = k.id; C.form = null; C.dirty = false; C.tab = 'profil';
                    ev('klasse_angelegt', { faecher: p.faecher.length, bloecke: p.bloecke.length, rhythmus: p.rhythmus.length });
                    zeichneCockpit(); toast(L('Klasse angelegt', 'Class created'));
                } else {
                    const alt = aktuelleKlasse(), vorher = alt.version || 0;
                    const k = await call('klasse_speichern', { p_id: alt.id, p: p });
                    k.beitritte = alt.beitritte; Object.assign(alt, k);
                    C.form = profilAus(alt); C.dirty = false;
                    const hoch = (k.version || 0) > vorher;
                    zeichneCockpit();
                    const t2 = $('klSaveT');
                    if (t2) { t2.className = 'kl-savebar__t'; t2.textContent = hoch ? L('Gespeichert. Ihre Azubis werden beim nächsten Öffnen gefragt.', 'Saved. Your trainees will be asked next time they open the app.') : L('Gespeichert, für die Azubis hat sich nichts geändert.', 'Saved, nothing changed for your trainees.'); }
                    ev('klasse_gespeichert', { version: k.version || 0, geaendert: !!hoch });
                }
            } catch (x) {
                btn.disabled = false; t.className = 'kl-savebar__t is-err'; t.textContent = fehlerText(x);
            }
        };
    }
    function fld(k, label, v, ph, max, pflicht) {
        return '<label class="kl-field"><span class="kl-label">' + label + (pflicht ? ' *' : '') + '</span><input class="kl-in" data-f="' + k + '" maxlength="' + max + '" value="' + esc(v) + '" placeholder="' + esc(ph) + '"' + (pflicht ? ' required' : '') + '></label>';
    }
    function dfld(k, label, v) { return '<label class="kl-field"><span class="kl-label">' + label + '</span><input class="kl-in" type="date" data-p="' + k + '" value="' + esc(v || '') + '"></label>'; }

    // ── Mitteilungen ──────────────────────────────────────────────────
    async function mitteilungen(t, k) {
        t.innerHTML = '<form class="kl-compose" id="klCompose">' +
            '<label class="kl-sr" for="klMsg">' + L('Mitteilung', 'Message') + '</label>' +
            '<textarea class="kl-ta" id="klMsg" maxlength="500" placeholder="' + L('z. B. Berichtsheft bitte bis Freitag mitbringen.', 'e.g. Please bring your report book by Friday.') + '"></textarea>' +
            '<div class="kl-compose__row"><label class="kl-field" style="grid-auto-flow:column;align-items:center;gap:10px"><span class="kl-label">' + L('Sichtbar bis (optional)', 'Visible until (optional)') + '</span><input class="kl-in" type="date" id="klBis" min="' + K.heuteIso() + '" style="width:auto"></label>' +
                '<span class="kl-compose__count" id="klMsgN">0 / 500</span>' +
                '<button class="kl-btn kl-btn--primary" type="submit" id="klSend"><span>' + L('Senden', 'Send') + '</span></button></div>' +
            '<p class="kl-hint" id="klPushHint">' + L('Kommt als Benachrichtigung aufs Handy, wenn der Azubi das eingeschaltet hat, sonst beim nächsten Öffnen der App.', 'Arrives as a phone notification if the trainee turned that on, otherwise next time they open the app.') + '</p>' +
            '<p class="kl-codebar__err" id="klSendErr" role="alert" hidden></p></form><ul class="kl-sent" id="klSent"><li><p class="kl-hint">' + L('Wird geladen …', 'Loading …') + '</p></li></ul>';
        const ta = $('klMsg');
        ta.addEventListener('input', function () { $('klMsgN').textContent = ta.value.length + ' / 500'; });
        const liste = async function () {
            try {
                const c = await sb();
                const r = await c.from('klassen_mitteilungen').select('id,text,bis,erstellt_at').eq('klasse_id', k.id).order('erstellt_at', { ascending: false });
                const rows = r.data || [];
                k.mitteilungen = rows.filter(function (m) { return !m.bis || m.bis >= K.heuteIso(); });
                $('klSent').innerHTML = rows.length ? rows.map(function (m) {
                    const abgelaufen = m.bis && m.bis < K.heuteIso();
                    return '<li><div><p>' + esc(m.text) + '</p><small>' + esc(new Date(m.erstellt_at).toLocaleString(EN ? 'en-GB' : 'de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) +
                        (m.bis ? (abgelaufen ? L(', abgelaufen', ', expired') : L(', sichtbar bis ', ', visible until ') + esc(K.datum(m.bis, true))) : '') + '</small></div>' +
                        '<button class="kl-x" type="button" data-mdel="' + m.id + '" aria-label="' + L('Löschen', 'Delete') + '">' + svg('x') + '</button></li>';
                }).join('') : '<li><p class="kl-hint">' + L('Noch keine Mitteilung geschickt.', 'No message sent yet.') + '</p></li>';
                $('klSent').querySelectorAll('[data-mdel]').forEach(function (b) {
                    b.onclick = async function () {
                        if (b.dataset.sicher !== '1') { b.dataset.sicher = '1'; b.title = L('Noch einmal klicken zum Löschen', 'Click again to delete'); b.style.color = 'var(--danger)'; return; }
                        try { await call('klasse_mitteilung_loeschen', { p_mid: b.getAttribute('data-mdel') }); liste(); } catch (e) { toast(fehlerText(e)); }
                    };
                });
            } catch (e) { $('klSent').innerHTML = '<li><p class="kl-hint">' + fehlerText(e) + '</p></li>'; }
        };
        liste();
        // Wie viele Geraete Mitteilungen als Benachrichtigung bekommen (nur die Zahl, wie beim Beitritt)
        call('klasse_push_zahl', { p_id: k.id }).then(function (n) {
            const h = $('klPushHint'); if (!h) return;
            h.textContent = n > 0
                ? L(n + (n === 1 ? ' Gerät bekommt' : ' Geräte bekommen') + ' Mitteilungen sofort als Benachrichtigung, alle anderen beim nächsten Öffnen der App.', n + (n === 1 ? ' device gets' : ' devices get') + ' messages right away as a notification, everyone else next time they open the app.')
                : L('Noch hat niemand Benachrichtigungen eingeschaltet: Mitteilungen erscheinen beim nächsten Öffnen der App. Azubis schalten sie beim Beitritt ein.', 'Nobody has turned on notifications yet: messages appear next time the app opens. Trainees turn them on when joining.');
        }).catch(function () { /* Hinweis bleibt allgemein */ });
        $('klCompose').onsubmit = async function (e) {
            e.preventDefault();
            const err = $('klSendErr'), btn = $('klSend');
            if (!ta.value.trim()) { ta.focus(); return; }
            btn.disabled = true; err.hidden = true;
            const mitAblauf = !!$('klBis').value;
            try {
                const neu = await call('klasse_mitteilung', { p_id: k.id, p_text: ta.value, p_bis: $('klBis').value || null });
                // Sofort aufs Handy (Edge Function klassen-push). Scheitert das, ist die Mitteilung
                // trotzdem gespeichert und kommt beim naechsten Oeffnen der App an.
                let gepusht = null;
                try { const c = await sb(); const r = await c.functions.invoke('klassen-push', { body: { mitteilung_id: neu && neu.id } }); if (!r.error) gepusht = r.data; } catch (x) { gepusht = null; }
                ta.value = ''; $('klBis').value = ''; $('klMsgN').textContent = '0 / 500';
                ev('klasse_mitteilung', { mit_ablauf: mitAblauf });
                toast(gepusht && gepusht.gesendet > 0
                    ? L('Gesendet, ' + gepusht.gesendet + (gepusht.gesendet === 1 ? ' Benachrichtigung' : ' Benachrichtigungen') + ' raus', 'Sent, ' + gepusht.gesendet + (gepusht.gesendet === 1 ? ' notification' : ' notifications') + ' delivered')
                    : L('Mitteilung gesendet', 'Message sent'));
                await liste();
                const tab = document.querySelector('[data-tab="mitteilungen"]'); if (tab) tab.innerHTML = L('Mitteilungen', 'Messages') + (k.mitteilungen.length ? '<small>' + k.mitteilungen.length + '</small>' : '');
            } catch (x) { err.textContent = fehlerText(x); err.hidden = false; }
            btn.disabled = false;
        };
    }

    // ── Verwaltung ────────────────────────────────────────────────────
    function verwaltung(t, k) {
        t.innerHTML = '<div class="kl-danger">' +
            zeile('code', L('Neuen Code erzeugen', 'Create a new code'), L('Der alte Link und der alte QR-Code funktionieren danach nicht mehr. Wer schon beigetreten ist, bleibt verbunden.', 'The old link and QR code stop working. Anyone who already joined stays connected.'), L('Neuer Code', 'New code'), '') +
            zeile('zu', k.geschlossen ? L('Klasse wieder öffnen', 'Reopen class') : L('Klasse schließen', 'Close class'),
                k.geschlossen ? L('Neue Beitritte sind wieder möglich.', 'New members can join again.') : L('Keine neuen Beitritte mehr, zum Beispiel am Ende des Schuljahres. Mitteilungen und Änderungen erreichen die Klasse weiter.', 'No new members, for example at the end of the school year. Messages and changes still reach the class.'),
                k.geschlossen ? L('Öffnen', 'Reopen') : L('Schließen', 'Close'), '') +
            zeile('weg', L('Klasse löschen', 'Delete class'), L('Löscht Profil, Mitteilungen und Zählung. Auf den Geräten der Azubis bleibt alles eingerichtet, es kommen nur keine Updates mehr.', 'Deletes profile, messages and count. Everything stays set up on the trainees’ devices, they just stop receiving updates.'), L('Löschen', 'Delete'), 'kl-btn--danger') +
        '</div>';
        t.querySelectorAll('[data-akt]').forEach(function (b) {
            b.onclick = async function () {
                const a = b.getAttribute('data-akt');
                if (b.dataset.sicher !== '1') { b.dataset.sicher = '1'; b.querySelector('span').textContent = L('Wirklich?', 'Sure?'); setTimeout(function () { if (b.isConnected) { b.dataset.sicher = ''; zeichneTab(k); } }, 4000); return; }
                b.disabled = true;
                try {
                    if (a === 'code') { const r = await call('klasse_code_erneuern', { p_id: k.id }); k.code = r.code; toast(L('Neuer Code: ', 'New code: ') + K.codeFmt(r.code)); C.tab = 'profil'; zeichneDetail(); }
                    else if (a === 'zu') { const r = await call('klasse_schliessen', { p_id: k.id, p_zu: !k.geschlossen }); k.geschlossen = r.geschlossen; zeichneCockpit(); C.tab = 'verwaltung'; zeichneDetail(); }
                    else if (a === 'weg') {
                        await call('klasse_loeschen', { p_id: k.id });
                        C.klassen = C.klassen.filter(function (x) { return x.id !== k.id; }); C.sel = null; C.form = null; C.tab = 'profil';
                        toast(L('Klasse gelöscht', 'Class deleted'));
                        cockpit(false);
                    }
                } catch (e) { b.disabled = false; toast(fehlerText(e)); }
            };
        });
    }
    function zeile(a, h, p, knopf, cls) {
        return '<div class="kl-danger__row"><div><h3>' + h + '</h3><p>' + p + '</p></div><button class="kl-btn kl-btn--sm ' + cls + '" type="button" data-akt="' + a + '"><span>' + knopf + '</span></button></div>';
    }

    // ── QR als Bild, Aushang ──────────────────────────────────────────
    function qrPng(k) {
        const host = document.createElement('div'); host.style.position = 'fixed'; host.style.left = '-9999px'; document.body.appendChild(host);
        qrInto(host, joinUrl(k.code), 1024);
        setTimeout(function () {
            const c = host.querySelector('canvas');
            if (c) {
                const a = document.createElement('a'); a.href = c.toDataURL('image/png');
                a.download = 'klasse-' + k.code.toLowerCase() + '-qr.png'; document.body.appendChild(a); a.click(); a.remove();
                ev('klasse_teilen', { art: 'qr_png' });
            }
            host.remove();
        }, 60);
    }
    function drucken(k) {
        const pr = $('klPrint');
        pr.innerHTML = '<h1>' + esc(k.name) + '</h1>' +
            '<p class="pp-sub">' + esc([k.schule, k.kontakt].filter(Boolean).join(', ')) + '</p>' +
            '<div class="pp-qr" id="klPrintQr"></div>' +
            '<p class="pp-code">' + esc(K.codeFmt(k.code)) + '</p>' +
            '<p class="pp-how">' + L('QR-Code mit der Handykamera scannen oder auf ', 'Scan the QR code with your phone camera or enter the code on ') + '<b>myworklog.de/klasse</b>' + L(' den Code eingeben.', '.') + '</p>' +
            '<ol class="pp-steps"><li>' + L('Du siehst, was MyWorkLog auf deinem Handy einrichtet, und kannst Punkte abwählen.', 'You see what MyWorkLog sets up on your phone and can deselect items.') + '</li>' +
                '<li>' + L('Kein Konto nötig. Deine Lehrkraft sieht nur, wie viele beigetreten sind, keine Namen.', 'No account needed. Your teacher only sees how many joined, no names.') + '</li>' +
                '<li>' + L('Danach: Zeiten erfassen, Berichtsheft schreiben, Noten eintragen.', 'Then: track hours, write your report book, enter grades.') + '</li></ol>' +
            '<p class="pp-foot">MyWorkLog, ' + L('kostenlos und werbefrei', 'free and ad-free') + '</p>';
        qrInto($('klPrintQr'), joinUrl(k.code), 1024);
        ev('klasse_teilen', { art: 'aushang' });
        setTimeout(function () { window.print(); }, 120);
    }

    // ══ BEAMER ════════════════════════════════════════════════════════
    const B = { k: null, poll: 0, n: -1, lock: null, fehler: 0 };
    async function beamer(k) {
        B.k = k; B.n = -1; B.fehler = 0;
        const el = $('klBeamer');
        el.innerHTML =
            '<div class="kl-beamer__top"><p class="kl-beamer__class">' + esc(k.name) + (k.schule ? ' <span>' + esc(k.schule) + '</span>' : '') + '</p>' +
                '<div class="kl-beamer__btns"><button class="kl-beamer__btn" type="button" id="klBmFull">' + svg('maximize') + '<span>' + L('Vollbild', 'Full screen') + '</span></button>' +
                '<button class="kl-beamer__btn" type="button" id="klBmZu">' + svg('x') + '<span>' + L('Schließen', 'Close') + '</span></button></div></div>' +
            '<div class="kl-beamer__main">' +
                '<div><div class="kl-beamer__qr" id="klBmQr"></div>' +
                    '<p class="kl-beamer__how">' + L('Kamera aufs Bild, oder <b>myworklog.de/klasse</b> öffnen und eingeben:', 'Point your camera here, or open <b>myworklog.de/klasse</b> and enter:') + '</p>' +
                    '<p class="kl-beamer__code" translate="no">' + esc(K.codeFmt(k.code)) + '</p></div>' +
                '<div><p class="kl-beamer__l">' + L('Beigetreten', 'Joined') + '</p><p class="kl-beamer__n" id="klBmN" aria-live="polite"><span>0</span></p><div class="kl-seats" id="klBmSeats" aria-hidden="true"></div></div>' +
            '</div>' +
            '<div class="kl-beamer__foot"><span class="kl-beamer__live" id="klBmLive"><i></i><span>' + L('Live', 'Live') + '</span></span><span>' + L('Keine Namen, nur die Zahl.', 'No names, just the number.') + '</span></div>';
        el.hidden = false; document.body.style.overflow = 'hidden';
        qrInto($('klBmQr'), joinUrl(k.code), 640);
        $('klBmZu').onclick = beamerZu;
        $('klBmFull').onclick = function () { const d = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen().catch(function () {}); };
        try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch (e) { /* ohne Vollbild */ }
        try { if (navigator.wakeLock) B.lock = await navigator.wakeLock.request('screen'); } catch (e) { B.lock = null; }
        ev('klasse_beamer', { beitritte: k.beitritte || 0 });
        beamerZahl();
        clearInterval(B.poll); B.poll = setInterval(beamerZahl, 2500);
    }
    async function beamerZahl() {
        if (!B.k) return;
        try {
            const s = await call('klasse_stand', { p_id: B.k.id });
            B.fehler = 0; $('klBmLive').classList.remove('is-off'); $('klBmLive').lastChild.textContent = L('Live', 'Live');
            setzeZahl(s.gesamt);
        } catch (e) {
            if (++B.fehler >= 2) { $('klBmLive').classList.add('is-off'); $('klBmLive').lastChild.textContent = L('Verbindung unterbrochen', 'Connection lost'); }
        }
    }
    // Die Zahl rollt: alte Ziffer faehrt nach oben raus, neue kommt von unten.
    function setzeZahl(n) {
        const box = $('klBmN'); if (!box) return;
        if (n === B.n) return;
        const erst = B.n < 0; B.n = n;
        sitzePlatz($('klBmSeats'), n, 10);
        if (erst || RM.matches) { box.innerHTML = '<span>' + n + '</span>'; return; }
        const alt = box.querySelector('span:not(.is-out)');
        const neu = document.createElement('span'); neu.textContent = n; neu.className = 'is-in';
        if (alt) alt.classList.add('is-out');
        box.appendChild(neu);
        void neu.offsetWidth; neu.className = '';
        setTimeout(function () { if (alt && alt.parentNode) alt.remove(); }, 600);
    }
    function beamerZu() {
        clearInterval(B.poll); B.k = null;
        $('klBeamer').hidden = true; document.body.style.overflow = '';
        if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
        try { if (B.lock) B.lock.release(); } catch (e) { /* egal */ } B.lock = null;
        const k = aktuelleKlasse(); if (k) standLaden(k);
    }
    document.addEventListener('keydown', function (e) {
        if ($('klBeamer').hidden) return;
        if (e.key === 'Escape' && !document.fullscreenElement) beamerZu();
        if (e.key === 'f' || e.key === 'F') $('klBmFull').click();
    });
    document.addEventListener('visibilitychange', async function () {
        if (!document.hidden && B.k && !B.lock && navigator.wakeLock) { try { B.lock = await navigator.wakeLock.request('screen'); } catch (e) { /* egal */ } }
    });

    // ══ START ═════════════════════════════════════════════════════════
    async function start() {
        const code = K.codeAusAdresse();
        if (code) return zeigeBeitritt(code);
        const wunsch = /^#klassen$/.test(location.hash);
        if (hatSitzung()) {
            // Angemeldet: wer schon Klassen hat, landet im Cockpit; sonst bleibt die
            // Landingpage (auch Azubis mit Cloud-Konto kommen hierher), und "Klasse
            // anlegen" schaltet ins Cockpit statt zur Anmeldung.
            ['klHeroStart', 'klTopLogin'].forEach(function (id) {
                const a = $(id); if (!a) return;
                a.setAttribute('href', BASE + '/klasse/#klassen');
                if (id === 'klTopLogin') a.textContent = L('Meine Klassen', 'My classes');
            });
            if (wunsch) return cockpit(true);
            try {
                const s = await sitzung();
                if (s) {
                    const liste = await call('klassen_uebersicht');
                    if (liste && liste.length) { C.klassen = liste; return cockpit(false); }
                }
            } catch (e) { /* dann eben Landingpage */ }
        } else if (wunsch) { location.href = '/?cloud=login&back=klasse'; return; }
        landing();
    }
    window.addEventListener('hashchange', function () {
        if (!$('klBeamer').hidden) return;
        if (document.body.getAttribute('data-mode') === 'landing' && !K.codeAusAdresse() && location.hash !== '#klassen') return;
        if (C.dirty && !verwerfenOk()) return;
        C.dirty = false;
        start();
    });
    // Test-Sichtfenster nur lokal (vgl. window.__abKonto auf /ausbilder/)
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__klasse = { C: C, B: B, beamer: beamer, setzeZahl: setzeZahl, zeigeBeitritt: zeigeBeitritt, landing: landing, karteHtml: karteHtml, formular: formular };
    start();
})();
