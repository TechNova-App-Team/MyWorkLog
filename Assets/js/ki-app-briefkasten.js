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
            if (!zeile) { zustand.status = aes ? 'aus' : 'code'; merken(false); return zustand; }
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

    // Entwuerfe einer Art: 'zeit' | 'bericht'.
    function entwuerfe(art) {
        return zustand.entwuerfe.filter(e => !e.fehler && e.daten && e.daten.art === art);
    }

    window.MWLKiApp = {
        init, laden, einschalten, ausschalten, loeschen, verbindungen, trennen, entwuerfe, gemerkt,
        get status() { return zustand.status; },
        get alle() { return zustand.entwuerfe; },
        get verbunden() { return zustand.verbindungen; },
    };
})();
