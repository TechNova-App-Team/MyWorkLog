// ═══ AUSBILDER DEMO MODULE ═══
// Demo-Durchgang des Ausbilder-Cockpits mit einem erfundenen Betrieb:
// /ausbilder/?demo, Knopf „Demo ansehen“ im Einstieg. Laeuft LIVE fuer
// Betriebe, die das Cockpit vor dem Anlegen ausprobieren wollen (Wunsch des
// Nutzers 20.11.2026). Ein echtes Demo-Konto haette in die produktive
// Supabase geschrieben und echte Stripe-Kassen geoeffnet.
//
// 🔴 Sicherheitsregeln, nicht aufweichen (Test: tools/ausbilder-demo.test.mjs):
// - JEDE BHB2B-Funktion wird ersetzt. Was hier nicht nachgebaut ist, wirft
//   „in der Demo nicht möglich“ — so kann kein Klick die echte DB oder
//   Stripe erreichen, auch nicht eine kuenftig neue Funktion. Echt bleiben
//   nur reine Rechenfunktionen ohne Netz (ECHT unten).
// - mwlEvent laesst in der Demo NUR 'ausbilder_demo' durch. Sonst zaehlten
//   Demo-Klicks als echte Freigaben und Firmenpass-Kaeufe (Kaufrate!).
// - Zustand (Paesse, Entscheidungen) lebt in sessionStorage, mit dem Tab weg.
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
            betrieb: 'Musterwerk GmbH', kuerzel: z.kuerzel || '', betriebId: 'demo', domain: 'musterwerk.de', domainOk: true,
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
        kuerzelSetzen: async function (k) { var z = zustand(); z.kuerzel = k || ''; merken(z); return z.kuerzel; },
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

    function L(de, en) { return document.documentElement.lang === 'en' ? en : de; }

    // Der echte Weg zum eigenen Betrieb: derselbe Link wie der Hauptknopf im
    // Einstieg (auf /en/ zeigt er dorthin, wohin die EN-Seite zeigt).
    function einrichtenUrl() {
        var a = document.querySelector('#abIntro .abi-start .ab-cta');
        return (a && a.getAttribute('href')) || '/?cloud=login&back=ausbilder';
    }
    function demoVerlassen(ziel) {
        try { sessionStorage.removeItem(SPEICHER); } catch (e) { /* egal */ }
        location.href = ziel;
    }

    window.MWLAusbilderDemo = function (bhb2b) {
        // Reine Rechenfunktionen ohne Netz duerfen echt bleiben.
        var ECHT = ['fehlendeWochen', 'inhaltDiff'];
        var nichtMoeglich = function () {
            throw new Error(L('In der Demo nicht möglich. Richten Sie dafür Ihren eigenen Betrieb ein.',
                              'Not available in the demo. Set up your own company for this.'));
        };
        Object.keys(bhb2b).forEach(function (k) {
            if (typeof bhb2b[k] !== 'function' || ECHT.indexOf(k) !== -1) return;
            bhb2b[k] = NACHGEBAUT[k] || nichtMoeglich;
        });
        Object.keys(NACHGEBAUT).forEach(function (k) { if (!bhb2b[k]) bhb2b[k] = NACHGEBAUT[k]; });
        // „Abmelden“ im Konto-Menue verlaesst die Demo.
        bhb2b.abmelden = async function () { demoVerlassen(location.pathname); };

        // Messung: nur das eigene Ereignis durchlassen (siehe Kopf).
        var echtesEvent = typeof window.mwlEvent === 'function' ? window.mwlEvent : null;
        var melden = function (schritt) {
            if (echtesEvent) { try { echtesEvent('ausbilder_demo', { schritt: schritt }, { transport: 'sendBeacon' }); } catch (e) { /* egal */ } }
        };
        window.mwlEvent = function (name) {
            if (name === 'ausbilder_demo' && echtesEvent) return echtesEvent.apply(this, arguments);
        };
        var z = zustand();
        if (!z.gestartet) { z.gestartet = true; merken(z); melden('start'); }

        // Band IM Fluss ueber dem Cockpit, nicht fixiert: fixiert lag es am Handy
        // auf der Entscheidungsleiste (die klebt ebenfalls unten).
        var band = document.createElement('div');
        band.className = 'ab-demo-band';
        band.setAttribute('role', 'note');
        band.innerHTML =
            '<p class="ab-demo-t"><b>' + L('Demo-Betrieb', 'Demo company') + '</b>' +
            '<span>' + L('Erfundene Azubis und Wochen. Probieren Sie alles aus: nichts wird gespeichert, verschickt oder bezahlt.',
                         'Made-up apprentices and weeks. Try everything: nothing is saved, sent or charged.') + '</span></p>' +
            '<div class="ab-demo-knoepfe">' +
            '<button type="button" class="ab-demo-neu">' + L('Neu starten', 'Start over') + '</button>' +
            '<a class="ab-demo-los" href="' + einrichtenUrl().replace(/"/g, '&quot;') + '">' + L('Eigenen Betrieb einrichten', 'Set up your company') + '</a>' +
            '</div>';
        band.querySelector('.ab-demo-neu').addEventListener('click', function () {
            melden('neu');
            demoVerlassen(location.pathname + '?demo');
        });
        band.querySelector('.ab-demo-los').addEventListener('click', function (e) {
            e.preventDefault();
            melden('einrichten');
            demoVerlassen(this.getAttribute('href'));
        });
        var st = document.createElement('style');
        st.textContent =
            '.ab-demo-band{display:flex;align-items:center;flex-wrap:wrap;gap:12px 20px;margin:0 0 18px;padding:12px 12px 12px 18px;' +
            'border:1px solid rgba(var(--primary-rgb),.35);border-radius:14px;background:rgba(var(--primary-rgb),.1)}' +
            '.ab-demo-t{flex:1 1 320px;display:flex;flex-wrap:wrap;gap:2px 10px;align-items:baseline;font-size:.84rem;line-height:1.5;color:var(--text-muted)}' +
            '.ab-demo-t b{color:var(--text-main);font-weight:650}' +
            '.ab-demo-knoepfe{display:flex;gap:8px;flex-wrap:wrap}' +
            '.ab-demo-neu,.ab-demo-los{display:inline-flex;align-items:center;padding:8px 16px;border-radius:999px;font:inherit;' +
            'font-size:.84rem;font-weight:600;cursor:pointer;text-decoration:none;transition:background-color .18s ease,border-color .18s ease}' +
            '.ab-demo-neu{border:1px solid var(--border-strong);background:none;color:var(--text-main)}' +
            '.ab-demo-neu:hover{border-color:var(--text-muted)}' +
            '.ab-demo-los{border:1px solid transparent;background:var(--ink);color:var(--on-ink)}' +
            '.ab-demo-los:hover{background:color-mix(in srgb,var(--ink) 88%,var(--primary))}' +
            '.ab-demo-neu:active,.ab-demo-los:active{transform:scale(.97)}' +
            '@media (max-width:760px){.ab-demo-knoepfe{width:100%}.ab-demo-knoepfe>*{flex:1 1 100%;justify-content:center;white-space:nowrap}.ab-demo-los{order:-1}}';
        document.head.appendChild(st);
        var konto = document.getElementById('abKonto');
        if (konto && konto.parentNode) konto.parentNode.insertBefore(band, konto);
        else document.body.insertBefore(band, document.body.firstChild);
    };
})();
