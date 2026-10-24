// ═══ KI-ASSISTENT MODULE ═══
//
// App-Seite des KI-Briefkastens (Datenschicht: Assets/js/ki-app-briefkasten.js,
// Krypto: Assets/js/ki-krypto.js, Server: workers/mcp-proxy).
//
// 🔴 Die App FUEHRT AUS (Entscheidung des Nutzers 24.10.2026, zweite Runde:
// „der Agent macht alles, der User soll es entspannter haben"). Auftraege des
// Bereichs `app` — Tage anlegen, aendern, loeschen, Einstellungen — werden beim
// naechsten Blick auf die App ohne Pruef-Schritt uebernommen; ein Hinweis mit
// „Rueckgaengig" zeigt, was passiert ist. Berichtsheft-Wochen legt
// /berichtsheft/ selbst an (bh-ki.js). Das Schatten-Heft bleibt bei „pruefen".
//
// Tage entstehen weiterhin NUR ueber die Rechenwege des Imports
// (mwlAnalyzeRows + mwlBuildPreview, components/import/import.js): worked,
// expected und diff muessen exakt wie handleEntry() rechnen. Die Standardpause
// (fehlt pause_min) bilden wir hier nach: ab break.thresh die Pause des
// Wochentags, wie in handleEntry().
//
// Lesen: auf ausdrueckliches Einschalten legt die App eine lesbare Kopie fuer
// den Agenten ab (ki_app_spiegel) und haelt sie nach jedem save() aktuell.
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

    const eingeloggt = () => !!(window.cloudSync && typeof window.cloudSync.isLoggedIn === 'function' && window.cloudSync.isLoggedIn());

    // Arten wie im Werkzeug (Server: ZEIT_ARTEN) ↔ Typen der App
    const ART_ZU_TYP = { arbeit: 'work', schule: 'school', urlaub: 'vacation', krank: 'sick', feiertag: 'holiday', gleittag: 'gleittag' };
    const TYP_ZU_ART = Object.fromEntries(Object.entries(ART_ZU_TYP).map(([a, t]) => [t, a]));
    const TAGE = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];   // Index = getDay()

    // Was der Nutzer geschrieben hat, ohne den System-Vorspann („07:30 - 16:15 (30m Pause) | …").
    // Nicht activityUserNote() (charts.js): die liefert bei nur EINEM Abschnitt ''
    // — die Notiz eines Schultags vom Assistenten (info = reine Notiz) ginge verloren.
    function nutzerNotiz(info) {
        const teile = String(info || '').split('|').map(s => s.trim()).filter(Boolean);
        return teile.length > 1 ? teile.slice(1).join(' · ') : (teile[0] || '');
    }

    function standardPause(datum, von, bis) {
        const brk = (typeof getJobBreak === 'function') ? getJobBreak('primary') : (data.settings && data.settings.break) || {};
        const dow = new Date(datum + 'T12:00:00').getDay();
        const min = Array.isArray(brk.min) ? (brk.min[dow] || 0) : (brk.min || 0);
        const span = mwlSpanHours(von, bis);
        return (brk.thresh > 0 && span >= brk.thresh) ? min : 0;
    }

    // Tage → Tabellenzeilen → Import-Rechnung. ausnahmeId: beim Aendern zaehlt
    // der Eintrag selbst nicht als Dublette und belegt kein Tagessoll.
    function kiaBaue(liste, ausnahmeId) {
        const rows = [['Datum', 'Von', 'Bis', 'Stunden', 'Pause', 'Typ', 'Notiz']];
        liste.forEach(e => {
            const art = e.art || 'arbeit';
            let p = e.pause_min;
            if (e.von && e.bis && (p === null || p === undefined)) p = standardPause(e.datum, e.von, e.bis);
            // Notiz wie handleEntry(): Zeitspanne vorn, Text des Nutzers hinter „ | "
            const info = (art === 'arbeit' && e.von)
                ? e.von + ' - ' + e.bis + (p ? ' (' + p + 'm Pause)' : '') + ' | ' + (e.notiz || '')
                : (e.notiz || '');
            // Bei reiner Stundenzahl keine Pause: der Import zoege sie von den
            // schon netto gemeinten Stunden ab.
            rows.push([e.datum, e.von || '', e.bis || '',
                e.von ? '' : (e.stunden == null ? '' : String(e.stunden).replace('.', ',')),
                e.von ? String(p || 0) : '', art, info]);
        });
        const an = mwlAnalyzeRows(rows);
        const bestehend = new Set(), soll = [];
        (data.entries || []).forEach(x => {
            if (ausnahmeId && String(x.id) === ausnahmeId) return;
            const jid = (typeof getEntryJobId === 'function') ? getEntryJobId(x) : (x.jobId || 'primary');
            bestehend.add(x.date + '|' + jid);
            if ((parseFloat(x.expected) || 0) > 0) soll.push(x.date + '|' + jid);
        });
        return mwlBuildPreview(an.body, an.mapping, {
            jobId: 'primary', defaultType: 'work',
            expectedFor: (typeof mwlExpectedFor === 'function') ? mwlExpectedFor : () => 0,
            bestehend, sollBelegtVorher: soll,
        });
    }

    // ── Ausfuehren ───────────────────────────────────────────────────────
    let rueckgaengig = null;     // { schritte: [fn], text }
    let zuletzt = null;          // Zusammenfassung fuer den Hinweis

    function ausfuehren(auftraege) {
        const undo = [];
        const z = { neu: 0, doppelt: 0, geaendert: 0, geloescht: 0, unbekannt: 0, einstellungen: [] };
        let id = Date.now();

        for (const a of auftraege) {
            const d = a.daten;
            if (d.art === 'zeit') {
                kiaBaue(d.eintraege || []).forEach(r => {
                    if (!r.ok) { z.unbekannt++; return; }
                    if (r.dublette) { z.doppelt++; return; }
                    const e = Object.assign({}, r.entry, { id: id, timestamp: id, importedAt: new Date().toISOString(), quelle: 'ki' });
                    id++;
                    data.entries.push(e);
                    undo.push(() => { data.entries = data.entries.filter(x => x.id !== e.id); });
                    z.neu++;
                });
            } else if (d.art === 'zeit_aendern') {
                (d.aenderungen || []).forEach(c => {
                    const idx = data.entries.findIndex(x => String(x.id) === c.id);
                    if (idx < 0) { z.unbekannt++; return; }
                    const alt = data.entries[idx];
                    const zeitGeaendert = ('von' in c) || ('bis' in c);
                    const m = {
                        datum: alt.date,
                        art: TYP_ZU_ART[alt.type] || 'arbeit',
                        von: alt.start || '', bis: alt.end || '',
                        pause_min: alt.start ? (alt.breakMins || 0) : null,
                        stunden: alt.start ? null : alt.worked,
                        notiz: nutzerNotiz(alt.info),
                    };
                    Object.assign(m, c);
                    // Neue Uhrzeit ohne genannte Pause → Standard des Wochentags
                    if (zeitGeaendert && !('pause_min' in c)) m.pause_min = null;
                    // Uhrzeit entfernt → es zaehlt die Stundenzahl; fehlt sie, die bisherige.
                    if (!m.von) { m.von = ''; m.bis = ''; if (m.stunden == null) m.stunden = alt.worked; }
                    const r = kiaBaue([m], c.id)[0];
                    if (!r || !r.ok) { z.unbekannt++; return; }
                    const neu = Object.assign({}, alt, r.entry, { id: alt.id, timestamp: alt.timestamp, geaendertVon: 'ki' });
                    data.entries[idx] = neu;
                    undo.push(() => { const j = data.entries.findIndex(x => x.id === alt.id); if (j >= 0) data.entries[j] = alt; });
                    z.geaendert++;
                });
            } else if (d.art === 'zeit_loeschen') {
                (d.ids || []).forEach(i => {
                    const idx = data.entries.findIndex(x => String(x.id) === i);
                    if (idx < 0) { z.unbekannt++; return; }
                    const weg = data.entries[idx];
                    data.entries.splice(idx, 1);
                    data.trash = data.trash || [];
                    const t = { entry: weg, originalIndex: idx, deletedAt: Date.now() };
                    data.trash.push(t);
                    undo.push(() => { data.trash = data.trash.filter(x => x !== t); data.entries.push(weg); });
                    z.geloescht++;
                });
            } else if (d.art === 'einstellungen') {
                const s = data.settings;
                const vorher = JSON.parse(JSON.stringify({
                    name: s.name, job: s.job, jobCustom: s.jobCustom, bundesland: s.bundesland,
                    hours: s.hours, break: s.break, vacation: s.vacation, eingerichtet: s.eingerichtet,
                }));
                einstellungenAnwenden(d.patch || {}, z);
                undo.push(() => Object.assign(data.settings, vorher));
            }
        }
        return { undo, z };
    }

    function einstellungenAnwenden(p, z) {
        const s = data.settings;
        if ('name' in p) { s.name = p.name; z.einstellungen.push(L('Name', 'name')); }
        if ('beruf' in p) {
            // Bekannten Beruf auf seinen Schluessel abbilden, sonst Freitext.
            const sel = document.getElementById('confJob');
            const ziel = String(p.beruf).toLowerCase();
            const opt = sel ? [...sel.options].find(o => o.value && o.textContent.trim().toLowerCase() === ziel) ||
                [...sel.options].find(o => o.value && o.value !== 'sonstige' && o.textContent.toLowerCase().includes(ziel)) : null;
            if (opt) { s.job = opt.value; } else { s.job = 'sonstige'; s.jobCustom = String(p.beruf).slice(0, 80); }
            z.einstellungen.push(L('Beruf', 'occupation'));
        }
        if ('bundesland' in p) { s.bundesland = p.bundesland; z.einstellungen.push(L('Bundesland', 'state')); }
        if (p.sollstunden) {
            if (!Array.isArray(s.hours)) s.hours = [0, 0, 0, 0, 0, 0, 0];
            Object.entries(p.sollstunden).forEach(([t, v]) => { s.hours[TAGE.indexOf(t)] = v; });
            s.eingerichtet = true;
            z.einstellungen.push(L('Sollstunden', 'target hours'));
        }
        if (p.pausen || 'pause_ab_stunden' in p) {
            s.break = s.break || { min: [0, 30, 30, 30, 30, 30, 0], thresh: 6 };
            if (!Array.isArray(s.break.min)) s.break.min = [0, 30, 30, 30, 30, 30, 0];
            if (p.pausen) Object.entries(p.pausen).forEach(([t, v]) => { s.break.min[TAGE.indexOf(t)] = v; });
            if ('pause_ab_stunden' in p) s.break.thresh = p.pause_ab_stunden;
            z.einstellungen.push(L('Pausen', 'breaks'));
        }
        if ('urlaubstage' in p || 'urlaub_uebertrag' in p) {
            s.vacation = s.vacation || { total: 30, used: 0, usedManual: 0, mode: 'days' };
            const faktor = s.vacation.mode === 'hours' && typeof getVacationRefHours === 'function' ? getVacationRefHours() : 1;
            if ('urlaubstage' in p) s.vacation.total = p.urlaubstage * faktor;
            if ('urlaub_uebertrag' in p) s.vacation.carriedOver = p.urlaub_uebertrag * faktor;
            z.einstellungen.push(L('Urlaub', 'leave'));
        }
    }

    function nachAenderung() {
        if (typeof recalculateVacationUsed === 'function') { try { recalculateVacationUsed(); } catch (e) { /* weiter */ } }
        if (typeof dedupeDayExpected === 'function') { try { dedupeDayExpected(); } catch (e) { /* weiter */ } }
        data.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        save();
        if (typeof renderAll === 'function') { try { renderAll(); } catch (e) { /* weiter */ } }
    }

    async function kiaAusfuehren() {
        const auftraege = MWLKiApp.alle.filter(a => !a.fehler && a.daten && ['zeit', 'zeit_aendern', 'zeit_loeschen', 'einstellungen'].includes(a.daten.art));
        if (!auftraege.length || typeof mwlBuildPreview !== 'function' || typeof data === 'undefined') return;
        const { undo, z } = ausfuehren(auftraege);
        nachAenderung();
        // Erst nach dem Speichern aus dem Briefkasten nehmen.
        for (const a of auftraege) { try { await MWLKiApp.loeschen(a.id); } catch (e) { /* naechstes Mal wieder — Dubletten faengt der Import */ } }
        rueckgaengig = undo.length ? undo : null;
        zuletzt = z;
        if (typeof mwlEvent === 'function') mwlEvent('ki_ausgefuehrt', { neu: z.neu, geaendert: z.geaendert, geloescht: z.geloescht, einstellungen: z.einstellungen.length });
        kiaBanner();
    }

    function kiaRueckgaengig() {
        if (!rueckgaengig) return;
        rueckgaengig.slice().reverse().forEach(f => { try { f(); } catch (e) { /* weiter */ } });
        rueckgaengig = null;
        zuletzt = { zurueck: true };
        nachAenderung();
        kiaBanner();
    }

    // ── Lese-Kopie ───────────────────────────────────────────────────────
    function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

    function kiaSpiegel() {
        const s = data.settings || {};
        const proTag = arr => Object.fromEntries(TAGE.map((t, i) => [t, Array.isArray(arr) ? (arr[i] || 0) : (arr || 0)]));
        const sel = document.getElementById('confJob');
        const opt = sel && s.job ? [...sel.options].find(o => o.value === s.job) : null;
        const beruf = s.job === 'sonstige' ? (s.jobCustom || '') : (opt ? opt.textContent.trim() : (s.job || ''));
        const heute = new Date();
        const grenze = iso(new Date(heute.getTime() - 400 * 864e5));
        const eintraege = (data.entries || []).filter(e => e.date >= grenze)
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .map(e => ({
                id: String(e.id), datum: e.date, art: TYP_ZU_ART[e.type] || e.type,
                von: e.start || '', bis: e.end || '', pause_min: e.breakMins || 0,
                stunden: +e.worked || 0, soll: +e.expected || 0, diff: +e.diff || 0,
                notiz: nutzerNotiz(e.info).slice(0, 200), job: e.jobId || 'primary',
            }));
        // Fehlende Arbeitstage: Soll > 0, kein Eintrag, kein Feiertag, die
        // letzten sechs Wochen bis gestern, nie vor dem ersten Eintrag.
        const daten = new Set((data.entries || []).map(e => e.date));
        const erster = (data.entries || []).reduce((m, e) => (!m || e.date < m ? e.date : m), '');
        const feiertage = new Set();
        if (typeof getGermanHolidays === 'function') {
            [heute.getFullYear() - 1, heute.getFullYear()].forEach(j => { try { getGermanHolidays(j).forEach(h => feiertage.add(h.date)); } catch (e) { /* ohne */ } });
        }
        const offen = [];
        for (let i = 42; i >= 1; i--) {
            const t = new Date(heute.getTime() - i * 864e5), k = iso(t);
            const sollTag = Array.isArray(s.hours) ? (s.hours[t.getDay()] || 0) : 0;
            if (sollTag > 0 && erster && k >= erster && !daten.has(k) && !feiertage.has(k)) offen.push(k);
        }
        const vac = s.vacation || {};
        return {
            v: 1,
            stand: new Date().toISOString(),
            einstellungen: {
                name: s.name || '', beruf, bundesland: s.bundesland || '',
                sollstunden: proTag(s.hours), pausen: proTag(s.break && s.break.min),
                pause_ab_stunden: (s.break && s.break.thresh) || 0,
                urlaub: { modus: vac.mode || 'days', anspruch: vac.total || 0, uebertrag: vac.carriedOver || 0, genommen: vac.used || 0 },
                mehrere_jobs: (typeof hasMultipleJobs === 'function') ? !!hasMultipleJobs() : false,
            },
            offene_tage: offen,
            konten: {
                summe_saldo_h: Math.round((data.entries || []).reduce((n, e) => n + (+e.diff || 0), 0) * 100) / 100,
                urlaub_rest: Math.round(((vac.total || 0) + (vac.carriedOver || 0) - (vac.used || 0)) * 100) / 100,
            },
            eintraege,
            berichte: MWLKiApp.berichteUeberblick(),
        };
    }

    let spiegelTimer = null;
    function kiaSpiegelBald() {
        if (!MWLKiApp.lesenAn() || !eingeloggt()) return;
        clearTimeout(spiegelTimer);
        spiegelTimer = setTimeout(() => { MWLKiApp.spiegelSchreiben(kiaSpiegel()).catch(e => console.warn('[KI-Assistent] Kopie:', e && e.message)); }, 4000);
    }

    async function kiaLesen(an) {
        try {
            await MWLKiApp.lesenSetzen(an, an ? kiaSpiegel() : null);
            if (typeof mwlEvent === 'function') mwlEvent('ki_lesen', { an: !!an });
        } catch (e) {
            if (typeof showCustomMessage === 'function') showCustomMessage(L('Hat nicht geklappt', 'That did not work'), L('Prüf deine Verbindung und versuch es erneut.', 'Check your connection and try again.'), 'error');
        }
        try { localStorage.setItem('mwl_ki_lesen_gefragt', '1'); } catch (e) { /* egal */ }
        kiaRenderEinstellungen(MWLKiApp.status);
        kiaBanner();
    }

    // ── Einstellungen ────────────────────────────────────────────────────
    async function kiaEinstellungen() {
        const box = document.getElementById('kiAppSection');
        if (!box) return;
        box.style.display = '';
        box.innerHTML = '<div class="settings-section-title">' + L('KI-Assistent', 'AI assistant') + '</div>' +
            '<p class="kia-lead">' + L('Einen Moment …', 'One moment …') + '</p>';
        if (eingeloggt()) await MWLKiApp.laden(true);
        kiaRenderEinstellungen(eingeloggt() ? MWLKiApp.status : 'konto');
    }

    function kiaRenderEinstellungen(status) {
        const box = document.getElementById('kiAppSection');
        if (!box) return;
        const lead = '<p class="kia-lead">' + L(
            'Verbinde Claude, ChatGPT & Co. mit MyWorkLog. Sag deinem Assistenten einfach, wie dein Tag war — er trägt Arbeitszeiten ein, korrigiert sie, schreibt Berichtsheft-Wochen, richtet deine Einstellungen ein und schlägt deine Rechte als Azubi nach. Die App übernimmt das selbst; du kannst es rückgängig machen.',
            'Connect Claude, ChatGPT & co. to MyWorkLog. Just tell your assistant how your day went — it adds and corrects working hours, writes report book weeks, sets up your settings and looks up your rights as an apprentice. The app applies it by itself; you can undo it.') + '</p>';
        let teil = '';
        if (status === 'konto') {
            teil = '<button class="settings-btn settings-btn-primary kia-voll" onclick="openCloudLoginModal()">' + L('Erst anmelden', 'Sign in first') + '</button>';
        } else if (status === 'code') {
            teil = '<p class="kia-note">' + L('Dieses Gerät kennt deinen Wiederherstellungs-Code noch nicht. Den braucht der Briefkasten, damit nur du die Aufträge deines Assistenten öffnen kannst. Lade einmal oben in die Cloud hoch oder hol deine Daten herunter, dann fragt die App danach.',
                'This device does not know your recovery code yet. The mailbox needs it so only you can open your assistant\'s requests. Upload to the cloud above once or restore your data, then the app asks for it.') + '</p>';
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
            // Lese-Freigabe: ehrlich beschriftet — diese Kopie IST lesbar.
            const an = MWLKiApp.lesenAn();
            teil += '<label class="kia-schalter"><input type="checkbox" ' + (an ? 'checked ' : '') + 'onchange="kiaLesen(this.checked)">' +
                '<span><b>' + L('Lesen erlauben', 'Allow reading') + '</b>' +
                L('Dein Assistent sieht deine Einstellungen, Zeiteinträge und Berichtsheft-Wochen und weiß so, was fehlt. Dafür liegt eine lesbare Kopie davon auf dem Server — getrennt von deinem verschlüsselten Backup, ohne Schatten-Berichtsheft. Ausschalten löscht sie.',
                  'Your assistant sees your settings, time entries and report book weeks and so knows what is missing. For this a readable copy is kept on the server — separate from your encrypted backup, without the shadow report book. Switching off deletes it.') + '</span></label>';
            if (status === 'fremd') {
                teil += '<p class="kia-note">' + L('Dein Wiederherstellungs-Code hat sich geändert. Beim Kopieren wird der Briefkasten neu eingerichtet; liegende Aufträge werden dabei gelöscht.',
                    'Your recovery code has changed. Copying sets the mailbox up again; waiting requests are deleted.') + '</p>';
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
            ? await window.mwlConfirm({ title: L('Briefkasten ausschalten?', 'Switch mailbox off?'), text: L('Verbundene Assistenten können danach nichts mehr eintragen.', 'Connected assistants can no longer add anything.') + (n ? ' ' + L(n + ' wartende Aufträge werden gelöscht.', n + ' waiting requests will be deleted.') : ''), confirmText: L('Ausschalten', 'Switch off') })
            : true;
        if (!ok) return;
        try { await MWLKiApp.ausschalten(); } catch (e) { /* s. o. */ }
        kiaRenderEinstellungen(MWLKiApp.status);
        kiaBanner();
    }

    // ── Dashboard-Hinweis ────────────────────────────────────────────────
    const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.6 4.9L18.5 9.5l-4.9 1.6L12 16l-1.6-4.9L5.5 9.5l4.9-1.6z"/><path d="M19 15l.7 2.1 2.1.7-2.1.7L19 20.6l-.7-2.1-2.1-.7 2.1-.7z"/></svg>';

    function teile(z) {
        const t = [];
        if (z.neu) t.push(z.neu === 1 ? L('einen Tag eingetragen', 'added one day') : L(z.neu + ' Tage eingetragen', 'added ' + z.neu + ' days'));
        if (z.geaendert) t.push(z.geaendert === 1 ? L('einen Tag korrigiert', 'corrected one day') : L(z.geaendert + ' Tage korrigiert', 'corrected ' + z.geaendert + ' days'));
        if (z.geloescht) t.push(z.geloescht === 1 ? L('einen Tag gelöscht', 'deleted one day') : L(z.geloescht + ' Tage gelöscht', 'deleted ' + z.geloescht + ' days'));
        if (z.einstellungen.length) t.push(L('Einstellungen angepasst (', 'adjusted settings (') + z.einstellungen.join(', ') + ')');
        return t;
    }

    function kiaBanner() {
        const el = document.getElementById('kiAppBanner');
        if (!el) return;
        const bericht = MWLKiApp.status === 'an' ? MWLKiApp.entwuerfe('bericht') : [];
        let titel = '', text = '', knoepfe = '';

        if (zuletzt && zuletzt.zurueck) {
            titel = L('Rückgängig gemacht', 'Undone');
            text = L('Die Änderungen deines Assistenten sind zurückgenommen.', 'Your assistant\'s changes have been reverted.');
            knoepfe = '<button class="umf-banner-btn umf-banner-btn--quiet" onclick="kiaHinweisWeg()">' + L('OK', 'OK') + '</button>';
        } else if (zuletzt && teile(zuletzt).length) {
            const t = teile(zuletzt);
            titel = L('Dein KI-Assistent hat ', 'Your AI assistant ') + t.join(', ');
            const extra = [];
            if (zuletzt.doppelt) extra.push(L(zuletzt.doppelt + ' Tag(e) gab es schon — übersprungen.', zuletzt.doppelt + ' day(s) already existed — skipped.'));
            if (zuletzt.unbekannt) extra.push(L(zuletzt.unbekannt + ' Auftrag/Aufträge passten nicht (Eintrag nicht gefunden).', zuletzt.unbekannt + ' request(s) did not fit (entry not found).'));
            text = extra.join(' ') || L('Alles ist schon in deiner Zeiterfassung.', 'Everything is already in your time tracking.');
            knoepfe = (rueckgaengig ? '<button class="umf-banner-btn" onclick="kiaRueckgaengig()">' + L('Rückgängig', 'Undo') + '</button>' : '') +
                '<button class="umf-banner-btn umf-banner-btn--quiet" onclick="kiaHinweisWeg()">' + L('OK', 'OK') + '</button>';
        } else if (MWLKiApp.status === 'an' && eingeloggt() && !MWLKiApp.lesenAn() && !gefragtLesen()) {
            titel = L('Soll dein Assistent sehen, was schon eingetragen ist?', 'Should your assistant see what is already recorded?');
            text = L('Dann weiß er, welche Tage fehlen, und fragt nicht nach. Dafür liegt eine lesbare Kopie deiner Zeiten und Einstellungen auf dem Server — dein Backup und das Schatten-Berichtsheft bleiben verschlüsselt.',
                     'Then it knows which days are missing and doesn\'t have to ask. A readable copy of your hours and settings is kept on the server for this — your backup and the shadow report book stay encrypted.');
            knoepfe = '<button class="umf-banner-btn" onclick="kiaLesen(true)">' + L('Erlauben', 'Allow') + '</button>' +
                '<button class="umf-banner-btn umf-banner-btn--quiet" onclick="kiaLesenNein()">' + L('Nein danke', 'No thanks') + '</button>';
        }
        if (bericht.length && !titel) {
            titel = L(bericht.length === 1 ? 'Eine Berichtsheft-Woche ist fertig' : bericht.length + ' Berichtsheft-Wochen sind fertig',
                      bericht.length === 1 ? 'One report book week is ready' : bericht.length + ' report book weeks are ready');
            text = L('Sie wird beim Öffnen des Berichtshefts angelegt.', 'It is created when you open the report book.');
            knoepfe = '<a class="umf-banner-btn" href="' + L('/berichtsheft/', '/en/berichtsheft/') + '">' + L('Zum Berichtsheft', 'Open report book') + '</a>';
        }
        if (!titel) { el.style.display = 'none'; el.innerHTML = ''; return; }
        el.innerHTML = '<div class="umf-banner-icon" aria-hidden="true">' + ICON + '</div>' +
            '<div class="umf-banner-content">' +
                '<div class="umf-banner-title">' + titel + '</div>' +
                '<div class="umf-banner-text">' + text + '</div>' +
                '<div class="umf-banner-actions">' + knoepfe + '</div>' +
            '</div>';
        el.style.display = '';
    }

    function gefragtLesen() { try { return localStorage.getItem('mwl_ki_lesen_gefragt') === '1'; } catch (e) { return true; } }
    function kiaLesenNein() { try { localStorage.setItem('mwl_ki_lesen_gefragt', '1'); } catch (e) { /* egal */ } kiaBanner(); }
    function kiaHinweisWeg() { zuletzt = null; rueckgaengig = null; kiaBanner(); }

    // Beim Start nur, wenn dieses Geraet den Briefkasten schon einmal offen
    // hatte — sonst kein einziger Abruf (Merker in ki-app-briefkasten.js).
    // Ausnahme: die Pille wurde gedrueckt (Wunsch gemerkt) und man ist jetzt
    // angemeldet — dann schaltet laden() den Briefkasten ein.
    let letzter = 0;
    async function kiaPruefen() {
        if (!MWLKiApp.gemerkt() && !(MWLKiApp.gewuenscht() && eingeloggt())) return;
        if (Date.now() - letzter < 20000) return;
        letzter = Date.now();
        await MWLKiApp.laden(false);
        if (MWLKiApp.status === 'an') await kiaAusfuehren();
        kiaBanner();
        kiaChip();
    }

    // Dashboard: Symbol in der Leiste statt Pille (Platz, Wunsch des Nutzers
    // 24.10.2026). Punkt = „neu", bis einmal geklickt; danach nur noch das
    // Symbol, das den Satz fuer weitere Agenten erneut kopiert.
    const CHIP_GESEHEN = 'mwl_ki_chip_gesehen';
    function kiaChip() {
        const b = document.getElementById('kiChipDash');
        if (!b) return;
        let gesehen = false;
        try { gesehen = localStorage.getItem(CHIP_GESEHEN) === '1'; } catch (e) { /* Punkt zeigen */ }
        const titel = MWLKiApp.gemerkt()
            ? L('KI-Assistent verbunden — klicken kopiert den Satz für einen weiteren', 'AI assistant connected — click copies the line for another one')
            : L('KI-Assistent verbinden — kopiert einen Satz für Claude, ChatGPT & Co.', 'Connect your AI assistant — copies one line for Claude, ChatGPT & co.');
        b.title = titel;
        b.setAttribute('aria-label', titel);
        document.getElementById('kiChipPunkt').hidden = gesehen;
        b.hidden = false;
        if (b.dataset.verdrahtet) return;
        b.dataset.verdrahtet = '1';
        b.addEventListener('click', async () => {
            const tip = b.querySelector('.dn-ki__tip');
            const ok = await MWLKiApp.verbindenKopieren('dashboard', eingeloggt);
            tip.textContent = ok ? L('Kopiert — im Chat einfügen', 'Copied — paste it in the chat')
                                 : L('Kopieren nicht erlaubt', 'Copying not allowed');
            try { localStorage.setItem(CHIP_GESEHEN, '1'); } catch (e) { /* egal */ }
            document.getElementById('kiChipPunkt').hidden = true;
            b.classList.add('is-kopiert');
            clearTimeout(b._weg);
            b._weg = setTimeout(() => b.classList.remove('is-kopiert'), 2600);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        kiaChip();
        setTimeout(kiaPruefen, 2500);
        // Waehrend die App sichtbar ist, jede Minute nachsehen — der Nutzer
        // spricht im Chat, die App soll es dabei schon uebernehmen.
        setInterval(() => { if (!document.hidden) kiaPruefen(); }, 60000);
        // Kopie nach jedem Speichern auffrischen (nur mit Freigabe, entprellt).
        const orig = window.save;
        if (typeof orig === 'function' && !orig._kiKopie) {
            window.save = function () { const r = orig.apply(this, arguments); kiaSpiegelBald(); return r; };
            window.save._kiKopie = true;
        }
        if (MWLKiApp.lesenAn()) setTimeout(kiaSpiegelBald, 3000);
    });
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
    window.kiaBanner = kiaBanner;
    window.kiaRueckgaengig = kiaRueckgaengig;
    window.kiaHinweisWeg = kiaHinweisWeg;
    window.kiaLesen = kiaLesen;
    window.kiaLesenNein = kiaLesenNein;
    window.kiaPruefen = kiaPruefen;
    // fuer tools/ki-app.test.mjs
    window.__kia = { kiaBaue, ausfuehren, kiaSpiegel, standardPause, nutzerNotiz };
})();
