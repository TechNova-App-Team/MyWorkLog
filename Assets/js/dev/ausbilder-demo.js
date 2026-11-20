// ═══ AUSBILDER DEMO MODULE ═══
// Vorschau des Ausbilder-Cockpits mit einem erfundenen Betrieb, NUR auf
// localhost: /ausbilder/?demo (Seite laedt diese Datei nur dort, siehe
// demoErlaubt() in pages/ausbilder/index.html).
//
// Warum: Der Nutzer hat selbst einen Pass und sah deshalb im Reiter „Pässe“
// nie den Kauf-Ablauf (20.11.2026). Ein echtes Demo-Konto haette in die
// PRODUKTIVE Supabase geschrieben — das hier ersetzt BHB2B im Browser.
//
// 🔴 Sicherheitsregeln, nicht aufweichen:
// - JEDE BHB2B-Funktion wird ersetzt. Was hier nicht nachgebaut ist, wirft
//   „in der Vorschau nicht möglich“ — so kann kein Klick die echte DB oder
//   Stripe erreichen, auch nicht eine kuenftig neue Funktion.
// - tools/prune-deploy.js entfernt Assets/js/dev/ aus dem Deploy.
// - Zustand (gekaufte Paesse, Entscheidungen) lebt in sessionStorage und ist
//   mit dem Tab weg.
(function () {
    'use strict';
    var SPEICHER = 'mwl_ausbilder_demo';
    var HEUTE = new Date();

    function zustand() {
        try { return JSON.parse(sessionStorage.getItem(SPEICHER) || '{}') || {}; } catch (e) { return {}; }
    }
    function merken(z) { try { sessionStorage.setItem(SPEICHER, JSON.stringify(z)); } catch (e) { /* ohne Merken */ } }

    function iso(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function montag(vorWochen) {
        var d = new Date(HEUTE.getFullYear(), HEUTE.getMonth(), HEUTE.getDate());
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * vorWochen);
        return d;
    }
    function kw(d) {
        var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
        var j = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
        return Math.ceil(((t - j) / 864e5 + 1) / 7);
    }

    var TAETIGKEITEN = [
        'Tickets im Helpdesk bearbeitet: Druckerfreigabe, VPN-Zugang, Passwort-Rücksetzungen',
        'Switch-Konfiguration gesichert, VLAN für die Buchhaltung angelegt',
        'Neuen Arbeitsplatz-PC aufgesetzt (Image, Domänenbeitritt, Software-Paket)',
        'Backup-Lauf geprüft und Fehlerprotokoll mit dem Ausbilder besprochen',
        'Patchfeld im Serverraum dokumentiert und Beschriftung erneuert',
        'Monitoring-Alarme ausgewertet und zwei Schwellwerte angepasst',
        'Kundentermin begleitet: Netzwerkdosen geprüft, Messprotokoll erstellt',
        'Dokumentation der Wiederanlauf-Reihenfolge im Wiki ergänzt'
    ];
    var SCHULE = ['Datenbanken: Normalformen und Joins', 'Wirtschaft: Kaufvertrag und AGB', 'Englisch: technische Dokumentation', 'Netzwerktechnik: Subnetting'];
    var TAGE = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    function woche(azubiId, vorWochen, lehrjahr, art, nr) {
        var mo = montag(vorWochen), fr = new Date(mo); fr.setDate(fr.getDate() + 4);
        var da = {}, dh = {}, ds = {};
        TAGE.forEach(function (t, i) {
            var schule = i === 1 + (nr % 2) * 2;
            ds[t] = schule;
            da[t] = schule
                ? '• ' + SCHULE[(nr + i) % 4] + '\n• ' + SCHULE[(nr + i + 1) % 4]
                : '• ' + TAETIGKEITEN[(nr + i) % 8] + '\n• ' + TAETIGKEITEN[(nr + i + 3) % 8];
            dh[t] = i === 4 ? 4.5 + (nr % 3) * 0.25 : 8.5 + ((nr + i) % 3) * 0.12;
        });
        da.saturday = ''; da.sunday = ''; dh.saturday = ''; dh.sunday = '';
        var summe = TAGE.reduce(function (s, t) { return s + dh[t]; }, 0);
        var b = {
            id: azubiId + '_' + iso(mo), azubi_id: azubiId, kw: kw(mo), jahr: lehrjahr,
            datum_von: iso(mo), datum_bis: iso(fr),
            status: art === 'arbeit' ? 'incomplete' : art === 'ihk' ? 'signed' : 'complete',
            quelle: art === 'ihk' ? 'ihk-import' : 'local',
            inhalt: { hours: Math.round(summe * 100) / 100, department: 'IT-Support', mode: 'daily',
                      dailyActivities: da, dailyHours: dh, dailySchool: ds, activities: '', school: '' },
            freigabe: null, verlauf: [], ketteOk: true, veraendert: false, nachgebessert: false, diff: null
        };
        if (art === 'ok' || art === 'zurueck' || art === 'nachgebessert') {
            var am = new Date(fr); am.setDate(am.getDate() + 3);
            b.freigabe = { id: 'f_' + b.id, ausbilder_id: 'demo-ich', ausbilder_name: 'M. Weber', bericht_id: b.id,
                           entscheidung: art === 'ok' ? 'approved' : 'rejected',
                           anmerkung: art === 'ok' ? '' : 'Bitte Dienstag genauer beschreiben.', erstellt_at: iso(am) + 'T09:00:00Z' };
            b.verlauf = [b.freigabe];
            b.nachgebessert = art === 'nachgebessert';
        }
        return b;
    }

    function azubi(userId, name, lehrjahr, plan) {
        return { userId: userId, name: name, berichte: plan.map(function (p, i) { return woche(userId, p[0], lehrjahr, p[1], i); }) };
    }
    function reihe(von, bis, art) {
        var r = [];
        for (var w = von; w >= bis; w--) r.push([w, art]);
        return r;
    }

    function daten() {
        var z = zustand();
        var konto = {
            betrieb: 'Musterwerk GmbH', betriebId: 'demo', domain: 'musterwerk.de', domainOk: true,
            nachweisArt: 'dns', nachgewiesen: true, impressumUrl: 'https://musterwerk.de/impressum',
            kontoEmail: 'm.weber@musterwerk.de',
            azubis: [
                azubi('demo-a1', 'Anna Beispiel', 3, reihe(30, 9, 'ok').concat([[8, 'neu'], [7, 'neu'], [6, 'neu'], [1, 'arbeit']])),
                azubi('demo-a2', 'Jonas Keller', 2, reihe(14, 9, 'ok').concat([[8, 'nachgebessert'], [7, 'neu'], [5, 'zurueck']])),
                azubi('demo-a3', 'Mira Özdemir', 1, [[9, 'ihk'], [8, 'ihk'], [7, 'ok'], [6, 'ok'], [5, 'neu']])
            ]
        };
        // Entscheidungen aus dieser Vorschau-Sitzung wieder anbringen
        var ent = z.entscheidungen || {};
        konto.azubis.forEach(function (a) {
            a.berichte.forEach(function (b) {
                var e = ent[b.id];
                if (!e) return;
                b.freigabe = e; b.verlauf = (b.verlauf || []).concat([e]); b.nachgebessert = false; b.veraendert = false;
            });
        });
        return konto;
    }

    function lizenzen() {
        var z = zustand();
        var bis = function (jahre) { var d = new Date(HEUTE); d.setFullYear(d.getFullYear() + jahre); return iso(d) + 'T00:00:00Z'; };
        var liste = z.lizenzen || [
            { id: 'demo-l1', dauer_jahre: 3, bis: bis(2), azubi: 'demo-a1', azubi_name: 'Anna Beispiel', zustand: 'aktiv', erstellt_am: iso(HEUTE) },
            { id: 'demo-l2', dauer_jahre: 2, bis: bis(1), azubi: 'demo-x', azubi_name: 'Lukas Brandt', zustand: 'verlassen',
              verlassen_am: iso(new Date(HEUTE.getTime() - 4 * 864e5)), erstellt_am: iso(HEUTE) },
            { id: 'demo-l3', dauer_jahre: 2, bis: bis(1), azubi: null, azubi_name: null, zustand: 'frei', erstellt_am: iso(HEUTE) }
        ];
        if (!z.lizenzen) { z.lizenzen = liste; merken(z); }
        var mitPass = liste.filter(function (l) { return (l.zustand === 'aktiv') && l.azubi; }).map(function (l) { return l.azubi; });
        return { betriebId: 'demo', lizenzen: liste, mitPass: mitPass };
    }
    function lizenzAendern(id, fn) {
        var z = zustand(); lizenzen(); z = zustand();
        z.lizenzen = z.lizenzen.map(function (l) { return l.id === id ? fn(Object.assign({}, l)) : l; });
        merken(z);
        return true;
    }

    var NACHGEBAUT = {
        angemeldet: function () { return true; },
        status: async function () {
            return { rolle: 'ausbilder', name: 'Musterwerk GmbH', betriebId: 'demo', domain: 'musterwerk.de', domainOk: true,
                     nachweisArt: 'dns', nachgewiesen: true, anzeigeName: 'M. Weber', userId: 'demo-ich' };
        },
        azubiBerichte: async function () { return daten(); },
        meldungen: async function () { return []; },
        meldungenQuittieren: async function () { return true; },
        team: async function () {
            return [{ userId: 'demo-ich', name: 'M. Weber', ich: true, seit: '2025-11-27' },
                    { userId: 'demo-u2', name: 'S. Brandt', ich: false, seit: '2026-07-15' }];
        },
        erinnerungenBetrieb: async function () { return {}; },
        erinnerungSenden: async function () { return { ok: true }; },
        freigabeSchreiben: async function (bid, entscheidung, note) {
            var z = zustand();
            var zeile = { id: 'demo-f-' + Date.now(), ausbilder_id: 'demo-ich', ausbilder_name: 'M. Weber', bericht_id: bid,
                          entscheidung: entscheidung, anmerkung: note || '', erstellt_at: new Date().toISOString() };
            z.entscheidungen = z.entscheidungen || {};
            z.entscheidungen[bid] = zeile;
            merken(z);
            return zeile;
        },
        lizenzen: async function () { return lizenzen(); },
        lizenzEntziehen: async function (id) { return lizenzAendern(id, function (l) { l.zustand = 'frei'; l.azubi = null; l.azubi_name = null; return l; }); },
        lizenzSchenken: async function (id) { return lizenzAendern(id, function (l) { l.zustand = 'geschenkt'; return l; }); },
        lizenzZuweisen: async function (id, azubiId) {
            var a = daten().azubis.filter(function (x) { return x.userId === azubiId; })[0];
            return lizenzAendern(id, function (l) { l.zustand = 'aktiv'; l.azubi = azubiId; l.azubi_name = a ? a.name : ''; return l; });
        },
        // Kasse: kein Stripe. Die Vorschau „bezahlt“ sofort und kehrt auf
        // denselben Weg zurueck, den Stripe nehmen wuerde (?betriebkauf=…).
        lizenzKasse: async function (ids, dauer) {
            var z = zustand(); z.kauf = { ids: ids, dauer: dauer }; merken(z);
            return { ok: true, url: location.pathname + '?demo&betriebkauf=cs_test_vorschau00000000' };
        },
        lizenzKaufAbholen: async function () {
            var z = zustand(); lizenzen(); z = zustand();
            var k = z.kauf; if (!k) return { ok: false, fehler: 'offen' };
            var alle = daten().azubis, bis = new Date(HEUTE); bis.setFullYear(bis.getFullYear() + k.dauer);
            k.ids.forEach(function (id, i) {
                var a = alle.filter(function (x) { return x.userId === id; })[0];
                z.lizenzen.unshift({ id: 'demo-k' + Date.now() + i, dauer_jahre: k.dauer, bis: iso(bis) + 'T00:00:00Z', azubi: id,
                                     azubi_name: a ? a.name : '', zustand: 'aktiv', erstellt_am: iso(HEUTE) });
            });
            var n = k.ids.length; delete z.kauf; merken(z);
            return { ok: true, anzahl: n };
        }
    };

    window.MWLAusbilderDemo = function (bhb2b) {
        // Reine Rechenfunktionen ohne Netz duerfen echt bleiben.
        var ECHT = ['fehlendeWochen', 'inhaltDiff'];
        Object.keys(bhb2b).forEach(function (k) {
            if (typeof bhb2b[k] !== 'function' || ECHT.indexOf(k) !== -1) return;
            bhb2b[k] = NACHGEBAUT[k] || function () {
                throw new Error('In der Vorschau nicht möglich.');
            };
        });
        Object.keys(NACHGEBAUT).forEach(function (k) { if (!bhb2b[k]) bhb2b[k] = NACHGEBAUT[k]; });

        var band = document.createElement('div');
        band.className = 'ab-demo-band';
        band.setAttribute('role', 'status');
        band.innerHTML = '<span>Vorschau mit erfundenen Daten. Nichts wird gespeichert oder bezahlt.</span>' +
            '<button type="button">Zurücksetzen</button>';
        band.querySelector('button').addEventListener('click', function () {
            try { sessionStorage.removeItem(SPEICHER); } catch (e) { /* egal */ }
            location.href = location.pathname + '?demo';
        });
        var st = document.createElement('style');
        st.textContent = '.ab-demo-band{position:fixed;left:16px;bottom:16px;max-width:calc(100vw - 32px);z-index:100001;' +
            'display:flex;align-items:center;gap:12px;padding:8px 8px 8px 16px;border-radius:999px;' +
            'background:var(--ink);color:var(--on-ink);font-size:.8rem;font-weight:500;box-shadow:0 10px 30px -10px rgba(0,0,0,.6)}' +
            '.ab-demo-band button{border:0;border-radius:999px;padding:6px 12px;font:inherit;font-weight:600;cursor:pointer;' +
            'background:rgba(var(--primary-rgb),.25);color:inherit}';
        document.head.appendChild(st);
        document.body.appendChild(band);
    };
})();
