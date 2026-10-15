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

    // ── Stundenplan (seit v8.5.7, Varianten + Zeiten seit v8.5.9) ─────
    // Form (abwaertskompatibel — die normale Woche steht wie in v8.5.7 oben):
    //   "1".."5": [{s, b, f}]   normale Woche, Schluessel = getDay, s/b erste/letzte Stunde
    //   raster:  {start:'07:45', dauer:45, pausen:[{nach:2, min:20}]}   Uhrzeiten der Stunden
    //   b:       {wechsel:'<Montag einer B-Woche>', "1".."5": [...]}    Woche B im Wechsel
    //   block:   {"1".."5": [...]}                                      in Blockwochen
    //   tage:    {'2026-10-21': [...]}                                  einzelne Sondertage
    // Anlass (15.10.2026, Nutzer): "einmal Mittwoch, naechste Woche Mi und Do", Block-
    // wochen und Uhrzeiten/Pausen liessen sich nicht eintragen. App-Fassungen vor v8.5.9
    // lesen nur die Wochentags-Schluessel und sehen damit weiter die normale Woche.
    // Welcher Tag ueberhaupt Schule IST, entscheiden weiter die Schultage/Rhythmus/Bloecke;
    // der Plan sagt nur, WAS an so einem Tag dran ist.
    function listeNorm(l) {
        return (Array.isArray(l) ? l : []).map(function (e) {
            const s = e && Number(e.s) | 0, b = e && Number(e.b) | 0, f = e && String(e.f || '').trim().slice(0, 60);
            return (s >= 1 && s <= 12 && b >= s && b <= 12 && f) ? { s: s, b: b, f: f } : null;
        }).filter(Boolean).sort(function (x, y) { return x.s - y.s || x.b - y.b; }).slice(0, 12);
    }
    // Nur die Wochentags-Schluessel (eine Woche). Name aus v8.5.7 beibehalten.
    function planNorm(sp) {
        const out = {};
        if (!sp || typeof sp !== 'object' || Array.isArray(sp)) return out;
        ['1', '2', '3', '4', '5'].forEach(function (t) { const l = listeNorm(sp[t]); if (l.length) out[t] = l; });
        return out;
    }
    function zeitOk(s) { return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s); }
    function rasterNorm(r) {
        if (!r || typeof r !== 'object' || !zeitOk(r.start)) return null;
        const dauer = Number(r.dauer) | 0;
        if (dauer < 30 || dauer > 90) return null;
        const gesehen = {};
        const pausen = (Array.isArray(r.pausen) ? r.pausen : []).map(function (p) {
            const nach = p && Number(p.nach) | 0, min = p && Number(p.min) | 0;
            return nach >= 1 && nach <= 11 && min >= 5 && min <= 90 ? { nach: nach, min: min } : null;
        }).filter(function (p) { if (!p || gesehen[p.nach]) return false; gesehen[p.nach] = 1; return true; })
            .sort(function (a, b) { return a.nach - b.nach; });
        return { start: r.start, dauer: dauer, pausen: pausen };
    }
    function montagVon(iso) {
        if (!isoOk(iso)) return null;
        const p = iso.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2]);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    // Ganzer Plan, normalisiert. Leere Teile fallen weg, damit "gleich" auch gleich ist.
    function planVoll(sp) {
        const out = planNorm(sp);
        if (!sp || typeof sp !== 'object' || Array.isArray(sp)) return out;
        const r = rasterNorm(sp.raster); if (r) out.raster = r;
        if (sp.b && typeof sp.b === 'object' && montagVon(sp.b.wechsel)) {
            const w = planNorm(sp.b);
            if (Object.keys(w).length) out.b = Object.assign({ wechsel: montagVon(sp.b.wechsel) }, w);
        }
        const bl = planNorm(sp.block); if (Object.keys(bl).length) out.block = bl;
        if (sp.tage && typeof sp.tage === 'object' && !Array.isArray(sp.tage)) {
            const t = {};
            Object.keys(sp.tage).filter(isoOk).sort().slice(0, 60).forEach(function (d) { const l = listeNorm(sp.tage[d]); if (l.length) t[d] = l; });
            if (Object.keys(t).length) out.tage = t;
        }
        return out;
    }
    function planSchluessel(sp) { return JSON.stringify(planVoll(sp)); }
    function planLeer(sp) { const v = planVoll(sp); return !Object.keys(v).some(function (k) { return k !== 'raster'; }); }

    // Uhrzeit je Stunde aus dem Raster: [null, {von, bis}, … bis 12]
    function stundenZeiten(raster) {
        const r = rasterNorm(raster); if (!r) return null;
        const p = r.start.split(':').map(Number);
        let t = p[0] * 60 + p[1];
        const hm = function (m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
        const out = [null];
        for (let h = 1; h <= 12; h++) {
            out.push({ von: hm(t), bis: hm(t + r.dauer) });
            t += r.dauer;
            const pa = r.pausen.filter(function (x) { return x.nach === h; })[0];
            if (pa) t += pa.min;
        }
        return out;
    }
    // Ist die Woche von `iso` eine B-Woche? (gerade Anzahl Wochen Abstand zum Wechsel-Montag)
    function istBWoche(sp, iso) {
        const v = planVoll(sp); if (!v.b) return false;
        const a = montagVon(iso), w = v.b.wechsel; if (!a) return false;
        const tag = function (s) { const p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]) / 864e5; };
        return Math.round(tag(a) - tag(w)) / 7 % 2 === 0;
    }
    // Was an einem Datum dran ist: Sondertag > Blockwoche > Woche B > normale Woche.
    // bloecke = schoolRules.blocks bzw. Klassen-Bloecke ([{von, bis}]). Rueckgabe:
    // {quelle, liste:[{s,b,f,von?,bis?}]} oder null.
    function planFuerDatum(sp, iso, bloecke) {
        if (!isoOk(iso)) return null;
        const v = planVoll(sp);
        const p = iso.split('-').map(Number), wt = String(new Date(p[0], p[1] - 1, p[2]).getDay());
        let quelle = null, liste = null;
        if (v.tage && v.tage[iso]) { quelle = 'tag'; liste = v.tage[iso]; }
        else if (v.block && (bloecke || []).some(function (b) { return b && b.von <= iso && b.bis >= iso; })) {
            if (v.block[wt]) { quelle = 'block'; liste = v.block[wt]; }
        }
        if (!liste && v.b && istBWoche(v, iso)) { if (v.b[wt]) { quelle = 'b'; liste = v.b[wt]; } else return null; }
        if (!liste && v[wt]) { quelle = 'normal'; liste = v[wt]; }
        if (!liste) return null;
        const z = stundenZeiten(v.raster);
        return { quelle: quelle, liste: liste.map(function (e) {
            const o = { s: e.s, b: e.b, f: e.f };
            if (z) { o.von = z[e.s].von; o.bis = z[e.b].bis; }
            return o;
        }) };
    }
    function wocheText(w, en) {
        return Object.keys(w).filter(function (t) { return /^[1-5]$/.test(t); }).map(function (t) {
            const faecher = []; w[t].forEach(function (e) { if (faecher.indexOf(e.f) < 0) faecher.push(e.f); });
            return TAGE[t][en ? 1 : 0] + ': ' + faecher.join(', ');
        }).join(' · ');
    }
    // "Di: LF5, PuG · Do: Englisch · Woche B · Blockwoche · ab 07:45" — kurz fuer Karte und Meldung
    function planText(sp, en) {
        const v = planVoll(sp), teile = [];
        const n = wocheText(v, en); if (n) teile.push(n);
        if (v.b) teile.push(en ? 'week B: ' + wocheText(v.b, en) : 'Woche B: ' + wocheText(v.b, en));
        if (v.block) teile.push(en ? 'block weeks: ' + wocheText(v.block, en) : 'Blockwoche: ' + wocheText(v.block, en));
        if (v.tage) { const k = Object.keys(v.tage).length; teile.push(k + (en ? (k === 1 ? ' special day' : ' special days') : (k === 1 ? ' Sondertag' : ' Sondertage'))); }
        if (v.raster) teile.push((en ? 'from ' : 'ab ') + v.raster.start);
        return teile.join(' · ');
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
            s.school.stundenplan = planVoll(p.stundenplan);
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

    // ── Mitteilungen als Push (seit v8.5.9) ───────────────────────────
    // Oeffentlicher VAPID-Schluessel. Das Paar hat die Edge Function klassen-push selbst
    // erzeugt (private.push_schluessel); der private Teil liegt nur dort. Wechselt der
    // Schluessel je, sind alle Abos ungueltig — deshalb setzt die Funktion ihn nur einmal.
    const VAPID = 'BK1BX7ZLWkvdCKupgCXjfvr9U4SyeNLaClQ_BC9pnqjGXI3hi24h7vhpSOx9eq0SfkF6oh0fbQyLvt_650eU_CA';
    function pushMoeglich() {
        return !!(root.navigator && 'serviceWorker' in root.navigator && 'PushManager' in root && 'Notification' in root);
    }
    async function pushRegistrierung() {
        const sw = root.navigator.serviceWorker;
        let reg = await sw.getRegistration('/');
        if (!reg) {
            // Frisches Geraet, App nie geoeffnet: denselben Worker anmelden wie die App
            // (onboarding.js), mit der Version als ?v= — sonst haette er keine Cache-Generation.
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
    // 'an' | 'aus' | 'gesperrt' | 'nicht' — gesperrt = im Browser abgelehnt, geht nur in den Einstellungen
    async function pushStatus() {
        if (!pushMoeglich()) return 'nicht';
        if (root.Notification.permission === 'denied') return 'gesperrt';
        try {
            const reg = await root.navigator.serviceWorker.getRegistration('/');
            const abo = reg && await reg.pushManager.getSubscription();
            const z = zustand();
            return abo && z && z.push === abo.endpoint ? 'an' : 'aus';
        } catch (e) { return 'aus'; }
    }
    // Muss aus einem Klick heraus laufen (Berechtigungsfrage).
    async function pushAn(code) {
        if (!pushMoeglich()) { const e = new Error('push_nicht_moeglich'); e.code = 'push_nicht_moeglich'; throw e; }
        const recht = await root.Notification.requestPermission();
        if (recht !== 'granted') { const e = new Error('push_abgelehnt'); e.code = 'push_abgelehnt'; throw e; }
        const reg = await pushRegistrierung();
        let abo = await reg.pushManager.getSubscription();
        if (!abo) abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: schluesselBytes(VAPID) });
        await rpc('klasse_push_an', { p_code: code, p_abo: abo.toJSON(), p_sprache: istEn() ? 'en' : 'de' });
        const z = zustand(); if (z) { z.push = abo.endpoint; zustandSetzen(z); }
        return true;
    }
    async function pushAus() {
        try {
            const reg = await root.navigator.serviceWorker.getRegistration('/');
            const abo = reg && await reg.pushManager.getSubscription();
            if (abo) { await rpc('klasse_push_aus', { p_endpoint: abo.endpoint }).catch(function () {}); await abo.unsubscribe(); }
        } finally { const z = zustand(); if (z) { delete z.push; zustandSetzen(z); } }
        return true;
    }

    // ── Beitritt vormerken (Seite) ────────────────────────────────────
    function vormerken(p, auswahl) {
        const alt = zustand();
        const gesehen = alt && alt.code === p.code ? (alt.gesehen || []) : [];
        return zustandSetzen({
            push: alt && alt.code === p.code ? alt.push : undefined,
            code: p.code, name: p.name, version: alt && alt.code === p.code ? alt.version || 0 : 0,
            profil: p, auswahl: auswahl, ausstehend: true, beigetreten: (alt && alt.code === p.code && alt.beigetreten) || Date.now(),
            gesehen: gesehen, geprueft: Date.now()
        });
    }
    function austreten() {
        // Abo mit abmelden, sonst kaemen Mitteilungen der alten Klasse weiter aufs Handy
        const z = zustand(); if (z && z.push && pushMoeglich()) pushAus().catch(function () {});
        try { root.localStorage.removeItem(STATE_KEY); } catch (e) { /* egal */ }
    }

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
        tageText: tageText, rhythmusText: rhythmusText, planNorm: planNorm, planVoll: planVoll, planText: planText, planLeer: planLeer,
        planSchluessel: planSchluessel, rasterNorm: rasterNorm, stundenZeiten: stundenZeiten, istBWoche: istBWoche, planFuerDatum: planFuerDatum, montagVon: montagVon, datum: datum, heuteIso: heuteIso,
        rpc: rpc, laden: laden, beitreten: beitreten, geraetHash: geraetHash,
        pushMoeglich: pushMoeglich, pushStatus: pushStatus, pushAn: pushAn, pushAus: pushAus,
        appAbgleich: appAbgleich, mitteilungenMelden: mitteilungenMelden
    };
    root.MWLKlasse = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;

    // In der App (nicht auf /klasse/): nach dem Laden und beim Zurueckkehren abgleichen.
    if (root.document && root.document.getElementById && root.addEventListener) {
        const inApp = function () { return !!root.document.getElementById('view-dashboard'); };
        root.addEventListener('load', function () { if (inApp()) setTimeout(function () { appAbgleich(false); }, 1500); });
        root.document.addEventListener('visibilitychange', function () { if (!root.document.hidden && inApp()) appAbgleich(false); });
        // Push kam an (Service Worker meldet sich) oder die App wurde ueber die Benachrichtigung
        // geoeffnet: sofort nachfragen statt auf das 10-Minuten-Fenster zu warten.
        if (root.navigator && root.navigator.serviceWorker) root.navigator.serviceWorker.addEventListener('message', function (e) {
            if (e.data && e.data.typ === 'klasse-mitteilung' && inApp()) appAbgleich(true);
        });
        if (/[?&]klasse=mitteilung/.test(root.location.search || '')) root.addEventListener('load', function () { if (inApp()) setTimeout(function () { appAbgleich(true); }, 3000); });
    }
})(typeof window !== 'undefined' ? window : globalThis);
