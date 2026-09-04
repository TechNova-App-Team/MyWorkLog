// ═══ ANMELDE-FEHLERTEXTE TEST ═══
//
// Prueft authFehlerText() aus Assets/js/Cloud/supabase-ui.js und die
// zugehoerigen EN-Regeln aus Assets/js/i18n-runtime.js.
//
// Anlass: der Login zeigte den englischen Rohtext von GoTrue. Bei
// "email rate limit exceeded" — dem mit Abstand haeufigsten Fall, siehe die
// fuenf 429 in den Auth-Logs vom 04.09.2026 — sagte die Meldung dem Nutzer
// weder was los ist noch was er tun kann. Der Support-Fall lautete deshalb
// "GMX geht nicht", obwohl gar keine Mail losgeschickt wurde.
//
// Aufruf:  node tools/auth-fehlertext.test.mjs

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const lies = p => fs.readFileSync(path.join(ROOT, p), 'utf8').split('\r\n').join('\n');

let fehler = 0, geprueft = 0;
const ok = (name, b, detail = '') => {
    geprueft++;
    if (!b) fehler++;
    console.log(`  ${b ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   → ' + detail : ''}`);
};

// ── authFehlerText herausloesen ──────────────────────────────────────────────
// Die Datei laesst sich nicht als Ganzes laden (Browser-Klasse mit DOM-Zugriff).
// Die Funktion steht auf Einrueckung 0 und endet damit an der ersten Zeile, die
// nur aus "}" besteht — dasselbe Verfahren wie in tools/berichtsheft-laden.mjs.
const UI = lies('Assets/js/Cloud/supabase-ui.js');
const start = UI.indexOf('function authFehlerText(');
if (start < 0) { console.log('authFehlerText nicht gefunden — Test wertlos'); process.exit(1); }
const rest = UI.slice(start);
const ende = rest.indexOf('\n}\n');
if (ende < 0) { console.log('Funktionsende nicht gefunden — Test wertlos'); process.exit(1); }
const authFehlerText = new Function(rest.slice(0, ende + 3) + '; return authFehlerText;')();

// ── 1. Der Fall, um den es geht ──────────────────────────────────────────────
console.log('\n1. Mail-Limit (429)');
{
    const t = authFehlerText({ status: 429, message: 'email rate limit exceeded' });
    ok('nennt den Grund', /zu viele Anmelde-Mails/.test(t), t.slice(0, 60) + '…');
    ok('nennt eine Wartezeit', /Stunde/.test(t));
    ok('nennt den Weg, der sofort geht', /Google/.test(t) && /GitHub/.test(t));
    ok('kein englischer Rohtext mehr', !/rate limit/i.test(t));
    // Der Code kommt nicht immer als status durch — supabase-js verpackt ihn
    // je nach Fassung anders. Deshalb beide Wege pruefen.
    ok('erkennt ihn auch ohne status-Feld',
       /zu viele Anmelde-Mails/.test(authFehlerText({ message: 'email rate limit exceeded' })));
    ok('erkennt "too many requests"',
       /zu viele Anmelde-Mails/.test(authFehlerText({ message: 'Too Many Requests' })));
}

// ── 2. Die uebrigen Faelle aus den Logs ──────────────────────────────────────
console.log('\n2. Weitere Faelle');
{
    ok('abgelaufener Link',
       /abgelaufen/.test(authFehlerText({ message: 'Email link is invalid or has expired' })));
    ok('verbrauchter Link',
       /abgelaufen|benutzt/.test(authFehlerText({ message: 'One-time token not found' })));
    ok('ungueltige Adresse',
       /nicht gültig/.test(authFehlerText({ message: 'Unable to validate email address' })));
    ok('offline',
       /Verbindung/.test(authFehlerText({ message: 'Failed to fetch' })));
    ok('Registrierung aus',
       /abgeschaltet/.test(authFehlerText({ message: 'Signups not allowed for this instance' })));
}

// ── 3. Nichts verschlucken ───────────────────────────────────────────────────
console.log('\n3. Unbekanntes bleibt sichtbar');
{
    const t = authFehlerText({ message: 'irgendein neuer Serverfehler' });
    ok('unbekannter Fehler wird durchgereicht', t.includes('irgendein neuer Serverfehler'), t);
    ok('leerer Fehler ergibt trotzdem einen Satz',
       authFehlerText({}).length > 10 && authFehlerText(null).length > 10);
    ok('wirft nie', (() => { try { authFehlerText(undefined); return true; } catch (e) { return false; } })());
}

// ── 4. Die EN-Regeln greifen wirklich ────────────────────────────────────────
// 🔴 Ohne diesen Abschnitt waere die Uebersetzung eine Behauptung: die Strings
// werden in JS zusammengebaut, tauchen in keinem Dict auf, und der i18n-Build
// meldet fuer sie weder "fehlend" noch "uebersetzt".
console.log('\n4. Englische Fassung');
{
    const RT = lies('Assets/js/i18n-runtime.js');
    const mapStart = RT.indexOf('[/^');
    ok('i18n-runtime hat ueberhaupt Regeln', mapStart > 0);

    // Die Regelpaare einsammeln und auf die deutschen Meldungen anwenden.
    const regeln = [];
    const re = /\[(\/(?:\\.|\[[^\]]*\]|[^/\\])+\/[gimsuy]*)\s*,\s*('(?:\\.|[^'\\])*')\s*\]/g;
    let m;
    while ((m = re.exec(RT))) {
        try { regeln.push([eval(m[1]), eval(m[2])]); } catch (e) { /* Regel nicht auswertbar */ }
    }
    ok('Regeln liessen sich lesen', regeln.length > 50, regeln.length + ' Regeln');

    const uebersetze = txt => {
        for (const [rx, en] of regeln) {
            rx.lastIndex = 0;
            if (rx.test(txt)) { rx.lastIndex = 0; return txt.replace(rx, en); }
        }
        return txt;
    };

    const faelle = [
        [authFehlerText({ status: 429, message: 'email rate limit exceeded' }), /Too many sign-in emails/],
        [authFehlerText({ message: 'Email link is invalid or has expired' }),   /expired|already been used/],
        [authFehlerText({ message: 'Unable to validate email address' }),       /does not look valid/],
        [authFehlerText({ message: 'Failed to fetch' }),                        /No connection to the server/],
        [authFehlerText({ message: 'Signups not allowed for this instance' }),  /sign-ups are currently disabled/i],
        [authFehlerText({ message: 'irgendwas' }),                              /Sign-in failed: irgendwas/],
        ['Discord-Anmeldung fehlgeschlagen: xyz',                               /Discord sign-in failed: xyz/],
        ['Magic Link versendet! Bitte überprüfe deine E-Mail und klicke auf den Link.', /Magic link sent/],
    ];
    for (const [de, erwartet] of faelle) {
        const en = uebersetze(de);
        ok('EN: ' + de.slice(0, 42) + '…', erwartet.test(en), en.slice(0, 70));
        // Gegenprobe: es darf kein deutscher Rest stehenbleiben.
        ok('   kein Deutsch uebrig', !/[äöüß]|fehlgeschlagen|Anmelde|versendet/.test(en), en.slice(0, 70));
    }
}

console.log(`\n${geprueft - fehler}/${geprueft} bestanden`);
if (geprueft < 25) { console.log('ZU WENIG PRUEFUNGEN — der Lauf hat nichts getan'); process.exit(1); }
process.exit(fehler ? 1 : 0);
