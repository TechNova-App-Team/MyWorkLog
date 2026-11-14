// ═══ ERINNERUNG-PUSH MODULE ═══
// Berichtsheft-Erinnerung aufs Handy (Wochentag + Stunde frei, Vorgabe Freitag 13 Uhr) und
// Erinnerungen des Ausbilders als Push — auch wenn die Seite zu ist (seit 14.11.2026, v9.7.1).
// Laeuft in der App und auf /berichtsheft/; eine Quelle fuer beide (window.MWLErinnerung).
//
// Server: Tabelle erinnerung_push (nur ueber die RPCs erinnerung_push_setzen/_aus), Edge
// Function erinnerung-push, stuendlicher pg_cron-Job. Gespeichert wird nur der Browser-Endpunkt,
// die Wunschzeit und — falls beim Einschalten angemeldet — das Konto, damit Ausbilder-
// Erinnerungen das Geraet finden. Kein Name, kein Inhalt.
//
// 🔴 Der VAPID-Schluessel ist DERSELBE wie in klasse-profil.js (ein Paar fuer alle Pushs).
// Ein Browser hat genau EIN Abo je Service Worker — Klasse und Erinnerung teilen es sich.
// Deshalb meldet keiner der beiden das Browser-Abo ab, solange der andere es noch braucht
// (klasse-profil.js pushAus fragt MWLErinnerung.istAn(), hier umgekehrt mwl_klasse.push).
//
// iPhone: Web-Push nur fuer zum Home-Bildschirm hinzugefuegte Seiten (iOS 16.4+);
// moeglich() ist dort im normalen Safari-Tab falsch, die Oberflaeche sagt das.

(function (root) {
    'use strict';

    const KEY = 'mwl_erinnerung_push';
    const VAPID = 'BK1BX7ZLWkvdCKupgCXjfvr9U4SyeNLaClQ_BC9pnqjGXI3hi24h7vhpSOx9eq0SfkF6oh0fbQyLvt_650eU_CA';
    const VORGABE = { tag: 5, stunde: 13 };

    function konfig() {
        const c = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG) || root.SUPABASE_CONFIG;
        return c && c.URL && c.ANON_KEY ? c : null;
    }
    function lesen() { try { return JSON.parse(root.localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
    function schreiben(v) { try { if (v) root.localStorage.setItem(KEY, JSON.stringify(v)); else root.localStorage.removeItem(KEY); } catch (e) { /* Privatmodus */ } }
    function istEn() { try { return root.document.documentElement.lang === 'en'; } catch (e) { return false; } }

    // Token der Supabase-Sitzung, falls vorhanden und nicht abgelaufen — dann haengt der Server
    // das Konto an (fuer Ausbilder-Erinnerungen). Sonst anonym.
    function sitzungsToken(c) {
        try {
            const ref = new URL(c.URL).hostname.split('.')[0];
            const s = JSON.parse(root.localStorage.getItem('sb-' + ref + '-auth-token') || 'null');
            if (s && s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now() + 60000)) return s.access_token;
        } catch (e) { /* ohne Sitzung */ }
        return null;
    }

    async function rpc(name, body) {
        const c = konfig();
        if (!c) throw Object.assign(new Error('keine_konfiguration'), { code: 'keine_konfiguration' });
        const tok = sitzungsToken(c);
        const ruf = (t) => root.fetch(c.URL + '/rest/v1/rpc/' + name, {
            method: 'POST',
            headers: { apikey: c.ANON_KEY, Authorization: 'Bearer ' + (t || c.ANON_KEY), 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {})
        });
        let r;
        try {
            r = await ruf(tok);
            // Abgelaufenes oder widerrufenes Token: anonym nochmal, statt gar nicht einzuschalten.
            if (tok && r.status === 401) r = await ruf(null);
        } catch (x) { throw Object.assign(new Error('offline'), { code: 'offline' }); }
        const text = await r.text();
        let j = null; try { j = text ? JSON.parse(text) : null; } catch (x) { j = null; }
        if (!r.ok) throw Object.assign(new Error((j && j.message) || ('http_' + r.status)), { code: (j && j.message) || ('http_' + r.status) });
        return j;
    }

    function moeglich() {
        return !!(root.navigator && 'serviceWorker' in root.navigator && 'PushManager' in root && 'Notification' in root);
    }
    // iPhone/iPad im normalen Safari-Tab: kein PushManager. Fuer den Hinweis in der Oberflaeche.
    function iosOhneHomescreen() {
        try {
            const ios = /iP(hone|ad|od)/.test(root.navigator.userAgent) ||
                (root.navigator.platform === 'MacIntel' && root.navigator.maxTouchPoints > 1);
            const standalone = root.navigator.standalone === true || root.matchMedia('(display-mode: standalone)').matches;
            return ios && !standalone;
        } catch (e) { return false; }
    }

    async function registrierung() {
        const sw = root.navigator.serviceWorker;
        let reg = await sw.getRegistration('/');
        if (!reg) {
            // Frisches Geraet, App nie geoeffnet: denselben Worker anmelden wie die App
            // (Muster aus klasse-profil.js) — mit der Version als ?v=, sonst fehlt die Cache-Generation.
            let v = 'dev';
            try { v = (await (await root.fetch('/config/version.json', { cache: 'no-store' })).json()).version || v; } catch (e) { /* bleibt dev */ }
            reg = await sw.register('/service-worker.js?v=' + v, { scope: '/' });
        }
        return sw.ready.then(function () { return reg; });
    }
    function schluesselBytes(s) {
        const p = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
        return Uint8Array.from(root.atob(p), function (c) { return c.charCodeAt(0); });
    }

    // 'an' | 'aus' | 'gesperrt' | 'nicht'
    async function status() {
        if (!moeglich()) return 'nicht';
        if (root.Notification.permission === 'denied') return 'gesperrt';
        const z = lesen();
        if (!z || !z.endpoint) return 'aus';
        try {
            const reg = await root.navigator.serviceWorker.getRegistration('/');
            const abo = reg && await reg.pushManager.getSubscription();
            return abo && abo.endpoint === z.endpoint ? 'an' : 'aus';
        } catch (e) { return 'aus'; }
    }

    /**
     * Einschalten oder Zeit aendern. o = { tag, stunde, wochen } — `wochen:false` heisst
     * "nur Erinnerungen des Ausbilders", ohne woechentliche Erinnerung.
     */
    async function an(o) {
        if (!moeglich()) throw Object.assign(new Error('push_nicht_moeglich'), { code: 'push_nicht_moeglich' });
        const recht = await root.Notification.requestPermission();
        if (recht !== 'granted') throw Object.assign(new Error('push_abgelehnt'), { code: 'push_abgelehnt' });
        const reg = await registrierung();
        let abo = await reg.pushManager.getSubscription();
        if (!abo) abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: schluesselBytes(VAPID) });
        const alt = lesen() || {};
        const tag = o && o.tag != null ? +o.tag : (alt.tag != null ? alt.tag : VORGABE.tag);
        const stunde = o && o.stunde != null ? +o.stunde : (alt.stunde != null ? alt.stunde : VORGABE.stunde);
        const wochen = o && o.wochen != null ? !!o.wochen : (alt.wochen != null ? alt.wochen : true);
        await rpc('erinnerung_push_setzen', { p_abo: abo.toJSON(), p_wochen: wochen, p_tag: tag, p_stunde: stunde, p_sprache: istEn() ? 'en' : 'de' });
        schreiben({ endpoint: abo.endpoint, tag: tag, stunde: stunde, wochen: wochen, at: Date.now() });
        if (typeof root.mwlEvent === 'function') root.mwlEvent('erinnerung_push', { aktion: 'an', tag: tag, stunde: stunde, wochen: wochen });
        return { tag: tag, stunde: stunde, wochen: wochen };
    }

    async function aus() {
        const z = lesen();
        schreiben(null);
        try {
            const reg = await root.navigator.serviceWorker.getRegistration('/');
            const abo = reg && await reg.pushManager.getSubscription();
            const ep = (abo && abo.endpoint) || (z && z.endpoint);
            if (ep) await rpc('erinnerung_push_aus', { p_endpoint: ep }).catch(function () {});
            // Das Browser-Abo nur aufgeben, wenn die Klasse es nicht mehr braucht.
            let klasse = null; try { klasse = JSON.parse(root.localStorage.getItem('mwl_klasse') || 'null'); } catch (e) { /* egal */ }
            if (abo && !(klasse && klasse.push)) await abo.unsubscribe();
        } catch (e) { /* offline: der Server raeumt tote Abos beim naechsten Versand */ }
        if (typeof root.mwlEvent === 'function') root.mwlEvent('erinnerung_push', { aktion: 'aus' });
        return true;
    }

    // Nach einem Anmelden das Konto an das bestehende Abo haengen (fuer Ausbilder-Erinnerungen),
    // ohne Rueckfrage — die Erlaubnis liegt schon vor. Hoechstens einmal je Sitzung und Konto.
    async function kontoNachziehen() {
        const z = lesen(); const c = konfig();
        if (!z || !z.endpoint || !c || !moeglich() || root.Notification.permission !== 'granted') return false;
        const tok = sitzungsToken(c); if (!tok) return false;
        try {
            if (root.sessionStorage.getItem('mwl_er_konto') === tok.slice(-16)) return false;
            root.sessionStorage.setItem('mwl_er_konto', tok.slice(-16));
        } catch (e) { return false; }
        try { await an({ tag: z.tag, stunde: z.stunde, wochen: z.wochen }); return true; } catch (e) { return false; }
    }

    function zeitText(tag, stunde) {
        const de = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        const en = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return istEn() ? (en[tag] + ' at ' + stunde + ':00') : (de[tag] + ' um ' + stunde + ' Uhr');
    }

    // ── Bedienfeld (App: Meldungen-Einstellungen, Berichtsheft: Karte) ────────
    // EIN Baustein fuer beide Seiten, damit Wortlaut und Zustaende nicht auseinanderlaufen.
    // Klassen `erp-*`; die Optik liefert jede Seite selbst mit ihren Tokens
    // (components/core/alerts.css bzw. Assets/css/berichtsheft/b2b.css).
    function L(de, en) { return istEn() ? en : de; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    const GLOCKE = '<svg class="erp-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

    async function zeichne(box, opt) {
        if (!box) return;
        opt = opt || {};
        const st = await status();
        const z = lesen() || {};
        const tag = z.tag != null ? z.tag : VORGABE.tag, stunde = z.stunde != null ? z.stunde : VORGABE.stunde;
        const tageDe = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        const tageEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        // Reihenfolge Mo … So, Wert = getDay()
        const tagOpt = [1, 2, 3, 4, 5, 6, 0].map(function (t) {
            return '<option value="' + t + '"' + (t === tag ? ' selected' : '') + '>' + (istEn() ? tageEn[t] : tageDe[t]) + '</option>';
        }).join('');
        const stOpt = Array.from({ length: 17 }, function (_, i) { return i + 6; }).map(function (h) {
            return '<option value="' + h + '"' + (h === stunde ? ' selected' : '') + '>' + (istEn() ? h + ':00' : h + ' Uhr') + '</option>';
        }).join('');

        let unter, rechts = '', zeit = '';
        if (st === 'nicht') {
            unter = iosOhneHomescreen()
                ? L('Auf dem iPhone geht das nur, wenn du MyWorkLog über „Teilen → Zum Home-Bildschirm“ hinzufügst und von dort öffnest.',
                    'On iPhone this only works if you add MyWorkLog via “Share → Add to Home Screen” and open it from there.')
                : L('Dieser Browser kann keine Benachrichtigungen empfangen.', 'This browser cannot receive notifications.');
        } else if (st === 'gesperrt') {
            unter = L('Benachrichtigungen sind für myworklog.de blockiert. Erlaube sie in den Einstellungen des Browsers, dann kannst du sie hier einschalten.',
                'Notifications are blocked for myworklog.de. Allow them in your browser settings, then you can turn them on here.');
        } else {
            const an_ = st === 'an' && z.wochen !== false;
            unter = an_
                ? L('Jeden ', 'Every ') + esc(zeitText(tag, stunde)) + L(', auch wenn MyWorkLog geschlossen ist.', ', even when MyWorkLog is closed.')
                : L('Eine Benachrichtigung an deinem Wunschtag, auch wenn MyWorkLog geschlossen ist.', 'A notification on the day you choose, even when MyWorkLog is closed.');
            if (opt.ausbilder) unter += ' ' + L('Erinnerungen deines Ausbilders kommen ebenfalls aufs Handy.', 'Reminders from your trainer reach your phone too.');
            zeit = '<div class="erp-zeit">' +
                '<label><span class="erp-vh">' + L('Tag', 'Day') + '</span><select class="erp-tag">' + tagOpt + '</select></label>' +
                '<label><span class="erp-vh">' + L('Uhrzeit', 'Time') + '</span><select class="erp-stunde">' + stOpt + '</select></label>' +
                '</div>';
            rechts = an_
                ? '<button type="button" class="erp-btn erp-aus">' + L('Ausschalten', 'Turn off') + '</button>'
                : '<button type="button" class="erp-btn erp-an is-primaer">' + L('Einschalten', 'Turn on') + '</button>';
        }
        box.innerHTML =
            '<div class="erp-kopf">' + GLOCKE +
            '<div class="erp-text"><p class="erp-titel">' + L('Berichtsheft-Erinnerung aufs Handy', 'Report book reminder on your phone') +
            (st === 'an' && z.wochen !== false ? '<span class="erp-marke">' + L('an', 'on') + '</span>' : '') + '</p>' +
            '<p class="erp-unter">' + unter + '</p></div></div>' +
            (zeit || rechts ? '<div class="erp-fuss">' + zeit + rechts + '</div>' : '') +
            '<p class="erp-meldung" role="status" hidden></p>';
        box.hidden = false;

        const meldung = function (t, fehler) {
            const p = box.querySelector('.erp-meldung'); if (!p) return;
            p.textContent = t; p.hidden = !t; p.classList.toggle('is-fehler', !!fehler);
        };
        const fehlerText = function (e) {
            const c = e && e.code;
            return c === 'push_abgelehnt' ? L('Du hast Benachrichtigungen nicht erlaubt.', 'You did not allow notifications.')
                : c === 'offline' ? L('Keine Verbindung. Versuch es gleich noch einmal.', 'No connection. Please try again in a moment.')
                : L('Das hat nicht geklappt. Versuch es später noch einmal.', 'That did not work. Please try again later.');
        };
        const wert = function () {
            return { tag: +box.querySelector('.erp-tag').value, stunde: +box.querySelector('.erp-stunde').value, wochen: true };
        };
        const btnAn = box.querySelector('.erp-an'), btnAus = box.querySelector('.erp-aus');
        if (btnAn) btnAn.addEventListener('click', async function () {
            btnAn.disabled = true;
            try { await an(wert()); await zeichne(box, opt); }
            catch (e) { btnAn.disabled = false; meldung(fehlerText(e), true); if (e && e.code === 'push_abgelehnt') zeichne(box, opt); }
        });
        if (btnAus) btnAus.addEventListener('click', async function () {
            btnAus.disabled = true;
            await aus(); await zeichne(box, opt);
        });
        // Zeit aendern, waehrend es an ist: sofort uebernehmen.
        box.querySelectorAll('.erp-tag, .erp-stunde').forEach(function (s) {
            s.addEventListener('change', async function () {
                if (!(st === 'an' && z.wochen !== false)) return;
                try { const r = await an(wert()); meldung(L('Gespeichert: ', 'Saved: ') + zeitText(r.tag, r.stunde) + '.'); }
                catch (e) { meldung(fehlerText(e), true); }
            });
        });
    }

    root.MWLErinnerung = {
        moeglich: moeglich, iosOhneHomescreen: iosOhneHomescreen, status: status, an: an, aus: aus,
        stand: lesen, istAn: function () { const z = lesen(); return !!(z && z.endpoint); },
        kontoNachziehen: kontoNachziehen, zeitText: zeitText, zeichne: zeichne, VORGABE: VORGABE
    };
})(typeof window !== 'undefined' ? window : globalThis);
