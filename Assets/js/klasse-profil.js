// ═══ KLASSE-PROFIL MODULE ═══
// Gemeinsame Logik fuer /klasse/ (Beitritt, Cockpit) und die App (Abgleich).
//
// 🔴 Die Beitrittsseite schreibt NIE selbst in tg_pro_data. Sie legt nur fest,
// WAS uebernommen wird (mwl_klasse.ausstehend + auswahl), und die App wendet es
// beim naechsten Start mit ihrem eigenen save() an. Gruende: (1) auf einem
// frischen Geraet gibt es noch kein tg_pro_data — eine halbe Datei ohne
// entries risse die App beim Laden; (2) ist die App in einem zweiten Tab offen,
// wuerde ihr naechstes save() die Aenderung der Beitrittsseite ueberschreiben;
// (3) save() legt die Sicherung in tg_pro_data_backups an, nicht wir.
//
// Datenschutz (Entscheidung des Nutzers, 12.10.2026): der Server sieht nur einen
// Geraete-Hash je Klasse — SHA-256 aus einer Zufalls-Id dieses Geraets und dem
// Klassencode. Er ist ueber Klassen hinweg nicht verknuepfbar und traegt keinen Namen.
//
// Laeuft im Browser (window.MWLKlasse) und unter Node (module.exports, Tests).

(function (root) {
    'use strict';

    const STATE_KEY = 'mwl_klasse';
    const GERAET_KEY = 'mwl_klasse_geraet';
    // Wie oft die App beim Server nach Aenderungen und Mitteilungen fragt (ein kleiner
    // RPC, keine Personendaten). Bis v8.5.5 waren es 6 h: eine Mitteilung der Lehrkraft
    // kam erst Stunden spaeter an, ein Test direkt nach dem Senden fand nichts
    // ("kam keine an", gemeldet 14.10.2026). Ausloeser sind Laden + Rueckkehr in die App.
    const PRUEF_MS = 10 * 60 * 1000;
    const CODE_RE = /^[A-HJKMNP-Z2-9]{8}$/;

    const BUNDESLAENDER = {
        BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen',
        HH: 'Hamburg', HE: 'Hessen', MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen',
        NW: 'Nordrhein-Westfalen', RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen',
        ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen'
    };
    // Index = getDay(): 0 Sonntag … 6 Samstag (wie schoolRules.weeklyDays der App)
    const TAGE = [['So', 'Sun'], ['Mo', 'Mon'], ['Di', 'Tue'], ['Mi', 'Wed'], ['Do', 'Thu'], ['Fr', 'Fri'], ['Sa', 'Sat']];
    const TAGE_LANG = [['Sonntag', 'Sunday'], ['Montag', 'Monday'], ['Dienstag', 'Tuesday'], ['Mittwoch', 'Wednesday'],
                       ['Donnerstag', 'Thursday'], ['Freitag', 'Friday'], ['Samstag', 'Saturday']];

    function istEn() { try { return root.document && root.document.documentElement.lang === 'en'; } catch (e) { return false; } }
    function L(de, en) { return istEn() ? en : de; }

    // ── Code ──────────────────────────────────────────────────────────
    function codeNorm(s) {
        const c = String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '');
        return CODE_RE.test(c) ? c : null;
    }
    function codeFmt(c) { return c ? c.slice(0, 4) + '-' + c.slice(4) : ''; }
    function codeAusAdresse(loc) {
        loc = loc || (root.location || {});
        const h = String(loc.hash || '').replace(/^#/, '');
        const q = /[?&]k=([^&]+)/.exec(loc.search || '');
        return codeNorm(h) || (q ? codeNorm(decodeURIComponent(q[1])) : null);
    }

    // ── Speicher ──────────────────────────────────────────────────────
    function lesen(k) { try { return JSON.parse(root.localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
    function schreiben(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
    function zustand() { const z = lesen(STATE_KEY); return z && typeof z === 'object' && codeNorm(z.code) ? z : null; }
    function zustandSetzen(z) { return schreiben(STATE_KEY, z); }

    // ── Datum ─────────────────────────────────────────────────────────
    function isoOk(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
    function datum(iso, mitJahr) {
        if (!isoOk(iso)) return '';
        const p = iso.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2]);
        return d.toLocaleDateString(istEn() ? 'en-GB' : 'de-DE', mitJahr ? { day: '2-digit', month: '2-digit', year: 'numeric' } : { day: '2-digit', month: '2-digit' });
    }
    function heuteIso() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // ── Texte fuer Schultage ──────────────────────────────────────────
    function tageText(tage, lang) {
        const t = (tage || []).slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); });   // Mo zuerst
        return t.map(function (i) { return TAGE[i] ? TAGE[i][lang ? 1 : 0] : ''; }).filter(Boolean).join(', ');
    }
    function rhythmusText(r) {
        return (r || []).map(function (x) {
            const tag = TAGE_LANG[x.weekday] ? TAGE_LANG[x.weekday][istEn() ? 1 : 0] : '?';
            return x.interval === 1 ? L('jeden ', 'every ') + tag
                : L('alle ' + x.interval + ' Wochen ' + tag, tag + ' every ' + x.interval + ' weeks') + L(' ab ', ' from ') + datum(x.startDate);
        }).join('; ');
    }
    function naechsterBlock(bloecke) {
        const h = heuteIso();
        return (bloecke || []).filter(function (b) { return b.bis >= h; }).sort(function (a, b) { return a.von < b.von ? -1 : 1; })[0] || null;
    }

    // ── Plan: was ein Beitritt in den Einstellungen aendert ───────────
    // Ein Eintrag je Bereich. `gleich` = nichts zu tun; `alt` = was ueberschrieben
    // wuerde (dann fragt die Seite, statt still zu ersetzen).
    function gleicheMenge(a, b) {
        a = (a || []).map(Number).sort(); b = (b || []).map(Number).sort();
        return a.length === b.length && a.every(function (x, i) { return x === b[i]; });
    }
    function rhythmusSchluessel(r) { return JSON.stringify((r || []).map(function (x) { return [x.weekday | 0, x.interval | 0, x.startDate || '']; }).sort()); }
    function blockSchluessel(b) { return JSON.stringify((b || []).map(function (x) { return [x.von, x.bis]; }).sort()); }
    function lehrjahrSchluessel(p) { return String(p && p.lehrjahr >= 1 && p.lehrjahr <= 4 ? p.lehrjahr : 1); }

    // ── Stundenplan (seit v8.5.7) ─────────────────────────────────────
    // {"<getDay 1-5>": [{s, b, f}]} — s/b erste/letzte Stunde, f Fach. Gilt an jedem
    // Schultag dieses Wochentags (auch im Block). Zweck: die Berichtsheft-KI schreibt
    // ueber das Fach, das wirklich war, statt eines zu raten.
    function planNorm(sp) {
        const out = {};
        if (!sp || typeof sp !== 'object' || Array.isArray(sp)) return out;
        ['1', '2', '3', '4', '5'].forEach(function (t) {
            const liste = (Array.isArray(sp[t]) ? sp[t] : []).map(function (e) {
                const s = e && Number(e.s) | 0, b = e && Number(e.b) | 0, f = e && String(e.f || '').trim().slice(0, 60);
                return (s >= 1 && s <= 12 && b >= s && b <= 12 && f) ? { s: s, b: b, f: f } : null;
            }).filter(Boolean).sort(function (x, y) { return x.s - y.s || x.b - y.b; }).slice(0, 12);
            if (liste.length) out[t] = liste;
        });
        return out;
    }
    function planSchluessel(sp) { return JSON.stringify(planNorm(sp)); }
    function planLeer(sp) { return Object.keys(planNorm(sp)).length === 0; }
    // "Di: LF5, PuG · Do: Englisch, LF3" — kurz fuer Karte und Meldung
    function planText(sp, en) {
        const n = planNorm(sp);
        return Object.keys(n).map(function (t) {
            const faecher = []; n[t].forEach(function (e) { if (faecher.indexOf(e.f) < 0) faecher.push(e.f); });
            return TAGE[t][en ? 1 : 0] + ': ' + faecher.join(', ');
        }).join(' · ');
    }

    function planen(settings, p) {
        settings = settings || {};
        const en = istEn(), out = [];
        const rules = settings.schoolRules || {};
        const ihk = settings.ihk || {};

        if ((p.schultage && p.schultage.length) || (p.rhythmus && p.rhythmus.length)) {
            const neu = [tageText(p.schultage, en), rhythmusText(p.rhythmus)].filter(Boolean).join('; ');
            const altDa = (rules.weeklyDays && rules.weeklyDays.length) || (rules.biweekly && rules.biweekly.length);
            const gleich = gleicheMenge(rules.weeklyDays, p.schultage) && rhythmusSchluessel(rules.biweekly) === rhythmusSchluessel(p.rhythmus);
            out.push({ id: 'schultage', icon: 'calendar', titel: L('Berufsschultage', 'School days'), neu: neu,
                alt: altDa && !gleich ? [tageText(rules.weeklyDays, en), rhythmusText(rules.biweekly)].filter(Boolean).join('; ') : null, gleich: gleich });
        }
        if (p.bloecke && p.bloecke.length) {
            const n = naechsterBlock(p.bloecke);
            const neu = p.bloecke.length + ' ' + (p.bloecke.length === 1 ? L('Block', 'block') : L('Blöcke', 'blocks')) +
                (n ? L(', nächster ', ', next ') + datum(n.von) + '–' + datum(n.bis) : '');
            const gleich = blockSchluessel(rules.blocks) === blockSchluessel(p.bloecke);
            out.push({ id: 'bloecke', icon: 'layers', titel: L('Blockunterricht', 'Block teaching'), neu: neu,
                alt: rules.blocks && rules.blocks.length && !gleich ? rules.blocks.length + ' ' + L('eigene Blöcke', 'own blocks') : null, gleich: gleich });
        }
        if (p.bundesland) {
            const gleich = settings.bundesland === p.bundesland;
            out.push({ id: 'bundesland', icon: 'map', titel: L('Feiertage', 'Public holidays'), neu: BUNDESLAENDER[p.bundesland] || p.bundesland,
                alt: settings.bundesland && !gleich ? (BUNDESLAENDER[settings.bundesland] || settings.bundesland) : null, gleich: gleich });
        }
        const pr = p.pruefungen || {};
        if (pr.ap1 || pr.ap2 || pr.anmeldung) {
            const teile = [], alt = [];
            let gleich = true;
            [['ap1', 'exam_zwischen', L('Teil 1', 'Part 1')], ['ap2', 'exam_abschluss', L('Teil 2', 'Part 2')], ['anmeldung', 'anmeldung', L('Anmeldeschluss', 'Registration')]].forEach(function (f) {
                if (!pr[f[0]]) return;
                teile.push(f[2] + ' ' + datum(pr[f[0]], true));
                if (ihk[f[1]] !== pr[f[0]]) { gleich = false; if (ihk[f[1]]) alt.push(f[2] + ' ' + datum(ihk[f[1]], true)); }
            });
            out.push({ id: 'pruefungen', icon: 'award', titel: L('Prüfungstermine', 'Exam dates'), neu: teile.join(', '), alt: alt.length ? alt.join(', ') : null, gleich: gleich });
        }
        if (p.faecher && p.faecher.length) {
            const y = lehrjahrSchluessel(p);
            const vorhanden = Object.keys(((settings.school || {}).years || {})[y] && settings.school.years[y].grades || {}).map(function (f) { return f.toLowerCase(); });
            const fehlen = p.faecher.filter(function (f) { return vorhanden.indexOf(String(f).toLowerCase()) < 0; });
            out.push({ id: 'faecher', icon: 'book', titel: L('Fächer & Lernfelder', 'Subjects'),
                neu: p.faecher.length + ' ' + L('für das ' + y + '. Lehrjahr', 'for year ' + y) + (fehlen.length && fehlen.length < p.faecher.length ? L(' (' + fehlen.length + ' neu)', ' (' + fehlen.length + ' new)') : ''),
                liste: p.faecher.slice(), alt: null, gleich: fehlen.length === 0 });
        }
        if (!planLeer(p.stundenplan)) {
            const eigen = ((settings.school || {}).stundenplan);
            const gleich = planSchluessel(eigen) === planSchluessel(p.stundenplan);
            out.push({ id: 'stundenplan', icon: 'clock', titel: L('Stundenplan', 'Timetable'), neu: planText(p.stundenplan, en),
                alt: !planLeer(eigen) && !gleich ? planText(eigen, en) : null, gleich: gleich });
        }
        return out;
    }

    // ── Anwenden (nur aus der App heraus, siehe Kopf) ─────────────────
    // Ueberschreibt Schultage/Bloecke/Bundesland/Termine, wenn ausgewaehlt;
    // Faecher werden nur ERGAENZT — Noten bleiben, nichts wird entfernt.
    function anwenden(data, p, auswahl) {
        if (!data || !p) return [];
        if (!data.settings || typeof data.settings !== 'object') data.settings = {};
        const s = data.settings, getan = [];
        const will = function (id) { return !auswahl || auswahl.indexOf(id) >= 0; };

        if (will('schultage') && ((p.schultage && p.schultage.length) || (p.rhythmus && p.rhythmus.length))) {
            if (!s.schoolRules || typeof s.schoolRules !== 'object') s.schoolRules = { weeklyDays: [], biweekly: [] };
            s.schoolRules.weeklyDays = (p.schultage || []).map(Number).filter(function (x) { return x >= 0 && x <= 6; });
            s.schoolRules.biweekly = (p.rhythmus || []).map(function (r) { return { weekday: r.weekday | 0, interval: r.interval | 0, startDate: r.startDate }; });
            getan.push('schultage');
        }
        if (will('bloecke') && p.bloecke && p.bloecke.length) {
            if (!s.schoolRules || typeof s.schoolRules !== 'object') s.schoolRules = { weeklyDays: [], biweekly: [] };
            s.schoolRules.blocks = p.bloecke.filter(function (b) { return isoOk(b.von) && isoOk(b.bis); }).map(function (b) { return { von: b.von, bis: b.bis }; });
            getan.push('bloecke');
        }
        if (will('bundesland') && p.bundesland && BUNDESLAENDER[p.bundesland]) {
            s.bundesland = p.bundesland;
            getan.push('bundesland');
        }
        const pr = p.pruefungen || {};
        if (will('pruefungen') && (pr.ap1 || pr.ap2 || pr.anmeldung)) {
            if (!s.ihk || typeof s.ihk !== 'object') s.ihk = { start: '', end: '', exam_zwischen: '', note_zwischen: '', note_abschluss: '' };
            if (isoOk(pr.ap1)) s.ihk.exam_zwischen = pr.ap1;
            if (isoOk(pr.ap2)) s.ihk.exam_abschluss = pr.ap2;
            if (isoOk(pr.anmeldung)) s.ihk.anmeldung = pr.anmeldung;
            getan.push('pruefungen');
        }
        if (will('faecher') && p.faecher && p.faecher.length) {
            if (!s.school || typeof s.school !== 'object') s.school = {};
            if (!s.school.years || typeof s.school.years !== 'object' || Array.isArray(s.school.years)) s.school.years = {};
            const y = lehrjahrSchluessel(p);
            if (!s.school.years[y] || typeof s.school.years[y] !== 'object') s.school.years[y] = { grades: {} };
            if (!s.school.years[y].grades || typeof s.school.years[y].grades !== 'object') s.school.years[y].grades = {};
            const g = s.school.years[y].grades, klein = Object.keys(g).map(function (f) { return f.toLowerCase(); });
            p.faecher.forEach(function (f) {
                const t = String(f).trim().slice(0, 60);
                if (t && klein.indexOf(t.toLowerCase()) < 0) { g[t] = []; klein.push(t.toLowerCase()); }
            });
            getan.push('faecher');
        }
        if (will('stundenplan') && !planLeer(p.stundenplan)) {
            if (!s.school || typeof s.school !== 'object') s.school = {};
            s.school.stundenplan = planNorm(p.stundenplan);
            getan.push('stundenplan');
        }
        return getan;
    }

    // Kurzfassung fuer Meldungen: welche Bereiche sich zwischen zwei Fassungen unterscheiden.
    function unterschiede(alt, neu) {
        if (!alt || !neu) return [];
        const out = [];
        if (!gleicheMenge(alt.schultage, neu.schultage) || rhythmusSchluessel(alt.rhythmus) !== rhythmusSchluessel(neu.rhythmus)) out.push(L('Schultage', 'school days'));
        if (blockSchluessel(alt.bloecke) !== blockSchluessel(neu.bloecke)) out.push(L('Blockunterricht', 'block teaching'));
        if (alt.bundesland !== neu.bundesland) out.push(L('Bundesland', 'state'));
        if (JSON.stringify(alt.pruefungen || {}) !== JSON.stringify(neu.pruefungen || {})) out.push(L('Prüfungstermine', 'exam dates'));
        if (JSON.stringify(alt.faecher || []) !== JSON.stringify(neu.faecher || [])) out.push(L('Fächer', 'subjects'));
        if (planSchluessel(alt.stundenplan) !== planSchluessel(neu.stundenplan)) out.push(L('Stundenplan', 'timetable'));
        if (alt.name !== neu.name || alt.schule !== neu.schule || alt.kontakt !== neu.kontakt) out.push(L('Angaben zur Klasse', 'class details'));
        return out;
    }

    // ── Server ────────────────────────────────────────────────────────
    function konfig() {
        const c = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG) || root.SUPABASE_CONFIG;
        return c && c.URL && c.ANON_KEY ? c : null;
    }
    // Schlanker RPC-Aufruf ohne Bibliothek (Azubis brauchen kein Konto). Mit `token`
    // spricht er als angemeldetes Konto (Cockpit). Fehler kommen als Error mit
    // `.code` = Meldung des Servers ('name_ungueltig', 'zu_schnell' …).
    async function rpc(name, body, token) {
        const c = konfig();
        if (!c) { const e = new Error('keine_konfiguration'); e.code = 'keine_konfiguration'; throw e; }
        let r;
        try {
            r = await root.fetch(c.URL + '/rest/v1/rpc/' + name, {
                method: 'POST',
                headers: { apikey: c.ANON_KEY, Authorization: 'Bearer ' + (token || c.ANON_KEY), 'Content-Type': 'application/json' },
                body: JSON.stringify(body || {})
            });
        } catch (x) { const e = new Error('offline'); e.code = 'offline'; throw e; }
        const text = await r.text();
        let j = null; try { j = text ? JSON.parse(text) : null; } catch (x) { j = null; }
        if (!r.ok) {
            const e = new Error((j && j.message) || ('http_' + r.status));
            e.code = (j && j.message) || ('http_' + r.status); e.status = r.status;
            throw e;
        }
        return j;
    }

    async function geraetHash(code) {
        let id = null;
        try { id = root.localStorage.getItem(GERAET_KEY); } catch (e) { /* ohne Speicher: jedes Mal neu */ }
        if (!id || !/^[0-9a-f]{64}$/.test(id)) {
            const b = new Uint8Array(32); root.crypto.getRandomValues(b);
            id = Array.from(b, function (x) { return x.toString(16).padStart(2, '0'); }).join('');
            try { root.localStorage.setItem(GERAET_KEY, id); } catch (e) { /* egal */ }
        }
        const buf = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(id + ':' + code));
        return Array.from(new Uint8Array(buf), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    }

    function laden(code) { return rpc('klasse_oeffentlich', { p_code: code }); }
    async function beitreten(code) { return rpc('klasse_beitreten', { p_code: code, p_geraet: await geraetHash(code) }); }

    // ── Beitritt vormerken (Seite) ────────────────────────────────────
    function vormerken(p, auswahl) {
        const alt = zustand();
        const gesehen = alt && alt.code === p.code ? (alt.gesehen || []) : [];
        return zustandSetzen({
            code: p.code, name: p.name, version: alt && alt.code === p.code ? alt.version || 0 : 0,
            profil: p, auswahl: auswahl, ausstehend: true, beigetreten: (alt && alt.code === p.code && alt.beigetreten) || Date.now(),
            gesehen: gesehen, geprueft: Date.now()
        });
    }
    function austreten() { try { root.localStorage.removeItem(STATE_KEY); } catch (e) { /* egal */ } }

    // ── App: ausstehendes anwenden + Abgleich ─────────────────────────
    function melden(o) { return typeof root.mwlKlassenMeldung === 'function' ? root.mwlKlassenMeldung(o) : false; }

    function mitteilungenMelden(z, p) {
        // Ohne Meldungs-Modul nichts als gesehen abhaken — sonst waere die Mitteilung
        // still verloren und kaeme nie wieder. (Hat jemand die Klassen-Meldungen selbst
        // abgeschaltet, liefert melden() false; das ist seine Wahl und zaehlt als gesehen.)
        if (typeof root.mwlKlassenMeldung !== 'function') return 0;
        const neu = (p.mitteilungen || []).filter(function (m) { return (z.gesehen || []).indexOf(m.id) < 0; });
        neu.slice().reverse().forEach(function (m) {
            melden({ key: 'klasse_m_' + m.id, title: L('Mitteilung von ', 'Message from ') + p.name, message: m.text, type: 'info' });
        });
        z.gesehen = (z.gesehen || []).concat(neu.map(function (m) { return m.id; })).slice(-80);
        return neu.length;
    }

    let laeuft = false;
    async function appAbgleich(erzwingen) {
        if (laeuft) return null;
        if (typeof root.data === 'undefined' && typeof data === 'undefined') return null;
        const d = typeof data !== 'undefined' ? data : root.data;
        const sichern = typeof save === 'function' ? save : root.save;
        const z = zustand(); if (!z) return null;
        laeuft = true;
        try {
            // 1) Vorgemerkter Beitritt / uebernommene Aenderung
            if (z.ausstehend && z.profil) {
                const getan = anwenden(d, z.profil, z.auswahl);
                if (typeof sichern === 'function') sichern();
                z.version = z.profil.version || 0; z.ausstehend = false; z.angewendet = Date.now();
                mitteilungenMelden(z, z.profil);
                zustandSetzen(z);
                try { if (typeof updateUI === 'function') updateUI(); } catch (e) { /* Ansicht noch nicht da */ }
                if (typeof showToast === 'function' && getan.length) {
                    showToast(L('Klasse eingerichtet', 'Class set up'), z.name + ': ' + getan.length + ' ' + L(getan.length === 1 ? 'Bereich übernommen' : 'Bereiche übernommen', getan.length === 1 ? 'area applied' : 'areas applied'), 'success');
                }
                return { angewendet: getan };
            }
            // 2) Hoechstens alle 6 h beim Server nachfragen
            if (!erzwingen && Date.now() - (z.geprueft || 0) < PRUEF_MS) return null;
            const p = await laden(z.code);
            z.geprueft = Date.now();
            if (!p) { z.weg = true; zustandSetzen(z); return { weg: true }; }
            z.weg = false; z.name = p.name;
            if ((p.version || 0) > (z.version || 0) && z.angeboten !== p.version) {
                const was = unterschiede(z.profil, p);
                melden({
                    key: 'klasse_v_' + p.code + '_' + p.version, type: 'warning',
                    title: L('Deine Klasse hat Änderungen', 'Your class has changes'),
                    message: p.name + (was.length ? ': ' + was.join(', ') : '') + L('. Du entscheidest, was übernommen wird.', '. You decide what to apply.'),
                    link: (istEn() ? '/en' : '') + '/klasse/#' + p.code, linkLabel: L('Ansehen und übernehmen', 'Review and apply')
                });
                z.angeboten = p.version;
            }
            mitteilungenMelden(z, p);
            zustandSetzen(z);
            return { version: p.version };
        } catch (e) {
            return null;   // offline o. ae.: naechstes Mal
        } finally { laeuft = false; }
    }

    const api = {
        STATE_KEY: STATE_KEY, BUNDESLAENDER: BUNDESLAENDER, TAGE: TAGE, TAGE_LANG: TAGE_LANG,
        codeNorm: codeNorm, codeFmt: codeFmt, codeAusAdresse: codeAusAdresse,
        zustand: zustand, zustandSetzen: zustandSetzen, vormerken: vormerken, austreten: austreten,
        planen: planen, anwenden: anwenden, unterschiede: unterschiede, naechsterBlock: naechsterBlock,
        tageText: tageText, rhythmusText: rhythmusText, planNorm: planNorm, planText: planText, planLeer: planLeer, datum: datum, heuteIso: heuteIso,
        rpc: rpc, laden: laden, beitreten: beitreten, geraetHash: geraetHash,
        appAbgleich: appAbgleich, mitteilungenMelden: mitteilungenMelden
    };
    root.MWLKlasse = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;

    // In der App (nicht auf /klasse/): nach dem Laden und beim Zurueckkehren abgleichen.
    if (root.document && root.document.getElementById && root.addEventListener) {
        const inApp = function () { return !!root.document.getElementById('view-dashboard'); };
        root.addEventListener('load', function () { if (inApp()) setTimeout(function () { appAbgleich(false); }, 1500); });
        root.document.addEventListener('visibilitychange', function () { if (!root.document.hidden && inApp()) appAbgleich(false); });
    }
})(typeof window !== 'undefined' ? window : globalThis);
