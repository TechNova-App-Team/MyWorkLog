// ═══ PASSKEY TEST ═══
//
// Prueft die Passkey-Anbindung: den Zwang zum experimental-Flag, die
// Verfuegbarkeitspruefung, die Fehlertexte und die Verdrahtung im Markup.
//
// Warum das nicht "sieht man doch": Supabase liefert die Passkey-Methoden NUR
// aus, wenn der Client mit `auth.experimental.passkey` erzeugt wurde. Fehlt das
// Flag, ist `auth.signInWithPasskey` schlicht `undefined` — der Knopf stirbt
// dann an "is not a function", und zwar erst zur Laufzeit, im Klick des
// Nutzers. Genau die Klasse Fehler, die im Screenshot nicht zu sehen ist.
//
// Aufruf:  node tools/passkey.test.mjs

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

const INT = lies('Assets/js/Cloud/supabase-integration.js');
const UI = lies('Assets/js/Cloud/supabase-ui.js');
const API = lies('components/core/api-cloud-sync.js');
const MODALS = lies('components/modals/modals.html');

// Kommentare strippen, bevor ueber den Code behauptet wird — die Dateikoepfe
// hier ERKLAEREN das Flag, ein Grep auf die rohe Datei pruefte sich selbst.
const ohneKomm = q => q.split('\n').map(z => z.replace(/^\s*\/\/.*$/, '')).join('\n')
                       .replace(/\/\*[\s\S]*?\*\//g, '');
const INT_C = ohneKomm(INT);

// ── 1. Das Flag, ohne das gar nichts geht ────────────────────────────────────
console.log('\n1. Client-Opt-in');
{
    ok('createClient bekommt experimental.passkey',
       /createClient\([\s\S]{0,200}experimental:\s*\{\s*passkey:\s*true/.test(INT_C));
    ok('… und es steht im echten Code, nicht nur im Kommentar',
       INT_C.includes('experimental'), 'gestrippte Quelle');
    ok('Gegenprobe: die gestrippte Quelle ist nicht leer', INT_C.length > 3000);
}

// ── 2. Verfuegbarkeit wird geprueft, nicht angenommen ────────────────────────
console.log('\n2. passkeySupported');
{
    const start = INT.indexOf('passkeySupported()');
    ok('Methode existiert', start > 0);
    const block = INT.slice(start, start + 400);
    ok('prueft PublicKeyCredential', block.includes('PublicKeyCredential'));
    ok('prueft sicheren Kontext', block.includes('isSecureContext'));
    ok('prueft, ob die Bibliothek die Methode ueberhaupt kennt',
       block.includes("typeof this.client.auth.signInWithPasskey === 'function'"));

    // Nachbauen und durchspielen — drei Umgebungen, drei Antworten.
    const fn = new Function('return function passkeySupported() {'
        + INT.slice(INT.indexOf('{', start) + 1, INT.indexOf('\n    }', start)) + '}')();
    const lauf = (ctx) => fn.call(ctx);
    const echterClient = { auth: { signInWithPasskey: () => {} } };

    global.window = { PublicKeyCredential: function () {}, isSecureContext: true };
    ok('modernes HTTPS-Geraet → true', lauf({ client: echterClient }) === true);
    ok('ohne Client → false', lauf({ client: null }) === false);
    ok('alte Bibliothek ohne die Methode → false', lauf({ client: { auth: {} } }) === false);

    global.window = { PublicKeyCredential: function () {}, isSecureContext: false };
    ok('unsicherer Kontext (http) → false', lauf({ client: echterClient }) === false);

    global.window = { isSecureContext: true };
    ok('Browser ohne WebAuthn → false', lauf({ client: echterClient }) === false);
    delete global.window;
}

// ── 3. Fehlertexte ───────────────────────────────────────────────────────────
console.log('\n3. Fehlertexte');
{
    const start = UI.indexOf('function authFehlerText(');
    const rest = UI.slice(start);
    const authFehlerText = new Function(rest.slice(0, rest.indexOf('\n}\n') + 3)
                                        + '; return authFehlerText;')();

    // Der haeufigste Fall: der Nutzer bricht den Systemdialog ab. Der Browser
    // meldet dasselbe NotAllowedError, wenn gar kein Schluessel da ist — beide
    // Deutungen muessen im Text stehen.
    const t = authFehlerText({ name: 'NotAllowedError', message: 'NotAllowedError: operation cancelled' });
    ok('Abbruch nennt beide Ursachen', /abgebrochen/.test(t) && /noch keiner/.test(t), t.slice(0, 70));
    ok('… und sagt, wo man ihn einrichtet', /Einstellungen/.test(t));

    ok('unbekannte Anmeldedaten',
       /keinem Konto/.test(authFehlerText({ message: 'webauthn_credential_not_found' })));
    ok('schon vorhanden',
       /schon einen Passkey/.test(authFehlerText({ message: 'webauthn_credential_exists' })));
    ok('abgelaufen',
       /zu lange/.test(authFehlerText({ message: 'webauthn_challenge_expired' })));
    ok('Obergrenze',
       /maximal/.test(authFehlerText({ message: 'too_many_passkeys' })));
    ok('serverseitig aus',
       /nicht verfügbar/.test(authFehlerText({ message: 'passkey_disabled' })));
    // Der 429 aus dem Mail-Weg darf davon unberuehrt bleiben.
    ok('Mail-Limit weiterhin eigener Text',
       /zu viele Anmelde-Mails/.test(authFehlerText({ status: 429, message: 'email rate limit exceeded' })));
}

// ── 4. Verdrahtung ───────────────────────────────────────────────────────────
console.log('\n4. Markup und Verdrahtung');
{
    ok('Anmelde-Knopf im Dialog', MODALS.includes('id="cloud-login-passkey"'));
    ok('Knopf startet versteckt (JS blendet ihn ein)',
       /id="cloud-passkey-block"[^>]*display:none/.test(MODALS));
    ok('Hinweis erklaert die einmalige Einrichtung',
       /Einmalig einrichten/.test(MODALS));
    ok('Listener haengt am Knopf', UI.includes("getElementById('cloud-login-passkey')"));
    ok('Sichtbarkeit wird gesetzt', UI.includes('updatePasskeyVisibility'));

    ok('Einrichten-Abschnitt vorhanden', MODALS.includes('id="passkeySection"'));
    ok('Abschnitt startet versteckt', /id="passkeySection"[^>]*display:none/.test(MODALS));
    ok('Einrichten-Handler existiert', API.includes('function handlePasskeyRegister'));
    ok('Entfernen-Handler existiert', API.includes('function handlePasskeyDelete'));
    ok('Abschnitt wird beim Auth-Wechsel neu gezeichnet',
       ohneKomm(API).includes('renderPasskeySection(isLoggedIn)'));

    // 🔴 Der Abschnitt darf NUR bei angemeldetem Konto erscheinen: Supabase
    // laesst einen Passkey nur fuer ein bestehendes Konto anlegen.
    const r = API.slice(API.indexOf('async function renderPasskeySection'));
    ok('versteckt sich ohne Anmeldung',
       /if \(!isLoggedIn \|\| !passkeyMoeglich\(\)\)/.test(r.slice(0, 400)));

    // Fremder Text (Name vom Authenticator) muss durch esc().
    ok('Authenticator-Name wird escaped', /esc\(k\.friendly_name/.test(r));
    ok('Passkey-Id wird escaped', /esc\(k\.id\)/.test(r));
}

// ── 5. Englische Fassung ─────────────────────────────────────────────────────
console.log('\n5. Englische Fassung');
{
    const RT = lies('Assets/js/i18n-runtime.js');
    const regeln = [];
    const re = /\[(\/(?:\\.|\[[^\]]*\]|[^/\\])+\/[gimsuy]*)\s*,\s*('(?:\\.|[^'\\])*')\s*\]/g;
    let m;
    while ((m = re.exec(RT))) {
        try { regeln.push([eval(m[1]), eval(m[2])]); } catch (e) {}
    }
    const ue = txt => {
        for (const [rx, en] of regeln) {
            rx.lastIndex = 0;
            if (rx.test(txt)) { rx.lastIndex = 0; return txt.replace(rx, en); }
        }
        return txt;
    };
    const faelle = [
        ['Für dieses Gerät gibt es hier schon einen Passkey.', /already has a passkey/],
        ['Der Vorgang hat zu lange gedauert. Versuch es noch einmal.', /took too long/],
        ['Passkeys werden auf diesem Gerät nicht unterstützt', /does not support passkeys/],
        ['Noch keiner eingerichtet.', /None set up yet/],
        ['Warte auf Bestätigung…', /Waiting for confirmation/],
        ['Passkey entfernt. Im Schlüsselbund deines Geräts liegt er weiterhin — dort musst du ihn getrennt löschen.', /still exists in your device keychain/],
    ];
    for (const [de, erwartet] of faelle) {
        const en = ue(de);
        ok('EN: ' + de.slice(0, 38) + '…', erwartet.test(en), en.slice(0, 62));
        ok('   kein Deutsch uebrig', !/[äöüß]|Passkeys werden|eingerichtet|Gerät/.test(en), en.slice(0, 62));
    }
}

console.log(`\n${geprueft - fehler}/${geprueft} bestanden`);
if (geprueft < 35) { console.log('ZU WENIG PRUEFUNGEN — der Lauf hat nichts getan'); process.exit(1); }
process.exit(fehler ? 1 : 0);
