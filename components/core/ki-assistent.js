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

    // entry.info ist ein Pipe-String: Vermerke der App (handleEntry, Schulregeln,
    // Import) plus die Notiz des Nutzers. Die Vermerke werden am MUSTER erkannt,
    // nicht an der Position: ein Schultag vom Assistenten hat gar keinen, ein
    // Schultag aus handleEntry ohne Notiz hat NUR einen. 🔴 „Keine Berufsschule
    // (Regulär)" ist so ein Vermerk (Schultag ausserhalb Mi/ungeraden Do) — der
    // Agent las ihn als Aussage des Nutzers und meldete „Schule gebucht, obwohl
    // keine Schule war" (24.10.2026).
    const VERMERK = /^(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}|Manuell|Live-Tracker|Berufsschule|Keine Berufsschule|Gleittag|Urlaubstag|Krankmeldung|Feiertag|Import|Korrektur|↪)/;
    function infoTeile(info) {
        const vermerk = [], notiz = [];
        String(info || '').split('|').map(s => s.trim()).filter(Boolean)
            .forEach(t => (VERMERK.test(t) ? vermerk : notiz).push(t));
        return { vermerk: vermerk.join(' · '), notiz: notiz.join(' · ') };
    }
    function nutzerNotiz(info) { return infoTeile(info).notiz; }

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
        // Eigene Eintragstypen (data.customEntryTypes) kennt der Import nicht:
        // als Arbeitszeit rechnen lassen, danach den Typ umsetzen.
        const eigen = [];
        liste.forEach(e0 => {
            let e = e0;
            let art = e.art || 'arbeit';
            const istEigen = !ART_ZU_TYP[art];
            eigen.push(istEigen ? art : null);
            if (istEigen) art = 'arbeit';
            let p = e.pause_min;
            // Eigene Typen: keine Standardpause, wie in handleEntry() (Pause nur, wenn genannt).
            if (e.von && e.bis && (p === null || p === undefined)) p = istEigen ? 0 : standardPause(e.datum, e.von, e.bis);
            if (istEigen && !e.von && e.stunden == null) e = Object.assign({}, e, { stunden: 0 });
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
        const vorschau = mwlBuildPreview(an.body, an.mapping, {
            jobId: 'primary', defaultType: 'work',
            expectedFor: (typeof mwlExpectedFor === 'function') ? mwlExpectedFor : () => 0,
            bestehend, sollBelegtVorher: soll,
        });
        // handleEntry(): ein eigener Typ zaehlt nur mit countsAsWork gegen das
        // Soll, sonst ist er neutral (diff 0).
        vorschau.forEach((r, i) => {
            if (!r.ok || !eigen[i]) return;
            r.entry.type = eigen[i];
            const info = typeof getEntryTypeInfo === 'function' ? getEntryTypeInfo(eigen[i]) : null;
            if (!(info && info.countsAsWork === true)) r.entry.diff = 0;
        });
        return vorschau;
    }

    // ── Freier Zugriff auf die App-Daten ─────────────────────────────────
    // Wunsch des Nutzers 24.10.2026: „der Agent soll ALLES koennen". Statt je
    // Einstellung ein Werkzeug: Operationen auf Pfade in `data`. Tage laufen
    // trotzdem NUR ueber die Zeit-Werkzeuge (Rechnung wie handleEntry), deshalb
    // sind entries/trash hier gesperrt. Schutz gegen Kaputtschreiben: ein Wert
    // darf seinen Typ nicht wechseln (Zahl bleibt Zahl, Liste bleibt Liste) —
    // sonst wirft die App beim naechsten Rendern. Rueckgaengig: Schnappschuss.
    const GESPERRT_WURZEL = new Set(['entries', 'trash']);
    const GESPERRT_TEIL = /^(__proto__|prototype|constructor|navVersion)$|key|token|secret|passw/i;
    function pfadTeile(pfad) {
        const t = String(pfad || '').split('.').filter(x => x !== '');
        if (!t.length || t.length > 8) return null;
        if (t.some(x => !/^[A-Za-z0-9_-]{1,60}$/.test(x) || GESPERRT_TEIL.test(x))) return null;
        if (GESPERRT_WURZEL.has(t[0])) return null;
        return t;
    }
    const sorte = v => Array.isArray(v) ? 'liste' : (v === null ? 'leer' : typeof v);
    const INDEX = /^[0-9]+$/;
    function datenOp(o) {
        const t = o && pfadTeile(o.pfad);
        if (!t) return false;
        let el = data;
        for (let i = 0; i < t.length - 1; i++) {
            if (el[t[i]] === undefined || el[t[i]] === null) {
                if (o.op === 'loeschen') return true;
                el[t[i]] = INDEX.test(t[i + 1]) ? [] : {};
            }
            el = el[t[i]];
            if (!el || typeof el !== 'object') return false;
        }
        const k = t[t.length - 1], alt = el[k];
        if (o.op === 'loeschen') {
            if (Array.isArray(el) && INDEX.test(k)) el.splice(+k, 1); else delete el[k];
            return true;
        }
        if (o.op === 'anhaengen') {
            if (alt === undefined) el[k] = [];
            if (!Array.isArray(el[k])) return false;
            el[k].push(o.wert);
            return true;
        }
        if (o.op === 'zusammenfuehren') {
            if (!o.wert || typeof o.wert !== 'object' || Array.isArray(o.wert)) return false;
            if (alt === undefined || alt === null) el[k] = {};
            if (sorte(el[k]) !== 'object') return false;
            Object.assign(el[k], o.wert);
            return true;
        }
        if (o.op === 'setzen') {
            if (alt !== undefined && alt !== null && o.wert !== null && sorte(alt) !== sorte(o.wert)) return false;
            el[k] = o.wert;
            return true;
        }
        return false;
    }
    // Eigene Eintragstypen nach jeder Aenderung in Form bringen — ein Typ ohne
    // id oder Namen zerlegt Filter und Legende.
    function typenPflegen() {
        if (!Array.isArray(data.customEntryTypes)) { data.customEntryTypes = []; return; }
        const def = typeof isDefaultType === 'function' ? isDefaultType : () => false;
        const ids = new Set();
        data.customEntryTypes = data.customEntryTypes.filter(t => t && typeof t === 'object' && String(t.label || '').trim()).map(t => {
            let id = String(t.id || '').trim() || 'custom_' + String(t.label).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
            while (def(id) || ids.has(id)) id += '_2';
            ids.add(id);
            // Felder wie createCustomType() (custom-types-fields.js)
            return Object.assign({ iconMode: 'svg', icon: '', description: '', countsAsWork: false, createdAt: new Date().toISOString() }, t, {
                id, label: String(t.label).trim().slice(0, 40), emoji: t.emoji || '',
                color: /^#[0-9a-f]{3,8}$/i.test(t.color || '') ? t.color : '#64748b' });
        });
    }
    function appDaten() {
        const kopie = (v, tiefe) => {
            if (tiefe > 8 || v === null || typeof v !== 'object') return v;
            if (Array.isArray(v)) return v.map(x => kopie(x, tiefe + 1));
            const o = {};
            Object.keys(v).forEach(k => { if (!GESPERRT_TEIL.test(k)) o[k] = kopie(v[k], tiefe + 1); });
            return o;
        };
        const o = {};
        Object.keys(data || {}).forEach(k => { if (!GESPERRT_WURZEL.has(k) && !GESPERRT_TEIL.test(k)) o[k] = kopie(data[k], 0); });
        return o;
    }

    // ── Der Rest der App (seit 9.3.0) ────────────────────────────────────
    // Wunsch des Nutzers 24.10.2026: „wirklich komplett, ausser Schatten".
    // Jede Art schreibt ins Protokoll (MWLKiApp.protokollieren), auch wenn
    // sie scheitert — der Agent liest es in myworklog_stand.
    const prot = (art, text) => { try { MWLKiApp.protokollieren(art, text); } catch (e) { /* egal */ } };
    const lsLesen = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } };
    const uhr = ms => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

    // Stempeluhr: dieselben Felder wie timerAction() (dashboard.js), aber mit
    // dem Zeitpunkt aus dem Auftrag statt Date.now() — der Agent sagt „seit
    // 7:30", und die App ist vielleicht erst um 9 offen.
    // Stop bucht NICHT ueber handleEntry() (das liest Formularfelder und
    // Date.now()), sondern als von/bis/Pause durch denselben Import wie jeder
    // andere Tag. timer.paused ist reine Laufzeit, breakTime die Pause.
    function timerAuftrag(d, z, undo) {
        if (typeof timer === 'undefined' || typeof logTimerAction !== 'function') { prot('Stempeluhr', 'NICHT ausgeführt: Stempeluhr nicht geladen'); return; }
        const [h, m] = String(d.uhrzeit || '').split(':').map(Number);
        const t0 = new Date(d.datum + 'T00:00:00'); t0.setHours(h, m, 0, 0);
        const t = Math.min(t0.getTime(), Date.now());
        const vorher = JSON.stringify(timer);
        const box = document.getElementById('timerBox');
        const zurueck = () => { const v = JSON.parse(vorher); Object.keys(timer).forEach(k => delete timer[k]); Object.assign(timer, v); saveTimerState(); if (typeof displayTimerTime === 'function') displayTimerTime(timer.paused || 0); };
        if (d.aktion === 'start' || d.aktion === 'weiter') {
            if (timer.running) { prot('Stempeluhr', 'läuft schon seit ' + uhr(timer.start) + ' — nichts geändert'); return; }
            timer.start = t; timer.running = true;
            logTimerAction('start', t);
            if (typeof timerRun === 'function') timerRun();
            if (box) box.classList.add('timer-active');
            undo.push(zurueck);
            const weiter = timer.paused > 0;
            z.timer = weiter ? L('die Stempeluhr um ' + d.uhrzeit + ' weiterlaufen lassen', 'resumed the time clock at ' + d.uhrzeit)
                             : L('die Stempeluhr um ' + d.uhrzeit + ' gestartet', 'started the time clock at ' + d.uhrzeit);
            prot('Stempeluhr', (weiter ? 'weiter' : 'gestartet') + ' um ' + d.uhrzeit);
            return;
        }
        if (d.aktion === 'pause') {
            if (!timer.running) { prot('Stempeluhr', 'NICHT pausiert: läuft gerade nicht'); return; }
            timer.running = false;
            timer.paused += Math.max(0, t - timer.start);
            logTimerAction('pause', t);
            if (box) box.classList.remove('timer-active');
            if (typeof displayTimerTime === 'function') displayTimerTime(timer.paused);
            undo.push(zurueck);
            z.timer = L('die Stempeluhr um ' + d.uhrzeit + ' angehalten', 'paused the time clock at ' + d.uhrzeit);
            prot('Stempeluhr', 'Pause um ' + d.uhrzeit);
            return;
        }
        // stop
        const log = (timer.log || []).slice();
        const erster = log.find(l => l.action === 'start');
        const vonMs = erster ? erster.time : (timer.running ? timer.start : 0);
        if (!vonMs) { prot('Stempeluhr', 'NICHT gebucht: Stempeluhr lief nicht'); return; }
        let pauseMs = timer.breakTime || 0;
        const letzte = log[log.length - 1];
        if (letzte && letzte.action === 'pause') pauseMs += Math.max(0, t - letzte.time);
        const datum = iso(new Date(vonMs)), von = uhr(vonMs), bis = uhr(t);
        // Mindestpause wie handleEntry(): reicht die gemessene nicht, gilt die des Wochentags.
        const pause = Math.max(Math.round(pauseMs / 60000), standardPause(datum, von, bis));
        const r = kiaBaue([{ datum, von, bis, pause_min: pause, notiz: d.notiz || '' }])[0];
        if (!r || !r.ok) { prot('Stempeluhr', 'NICHT gebucht: Zeiten ungültig (' + von + '–' + bis + ')'); return; }
        const id = Math.max(Date.now(), ...(data.entries || []).map(x => Math.floor(+x.id) || 0)) + 1;
        const e = Object.assign({}, r.entry, { id, timestamp: id, quelle: 'ki' });
        e.info = 'Live-Tracker (' + (+e.worked).toFixed(2) + 'h) | ' + (e.info || '');
        data.entries.push(e);
        Object.keys(timer).forEach(k => delete timer[k]);
        Object.assign(timer, { id: null, start: 0, paused: 0, running: false, log: [], breakTime: 0 });
        saveTimerState();
        if (typeof displayTimerTime === 'function') displayTimerTime(0);
        if (box) box.classList.remove('timer-active');
        undo.push(() => { data.entries = data.entries.filter(x => x.id !== e.id); zurueck(); });
        z.neu++;
        z.timer = L('die Stempeluhr gestoppt (' + von + '–' + bis + ')', 'stopped the time clock (' + von + '–' + bis + ')');
        prot('Stempeluhr', 'gestoppt: ' + datum + ' ' + von + '–' + bis + ', ' + pause + ' min Pause, ' + (+e.worked).toFixed(2) + ' h');
    }

    // Aufgaben (/aufgaben/): gleiche Schluessel und Formen wie aufgaben.js.
    // Die Seite laedt bei jedem fremden Schreiben neu (storage-Ereignis), ein
    // offener Tab ueberschreibt also nichts.
    const AG = { cats: 'mwl_tasks_cats', states: 'mwl_tasks_states', notes: 'mwl_tasks_notes', stats: 'mwl_tasks_stats' };
    function aufgabenAuftrag(ops, z, undo) {
        const vorher = {};
        Object.values(AG).forEach(k => { try { vorher[k] = localStorage.getItem(k); } catch (e) { vorher[k] = null; } });
        const cats = lsLesen(AG.cats, []), st = lsLesen(AG.states, {}) || {}, stats = lsLesen(AG.stats, { done: 0 });
        let notes = lsLesen(AG.notes, []);
        if (!Array.isArray(cats) || !Array.isArray(notes)) { prot('Aufgaben', 'NICHT ausgeführt: Speicher der Aufgaben ist beschädigt'); return; }
        cats.forEach(c => { if (!Array.isArray(c.tasks)) c.tasks = []; });
        const rnd = () => Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const lokalJetzt = () => { const d = new Date(); return iso(d) + 'T' + [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); };
        const liste = name => {
            if (!name) {
                let c = cats.find(x => x.id === 'cat_inbox');
                if (!c) { c = { id: 'cat_inbox', name: L('Eingang', 'Inbox'), icon: 'inbox', tasks: [], defaultPriority: '', days: [], autoReset: '' }; cats.unshift(c); }
                return c;
            }
            const n = String(name).trim().toLowerCase();
            let c = cats.find(x => x.id === name || String(x.name || '').trim().toLowerCase() === n);
            if (!c) { c = { id: 'cat_' + rnd(), name: String(name).trim(), icon: 'folder', tasks: [], defaultPriority: '', days: [], autoReset: '' }; cats.push(c); }
            return c;
        };
        const finde = id => { for (const c of cats) { const t = c.tasks.find(x => x.id === id); if (t) return { c, t }; } return null; };
        let n = 0;
        ops.forEach(o => {
            const f = o.id ? finde(o.id) : null;
            if (['aendern', 'erledigt', 'offen', 'loeschen'].includes(o.aktion) && !f) { prot('Aufgaben', 'NICHT ' + o.aktion + ': Aufgabe ' + o.id + ' gibt es nicht'); return; }
            if (o.aktion === 'anlegen' || o.aktion === 'aendern') {
                const c = o.aktion === 'anlegen' || 'liste' in o ? liste(o.liste) : f.c;
                const t = f ? f.t : { id: 'tk_' + rnd(), name: o.name, priority: c.defaultPriority || '', days: [], due: '', recurring: 'none', reminder: '', note: '', subtasks: [], createdAt: new Date().toISOString() };
                if ('name' in o) t.name = o.name;
                if ('faellig' in o) t.due = o.faellig;
                if ('prioritaet' in o) t.priority = o.prioritaet;
                if ('wiederholung' in o) t.recurring = o.wiederholung;
                if ('tage' in o) t.days = o.tage;
                if ('notiz' in o) t.note = o.notiz;
                if ('unteraufgaben' in o) t.subtasks = o.unteraufgaben.map(s => ({ name: s, done: !!st[t.id] }));
                if (f && f.c !== c) f.c.tasks.splice(f.c.tasks.indexOf(t), 1);
                if (!f || f.c !== c) c.tasks.push(t);
                prot('Aufgaben', (f ? 'geändert' : 'angelegt') + ': „' + t.name + '" (id ' + t.id + ', Liste ' + c.name + ')');
            } else if (o.aktion === 'erledigt') {
                if (!st[o.id]) { st[o.id] = true; f.t.doneAt = lokalJetzt(); stats.done = (stats.done || 0) + 1; }
                (f.t.subtasks || []).forEach(s => { s.done = true; });
                prot('Aufgaben', 'erledigt: „' + f.t.name + '"');
            } else if (o.aktion === 'offen') {
                delete st[o.id]; delete f.t.doneAt;
                (f.t.subtasks || []).forEach(s => { s.done = false; });
                prot('Aufgaben', 'wieder offen: „' + f.t.name + '"');
            } else if (o.aktion === 'loeschen') {
                f.c.tasks.splice(f.c.tasks.indexOf(f.t), 1); delete st[o.id];
                prot('Aufgaben', 'gelöscht: „' + f.t.name + '"');
            } else if (o.aktion === 'notiz_anlegen') {
                const id = 'nt_' + rnd();
                notes.unshift({ id, text: o.text, createdAt: new Date().toISOString() });
                prot('Aufgaben', 'Notiz angelegt (id ' + id + ')');
            } else if (o.aktion === 'notiz_loeschen') {
                const vor = notes.length;
                notes = notes.filter(x => x.id !== o.id);
                if (notes.length === vor) { prot('Aufgaben', 'NICHT gelöscht: Notiz ' + o.id + ' gibt es nicht'); return; }
                prot('Aufgaben', 'Notiz gelöscht');
            } else if (o.aktion === 'liste_anlegen') {
                prot('Aufgaben', 'Liste „' + liste(o.name).name + '" bereit');
            }
            n++;
        });
        if (!n) return;
        try {
            localStorage.setItem(AG.cats, JSON.stringify(cats));
            localStorage.setItem(AG.states, JSON.stringify(st));
            localStorage.setItem(AG.notes, JSON.stringify(notes));
            localStorage.setItem(AG.stats, JSON.stringify(stats));
        } catch (e) { prot('Aufgaben', 'NICHT gespeichert: Speicher voll'); return; }
        z.aufgaben += n;
        undo.push(() => Object.keys(vorher).forEach(k => { try { vorher[k] === null ? localStorage.removeItem(k) : localStorage.setItem(k, vorher[k]); } catch (e) { /* egal */ } }));
    }

    // Meldungen: ueber die Haken in den Einstellungen und saveAlertSettings()
    // (alerts-toasts.js) — so gelten Hauptschalter-Logik und Ansicht gleich mit.
    const MELDUNG_ID = k => 'alert' + k.charAt(0).toUpperCase() + k.slice(1);
    const MELDUNG_KEY = 'timetracker_alert_settings_v2';
    function meldungenAuftrag(schalter, z, undo) {
        let vorher = null;
        try { vorher = localStorage.getItem(MELDUNG_KEY); } catch (e) { /* ohne */ }
        Object.entries(schalter).forEach(([k, v]) => { const el = document.getElementById(MELDUNG_ID(k)); if (el) el.checked = v; });
        if (typeof saveAlertSettings === 'function') saveAlertSettings();
        else {
            const s = Object.assign(lsLesen(MELDUNG_KEY, {}), schalter);
            try { localStorage.setItem(MELDUNG_KEY, JSON.stringify(s)); } catch (e) { /* voll */ }
        }
        z.einstellungen.push(L('Meldungen', 'notifications'));
        prot('Meldungen', Object.entries(schalter).map(([k, v]) => k + ' ' + (v ? 'an' : 'aus')).join(', '));
        undo.push(() => {
            const alt = Object.assign({}, lsLesen(MELDUNG_KEY, {}), vorher ? JSON.parse(vorher) : {});
            Object.keys(schalter).forEach(k => { const el = document.getElementById(MELDUNG_ID(k)); if (el) el.checked = alt[k] !== false; });
            if (typeof saveAlertSettings === 'function') saveAlertSettings();
            try { vorher === null ? localStorage.removeItem(MELDUNG_KEY) : localStorage.setItem(MELDUNG_KEY, vorher); } catch (e) { /* egal */ }
        });
    }

    // Klasse: derselbe Ablauf wie der Knopf auf /klasse/ (klasse.js) —
    // laden, planen, beitreten, vormerken; anwenden macht appAbgleich() wie
    // nach jedem Beitritt. Asynchron (Netz), deshalb nicht in ausfuehren().
    async function klasseAuftrag(d, z) {
        const K = window.MWLKlasse;
        if (!K) { prot('Klasse', 'NICHT ausgeführt: Klassen-Modul nicht geladen'); return; }
        if (d.aktion === 'austreten') {
            const alt = K.zustand();
            if (!alt) { prot('Klasse', 'kein Austritt nötig — in keiner Klasse'); return; }
            K.austreten();
            z.klasse = L('die Klasse verlassen', 'left the class');
            prot('Klasse', 'ausgetreten aus ' + (alt.name || alt.code));
            return;
        }
        const code = K.codeNorm(d.code);
        if (!code) { prot('Klasse', 'NICHT beigetreten: Code ' + d.code + ' ist ungültig'); return; }
        let p;
        try { p = await K.laden(code); } catch (e) { prot('Klasse', 'NICHT beigetreten: Server nicht erreichbar, nächstes Öffnen versucht es wieder'); throw e; }
        if (!p) { prot('Klasse', 'NICHT beigetreten: Code ' + K.codeFmt(code) + ' gehört zu keiner Klasse'); return; }
        const alt = K.zustand(), mitglied = !!(alt && alt.code === p.code);
        if (p.geschlossen && !mitglied) { prot('Klasse', 'NICHT beigetreten: ' + p.name + ' nimmt gerade keine neuen Mitglieder auf'); return; }
        const plan = K.planen(data.settings, p);
        const auswahl = plan.filter(it => !it.gleich && (!d.bereiche || d.bereiche.includes(it.id))).map(it => it.id);
        if (!mitglied) await K.beitreten(p.code);
        K.vormerken(p, auswahl);
        await K.appAbgleich(true);
        z.klasse = L('die Klasse „' + p.name + '“ eingerichtet', 'set up the class “' + p.name + '”');
        prot('Klasse', (mitglied ? 'aktualisiert: ' : 'beigetreten: ') + p.name + (auswahl.length ? ' (übernommen: ' + auswahl.join(', ') + ')' : ' (nichts zu übernehmen)'));
    }

    // Export-Link aus zeiten_export: /#export=csv:VON:BIS
    function exportAusAnker() {
        const m = /^#export=(csv|json)(?::(\d{4}-\d{2}-\d{2})?:(\d{4}-\d{2}-\d{2})?)?$/.exec(location.hash);
        if (!m || typeof data === 'undefined') return;
        history.replaceState(null, '', location.pathname + location.search);
        const [, format, von, bis] = m;
        const liste = (data.entries || []).filter(e => (!von || e.date >= von) && (!bis || e.date <= bis))
            .slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
        if (!liste.length) {
            if (typeof showCustomMessage === 'function') showCustomMessage(L('Nichts zu exportieren', 'Nothing to export'), L('Im Zeitraum gibt es keine Einträge.', 'There are no entries in this period.'), 'info');
            return;
        }
        const inhalt = format === 'csv' && typeof convertToCSV === 'function' ? convertToCSV(liste) : JSON.stringify(liste, null, 2);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([inhalt], { type: format === 'csv' ? 'text/csv' : 'application/json' }));
        a.download = 'myworklog_' + (von || 'anfang') + '_' + (bis || iso(new Date())) + '.' + format;
        document.body.appendChild(a); a.click(); a.remove();
        if (typeof mwlEvent === 'function') mwlEvent('data_exported', { format, quelle: 'ki' });
        prot('Export', liste.length + ' Einträge als ' + format.toUpperCase() + ' heruntergeladen');
    }

    // ── Ausfuehren ───────────────────────────────────────────────────────
    let rueckgaengig = null;     // { schritte: [fn], text }
    let zuletzt = null;          // Zusammenfassung fuer den Hinweis

    function ausfuehren(auftraege) {
        const undo = [];
        const z = { neu: 0, doppelt: 0, geaendert: 0, geloescht: 0, unbekannt: 0, einstellungen: [], aufgaben: 0, timer: '', klasse: '' };
        // Ueber der hoechsten vorhandenen id beginnen: zwei Laeufe in derselben
        // Millisekunde vergaben sonst dieselbe id, und Aendern traf den falschen Tag.
        let id = Math.max(Date.now(), ...(data.entries || []).map(x => Math.floor(+x.id) || 0)) + 1;

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
                        art: TYP_ZU_ART[alt.type] || alt.type || 'arbeit',
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
            } else if (d.art === 'daten') {
                // Schnappschuss als echte Tiefkopie MIT gesperrten Schluesseln,
                // sonst wuerde Rueckgaengig sie loeschen.
                const vorher = {};
                Object.keys(data).forEach(k => { if (!GESPERRT_WURZEL.has(k)) vorher[k] = JSON.stringify(data[k]); });
                let n = 0;
                (d.operationen || []).forEach(o => { if (datenOp(o)) n++; else z.unbekannt++; });
                typenPflegen();
                if (n) {
                    z.einstellungen.push(n === 1 ? L('eine Änderung', 'one change') : L(n + ' Änderungen', n + ' changes'));
                    undo.push(() => {
                        Object.keys(data).forEach(k => { if (!GESPERRT_WURZEL.has(k) && !(k in vorher)) delete data[k]; });
                        Object.keys(vorher).forEach(k => { data[k] = vorher[k] === undefined ? undefined : JSON.parse(vorher[k]); });
                    });
                }
            } else if (d.art === 'einstellungen') {
                const s = data.settings;
                const vorher = JSON.parse(JSON.stringify({
                    name: s.name, job: s.job, jobCustom: s.jobCustom, bundesland: s.bundesland,
                    hours: s.hours, break: s.break, vacation: s.vacation, eingerichtet: s.eingerichtet,
                }));
                let pdfVorher = null;
                try { pdfVorher = localStorage.getItem('pdf_personal_cfg'); } catch (e) { /* ohne */ }
                einstellungenAnwenden(d.patch || {}, z);
                undo.push(() => {
                    Object.assign(data.settings, vorher);
                    try { pdfVorher === null ? localStorage.removeItem('pdf_personal_cfg') : localStorage.setItem('pdf_personal_cfg', pdfVorher); } catch (e) { /* egal */ }
                });
                prot('Einstellungen', Object.keys(d.patch || {}).join(', ') + ' gesetzt');
            } else if (d.art === 'timer') {
                timerAuftrag(d, z, undo);
            } else if (d.art === 'aufgaben') {
                aufgabenAuftrag(d.operationen || [], z, undo);
            } else if (d.art === 'meldungen') {
                meldungenAuftrag(d.schalter || {}, z, undo);
            }
        }
        // Zeit- und Datenauftraege gesammelt ins Protokoll (je Tag eine Zeile waere zu viel)
        const zt = [];
        if (z.neu) zt.push(z.neu + ' Tag(e) eingetragen');
        if (z.doppelt) zt.push(z.doppelt + ' gab es schon (übersprungen — zum Korrigieren zeit_eintrag_aendern)');
        if (z.geaendert) zt.push(z.geaendert + ' geändert');
        if (z.geloescht) zt.push(z.geloescht + ' in den Papierkorb');
        if (z.unbekannt) zt.push(z.unbekannt + ' passten nicht (id unbekannt, Datum ungültig oder Pfad gesperrt)');
        if (zt.length) prot('Zeiterfassung', zt.join(', '));
        return { undo, z };
    }
    // Arten, die die App selbst ausfuehrt (Berichtsheft-Arten macht bh-ki.js)
    const APP_ARTEN = ['zeit', 'zeit_aendern', 'zeit_loeschen', 'einstellungen', 'daten', 'timer', 'aufgaben', 'meldungen', 'klasse'];
    const BH_ARTEN = ['bericht', 'bericht_aendern', 'bericht_loeschen'];

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
        // Deckblatt des Berichtsheft-PDFs: liegt in pdf_personal_cfg (gleiche
        // Herkunft, bh-pdf-modal.js liest es). Name und Beruf gehen mit, damit
        // App und PDF nicht zweierlei sagen. Datum dort als TT.MM.JJJJ wie im Formular.
        const DECK = ['name', 'beruf', 'betrieb', 'ausbilder', 'ausbildung_beginn', 'ausbildung_ende'];
        if (DECK.some(k => k in p)) {
            let cfg = {};
            try { cfg = JSON.parse(localStorage.getItem('pdf_personal_cfg') || '{}') || {}; } catch (e) { cfg = {}; }
            const tt = iso => iso.split('-').reverse().join('.');
            if ('name' in p) cfg.name = p.name;
            if ('beruf' in p) cfg.beruf = p.beruf;
            if ('betrieb' in p) cfg.betrieb = p.betrieb;
            if ('ausbilder' in p) cfg.ausbilder = p.ausbilder;
            if ('ausbildung_beginn' in p) cfg.beginn = tt(p.ausbildung_beginn);
            if ('ausbildung_ende' in p) cfg.ende = tt(p.ausbildung_ende);
            try { localStorage.setItem('pdf_personal_cfg', JSON.stringify(cfg)); } catch (e) { /* Speicher voll */ }
            if (['betrieb', 'ausbilder', 'ausbildung_beginn', 'ausbildung_ende'].some(k => k in p)) z.einstellungen.push(L('Deckblatt', 'cover page'));
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
        const alle = MWLKiApp.alle.filter(a => !a.fehler && a.daten && APP_ARTEN.includes(a.daten.art));
        if (!alle.length || typeof mwlBuildPreview !== 'function' || typeof data === 'undefined') return;
        const auftraege = alle.filter(a => a.daten.art !== 'klasse');
        const { undo, z } = ausfuehren(auftraege);
        // Klasse zuletzt: appAbgleich() speichert selbst und rechnet auf den
        // eben gesetzten Einstellungen weiter.
        const klasseFertig = [];
        for (const a of alle.filter(x => x.daten.art === 'klasse')) {
            try { await klasseAuftrag(a.daten, z); klasseFertig.push(a); }
            catch (e) { console.warn('[KI-Assistent] Klasse:', e && e.message); }   // Netzfehler: Auftrag bleibt liegen
        }
        nachAenderung();
        // Erst nach dem Speichern aus dem Briefkasten nehmen.
        for (const a of auftraege.concat(klasseFertig)) { try { await MWLKiApp.loeschen(a.id); } catch (e) { /* naechstes Mal wieder — Dubletten faengt der Import */ } }
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
        // ALLE Eintraege: der Server rechnet daraus die Auswertung und reicht
        // roh nur die letzten Wochen weiter. Mit einem Zeitfenster hier stimmte
        // die Summe der diff nicht mehr mit dem Saldo der App ueberein.
        const eintraege = (data.entries || []).slice()
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .map(e => {
                const t = infoTeile(e.info);
                return {
                    id: String(e.id), datum: e.date, art: TYP_ZU_ART[e.type] || e.type,
                    von: e.start || '', bis: e.end || '', pause_min: e.breakMins || 0,
                    stunden: +e.worked || 0, soll: +e.expected || 0, diff: +e.diff || 0,
                    notiz: t.notiz.slice(0, 200), vermerk: t.vermerk.slice(0, 120), job: e.jobId || 'primary',
                };
            });
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
                deckblatt: (() => {
                    let c = {};
                    try { c = JSON.parse(localStorage.getItem('pdf_personal_cfg') || '{}') || {}; } catch (e) { c = {}; }
                    return { name: c.name || '', betrieb: c.betrieb || '', ausbilder: c.ausbilder || '', beruf: c.beruf || '', beginn: c.beginn || '', ende: c.ende || '' };
                })(),
            },
            offene_tage: offen,
            konten: {
                summe_saldo_h: Math.round((data.entries || []).reduce((n, e) => n + (+e.diff || 0), 0) * 100) / 100,
                urlaub_rest: Math.round(((vac.total || 0) + (vac.carriedOver || 0) - (vac.used || 0)) * 100) / 100,
            },
            eintraege,
            berichte: MWLKiApp.berichteUeberblick(),
            eintragstypen: (typeof getAllEntryTypes === 'function' ? getAllEntryTypes() : []).map(t => ({
                id: t.id, art: TYP_ZU_ART[t.id] || t.id, name: String(t.label || '').trim(), farbe: t.color || '',
                beschreibung: t.description || '', eigener: typeof isDefaultType === 'function' ? !isDefaultType(t.id) : false,
            })),
            app_daten: appDaten(),
            klasse: klasseKopie(),
            live_tracker: trackerKopie(),
            aufgaben: aufgabenKopie(),
            meldungen: Object.assign(Object.fromEntries(['master', 'saldoPositive', 'saldoNegative', 'shiftMax', 'vacationLow', 'weeklyOvertime', 'dailyReminders', 'milestones', 'exportReminder', 'klasse'].map(k => [k, true])), lsLesen(MELDUNG_KEY, {})),
            protokoll: MWLKiApp.protokoll(),
        };
    }

    // Klasse ohne Geraete-Merker und Push-Endpunkt (die gehen den Agenten nichts an).
    function klasseKopie() {
        const z = window.MWLKlasse ? MWLKlasse.zustand() : lsLesen('mwl_klasse', null);
        if (!z || !z.code) return null;
        const p = z.profil || {};
        return {
            name: z.name || p.name || '', code: z.code, beigetreten: z.beigetreten ? iso(new Date(z.beigetreten)) : '',
            nicht_mehr_vorhanden: !!z.weg, schultage: p.schultage || [], rhythmus: p.rhythmus || [], bloecke: p.bloecke || [],
            faecher: p.faecher || [], bundesland: p.bundesland || '', pruefungen: p.pruefungen || null,
            stundenplan: p.stundenplan || null,
            mitteilungen: (p.mitteilungen || []).slice(0, 10).map(m => ({ text: String(m.text || '').slice(0, 300), am: m.created_at || m.am || '' })),
        };
    }
    function trackerKopie() {
        if (typeof timer === 'undefined') return null;
        const log = timer.log || [], erster = log.find(l => l.action === 'start');
        if (!timer.running && !(timer.paused > 0)) return { zustand: 'aus' };
        const pauseMs = (timer.breakTime || 0) + (!timer.running && log.length && log[log.length - 1].action === 'pause' ? Date.now() - log[log.length - 1].time : 0);
        return {
            zustand: timer.running ? 'läuft' : 'Pause',
            seit: erster ? uhr(erster.time) : (timer.start ? uhr(timer.start) : ''),
            pause_min: Math.round(pauseMs / 60000),
            gearbeitet_h: Math.round(((timer.paused || 0) + (timer.running ? Date.now() - timer.start : 0)) / 36e3) / 100,
        };
    }
    function aufgabenKopie() {
        const cats = lsLesen(AG.cats, []), st = lsLesen(AG.states, {}) || {}, notes = lsLesen(AG.notes, []);
        if (!Array.isArray(cats)) return null;
        let n = 0;
        return {
            listen: cats.map(c => ({
                id: c.id, name: c.name || '', tage: c.days || [],
                aufgaben: (c.tasks || []).filter(() => n++ < 400).map(t => {
                    const o = { id: t.id, name: String(t.name || '').slice(0, 200), erledigt: !!st[t.id] };
                    if (t.due) o.faellig = t.due;
                    if (t.priority) o.prioritaet = t.priority;
                    if (t.recurring && t.recurring !== 'none') o.wiederholung = t.recurring;
                    if (t.days && t.days.length) o.tage = t.days;
                    if (t.note) o.notiz = String(t.note).slice(0, 300);
                    if (t.subtasks && t.subtasks.length) o.unteraufgaben = t.subtasks.map(s => s.name + (s.done ? ' ✓' : ''));
                    if (t.doneAt) o.erledigt_am = String(t.doneAt).slice(0, 10);
                    return o;
                }),
            })),
            notizen: (Array.isArray(notes) ? notes : []).slice(0, 100).map(x => ({ id: x.id, text: String(x.text || '').slice(0, 300) })),
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
            'Verbinde Claude, ChatGPT & Co. mit MyWorkLog. Sag deinem Assistenten einfach, wie dein Tag war — er trägt Arbeitszeiten ein, bedient die Stempeluhr, schreibt und ändert Berichtsheft-Wochen, verwaltet Aufgaben, tritt deiner Klasse bei, richtet deine Einstellungen ein und schlägt deine Rechte als Azubi nach. Die App übernimmt das selbst; du kannst es rückgängig machen.',
            'Connect Claude, ChatGPT & co. to MyWorkLog. Just tell your assistant how your day went — it adds working hours, operates the time clock, writes and changes report book weeks, manages tasks, joins your class, sets up your settings and looks up your rights as an apprentice. The app applies it by itself; you can undo it.') + '</p>';
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
                L('Dein Assistent sieht deine Einstellungen, Zeiteinträge, Berichtsheft-Wochen mit Text, Aufgaben und Klasse und weiß so, was fehlt. Dafür liegt eine lesbare Kopie davon auf dem Server — getrennt von deinem verschlüsselten Backup, ohne Schatten-Berichtsheft. Ausschalten löscht sie.',
                  'Your assistant sees your settings, time entries, report book weeks with their text, tasks and class and so knows what is missing. For this a readable copy is kept on the server — separate from your encrypted backup, without the shadow report book. Switching off deletes it.') + '</span></label>';
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
        if (z.aufgaben) t.push(z.aufgaben === 1 ? L('eine Aufgabe bearbeitet', 'edited one task') : L(z.aufgaben + ' Aufgaben bearbeitet', 'edited ' + z.aufgaben + ' tasks'));
        if (z.timer) t.push(z.timer);
        if (z.klasse) t.push(z.klasse);
        return t;
    }

    function kiaBanner() {
        const el = document.getElementById('kiAppBanner');
        if (!el) return;
        const bericht = MWLKiApp.status === 'an' ? BH_ARTEN.flatMap(a => MWLKiApp.entwuerfe(a)) : [];
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
            const nurNeu = bericht.every(b => b.daten.art === 'bericht');
            titel = nurNeu
                ? L(bericht.length === 1 ? 'Eine Berichtsheft-Woche ist fertig' : bericht.length + ' Berichtsheft-Wochen sind fertig',
                    bericht.length === 1 ? 'One report book week is ready' : bericht.length + ' report book weeks are ready')
                : L(bericht.length === 1 ? 'Ein Auftrag fürs Berichtsheft wartet' : bericht.length + ' Aufträge fürs Berichtsheft warten',
                    bericht.length === 1 ? 'One report book request is waiting' : bericht.length + ' report book requests are waiting');
            text = nurNeu ? L('Sie wird beim Öffnen des Berichtshefts angelegt.', 'It is created when you open the report book.')
                          : L('Dein Assistent hat Wochen geändert oder gelöscht. Das Berichtsheft führt es beim Öffnen aus.', 'Your assistant changed or deleted weeks. The report book applies it when you open it.');
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
        // Erste Kopie auch dann, wenn „Lesen" auf der Zustimmungsseite gesetzt
        // wurde und beim Start die Cloud-Anbindung noch nicht bereit war.
        if (MWLKiApp.lesenAn()) kiaSpiegelBald();
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
        if (/^#export=/.test(location.hash)) setTimeout(exportAusAnker, 600);
    });
    // Aenderungen anderer Tabs (Aufgaben, Klasse, Berichtsheft, Meldungen) in
    // die Kopie — sonst liest der Agent dort den Stand vom letzten save().
    window.addEventListener('storage', e => {
        if (e.key && /^(mwl_tasks_(cats|states|notes)|mwl_klasse|berichtsheft_reports|timetracker_alert_settings_v2|mwl_ki_protokoll)$/.test(e.key)) kiaSpiegelBald();
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
    window.__kia = { kiaBaue, ausfuehren, kiaSpiegel, standardPause, nutzerNotiz, infoTeile, appDaten, klasseAuftrag, exportAusAnker };
})();
