// ═══ BERICHTSHEFT: LERNPROFIL ═══
//
// Der Assistent lernt Schritt fuer Schritt, wie DIESER Azubi schreibt
// (Frage des Nutzers 04.10.2026: "lernt der mit der Zeit?" — bis dahin nein,
// und "nur aus den letzten Berichten" reicht nicht: "was is wenn die kacke waren?").
//
// 🔴 Aufbau, und warum so:
// - Das Profil ist ABGELEITET, kein eigener Zustand. Es wird bei jedem Prompt
//   aus den gespeicherten Berichten neu gerechnet. Ein Freitext, den eine KI
//   immer weiter umschreibt, schaukelt sich auf — nach zehn Runden steht
//   Unsinn drin, und niemand weiss woher. Hier kann nichts driften, und der
//   Sync (ganzer localStorage, Ende-zu-Ende) braucht keine Zusammenfuehrung:
//   kommen die Berichte an, stimmt das Profil.
// - Gespeichert wird nur, was sich NICHT aus den Berichten rechnen laesst:
//   die Korrekturpaare (KI-Entwurf → was der Azubi daraus gemacht hat), die
//   Anmerkungen des Ausbilders (eine spaetere Freigabe ueberschreibt
//   report.approval und naehme die Rueckgabe sonst mit) und die Entscheidungen
//   des Nutzers (festpinnen, verbergen, aus).
// - Keine KI im Lernschritt. Das Korrekturpaar IST das staerkste Signal, und
//   das Modell im Chat liest es direkt — ein Extra-Aufruf zum Zusammenfassen
//   kostete Geld und waere die Stelle, an der sich Fehler festsetzen.
// - Qualitaet entscheidet ueber Vorlagen, nicht das Datum: freigegeben schlaegt
//   alles, zurueckgegeben ist nie Vorlage, sonst die Bewertung aus
//   calculateQuality() (bh-bericht.js).
// - Eine Taetigkeit wird erst "typisch", wenn sie in mindestens zwei
//   verschiedenen Wochen vorkommt. Ein Ausrutscher wird so nie zur Regel.
//
// Speicher: bh_lernen_v1 = { an, korrekturen[], ausbilder[], gepinnt[], verborgen[] }
//           bh_lern_entwurf_v1 = { "<kw>": { tage: [5 Texte], zeit } } — die letzten
//           eingefuegten KI-Entwuerfe, bis der Bericht gespeichert ist.
// Test: node tools/bh-lernen.test.mjs

window.BHLernen = (function () {
'use strict';

const KEY = 'bh_lernen_v1';
const ENTWURF_KEY = 'bh_lern_entwurf_v1';
const TAG_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// Obergrenzen. Gemessen am Prompt: Vorlagen + Liste + Paare bleiben damit
// unter ~5000 Zeichen, der Proxy nimmt 128 KB.
const MAX_KORREKTUREN = 30;          // gespeichert
const PROMPT_KORREKTUREN = 6;        // davon im Prompt, neueste zuerst
const MAX_PAAR_TEXT = 400;           // Zeichen je Seite eines Paars
const MAX_AUSBILDER = 10;
const PROMPT_AUSBILDER = 5;
const MAX_TAETIGKEITEN = 12;
const MIN_WOCHEN = 2;                // "typisch" erst ab so vielen Wochen
const VORLAGEN = 2;
const MAX_VORLAGE_TEXT = 1500;
const MIN_QUALITAET = 40;            // darunter ist eine Woche keine Vorlage (ausser freigegeben)
const MAX_ENTWUERFE = 6;
const ENTWURF_TAGE = 120;            // aelter = gehoert zu keinem Bericht mehr
const HALBES_JAHR = 183 * 864e5;

// ── Speicher ──────────────────────────────────────────────────────────
function leer() { return { an: true, korrekturen: [], ausbilder: [], gepinnt: [], verborgen: [] }; }
function lesen() {
    try {
        const v = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (!v || typeof v !== 'object') return leer();
        const l = leer();
        return {
            an: v.an !== false,
            korrekturen: Array.isArray(v.korrekturen) ? v.korrekturen : l.korrekturen,
            ausbilder: Array.isArray(v.ausbilder) ? v.ausbilder : l.ausbilder,
            gepinnt: Array.isArray(v.gepinnt) ? v.gepinnt : l.gepinnt,
            verborgen: Array.isArray(v.verborgen) ? v.verborgen : l.verborgen,
        };
    } catch (e) { return leer(); }
}
function schreiben(z) {
    try { localStorage.setItem(KEY, JSON.stringify(z)); } catch (e) { /* voll — dann gilt der alte Stand */ }
}

function an() { return lesen().an; }
function setzeAn(wert) { const z = lesen(); z.an = !!wert; schreiben(z); }

// ── Text-Helfer ───────────────────────────────────────────────────────
// Eine Zeile ohne Aufzaehlungszeichen, Leerraum und Schlusspunkt — so gilt
// "• Server neu gestartet." gleich "Server neu gestartet".
function zeileSauber(z) {
    return String(z || '').replace(/^\s*[•\-*–·]\s*/, '').replace(/\s+/g, ' ').trim();
}
function schluessel(z) {
    return zeileSauber(z).toLowerCase().replace(/[.,;:!]+$/, '');
}
const STATUS_ZEILE = /keine Tätigkeiten|no activities/i;
const TAG_KOPF = /^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Monday|Tuesday|Wednesday|Thursday|Friday):?$/i;

// Die Tagestexte eines Berichts als Liste von 5 (Tagesmodus) bzw. ein Text
// (Wochenmodus, dann steht alles an Index 0).
function tageVon(r) {
    if (r && r.dailyActivities && typeof r.dailyActivities === 'object') {
        return TAG_KEYS.map(k => String(r.dailyActivities[k] || ''));
    }
    return [String((r && r.activities) || '')];
}
function zeilenVon(text) {
    return String(text || '').split('\n').map(zeileSauber)
        .filter(z => z.length >= 8 && !STATUS_ZEILE.test(z) && !TAG_KOPF.test(z));
}
function gekuerzt(t, max) {
    t = String(t || '').trim();
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
}
function kwSchluessel(kw) { return String(Number(kw) || 0); }

// ── 1. Entwurf merken (ais-studio.js → _doFillForm) ───────────────────
// week = Format von generate(): { calendarWeek, days: [{ index, entries, dayStatus }] }
function entwurfMerken(week, jetzt) {
    if (!week || !Array.isArray(week.days) || !week.calendarWeek || !an()) return;
    const tage = ['', '', '', '', ''];
    for (const d of week.days) {
        if (d && d.index >= 0 && d.index < 5 && !d.dayStatus && Array.isArray(d.entries)) tage[d.index] = d.entries.join('\n');
    }
    if (!tage.some(t => t.trim())) return;
    let alle = {};
    try { alle = JSON.parse(localStorage.getItem(ENTWURF_KEY) || '{}') || {}; } catch (e) { alle = {}; }
    alle[kwSchluessel(week.calendarWeek)] = { tage, zeit: (jetzt || new Date()).getTime() };
    const sortiert = Object.entries(alle).sort((a, b) => b[1].zeit - a[1].zeit).slice(0, MAX_ENTWUERFE);
    try { localStorage.setItem(ENTWURF_KEY, JSON.stringify(Object.fromEntries(sortiert))); } catch (e) { }
}

// ── 2. Bericht gespeichert (bh-bericht.js → saveReport) ───────────────
// Vergleicht je Tag den eingefuegten Entwurf mit dem gespeicherten Text. Jede
// echte Aenderung wird ein Korrekturpaar. Danach ist der Entwurf verbraucht:
// ein zweites Speichern derselben Woche lernt nicht doppelt.
function berichtGespeichert(report, jetzt) {
    if (!report || !an()) return 0;
    const t = (jetzt || new Date()).getTime();
    let alle = {};
    try { alle = JSON.parse(localStorage.getItem(ENTWURF_KEY) || '{}') || {}; } catch (e) { return 0; }
    const k = kwSchluessel(report.week);
    const e = alle[k];
    if (!e || t - e.zeit > ENTWURF_TAGE * 864e5) return 0;
    delete alle[k];
    try { localStorage.setItem(ENTWURF_KEY, JSON.stringify(alle)); } catch (er) { }

    const nachher = tageVon(report);
    if (nachher.length !== 5) return 0;          // Wochenmodus: keine Tageszuordnung
    const z = lesen();
    let neu = 0;
    for (let i = 0; i < 5; i++) {
        const v = String(e.tage[i] || '').trim(), n = nachher[i].trim();
        if (!v || !n || STATUS_ZEILE.test(n)) continue;
        if (v.replace(/\s+/g, ' ') === n.replace(/\s+/g, ' ')) continue;
        z.korrekturen.unshift({ kw: Number(report.week) || 0, tag: i,
            vorher: gekuerzt(v, MAX_PAAR_TEXT), nachher: gekuerzt(n, MAX_PAAR_TEXT), zeit: t });
        neu++;
    }
    if (neu) { z.korrekturen = z.korrekturen.slice(0, MAX_KORREKTUREN); schreiben(z); }
    return neu;
}

// ── 3. Anmerkungen des Ausbilders einsammeln ──────────────────────────
// report.approval wird bei einer spaeteren Freigabe ueberschrieben; die
// Rueckgabe-Begruendung waere damit weg. Deshalb hier festhalten, sobald sie
// einmal gesehen wurde. Schluessel: Bericht + Zeitpunkt der Entscheidung.
function ausbilderEinsammeln(reports, z) {
    let neu = false;
    for (const r of reports || []) {
        const a = r && r.approval;
        if (!a || a.state !== 'rejected' || !String(a.note || '').trim()) continue;
        const id = String(r.id) + '|' + String(a.at || '');
        if (z.ausbilder.some(x => x.id === id)) continue;
        z.ausbilder.unshift({ id, kw: Number(r.week) || 0, note: gekuerzt(a.note, 300), zeit: Date.parse(a.at) || Date.now() });
        neu = true;
    }
    if (neu) { z.ausbilder.sort((a, b) => b.zeit - a.zeit); z.ausbilder = z.ausbilder.slice(0, MAX_AUSBILDER); }
    return neu;
}

// ── 4. Das Profil ─────────────────────────────────────────────────────
function qualitaet(r) {
    const text = tageVon(r).join('\n');
    return typeof calculateQuality === 'function' ? calculateQuality(text) : Math.min(100, text.length / 4);
}
function istFreigegeben(r) {
    const a = r && r.approval;
    return !!(a && a.state === 'approved' && !a.stale && a.sigStatus !== 'ungueltig');
}
function istZurueckgegeben(r) { return !!(r && r.approval && r.approval.state === 'rejected'); }
// Die Woche, die gerade entsteht, ist nie Vorlage (sonst schriebe das Modell
// sie ab). Gleiche KW reicht nicht — KW 40 gibt es jedes Jahr.
function istAktuelleWoche(r, kw, t) {
    return !!(kw && Number(r.week) === Number(kw) && r.dateFrom && Math.abs(t - new Date(r.dateFrom).getTime()) < HALBES_JAHR);
}

function profil(reports, opt) {
    opt = opt || {};
    const t = (opt.jetzt || new Date()).getTime();
    const z = lesen();
    // Aus heisst aus: dann wird auch nichts mehr eingesammelt.
    if (!z.an) return { an: false, vorlagen: [], taetigkeiten: [], schulthemen: [], korrekturen: [], ausbilder: [], gepinnt: [], wochen: 0 };
    if (ausbilderEinsammeln(reports, z)) schreiben(z);

    const alle = (Array.isArray(reports) ? reports : [])
        .filter(r => r && tageVon(r).some(x => x.trim()))
        .filter(r => !istAktuelleWoche(r, opt.kw, t));
    const neueste = alle.slice().sort((a, b) => String(b.dateFrom || '').localeCompare(String(a.dateFrom || '')));

    // Vorlagen: Qualitaet vor Datum.
    const vorlagen = neueste
        .filter(r => !istZurueckgegeben(r))
        .map((r, i) => ({ r, q: qualitaet(r), frei: istFreigegeben(r), i }))
        .filter(x => x.frei || x.q >= MIN_QUALITAET)
        .sort((a, b) => (b.frei - a.frei) || (b.q - a.q) || (a.i - b.i))
        .slice(0, VORLAGEN)
        .map(x => ({ kw: Number(x.r.week) || 0, freigegeben: x.frei, qualitaet: Math.round(x.q),
            text: gekuerzt(String(x.r.activities || tageVon(x.r).join('\n')), MAX_VORLAGE_TEXT) }));

    // Typische Taetigkeiten: in wie vielen VERSCHIEDENEN Wochen vorgekommen.
    // Zurueckgegebene Wochen zaehlen nicht — der Ausbilder fand sie nicht gut.
    const verborgen = new Set(z.verborgen.map(schluessel));
    const zaehler = new Map();
    const schule = [];
    for (const r of neueste) {
        if (istZurueckgegeben(r)) continue;
        const gesehen = new Set();
        const tage = tageVon(r);
        tage.forEach((txt, i) => {
            const istSchule = tage.length === 5 && r.dailySchool && r.dailySchool[TAG_KEYS[i]];
            for (const zeile of zeilenVon(txt)) {
                if (istSchule) { if (schule.length < 8 && !schule.some(s => schluessel(s) === schluessel(zeile))) schule.push(zeile); continue; }
                const k = schluessel(zeile);
                if (verborgen.has(k) || gesehen.has(k)) continue;
                gesehen.add(k);
                const v = zaehler.get(k) || { text: zeile, wochen: 0 };
                v.wochen++;
                zaehler.set(k, v);
            }
        });
        if (r.school && String(r.school).trim() && schule.length < 8) schule.push(zeileSauber(r.school));
    }
    const taetigkeiten = [...zaehler.values()]
        .filter(v => v.wochen >= MIN_WOCHEN)
        .sort((a, b) => b.wochen - a.wochen)
        .slice(0, MAX_TAETIGKEITEN);

    return {
        an: true,
        vorlagen,
        taetigkeiten,
        schulthemen: schule,
        korrekturen: z.korrekturen.slice(0, PROMPT_KORREKTUREN),
        ausbilder: z.ausbilder.slice(0, PROMPT_AUSBILDER),
        gepinnt: z.gepinnt.slice(),
        wochen: alle.length,
    };
}

function hatInhalt(p) {
    return !!(p && p.an && (p.vorlagen.length || p.taetigkeiten.length || p.korrekturen.length || p.ausbilder.length || p.gepinnt.length));
}

// ── 5. Der Block fuer den Prompt ──────────────────────────────────────
// Marker im Text werden gestrichen: eingefuegter Text darf den Block nicht
// vorzeitig schliessen und danach wie eine Regel dastehen.
function ohneMarker(s) { return String(s || '').split('<<<PROFIL').join('').split('PROFIL>>>').join(''); }

function promptText(p) {
    if (!hatInhalt(p)) return '';
    const teile = [];
    if (p.ausbilder.length) {
        teile.push('Anmerkungen seines Ausbilders zu zurückgegebenen Wochen (das soll er künftig vermeiden bzw. besser machen):\n' +
            p.ausbilder.map(a => '- KW ' + a.kw + ': ' + ohneMarker(a.note)).join('\n'));
    }
    if (p.gepinnt.length) {
        teile.push('Von ihm selbst festgelegt:\n' + p.gepinnt.map(g => '- ' + ohneMarker(g)).join('\n'));
    }
    if (p.korrekturen.length) {
        teile.push('So hat er Entwürfe des Assistenten korrigiert (vorher → nachher). Daran siehst du am deutlichsten, wie er schreiben will:\n' +
            p.korrekturen.map(k => '- vorher: ' + ohneMarker(k.vorher).replace(/\n/g, ' / ') + '\n  nachher: ' + ohneMarker(k.nachher).replace(/\n/g, ' / ')).join('\n'));
    }
    if (p.taetigkeiten.length) {
        teile.push('Wiederkehrende Tätigkeiten (in so vielen Wochen vorgekommen):\n' +
            p.taetigkeiten.map(x => '- ' + ohneMarker(x.text) + ' (' + x.wochen + ')').join('\n'));
    }
    if (p.schulthemen.length) {
        teile.push('Themen aus seinen Berufsschultagen:\n' + p.schulthemen.map(s => '- ' + ohneMarker(s)).join('\n'));
    }
    if (p.vorlagen.length) {
        teile.push('Seine besten bisherigen Wochen als Stilvorlage' + (p.vorlagen.some(v => v.freigegeben) ? ' (freigegeben = vom Ausbilder abgezeichnet)' : '') + ':\n' +
            p.vorlagen.map(v => 'KW ' + v.kw + (v.freigegeben ? ', freigegeben' : '') + ':\n' + ohneMarker(v.text)).join('\n\n'));
    }
    return teile.join('\n\n');
}

// ── 6. Entscheidungen des Nutzers (Profilblatt) ───────────────────────
function verbergen(text) {
    const z = lesen(); const k = schluessel(text);
    if (!z.verborgen.some(v => schluessel(v) === k)) z.verborgen.push(zeileSauber(text));
    z.gepinnt = z.gepinnt.filter(g => schluessel(g) !== k);
    schreiben(z);
}
function anpinnen(text) {
    const z = lesen(); const t = gekuerzt(zeileSauber(text), 200);
    if (!t || z.gepinnt.some(g => schluessel(g) === schluessel(t))) return;
    z.gepinnt.push(t); z.gepinnt = z.gepinnt.slice(-15);
    z.verborgen = z.verborgen.filter(v => schluessel(v) !== schluessel(t));
    schreiben(z);
}
function loesePin(i) { const z = lesen(); z.gepinnt.splice(i, 1); schreiben(z); }
function korrekturWeg(i) { const z = lesen(); z.korrekturen.splice(i, 1); schreiben(z); }
function ausbilderWeg(i) { const z = lesen(); z.ausbilder.splice(i, 1); schreiben(z); }
// Alles vergessen: gespeicherte Paare, Anmerkungen, Pins und Verborgenes.
// Das Abgeleitete kommt aus den Berichten und ist beim naechsten Mal wieder da
// — wer das nicht will, schaltet das Lernen aus.
function vergessen() {
    const z = leer(); z.an = lesen().an; schreiben(z);
    try { localStorage.removeItem(ENTWURF_KEY); } catch (e) { }
}

return {
    an, setzeAn, entwurfMerken, berichtGespeichert, profil, promptText, hatInhalt,
    verbergen, anpinnen, loesePin, korrekturWeg, ausbilderWeg, vergessen, lesen,
    _intern: { zeilenVon, schluessel, tageVon, KEY, ENTWURF_KEY, MAX_KORREKTUREN, MIN_WOCHEN },
};
})();
