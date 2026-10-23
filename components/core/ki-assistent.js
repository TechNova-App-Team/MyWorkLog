// ═══ KI-ASSISTENT MODULE ═══
//
// App-Seite des KI-Briefkastens (Datenschicht: Assets/js/ki-app-briefkasten.js,
// Krypto: Assets/js/ki-krypto.js, Server: workers/mcp-proxy).
//   • Einstellungen → Cloud → „KI-Assistent": ein Knopf kopiert die eine Zeile
//     fuer den Agenten und schaltet den Briefkasten ein; verbundene Assistenten
//     lassen sich trennen.
//   • Dashboard (.dn-notes): wartende Zeiteintraege. „Pruefen" schickt sie als
//     Tabellenzeilen durch den Import (components/import/import.js) — Soll,
//     Saldo, Dubletten-Erkennung und „Rueckgaengig" kommen von dort. Ein
//     zweiter Weg, Eintraege anzulegen, waere die Falle aus dem Import-Kopf:
//     worked/expected/diff muessen exakt wie handleEntry() rechnen.
//   • Berichtsheft-Entwuerfe nimmt /berichtsheft/ selbst an (bh-ki.js); hier
//     steht nur der Hinweis darauf.
(function () {
    'use strict';

    const en = () => document.documentElement.lang === 'en';
    const L = (de, e) => en() ? e : de;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function client() {
        return new Promise(ok => {
            if (typeof loadSupabase !== 'function') { ok(null); return; }
            loadSupabase(() => ok(window.cloudSync && window.cloudSync.client));
        });
    }
    if (!window.MWLKiApp) return;
    MWLKiApp.init({ client });

    // ── Einstellungen ────────────────────────────────────────────────────
    async function kiaEinstellungen() {
        const box = document.getElementById('kiAppSection');
        if (!box) return;
        box.style.display = '';
        box.innerHTML = '<div class="settings-section-title">' + L('KI-Assistent', 'AI assistant') + '</div>' +
            '<p class="kia-lead">' + L('Einen Moment …', 'One moment …') + '</p>';
        const eingeloggt = !!(window.cloudSync && typeof window.cloudSync.isLoggedIn === 'function' && window.cloudSync.isLoggedIn());
        if (eingeloggt) await MWLKiApp.laden(true);
        kiaRenderEinstellungen(eingeloggt ? MWLKiApp.status : 'konto');
    }

    function kiaRenderEinstellungen(status) {
        const box = document.getElementById('kiAppSection');
        if (!box) return;
        const lead = '<p class="kia-lead">' + L(
            'Verbinde Claude, ChatGPT & Co. mit MyWorkLog. Dein Assistent trägt Arbeitszeiten ein, schreibt Berichtsheft-Wochen vor und schlägt deine Rechte als Azubi nach. Alles kommt als Entwurf, den du hier bestätigst — deine Daten lesen kann er nicht.',
            'Connect Claude, ChatGPT & co. to MyWorkLog. Your assistant adds working hours, pre-writes report book weeks and looks up your rights as an apprentice. Everything arrives as a draft that you confirm here — it cannot read your data.') + '</p>';
        let teil = '';
        if (status === 'konto') {
            teil = '<button class="settings-btn settings-btn-primary kia-voll" onclick="openCloudLoginModal()">' + L('Erst anmelden', 'Sign in first') + '</button>';
        } else if (status === 'code') {
            teil = '<p class="kia-note">' + L('Dieses Gerät kennt deinen Wiederherstellungs-Code noch nicht. Den braucht der Briefkasten, damit nur du die Entwürfe öffnen kannst. Lade einmal oben in die Cloud hoch oder hol deine Daten herunter, dann fragt die App danach.',
                'This device does not know your recovery code yet. The mailbox needs it so only you can open the drafts. Upload to the cloud above once or restore your data, then the app asks for it.') + '</p>';
        } else if (status === 'fehler') {
            teil = '<p class="kia-note">' + L('Gerade nicht erreichbar. Prüf deine Verbindung.', 'Not reachable right now. Check your connection.') + '</p>' +
                '<button class="settings-btn kia-voll" onclick="kiaEinstellungen()">' + L('Erneut versuchen', 'Try again') + '</button>';
        } else {
            teil = '<button type="button" class="settings-btn settings-btn-primary kia-voll kia-copy" onclick="kiaKopieren(this)">' +
                    '<span class="kia-copy-an">' + L('Für deinen Assistenten kopieren', 'Copy for your assistant') + '</span>' +
                    '<span class="kia-copy-ok" aria-hidden="true">' + L('Kopiert — im Chat einfügen', 'Copied — paste it in the chat') + '</span>' +
                '</button>' +
                '<p class="kia-hint">' + L('Der Text sagt deinem Assistenten, wie er sich verbindet. Du bestätigst danach nur noch einmal mit deinem MyWorkLog-Konto.',
                    'The text tells your assistant how to connect. Afterwards you only confirm once with your MyWorkLog account.') + '</p>';
            if (status === 'fremd') {
                teil += '<p class="kia-note">' + L('Dein Wiederherstellungs-Code hat sich geändert. Beim Kopieren wird der Briefkasten neu eingerichtet; liegende Entwürfe werden dabei gelöscht.',
                    'Your recovery code has changed. Copying sets the mailbox up again; waiting drafts are deleted.') + '</p>';
            }
            const v = MWLKiApp.verbunden;
            if (status === 'an' && v.length) {
                teil += '<div class="kia-sub">' + L('Verbundene Assistenten', 'Connected assistants') + '</div><ul class="kia-conn">' +
                    v.map(x => '<li><span>' + esc(x.client_name || x.client_id) + '</span>' +
                        '<button class="settings-btn kia-klein" onclick="kiaTrennen(\'' + esc(x.client_id) + '\')">' + L('Trennen', 'Disconnect') + '</button></li>').join('') + '</ul>';
            }
            if (status === 'an') {
                teil += '<button class="settings-btn settings-btn-danger kia-voll" onclick="kiaAusschalten()">' + L('Briefkasten ausschalten', 'Switch mailbox off') + '</button>';
            }
        }
        box.innerHTML = '<div class="settings-section-title">' + L('KI-Assistent', 'AI assistant') + '</div>' + lead + teil;
    }

    function kopieren(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
        return new Promise((ok, nein) => {
            const ta = document.createElement('textarea');
            ta.value = text; ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
            document.body.appendChild(ta); ta.select();
            const gut = document.execCommand('copy'); ta.remove();
            gut ? ok() : nein(new Error('copy'));
        });
    }

    async function kiaKopieren(btn) {
        // ZUERST kopieren, im selben Klick — nach einem Netzabruf waere die
        // Kopier-Erlaubnis des Browsers evtl. verfallen (wie im Schatten-Modul).
        const k = kopieren(kiAgentZeile(en()));
        try { await k; } catch (e) {
            if (typeof showCustomMessage === 'function') showCustomMessage(L('Kopieren nicht erlaubt', 'Copying not allowed'), L('Erlaube dem Browser das Kopieren und versuch es erneut.', 'Allow copying in your browser and try again.'), 'error');
            return;
        }
        if (btn) { btn.classList.add('is-copied'); setTimeout(() => btn.classList.remove('is-copied'), 2600); }
        if (typeof mwlEvent === 'function') mwlEvent('ki_agent_kopiert', { status: MWLKiApp.status });
        if (MWLKiApp.status === 'aus' || MWLKiApp.status === 'fremd') {
            try { await MWLKiApp.einschalten(); }
            catch (e) { console.warn('[KI-Assistent] Einschalten:', e && e.message); }
            setTimeout(() => kiaRenderEinstellungen(MWLKiApp.status), 2700);
        }
    }

    async function kiaTrennen(clientId) {
        const ok = typeof window.mwlConfirm === 'function'
            ? await window.mwlConfirm({ title: L('Verbindung trennen?', 'Disconnect?'), text: L('Der Assistent kann danach nichts mehr eintragen, bis du ihn neu verbindest.', 'The assistant can no longer add anything until you connect it again.'), confirmText: L('Trennen', 'Disconnect') })
            : true;
        if (!ok) return;
        try { await MWLKiApp.trennen(clientId); } catch (e) { /* Liste bleibt, naechstes Oeffnen zeigt die Wahrheit */ }
        kiaRenderEinstellungen(MWLKiApp.status);
    }

    async function kiaAusschalten() {
        const n = MWLKiApp.alle.length;
        const ok = typeof window.mwlConfirm === 'function'
            ? await window.mwlConfirm({ title: L('Briefkasten ausschalten?', 'Switch mailbox off?'), text: L('Verbundene Assistenten können danach nichts mehr eintragen.', 'Connected assistants can no longer add anything.') + (n ? ' ' + L(n + ' wartende Entwürfe werden gelöscht.', n + ' waiting drafts will be deleted.') : ''), confirmText: L('Ausschalten', 'Switch off') })
            : true;
        if (!ok) return;
        try { await MWLKiApp.ausschalten(); } catch (e) { /* s. o. */ }
        kiaRenderEinstellungen(MWLKiApp.status);
        kiaBanner();
    }

    // ── Dashboard-Hinweis ────────────────────────────────────────────────
    const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>';

    function kiaBanner() {
        const el = document.getElementById('kiAppBanner');
        if (!el) return;
        const zeit = MWLKiApp.status === 'an' ? MWLKiApp.entwuerfe('zeit') : [];
        const bericht = MWLKiApp.status === 'an' ? MWLKiApp.entwuerfe('bericht') : [];
        const tage = zeit.reduce((n, d) => n + ((d.daten.eintraege || []).length), 0);
        if (!tage && !bericht.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
        const titel = tage
            ? (tage === 1 ? L('Dein KI-Assistent hat einen Tag eingetragen', 'Your AI assistant added one day') : L('Dein KI-Assistent hat ' + tage + ' Tage eingetragen', 'Your AI assistant added ' + tage + ' days'))
            : L('Dein KI-Assistent hat eine Berichtsheft-Woche vorgeschrieben', 'Your AI assistant pre-wrote a report book week');
        const text = (tage ? L('Prüf sie in der Vorschau — erst dann landen sie in deiner Zeiterfassung.', 'Check them in the preview — only then do they go into your time tracking.') : '') +
            (bericht.length ? (tage ? ' ' : '') + L(bericht.length === 1 ? 'Eine Berichtsheft-Woche wartet im Berichtsheft.' : bericht.length + ' Berichtsheft-Wochen warten im Berichtsheft.',
                bericht.length === 1 ? 'One report book week is waiting in the report book.' : bericht.length + ' report book weeks are waiting in the report book.') : '');
        el.innerHTML = '<div class="umf-banner-icon" aria-hidden="true">' + ICON + '</div>' +
            '<div class="umf-banner-content">' +
                '<div class="umf-banner-title">' + titel + '</div>' +
                '<div class="umf-banner-text">' + text + '</div>' +
                '<div class="umf-banner-actions">' +
                    (tage ? '<button class="umf-banner-btn" onclick="kiaZeitPruefen()">' + L('Prüfen', 'Review') + '</button>' : '') +
                    (bericht.length ? '<a class="umf-banner-btn" href="' + L('/berichtsheft/', '/en/berichtsheft/') + '">' + L('Zum Berichtsheft', 'Open report book') + '</a>' : '') +
                    (tage ? '<button class="umf-banner-btn umf-banner-btn--quiet" onclick="kiaZeitVerwerfen()">' + L('Verwerfen', 'Discard') + '</button>' : '') +
                '</div>' +
            '</div>';
        el.style.display = '';
    }

    // Tabellenzeilen fuer den Import. Kopf in den Woertern, die mwlDetectMapping
    // kennt; Typ in den Woertern von MWL_TYPE_WORDS (Server: ZEIT_ARTEN).
    function kiaZeilen(liste) {
        const rows = [['Datum', 'Von', 'Bis', 'Stunden', 'Pause', 'Typ', 'Notiz']];
        liste.forEach(d => (d.daten.eintraege || []).forEach(e => {
            // Bei reiner Stundenzahl keine Pause mitgeben: der Import zieht sie
            // sonst von den (schon netto gemeinten) Stunden ab.
            rows.push([e.datum, e.von || '', e.bis || '',
                e.stunden == null ? '' : String(e.stunden).replace('.', ','),
                e.von ? String(e.pause_min || 0) : '', e.art || 'arbeit', e.notiz || '']);
        }));
        return rows;
    }

    function kiaZeitPruefen() {
        const liste = MWLKiApp.entwuerfe('zeit');
        if (!liste.length || typeof openImportWizard !== 'function') return;
        openImportWizard();
        if (typeof _mwlImport === 'undefined') return;
        _mwlImport.fileName = L('KI-Assistent', 'AI assistant');
        mwlImportTakeRows(kiaZeilen(liste));
        mwlImportBuildPreview();
        // Erst NACH dem Uebernehmen loeschen — wer die Vorschau schliesst,
        // behaelt die Entwuerfe.
        _mwlImport.quelle = 'ki';
        _mwlImport.nachher = async function () {
            for (const d of liste) { try { await MWLKiApp.loeschen(d.id); } catch (e) { /* bleibt liegen */ } }
            kiaBanner();
        };
    }

    async function kiaZeitVerwerfen() {
        const liste = MWLKiApp.entwuerfe('zeit');
        const ok = typeof window.mwlConfirm === 'function'
            ? await window.mwlConfirm({ title: L('Einträge verwerfen?', 'Discard entries?'), text: L('Die Vorschläge des Assistenten werden gelöscht.', 'The assistant\'s suggestions will be deleted.'), confirmText: L('Verwerfen', 'Discard') })
            : true;
        if (!ok) return;
        for (const d of liste) { try { await MWLKiApp.loeschen(d.id); } catch (e) { /* bleibt liegen */ } }
        kiaBanner();
    }

    // Beim Start nur, wenn dieses Geraet den Briefkasten schon einmal offen
    // hatte — sonst kein einziger Abruf (Merker in ki-app-briefkasten.js).
    let letzter = 0;
    async function kiaPruefen() {
        if (!MWLKiApp.gemerkt()) return;
        if (Date.now() - letzter < 20000) return;
        letzter = Date.now();
        await MWLKiApp.laden(false);
        kiaBanner();
    }
    document.addEventListener('DOMContentLoaded', () => setTimeout(kiaPruefen, 2500));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kiaPruefen(); });

    // Abschnitt erst beim Oeffnen des Cloud-Tabs laden, wie die Passkeys
    // (an Auth-Ereignisse gehoert kein Netzabruf, CLAUDE.md Supabase-Falle 2).
    document.addEventListener('DOMContentLoaded', () => {
        const vorher = window.switchSettingsTab;
        if (typeof vorher !== 'function') return;
        window.switchSettingsTab = function (tab) {
            vorher.apply(this, arguments);
            if (tab === 'cloud') kiaEinstellungen();
        };
    });

    window.kiaEinstellungen = kiaEinstellungen;
    window.kiaKopieren = kiaKopieren;
    window.kiaTrennen = kiaTrennen;
    window.kiaAusschalten = kiaAusschalten;
    window.kiaZeitPruefen = kiaZeitPruefen;
    window.kiaZeitVerwerfen = kiaZeitVerwerfen;
    window.kiaBanner = kiaBanner;
    window.kiaZeilen = kiaZeilen;   // fuer tools/ki-app.test.mjs (Rundweg durch den Import)
})();
