// ═══ KI-APP-BRIEFKASTEN MODULE ═══
//
// Datenschicht des KI-Briefkastens fuer die App (Zeiterfassung) und das
// Berichtsheft — Bereich `app` in schatten_ki_schluessel / schatten_ki_entwuerfe.
// Keine Oberflaeche: die macht components/core/ki-assistent.js (App) bzw.
// Assets/js/berichtsheft/bh-ki.js (Berichtsheft). Krypto: ki-krypto.js.
//
// 🔴 SCHLUESSEL: der private Teil wird mit dem Cloud-E2E-Schluessel verpackt
// (Wiederherstellungs-Code, cloud-e2e.js). Der ist auf jedem Geraet mit Code
// derselbe — deshalb reicht EIN Paar je Konto, und ohne Code kommt niemand an
// die Entwuerfe, auch der Server nicht. Fehlt der Code auf diesem Geraet,
// heisst der Status 'code' (nicht 'aus'): der Briefkasten kann laufen, nur
// HIER laesst er sich nicht oeffnen.
//
// Netz nur auf Ansage (CLAUDE.md, Supabase-Falle 2): laden() fragt nur, wenn der
// Aufrufer es will. Wer den Briefkasten nie eingeschaltet hat, loest beim Start
// keinen einzigen Abruf aus — dafuer der Merker MERK_AN je Geraet.
(function () {
    'use strict';

    const BEREICH = 'app';
    const MERK_AN = 'mwl_ki_app_an';

    let holeClient = null;
    const zustand = { status: 'unbekannt', priv: null, entwuerfe: [], verbindungen: [] };

    function init(opts) { holeClient = opts && opts.client; }

    function merken(an) {
        try { an ? localStorage.setItem(MERK_AN, '1') : localStorage.removeItem(MERK_AN); } catch (e) { /* egal */ }
    }
    function gemerkt() {
        try { return localStorage.getItem(MERK_AN) === '1'; } catch (e) { return false; }
    }

    async function ctx() {
        if (typeof holeClient !== 'function') throw new Error('MWLKiApp.init fehlt');
        const c = await holeClient();
        if (!c) throw new Error('kein Supabase-Client');
        const r = await c.auth.getSession();
        const u = r && r.data && r.data.session && r.data.session.user;
        return { c, u: u || null };
    }

    function pruefen(res) {
        if (res.error) throw new Error(res.error.message || 'Supabase-Fehler');
        return res.data;
    }

    // Cloud-E2E-Schluessel des Kontos. Liest dieselbe Ablage wie ablageLesen()
    // in Assets/js/Cloud/cloud-e2e.js (IndexedDB mwl_cloud_e2e, Store keys) —
    // hier nachgebaut, weil das Berichtsheft cloud-e2e.js samt Dialogen nicht laedt.
    function e2eSchluessel(uid) {
        return new Promise(function (ok) {
            let r;
            try { r = indexedDB.open('mwl_cloud_e2e', 1); } catch (e) { ok(null); return; }
            r.onupgradeneeded = function () { r.result.createObjectStore('keys', { keyPath: 'uid' }); };
            r.onerror = function () { ok(null); };
            r.onsuccess = function () {
                try {
                    const q = r.result.transaction('keys').objectStore('keys').get(uid);
                    q.onsuccess = function () { ok(q.result && q.result.key ? q.result.key : null); };
                    q.onerror = function () { ok(null); };
                } catch (e) { ok(null); }
            };
        });
    }

    // Status: 'konto' (nicht angemeldet) | 'code' (kein Wiederherstellungs-Code
    // auf diesem Geraet) | 'aus' | 'fremd' (Schluessel passt nicht, Code neu
    // gesetzt) | 'an' | 'fehler'. Bei 'an' stehen die Entwuerfe entschluesselt bereit.
    async function laden(mitVerbindungen) {
        zustand.priv = null;
        zustand.entwuerfe = [];
        try {
            const { c, u } = await ctx();
            if (!u) { zustand.status = 'konto'; return zustand; }
            const aes = await e2eSchluessel(u.id);
            const zeile = pruefen(await c.from('schatten_ki_schluessel')
                .select('public_key, private_key').eq('user_id', u.id).eq('bereich', BEREICH).maybeSingle());
            if (!zeile) {
                zustand.status = aes ? 'aus' : 'code';
                merken(false);
                // Wer die Pille gedrueckt hat, will den Briefkasten — dann jetzt
                // einschalten, statt ihn nochmal in den Einstellungen suchen zu lassen.
                if (aes && gewuenscht()) {
                    await einschalten();
                    try { localStorage.removeItem(WUNSCH); } catch (e) { /* egal */ }
                }
                return zustand;
            }
            if (!aes) { zustand.status = 'code'; return zustand; }
            try { zustand.priv = await kiPrivatSchluesselAuspacken(zeile.private_key, aes); }
            catch (e) { zustand.status = 'fremd'; return zustand; }
            zustand.status = 'an';
            merken(true);
            const zeilen = pruefen(await c.from('schatten_ki_entwuerfe')
                .select('id, payload, created_at, expires_at').eq('user_id', u.id).eq('bereich', BEREICH)
                .order('created_at', { ascending: true }));
            const jetzt = Date.now();
            for (const z of zeilen) {
                if (Date.parse(z.expires_at) < jetzt) { loeschen(z.id).catch(() => {}); continue; }
                try { zustand.entwuerfe.push({ id: z.id, created_at: z.created_at, daten: await kiEntwurfEntschluesseln(z.payload, zustand.priv) }); }
                catch (e) { zustand.entwuerfe.push({ id: z.id, created_at: z.created_at, fehler: true }); }
            }
            if (mitVerbindungen) zustand.verbindungen = await verbindungen().catch(() => []);
        } catch (e) {
            zustand.status = 'fehler';
            console.warn('[KI-App-Briefkasten]', e && e.message);
        }
        return zustand;
    }

    async function einschalten() {
        const { c, u } = await ctx();
        if (!u) throw new Error('nicht angemeldet');
        const aes = await e2eSchluessel(u.id);
        if (!aes) throw new Error('kein Wiederherstellungs-Code');
        const p = await kiSchluesselpaarErzeugen(aes);
        // Ein neues Paar macht alte Entwuerfe unlesbar — die gehoeren dann weg.
        pruefen(await c.from('schatten_ki_entwuerfe').delete().eq('user_id', u.id).eq('bereich', BEREICH));
        pruefen(await c.from('schatten_ki_schluessel')
            .upsert({ user_id: u.id, bereich: BEREICH, public_key: p.publicKey, private_key: p.privateKey }, { onConflict: 'user_id,bereich' }));
        zustand.priv = await kiPrivatSchluesselAuspacken(p.privateKey, aes);
        zustand.status = 'an';
        zustand.entwuerfe = [];
        merken(true);
    }

    async function ausschalten() {
        const { c, u } = await ctx();
        if (!u) return;
        pruefen(await c.from('schatten_ki_entwuerfe').delete().eq('user_id', u.id).eq('bereich', BEREICH));
        pruefen(await c.from('schatten_ki_schluessel').delete().eq('user_id', u.id).eq('bereich', BEREICH));
        zustand.status = 'aus';
        zustand.priv = null;
        zustand.entwuerfe = [];
        merken(false);
    }

    async function loeschen(id) {
        const { c, u } = await ctx();
        if (!u) return;
        pruefen(await c.from('schatten_ki_entwuerfe').delete().eq('user_id', u.id).eq('bereich', BEREICH).eq('id', id));
        zustand.entwuerfe = zustand.entwuerfe.filter(e => e.id !== id);
    }

    async function verbindungen() {
        const { c } = await ctx();
        if (!c.auth.oauth || typeof c.auth.oauth.getUserGrants !== 'function') return [];
        return pruefen(await c.auth.oauth.getUserGrants()) || [];
    }

    async function trennen(clientId) {
        const { c } = await ctx();
        pruefen(await c.auth.oauth.revokeGrant(clientId));
        zustand.verbindungen = zustand.verbindungen.filter(v => v.client_id !== clientId);
    }

    // ── Lese-Freigabe (ki_app_spiegel) ───────────────────────────────────
    // Eigene, LESBARE Kopie nur fuer den Agenten — Entscheidung des Nutzers
    // 24.10.2026. Getrennt vom E2E-Backup, ohne Schatten-Tresor, nur auf
    // ausdrueckliches Einschalten. Merker je Geraet, damit niemand ungefragt
    // eine lesbare Kopie hochlaedt.
    const LESEN = 'mwl_ki_lesen';
    function lesenAn() { try { return localStorage.getItem(LESEN) === '1'; } catch (e) { return false; } }

    async function spiegelSchreiben(daten) {
        const { c, u } = await ctx();
        if (!u) return;
        pruefen(await c.from('ki_app_spiegel').upsert({ user_id: u.id, daten }, { onConflict: 'user_id' }));
    }

    async function lesenSetzen(an, daten) {
        try { an ? localStorage.setItem(LESEN, '1') : localStorage.removeItem(LESEN); } catch (e) { /* egal */ }
        if (an) { if (daten) await spiegelSchreiben(daten); return; }
        const { c, u } = await ctx();
        if (u) pruefen(await c.from('ki_app_spiegel').delete().eq('user_id', u.id));
    }

    // Wochen des Berichtshefts (localStorage berichtsheft_reports, gleiche
    // Herkunft wie die App). Kurzfassung, damit der Agent fehlende Wochen sieht.
    function berichteUeberblick() {
        let liste = [];
        try { liste = JSON.parse(localStorage.getItem('berichtsheft_reports') || '[]') || []; } catch (e) { liste = []; }
        return liste.filter(r => r && r.week).map(r => ({
            kw: r.week,
            jahr: parseInt(String(r.dateFrom || '').slice(0, 4), 10) || null,
            von: r.dateFrom || '',
            status: r.status || '',
            modus: r.mode || 'weekly',
            kurz: String(r.activities || '').replace(/\s+/g, ' ').slice(0, 160),
        })).sort((a, b) => String(a.von).localeCompare(String(b.von)));
    }

    // Vom Berichtsheft aus: nur den Teil `berichte` der Kopie erneuern — der
    // Rest (Einstellungen, Zeiten, Feiertage) entsteht in der App.
    async function spiegelBerichteAktualisieren() {
        if (!lesenAn()) return;
        const { c, u } = await ctx();
        if (!u) return;
        const z = pruefen(await c.from('ki_app_spiegel').select('daten').eq('user_id', u.id).maybeSingle());
        if (!z || !z.daten) return;
        z.daten.berichte = berichteUeberblick();
        await spiegelSchreiben(z.daten);
    }

    // Entwuerfe einer Art: 'zeit' | 'bericht'.
    function entwuerfe(art) {
        return zustand.entwuerfe.filter(e => !e.fehler && e.daten && e.daten.art === art);
    }

    // ── Die Pille „Verbinde deinen KI-Assistenten" (Vorbild: Cloudflares
    // „Onboard your agent", Wunsch des Nutzers 24.10.2026) ─────────────────
    // Immer sichtbar auf Dashboard und Berichtsheft; laeuft der Briefkasten,
    // in leiser Form (s. u.). Ein Klick kopiert die eine Zeile
    // (kiAgentZeile, ki-krypto.js) und merkt sich den Wunsch: ist man
    // angemeldet, springt der Briefkasten gleich an, sonst nach dem Anmelden
    // (laden()). Stil als eingebautes <style>, weil App und Berichtsheft
    // verschiedene Tokens haben — die Pille richtet sich nur nach currentColor.
    const WUNSCH = 'mwl_ki_app_wunsch';
    function gewuenscht() { try { return localStorage.getItem(WUNSCH) === '1'; } catch (e) { return false; } }

    function pillenStil() {
        if (document.getElementById('kiPilleStil')) return;
        const s = document.createElement('style');
        s.id = 'kiPilleStil';
        s.textContent =
            '.ki-pille{display:inline-flex;align-items:center;gap:10px;max-width:100%;padding:7px 8px 7px 14px;' +
            'border-radius:999px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);' +
            'background:color-mix(in srgb,currentColor 4%,transparent);color:inherit;font:inherit;font-size:13px;' +
            'font-weight:500;cursor:pointer;transition:border-color .2s ease,background-color .2s ease,transform .16s ease-out}' +
            '.ki-pille:active{transform:scale(.97)}' +
            '.ki-pille:focus-visible{outline:2px solid var(--primary,currentColor);outline-offset:2px}' +
            '@media (hover:hover) and (pointer:fine){.ki-pille:hover{border-color:color-mix(in srgb,currentColor 30%,transparent);' +
            'background:color-mix(in srgb,currentColor 7%,transparent)}}' +
            '.ki-pille__text{display:inline-grid}' +
            '.ki-pille__text>span{grid-area:1/1;white-space:nowrap;transition:opacity .2s ease,filter .2s ease}' +
            '.ki-pille__ok{opacity:0;filter:blur(2px);display:inline-flex;align-items:center;gap:6px}' +
            '.ki-pille__ok svg{width:14px;height:14px}' +
            '.ki-pille.is-kopiert .ki-pille__an{opacity:0;filter:blur(2px)}' +
            '.ki-pille.is-kopiert .ki-pille__ok{opacity:1;filter:none}' +
            '.ki-pille__marken{display:inline-flex;gap:4px;transition:opacity .2s ease}' +
            '.ki-pille__marken svg{width:22px;height:22px;padding:4px;border-radius:999px;' +
            'background:color-mix(in srgb,currentColor 8%,transparent);opacity:.85}' +
            '.ki-pille.is-kopiert .ki-pille__marken{opacity:.35}' +
            '@media (max-width:420px){.ki-pille__marken svg:nth-child(n+3){display:none}}' +
            // Leise Form nach dem Verbinden: kleiner, kaum Flaeche, das Kopier-Symbol
            // erst bei Zeiger/Fokus deutlich — auf Touch immer halb sichtbar.
            '.ki-pille--leise{gap:8px;padding:4px 10px;font-size:12px;font-weight:450;' +
            'border-color:color-mix(in srgb,currentColor 10%,transparent);background:transparent;opacity:.82}' +
            '.ki-pille__punkt{width:6px;height:6px;border-radius:50%;flex-shrink:0;background:var(--primary,currentColor);' +
            'box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,currentColor) 22%,transparent)}' +
            '.ki-pille__mehr{display:inline-flex;opacity:.45;transition:opacity .2s ease}' +
            '.ki-pille__mehr svg{width:13px;height:13px}' +
            '@media (hover:hover) and (pointer:fine){.ki-pille--leise:hover{opacity:1}.ki-pille--leise:hover .ki-pille__mehr{opacity:1}}' +
            '.ki-pille--leise:focus-visible{opacity:1}' +
            '@media (prefers-reduced-motion:reduce){.ki-pille__text>span{transition:opacity .12s ease;filter:none!important}.ki-pille:active{transform:none}}';
        document.head.appendChild(s);
    }

    // Neutrale Symbole statt fremder Logos: Funke (Chat-KI), Terminal (Claude
    // Code & Co.), Sprechblase (ChatGPT, Gemini …), Stecker (MCP).
    const MARKEN = [
        '<path d="M12 3l1.6 4.9L18.5 9.5l-4.9 1.6L12 16l-1.6-4.9L5.5 9.5l4.9-1.6z"/><path d="M19 15l.7 2.1 2.1.7-2.1.7L19 20.6l-.7-2.1-2.1-.7 2.1-.7z"/>',
        '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/>',
    ];
    const svg = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';

    function pille(el, ort, angemeldet) {
        if (!el) return;
        pillenStil();
        const en = document.documentElement.lang === 'en';
        const T = (de, e) => en ? e : de;
        // Laeuft der Briefkasten schon, bleibt die Pille — aber leise: man will
        // den Satz ggf. fuer einen weiteren Agenten noch einmal kopieren
        // (Wunsch des Nutzers 24.10.: „nicht verschwinden, nicht stoeren,
        // trotzdem auffallen"). Punkt im Akzent statt Symbolreihe.
        const leise = gemerkt();
        el.hidden = false;
        el.innerHTML = '<button type="button" class="ki-pille' + (leise ? ' ki-pille--leise' : '') + '" title="' +
                (leise ? T('Noch einen Assistenten verbinden — kopiert den Satz erneut', 'Connect another assistant — copies the line again')
                       : T('Kopiert einen Satz für Claude, ChatGPT & Co.', 'Copies one line for Claude, ChatGPT & co.')) + '">' +
            (leise ? '<span class="ki-pille__punkt" aria-hidden="true"></span>' : '') +
            '<span class="ki-pille__text">' +
                '<span class="ki-pille__an">' + (leise ? T('KI-Assistent verbunden', 'AI assistant connected') : T('Verbinde deinen KI-Assistenten', 'Connect your AI assistant')) + '</span>' +
                // Leise: kurzes „Kopiert", sonst wuerde das gemeinsame Rasterfeld die
                // kleine Pille auf die Breite des langen Satzes aufblasen.
                '<span class="ki-pille__ok" aria-hidden="true">' + svg('<path d="M20 6 9 17l-5-5"/>') +
                    (leise ? T('Kopiert', 'Copied') : T('Kopiert — im Chat einfügen', 'Copied — paste it in the chat')) + '</span>' +
            '</span>' +
            (leise
                ? '<span class="ki-pille__mehr" aria-hidden="true">' + svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>') + '</span>'
                : '<span class="ki-pille__marken">' + MARKEN.map(svg).join('') + '</span>') +
        '</button>';
        const btn = el.querySelector('button');
        btn.addEventListener('click', async () => {
            if (!(await verbindenKopieren(ort, angemeldet))) { btn.title = kiAgentZeile(en); return; }
            btn.classList.add('is-kopiert');
            setTimeout(() => btn.classList.remove('is-kopiert'), 2600);
        });
    }

    // Gemeinsamer Klick fuer Pille (Berichtsheft) und Leisten-Symbol (Dashboard):
    // Zeile kopieren, Wunsch merken, Briefkasten bereitstellen. → true/false.
    async function verbindenKopieren(ort, angemeldet) {
        // Kopieren ZUERST, im selben Klick (Nutzergeste, s. ki-briefkasten.js).
        const text = kiAgentZeile(document.documentElement.lang === 'en');
        try {
            if (!navigator.clipboard || !navigator.clipboard.writeText) return false;
            await navigator.clipboard.writeText(text);
        } catch (e) { return false; }
        try { localStorage.setItem(WUNSCH, '1'); } catch (e) { /* ohne Merker */ }
        if (typeof mwlEvent === 'function') mwlEvent('ki_agent_kopiert', { status: zustand.status, ort });
        // Briefkasten gleich bereitstellen, wenn moeglich — sonst nach dem
        // Anmelden ueber laden().
        if (typeof angemeldet === 'function' && angemeldet()) laden(false).catch(() => {});
        return true;
    }

    window.MWLKiApp = {
        init, laden, einschalten, ausschalten, loeschen, verbindungen, trennen, entwuerfe, gemerkt, gewuenscht, pille, verbindenKopieren,
        lesenAn, lesenSetzen, spiegelSchreiben, berichteUeberblick, spiegelBerichteAktualisieren,
        get status() { return zustand.status; },
        get alle() { return zustand.entwuerfe; },
        get verbunden() { return zustand.verbindungen; },
    };
})();
