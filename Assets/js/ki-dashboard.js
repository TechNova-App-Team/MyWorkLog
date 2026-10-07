// ═══ KI-DASHBOARD MODULE ═══
// /ki-dashboard/ — internes Werkzeug. Liest GET /dev/statistik des ai-proxy
// (workers/ai-proxy/worker.js, handleDevStatistik) mit dem Umfrage-Secret und
// rechnet alles Weitere hier: Kennzahlen, Saeulen, Modellkette, letzte Aufrufe.
//
// Ein Protokolleintrag (Metadata im KV) sieht so aus:
//   { ts, a: 'woche'|'tag'|'chat'|'?', s: 'ok'|'rettung'|'fehler', m: Modell,
//     pt, ct: Tokens Eingabe/Ausgabe, ms: Dauer, f: '429,zeit,…' }
// f listet die Fehlversuche in Reihenfolge der Modellkette — Position j gehoert
// zu modelle[j]. Aendert sich die Kette, sind aeltere Eintraege dort verschoben;
// die Tabelle sagt das dazu, statt es zu verschweigen.
(function () {
    'use strict';

    var ENDPOINT = 'https://ai-proxy.myworklog.de/dev/statistik';
    var SECRET_KEY = 'kd_secret';   // sessionStorage: weg, sobald der Tab zu ist

    var ART_NAME = { woche: 'Ganze Woche', tag: 'Einzelner Tag', chat: 'Assistent (Chat)', '?': 'Ohne Angabe (ältere App)' };
    var STATUS_NAME = { ok: 'Geliefert', rettung: 'Gerettet', fehler: 'Fehlgeschlagen' };
    var FEHLER_NAME = { '429': 'Überlastet (429)', zeit: 'Zeitüberschreitung', form: 'Unbrauchbare Antwort', leer: 'Leere Antwort',
        json: 'Kaputtes JSON', netz: 'Netzfehler', '404': 'Nicht gefunden (404)', '500': 'Serverfehler (500)',
        '502': 'Gateway (502)', '503': 'Nicht verfügbar (503)', '504': 'Gateway-Zeit (504)' };

    var tage = 7;
    var daten = null;

    var $ = function (id) { return document.getElementById(id); };
    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    var zahl = function (n) { return Math.round(n).toLocaleString('de-DE'); };
    var kurzZahl = function (n) {
        if (n >= 1e6) return (n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Mio.';
        if (n >= 1e4) return Math.round(n / 1000).toLocaleString('de-DE') + ' Tsd.';
        return zahl(n);
    };
    var sek = function (ms) { return (ms / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' s'; };
    var modellKurz = function (m) { return String(m || '').replace(/^[^/]+\//, '').replace(/:free$/, ''); };
    var fehlerListe = function (e) { return e.f ? e.f.split(',').filter(Boolean) : []; };
    var FEHLER_KURZ = { zeit: 'Zeit', form: 'Form', leer: 'leer', json: 'JSON', netz: 'Netz' };
    // '429,429,zeit' → '429 ×2 · Zeit' — die Langform steht im Titel der Zelle.
    function fehlerKurz(f) {
        var n = {};
        f.forEach(function (c) { n[c] = (n[c] || 0) + 1; });
        return Object.keys(n).map(function (c) { return (FEHLER_KURZ[c] || c) + (n[c] > 1 ? ' ×' + n[c] : ''); }).join(' · ');
    }

    var berlin = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    function teile(ts) {
        var p = {};
        berlin.formatToParts(new Date(ts)).forEach(function (x) { p[x.type] = x.value; });
        return { tag: p.year + '-' + p.month + '-' + p.day, stunde: +p.hour, text: p.day + '.' + p.month + '. ' + p.hour + ':' + p.minute };
    }
    function quantil(werte, q) {
        if (!werte.length) return 0;
        var s = werte.slice().sort(function (a, b) { return a - b; });
        return s[Math.min(s.length - 1, Math.floor(q * s.length))];
    }

    // ── Laden ─────────────────────────────────────────────
    async function laden() {
        var secret = sessionStorage.getItem(SECRET_KEY);
        if (!secret) return zeigeLogin('');
        $('kdNeu').disabled = true;
        try {
            var r = await fetch(ENDPOINT + '?tage=' + Math.max(tage, 1), { headers: { 'X-Umfrage-Secret': secret }, cache: 'no-store' });
            if (r.status === 401) { sessionStorage.removeItem(SECRET_KEY); return zeigeLogin('Das Secret stimmt nicht.'); }
            if (!r.ok) throw new Error('Der Proxy antwortet mit ' + r.status + '.');
            daten = await r.json();
            $('kdLogin').hidden = true;
            $('kdInhalt').hidden = false;
            zeichnen();
        } catch (e) {
            zeigeLogin(e.message && e.message.indexOf('Proxy') === 0 ? e.message
                : 'Keine Verbindung zum Proxy. Offline, oder ein Blocker hält die Anfrage an.');
        } finally {
            $('kdNeu').disabled = false;
        }
    }
    function zeigeLogin(meldung) {
        $('kdInhalt').hidden = true;
        $('kdLogin').hidden = false;
        $('kdMeldung').hidden = !meldung;
        $('kdMeldung').textContent = meldung || '';
    }

    // ── Zeichnen ──────────────────────────────────────────
    function zeichnen() {
        var d = daten;
        var heute = d.heute;
        var tagSet = tage === 1 ? [heute] : d.tage.slice(-tage);
        var auf = d.aufrufe.filter(function (e) { return tagSet.indexOf(teile(e.ts).tag) >= 0; });

        $('kdStand').textContent = 'Stand ' + teile(Date.parse(d.stand)).text.slice(-5) + ' Uhr';
        kennzahlen(auf, d);
        saeulen(auf, tagSet);
        arten(auf);
        kontingent(d);
        modelle(auf, d.modelle);
        letzte(auf);
    }

    function kennzahlen(auf, d) {
        var tokEin = 0, tokAus = 0, n = { ok: 0, rettung: 0, fehler: 0 };
        auf.forEach(function (e) { tokEin += e.pt || 0; tokAus += e.ct || 0; n[e.s] = (n[e.s] || 0) + 1; });
        var wochen = auf.filter(function (e) { return e.a === 'woche' && e.s !== 'fehler'; });
        var wocheSchnitt = wochen.length ? wochen.reduce(function (s, e) { return s + e.pt + e.ct; }, 0) / wochen.length : null;
        var dauern = auf.filter(function (e) { return e.s !== 'fehler'; }).map(function (e) { return e.ms; });
        var amLimit = d.geraeteHeute.filter(function (g) { return g.t >= d.kontingent.tokensTag || g.n >= d.kontingent.anfragenTag; }).length;

        var kpis = [
            ['Aufrufe', zahl(auf.length), auf.length ? zahl(n.ok) + ' geliefert' : 'im Zeitraum keiner'],
            ['Tokens', kurzZahl(tokEin + tokAus), zahl(tokEin) + ' ein · ' + zahl(tokAus) + ' aus'],
            ['Ø je Woche', wocheSchnitt == null ? '—' : zahl(wocheSchnitt), wochen.length ? 'Tokens, ' + zahl(wochen.length) + ' Wochen' : 'keine Woche im Zeitraum'],
            ['Geliefert', auf.length ? Math.round(n.ok / auf.length * 100) + ' %' : '—', zahl(n.rettung) + ' gerettet · ' + zahl(n.fehler) + ' fehlgeschlagen'],
            ['Dauer, Median', dauern.length ? sek(quantil(dauern, 0.5)) : '—', dauern.length ? '90 % unter ' + sek(quantil(dauern, 0.9)) : ''],
            ['Geräte heute', zahl(d.geraeteHeute.length), amLimit + ' am Limit · ' + zahl(d.ipsHeute) + ' IP-Adressen'],
        ];
        $('kdKpis').innerHTML = kpis.map(function (k) {
            return '<div class="kd-kpi"><div class="kd-kpi-name">' + esc(k[0]) + '</div><div class="kd-kpi-wert">' + esc(k[1]) +
                '</div><div class="kd-kpi-zusatz">' + esc(k[2]) + '</div></div>';
        }).join('');
    }

    // Eine Achse je Diagramm (dataviz: nie zwei Skalen) — Aufrufe und Tokens
    // stehen deshalb in zwei Karten untereinander, mit derselben Zeitachse.
    function saeulen(auf, tagSet) {
        var stunden = tage === 1;
        var faecher = stunden
            ? Array.from({ length: 24 }, function (_, h) { return { key: h, name: String(h).padStart(2, '0') + ' Uhr', achse: h % 3 === 0 ? String(h).padStart(2, '0') : '' }; })
            : tagSet.map(function (t, i) {
                var p = t.split('-');
                var jeder = tagSet.length > 14 ? (i % 5 === 0 || i === tagSet.length - 1) : true;
                return { key: t, name: p[2] + '.' + p[1] + '.' + p[0], achse: jeder ? p[2] + '.' + p[1] + '.' : '' };
            });
        var werte = faecher.map(function () { return { ok: 0, rettung: 0, fehler: 0, tok: 0 }; });
        auf.forEach(function (e) {
            var t = teile(e.ts);
            var i = stunden ? t.stunde : tagSet.indexOf(t.tag);
            if (i < 0) return;
            werte[i][e.s] = (werte[i][e.s] || 0) + 1;
            werte[i].tok += (e.pt || 0) + (e.ct || 0);
        });

        var maxA = Math.max.apply(null, werte.map(function (w) { return w.ok + w.rettung + w.fehler; }));
        var maxT = Math.max.apply(null, werte.map(function (w) { return w.tok; }));
        $('kdChartAufrufe').innerHTML = maxA ? diagramm(faecher, werte, maxA, function (w) {
            return ['ok', 'rettung', 'fehler'].map(function (s) {
                return w[s] ? '<i class="kd-seg-' + s + '" style="height:' + (w[s] / maxA * 100) + '%"></i>' : '';
            }).join('');
        }, function (f, w) {
            var summe = w.ok + w.rettung + w.fehler;
            return f.name + ': ' + summe + ' Aufrufe, ' + w.ok + ' geliefert, ' + w.rettung + ' gerettet, ' + w.fehler + ' fehlgeschlagen';
        }, zahl) : '<p class="kd-leer">Im Zeitraum gab es keinen Cloud-Aufruf.</p>';

        $('kdChartTokens').innerHTML = maxT ? diagramm(faecher, werte, maxT, function (w) {
            return w.tok ? '<i class="kd-seg-tokens" style="height:' + (w.tok / maxT * 100) + '%"></i>' : '';
        }, function (f, w) {
            return f.name + ': ' + zahl(w.tok) + ' Tokens';
        }, kurzZahl) : '<p class="kd-leer">Noch keine Tokens im Zeitraum.</p>';
    }

    function diagramm(faecher, werte, max, segmente, beschriftung, fmt) {
        // Spalten liegen in derselben Reihenfolge wie die Achse darunter — beide
        // im selben Raster (grid-auto-columns), damit keine Marke verrutscht.
        var spalten = faecher.map(function (f, i) {
            return '<div class="kd-spalte" tabindex="0" data-i="' + i + '" aria-label="' + esc(beschriftung(f, werte[i])) + '">' +
                segmente(werte[i]) + '</div>';
        }).join('');
        var achse = faecher.map(function (f) { return '<span>' + esc(f.achse) + '</span>'; }).join('');
        return '<div class="kd-saeulen"><div class="kd-gitter" style="top:18px"><span>' + esc(fmt(max)) + '</span></div>' +
            '<div class="kd-gitter" style="top:calc(18px + (100% - 18px) / 2)"><span>' + esc(fmt(max / 2)) + '</span></div>' +
            spalten + '</div><div class="kd-achse">' + achse + '</div>';
    }

    function hbars(ziel, zeilen, leer) {
        var max = Math.max.apply(null, zeilen.map(function (z) { return z.wert; }).concat([0]));
        $(ziel).innerHTML = max ? zeilen.map(function (z) {
            return '<div><div class="kd-hbar-kopf"><span>' + esc(z.name) + '</span><span>' + esc(z.text) + '</span></div>' +
                '<div class="kd-hbar-spur"><i style="width:' + (z.wert / max * 100) + '%"></i></div></div>';
        }).join('') : '<p class="kd-leer">' + esc(leer) + '</p>';
    }

    function arten(auf) {
        var z = {};
        auf.forEach(function (e) {
            var a = ART_NAME[e.a] ? e.a : '?';
            z[a] = z[a] || { n: 0, tok: 0 };
            z[a].n++; z[a].tok += (e.pt || 0) + (e.ct || 0);
        });
        hbars('kdArten', ['woche', 'tag', 'chat', '?'].filter(function (a) { return z[a]; }).map(function (a) {
            return { name: ART_NAME[a], wert: z[a].n, text: zahl(z[a].n) + ' · Ø ' + zahl(z[a].tok / z[a].n) + ' Tokens' };
        }), 'Im Zeitraum gab es keinen Cloud-Aufruf.');
    }

    function kontingent(d) {
        var lim = d.kontingent.tokensTag;
        var stufen = [
            ['unter 10 %', function (g) { return g.t < lim * 0.1; }],
            ['10 bis 25 %', function (g) { return g.t >= lim * 0.1 && g.t < lim * 0.25; }],
            ['25 bis 50 %', function (g) { return g.t >= lim * 0.25 && g.t < lim * 0.5; }],
            ['50 bis 75 %', function (g) { return g.t >= lim * 0.5 && g.t < lim * 0.75; }],
            ['75 bis 99 %', function (g) { return g.t >= lim * 0.75 && g.t < lim && g.n < d.kontingent.anfragenTag; }],
            ['am Limit', function (g) { return g.t >= lim || g.n >= d.kontingent.anfragenTag; }],
        ];
        $('kdKontHinweis').textContent = 'Geräte nach Verbrauch, ' + zahl(lim) + ' Tokens je Gerät';
        hbars('kdKontingent', stufen.map(function (s) {
            var n = d.geraeteHeute.filter(s[1]).length;
            return { name: s[0], wert: n, text: zahl(n) + (n === 1 ? ' Gerät' : ' Geräte') };
        }), 'Heute hat noch kein Gerät die Cloud-KI benutzt.');
    }

    function modelle(auf, kette) {
        var z = kette.map(function () { return { gefragt: 0, ok: 0, gerettet: 0, tok: 0, fehler: {} }; });
        auf.forEach(function (e) {
            var f = fehlerListe(e);
            f.forEach(function (code, j) {
                if (!z[j]) return;
                z[j].gefragt++;
                z[j].fehler[code] = (z[j].fehler[code] || 0) + 1;
            });
            var j = kette.indexOf(e.m);
            if (e.s === 'ok' && z[j]) { z[j].gefragt++; z[j].ok++; z[j].tok += e.pt + e.ct; }
            if (e.s === 'rettung' && z[j]) z[j].gerettet++;
        });
        var kopf = '<thead><tr><th>#</th><th>Modell</th><th class="zahl">Gefragt</th><th class="zahl">Geliefert</th>' +
            '<th class="zahl">Quote</th><th class="zahl">Ø Tokens</th><th>Nicht geliefert, weil</th></tr></thead>';
        var zeilen = kette.map(function (m, i) {
            var r = z[i];
            var gruende = Object.keys(r.fehler).sort(function (a, b) { return r.fehler[b] - r.fehler[a]; })
                .map(function (c) { return (FEHLER_NAME[c] || c) + ' ×' + r.fehler[c]; }).join(', ');
            return '<tr><td class="leise">' + (i + 1) + '</td><td class="mono">' + esc(modellKurz(m)) + '</td>' +
                '<td class="zahl">' + zahl(r.gefragt) + '</td><td class="zahl">' + zahl(r.ok) + (r.gerettet ? ' <span class="leise">+' + r.gerettet + '</span>' : '') + '</td>' +
                '<td class="zahl">' + (r.gefragt ? Math.round(r.ok / r.gefragt * 100) + ' %' : '—') + '</td>' +
                '<td class="zahl">' + (r.ok ? zahl(r.tok / r.ok) : '—') + '</td>' +
                '<td class="leise">' + esc(gruende || '—') + '</td></tr>';
        }).join('');
        $('kdModelle').innerHTML = kopf + '<tbody>' + zeilen + '</tbody>';
    }

    function letzte(auf) {
        var liste = auf.slice().sort(function (a, b) { return b.ts - a.ts; }).slice(0, 50);
        var kopf = '<thead><tr><th>Zeit</th><th>Art</th><th>Ergebnis</th><th>Modell</th><th class="zahl">Ein</th>' +
            '<th class="zahl">Aus</th><th class="zahl">Dauer</th><th>Fehlversuche</th></tr></thead>';
        if (!liste.length) {
            $('kdLetzte').innerHTML = '<tbody><tr><td class="leise">Im Zeitraum gab es keinen Cloud-Aufruf.</td></tr></tbody>';
            return;
        }
        $('kdLetzte').innerHTML = kopf + '<tbody>' + liste.map(function (e) {
            var f = fehlerListe(e);
            return '<tr><td>' + esc(teile(e.ts).text) + '</td><td>' + esc(ART_NAME[e.a] || e.a) + '</td>' +
                '<td><span class="kd-status ' + esc(e.s) + '"><span>' + esc(STATUS_NAME[e.s] || e.s) + '</span></span></td>' +
                '<td class="mono">' + esc(modellKurz(e.m) || '—') + '</td>' +
                '<td class="zahl">' + zahl(e.pt || 0) + '</td><td class="zahl">' + zahl(e.ct || 0) + '</td>' +
                '<td class="zahl">' + sek(e.ms || 0) + '</td>' +
                '<td class="leise" title="' + esc(f.map(function (c) { return FEHLER_NAME[c] || c; }).join(', ')) + '">' + esc(f.length ? fehlerKurz(f) : '—') + '</td></tr>';
        }).join('') + '</tbody>';
    }

    // ── Tooltip: Maus und Tastatur ────────────────────────
    function tipZeigen(spalte, x, y) {
        var tip = $('kdTip');
        tip.textContent = spalte.getAttribute('aria-label');
        tip.hidden = false;
        var r = tip.getBoundingClientRect();
        tip.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2)) + 'px';
        tip.style.top = Math.max(8, y - r.height - 12) + 'px';
    }
    document.addEventListener('mousemove', function (ev) {
        var s = ev.target.closest && ev.target.closest('.kd-spalte');
        if (s) tipZeigen(s, ev.clientX, ev.clientY); else $('kdTip').hidden = true;
    });
    document.addEventListener('focusin', function (ev) {
        var s = ev.target.closest && ev.target.closest('.kd-spalte');
        if (!s) return;
        var r = s.getBoundingClientRect();
        tipZeigen(s, r.left + r.width / 2, r.top + 10);
    });
    document.addEventListener('focusout', function () { $('kdTip').hidden = true; });

    // ── Bedienung ─────────────────────────────────────────
    $('kdLogin').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var s = $('kdSecret').value.trim();
        if (!s) return;
        sessionStorage.setItem(SECRET_KEY, s);
        $('kdLos').disabled = true;
        laden().finally(function () { $('kdLos').disabled = false; });
    });
    document.querySelectorAll('.kd-seg button').forEach(function (b) {
        b.addEventListener('click', function () {
            tage = +b.dataset.tage;
            document.querySelectorAll('.kd-seg button').forEach(function (x) { x.classList.toggle('aktiv', x === b); });
            // 1 und 7 stecken in den 30 Tagen nicht drin, wenn zuletzt 7 geladen wurde —
            // also neu holen, sobald der Zeitraum ueber die geladenen Tage hinausgeht.
            if (!daten || daten.tage.length < Math.max(tage, 1)) laden(); else zeichnen();
        });
    });
    $('kdNeu').addEventListener('click', laden);
    $('kdAbmelden').addEventListener('click', function () {
        sessionStorage.removeItem(SECRET_KEY);
        daten = null;
        $('kdSecret').value = '';
        zeigeLogin('');
    });

    laden();
})();
