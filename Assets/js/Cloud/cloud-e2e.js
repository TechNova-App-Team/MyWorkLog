// ═══ CLOUD-E2E MODULE ═══
// Ende-zu-Ende-Verschluesselung des Cloud-Syncs (seit v8.1.0).
//
// Was der Server sieht: in `users.all_data` steht nur noch
//   { "__mwl_e2e": { v, kdf, it, salt, iv, z, ct } }
// — Geheimtext. Den Schluessel kennt nur, wer den Wiederherstellungs-Code hat.
// Auch MyWorkLog kann eine verlorene Cloud-Kopie deshalb NICHT zurueckholen;
// die Daten auf den Geraeten selbst bleiben davon unberuehrt.
//
// Entscheidungen, die nicht "wegrepariert" werden sollen:
//  - Der Code ist ZUFALL (24 Zeichen Crockford-Base32 = 120 Bit), kein
//    ausgedachtes Passwort. Wunsch des Nutzers, 02.10.2026.
//  - Der abgeleitete Schluessel liegt je Konto `extractable:false` in
//    IndexedDB. Einmal je Geraet eingeben reicht; beim Abmelden wird er
//    geloescht (geteilte Rechner).
//  - Ohne Schluessel wird NIE hochgeladen. Ein frisches Geraet ohne Code
//    wuerde sonst die verschluesselte Cloud-Kopie mit leeren Daten
//    ueberschreiben.
//  - Klartext-Zeilen von vor v8.1.0 lassen sich weiter LESEN (Uebergang);
//    der erste Upload ersetzt sie durch Geheimtext.
//  - Der Uebergang fragt ausdruecklich, ob vorher der Cloud-Stand geholt
//    werden soll — nie automatisch (Wunsch des Nutzers).
(function () {
    'use strict';

    var UMSCHLAG = '__mwl_e2e';
    var KDF_RUNDEN = 100000;          // Code hat 120 Bit Zufall; mehr Runden kaufen kaum etwas
    var ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';   // Crockford: ohne I, L, O, U
    var CODE_LAENGE = 24;

    // ── Kodierung ─────────────────────────────────────────────────────
    function b64(bytes) {
        var u = new Uint8Array(bytes), s = '';
        for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        return btoa(s);
    }
    function unb64(str) {
        var s = atob(str), u = new Uint8Array(s.length);
        for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
        return u;
    }

    // ── Code ──────────────────────────────────────────────────────────
    function codeErzeugen() {
        // 24 Zeichen zu je 5 Bit = 120 Bit = 15 Byte, ohne Modulo-Verzerrung
        var bytes = crypto.getRandomValues(new Uint8Array(15)), bits = 0, puffer = 0, out = '';
        for (var i = 0; i < bytes.length; i++) {
            puffer = (puffer << 8) | bytes[i]; bits += 8;
            while (bits >= 5) { bits -= 5; out += ALPHABET[(puffer >> bits) & 31]; }
        }
        return out;
    }
    // Was Menschen beim Abtippen falsch machen, wird verziehen: Kleinschreibung,
    // Leer- und Bindestriche, O statt 0, I/L statt 1. U kommt im Alphabet nicht
    // vor und ist deshalb ein echter Tippfehler.
    function codeNormalisieren(eingabe) {
        var s = String(eingabe || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
            .replace(/O/g, '0').replace(/[IL]/g, '1');
        if (s.length !== CODE_LAENGE) return null;
        for (var i = 0; i < s.length; i++) if (ALPHABET.indexOf(s[i]) < 0) return null;
        return s;
    }
    function codeAnzeigen(code) {
        return code.match(/.{1,4}/g).join('-');
    }

    // ── Krypto ────────────────────────────────────────────────────────
    async function schluesselAbleiten(code, salt) {
        var basis = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: KDF_RUNDEN },
            basis, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }

    async function packen(text) {
        var roh = new TextEncoder().encode(text);
        if (typeof CompressionStream === 'undefined') return { daten: roh, z: 0 };
        var strom = new Blob([roh]).stream().pipeThrough(new CompressionStream('gzip'));
        return { daten: new Uint8Array(await new Response(strom).arrayBuffer()), z: 1 };
    }
    async function entpacken(bytes, z) {
        if (!z) return new TextDecoder().decode(bytes);
        if (typeof DecompressionStream === 'undefined') throw new Error('Dieser Browser kann die Cloud-Kopie nicht entpacken.');
        var strom = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        return new TextDecoder().decode(await new Response(strom).arrayBuffer());
    }

    async function verschluesseln(obj, schluessel) {
        var iv = crypto.getRandomValues(new Uint8Array(12));
        var p = await packen(JSON.stringify(obj));
        var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, schluessel.key, p.daten);
        return { v: 1, kdf: 'PBKDF2-SHA256', it: KDF_RUNDEN, salt: schluessel.salt, iv: b64(iv), z: p.z, ct: b64(ct) };
    }

    // Wirft bei falschem Schluessel (GCM-Pruefsumme) — das IST die Code-Pruefung.
    async function entschluesseln(umschlag, key) {
        var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(umschlag.iv) }, key, unb64(umschlag.ct));
        return JSON.parse(await entpacken(new Uint8Array(pt), umschlag.z));
    }

    async function schluesselAusCode(code, saltB64) {
        var salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
        return { key: await schluesselAbleiten(code, salt), salt: saltB64 || b64(salt) };
    }

    function istUmschlag(allData) {
        return !!(allData && typeof allData === 'object' && allData[UMSCHLAG] && allData[UMSCHLAG].ct);
    }

    // ── Ablage je Konto (IndexedDB, Schluessel nicht auslesbar) ─────────
    function idb() {
        return new Promise(function (ok, fehler) {
            var r = indexedDB.open('mwl_cloud_e2e', 1);
            r.onupgradeneeded = function () { r.result.createObjectStore('keys', { keyPath: 'uid' }); };
            r.onsuccess = function () { ok(r.result); };
            r.onerror = function () { fehler(r.error); };
        });
    }
    async function ablageLesen(uid) {
        try {
            var db = await idb();
            return await new Promise(function (ok) {
                var q = db.transaction('keys').objectStore('keys').get(uid);
                q.onsuccess = function () { ok(q.result || null); };
                q.onerror = function () { ok(null); };
            });
        } catch (e) { return null; }
    }
    async function ablageSchreiben(uid, schluessel) {
        var db = await idb();
        await new Promise(function (ok, fehler) {
            var t = db.transaction('keys', 'readwrite');
            t.objectStore('keys').put({ uid: uid, key: schluessel.key, salt: schluessel.salt, at: new Date().toISOString() });
            t.oncomplete = ok; t.onerror = function () { fehler(t.error); };
        });
    }
    async function vergessen(uid) {
        try {
            var db = await idb();
            await new Promise(function (ok) {
                var t = db.transaction('keys', 'readwrite');
                t.objectStore('keys').delete(uid);
                t.oncomplete = ok; t.onerror = ok;
            });
        } catch (e) { /* ohne IndexedDB gibt es auch nichts zu vergessen */ }
    }

    // ── Sprache ───────────────────────────────────────────────────────
    function en() { return (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0; }
    function L(de, eng) { return en() ? eng : de; }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    // ── Dialog ────────────────────────────────────────────────────────
    function stil() {
        if (document.getElementById('e2eStyle')) return;
        var s = document.createElement('style');
        s.id = 'e2eStyle';
        // Nur Tokens; Flaeche zweilagig, weil --bg-sidebar Alpha traegt.
        s.textContent =
            '.e2e-bg{position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6)}' +
            '.e2e-card{width:100%;max-width:480px;max-height:calc(100vh - 32px);overflow-y:auto;background:linear-gradient(var(--bg-sidebar),var(--bg-sidebar)),var(--bg-deep);border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:0 24px 64px rgba(0,0,0,.5);color:var(--text-main)}' +
            '.e2e-ic{display:inline-flex;width:40px;height:40px;border-radius:12px;align-items:center;justify-content:center;color:var(--primary);background:rgba(var(--primary-rgb),.12);margin-bottom:14px}' +
            '.e2e-ic svg{width:22px;height:22px}' +
            '.e2e-t{font-size:1.15rem;font-weight:700;margin:0 0 6px;letter-spacing:-.01em}' +
            '.e2e-p{font-size:.86rem;line-height:1.55;color:var(--text-muted);margin:0 0 12px}' +
            '.e2e-p strong{color:var(--text-main);font-weight:600}' +
            '.e2e-q{margin:16px 0 4px;font-size:.9rem;font-weight:600}' +
            '.e2e-code{font-family:var(--font-mono,monospace);font-size:1.05rem;letter-spacing:.06em;text-align:center;padding:14px 10px;border:1px dashed rgba(var(--primary-rgb),.5);border-radius:10px;margin:6px 0 10px;user-select:all;word-break:break-all}' +
            '.e2e-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}' +
            '.e2e-in{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-main);font-family:var(--font-mono,monospace);font-size:16px;letter-spacing:.04em;margin:4px 0 8px}' +
            '.e2e-in:focus{outline:none;border-color:rgba(var(--primary-rgb),.6)}' +
            '.e2e-check{display:flex;gap:10px;align-items:flex-start;font-size:.84rem;line-height:1.45;margin:6px 0 4px;cursor:pointer}' +
            '.e2e-check input{margin-top:3px;flex-shrink:0;width:16px;height:16px;accent-color:var(--primary)}' +
            '.e2e-err{color:var(--danger);font-size:.82rem;margin:0 0 8px;min-height:1em}' +
            '.e2e-foot{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px}' +
            '.e2e-btn{padding:9px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-main);font-size:.85rem;font-weight:600;cursor:pointer;transition:background-color .2s ease,border-color .2s ease}' +
            '.e2e-btn:hover{background:var(--hover-fill);border-color:var(--hover-border)}' +
            '.e2e-btn:disabled{opacity:.45;cursor:not-allowed}' +
            '.e2e-btn--main{background:var(--primary);border-color:var(--primary);color:#fff}' +
            '.e2e-btn--main:hover{background:color-mix(in srgb,var(--primary) 88%,#fff)}' +
            '.e2e-btn--warn{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 40%,transparent)}' +
            '.e2e-link{background:none;border:0;padding:0;color:var(--text-muted);font-size:.8rem;text-decoration:underline;text-underline-offset:2px;cursor:pointer}' +
            '.e2e-btn:focus-visible,.e2e-link:focus-visible{outline:2px solid var(--primary);outline-offset:2px}' +
            '@media (max-width:480px){.e2e-foot .e2e-btn{flex:1 1 auto}}';
        document.head.appendChild(s);
    }

    var ICON_SCHLOSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

    // Ein Dialog, mehrere Seiten. `seite(html, binden)` tauscht den Inhalt;
    // `binden(card, fertig)` haengt die Knoepfe an und ruft fertig(ergebnis).
    function dialog(erste) {
        stil();
        return new Promise(function (ok) {
            var bg = document.createElement('div');
            bg.className = 'e2e-bg';
            bg.setAttribute('role', 'dialog');
            bg.setAttribute('aria-modal', 'true');
            bg.setAttribute('aria-labelledby', 'e2eT');
            var card = document.createElement('div');
            card.className = 'e2e-card';
            bg.appendChild(card);
            document.body.appendChild(bg);
            var zu = false;
            function fertig(e) {
                if (zu) return; zu = true;
                document.removeEventListener('keydown', taste);
                bg.remove();
                ok(e);
            }
            function taste(e) { if (e.key === 'Escape') fertig({ aktion: 'abbrechen' }); }
            document.addEventListener('keydown', taste);
            function seite(fn) {
                var s = fn();
                card.innerHTML = '<span class="e2e-ic">' + ICON_SCHLOSS + '</span>' + s.html;
                s.binden(card, fertig, seite);
                var f = card.querySelector('[autofocus]') || card.querySelector('.e2e-btn--main') || card.querySelector('button');
                if (f) setTimeout(function () { f.focus(); }, 30);
            }
            seite(erste);
        });
    }

    // Seite: neuen Code zeigen und bestaetigen lassen.
    function seiteCodeNeu(code, untertitel) {
        return function () {
            return {
                html:
                    '<h2 class="e2e-t" id="e2eT">' + L('Dein Wiederherstellungs-Code', 'Your recovery code') + '</h2>' +
                    '<p class="e2e-p">' + untertitel + '</p>' +
                    '<div class="e2e-code" id="e2eCode" translate="no">' + esc(codeAnzeigen(code)) + '</div>' +
                    '<div class="e2e-row">' +
                    '<button type="button" class="e2e-btn" data-e2e="kopieren">' + L('Kopieren', 'Copy') + '</button>' +
                    '<button type="button" class="e2e-btn" data-e2e="datei">' + L('Als Datei speichern', 'Save as file') + '</button>' +
                    '</div>' +
                    '<p class="e2e-p">' + L(
                        'Du brauchst ihn auf <strong>jedem neuen Gerät</strong> und nach dem Abmelden. Verlierst du ihn, kann niemand die Cloud-Kopie wiederherstellen, auch MyWorkLog nicht. Die Daten auf deinen Geräten bleiben erhalten.',
                        'You need it on <strong>every new device</strong> and after signing out. If you lose it, nobody can restore the cloud copy, not even MyWorkLog. The data on your devices stays.') + '</p>' +
                    '<label class="e2e-check"><input type="checkbox" id="e2eOk"><span>' +
                    L('Ich habe den Code aufgeschrieben oder gespeichert.', 'I have written down or saved the code.') + '</span></label>' +
                    '<div class="e2e-foot">' +
                    '<button type="button" class="e2e-btn" data-e2e="abbrechen">' + L('Abbrechen', 'Cancel') + '</button>' +
                    '<button type="button" class="e2e-btn e2e-btn--main" data-e2e="weiter" disabled>' + L('Verschlüsseln und hochladen', 'Encrypt and upload') + '</button>' +
                    '</div>',
                binden: function (card, fertig) {
                    var ok = card.querySelector('#e2eOk'), weiter = card.querySelector('[data-e2e="weiter"]');
                    ok.addEventListener('change', function () { weiter.disabled = !ok.checked; });
                    card.querySelector('[data-e2e="kopieren"]').addEventListener('click', function (e) {
                        var b = e.currentTarget;
                        navigator.clipboard.writeText(codeAnzeigen(code)).then(function () { b.textContent = L('Kopiert', 'Copied'); }, function () {});
                    });
                    card.querySelector('[data-e2e="datei"]').addEventListener('click', function () {
                        var text = L('MyWorkLog: Wiederherstellungs-Code für den Cloud-Sync', 'MyWorkLog: recovery code for cloud sync') +
                            '\n\n' + codeAnzeigen(code) + '\n\n' + new Date().toLocaleDateString() + '\n';
                        var a = document.createElement('a');
                        a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
                        a.download = 'myworklog-wiederherstellungs-code.txt';
                        document.body.appendChild(a); a.click(); a.remove();
                        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
                    });
                    card.querySelector('[data-e2e="abbrechen"]').addEventListener('click', function () { fertig({ aktion: 'abbrechen' }); });
                    weiter.addEventListener('click', function () { if (ok.checked) fertig({ aktion: 'code', code: code }); });
                }
            };
        };
    }

    // Seite: vorhandenen Code eingeben (Cloud ist schon verschluesselt).
    function seiteCodeEingeben(umschlag, uid) {
        return function () {
            return {
                html:
                    '<h2 class="e2e-t" id="e2eT">' + L('Wiederherstellungs-Code eingeben', 'Enter recovery code') + '</h2>' +
                    '<p class="e2e-p">' + L(
                        'Deine Cloud-Kopie ist Ende-zu-Ende verschlüsselt. Gib einmal auf diesem Gerät den Code ein, den du beim Einrichten bekommen hast.',
                        'Your cloud copy is end-to-end encrypted. Enter the code you got during setup once on this device.') + '</p>' +
                    '<input class="e2e-in" id="e2eIn" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autofocus>' +
                    '<p class="e2e-err" id="e2eErr" role="alert"></p>' +
                    '<button type="button" class="e2e-link" data-e2e="verloren">' + L('Code verloren?', 'Lost the code?') + '</button>' +
                    '<div class="e2e-foot">' +
                    '<button type="button" class="e2e-btn" data-e2e="abbrechen">' + L('Später', 'Later') + '</button>' +
                    '<button type="button" class="e2e-btn e2e-btn--main" data-e2e="pruefen">' + L('Entsperren', 'Unlock') + '</button>' +
                    '</div>',
                binden: function (card, fertig, seite) {
                    var inp = card.querySelector('#e2eIn'), err = card.querySelector('#e2eErr'), btn = card.querySelector('[data-e2e="pruefen"]');
                    async function pruefen() {
                        var code = codeNormalisieren(inp.value);
                        if (!code) { err.textContent = L('Der Code hat 24 Zeichen (Buchstaben und Ziffern).', 'The code has 24 characters (letters and digits).'); return; }
                        btn.disabled = true; err.textContent = L('Prüfe …', 'Checking …');
                        try {
                            var s = await schluesselAusCode(code, umschlag.salt);
                            await entschluesseln(umschlag, s.key);
                            await ablageSchreiben(uid, s);
                            fertig({ aktion: 'entsperrt', schluessel: s });
                        } catch (e) {
                            btn.disabled = false;
                            err.textContent = L('Dieser Code passt nicht zu deiner Cloud-Kopie.', 'This code does not match your cloud copy.');
                        }
                    }
                    btn.addEventListener('click', pruefen);
                    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') pruefen(); });
                    card.querySelector('[data-e2e="abbrechen"]').addEventListener('click', function () { fertig({ aktion: 'abbrechen' }); });
                    card.querySelector('[data-e2e="verloren"]').addEventListener('click', function () { seite(seiteNeuAnfangen()); });
                }
            };
        };
    }

    // Seite: Code verloren → Cloud-Kopie mit diesem Geraet neu anlegen.
    function seiteNeuAnfangen() {
        return function () {
            return {
                html:
                    '<h2 class="e2e-t" id="e2eT">' + L('Neu verschlüsseln?', 'Encrypt again?') + '</h2>' +
                    '<p class="e2e-p">' + L(
                        'Ohne den alten Code lässt sich die Cloud-Kopie nicht mehr öffnen, von niemandem. Du kannst sie aber mit dem Stand <strong>dieses Geräts</strong> und einem neuen Code ersetzen.',
                        'Without the old code the cloud copy cannot be opened again, by anyone. You can replace it with the data on <strong>this device</strong> and a new code.') + '</p>' +
                    '<p class="e2e-p"><strong>' + L('Was nur in der Cloud lag, ist danach weg.', 'Anything that only existed in the cloud is gone afterwards.') + '</strong> ' +
                    L('Andere Geräte brauchen dann den neuen Code.', 'Other devices will need the new code.') + '</p>' +
                    '<div class="e2e-foot">' +
                    '<button type="button" class="e2e-btn" data-e2e="abbrechen">' + L('Abbrechen', 'Cancel') + '</button>' +
                    '<button type="button" class="e2e-btn e2e-btn--warn" data-e2e="neu">' + L('Mit diesem Gerät neu anlegen', 'Start over with this device') + '</button>' +
                    '</div>',
                binden: function (card, fertig, seite) {
                    card.querySelector('[data-e2e="abbrechen"]').addEventListener('click', function () { fertig({ aktion: 'abbrechen' }); });
                    card.querySelector('[data-e2e="neu"]').addEventListener('click', function () {
                        seite(seiteCodeNeu(codeErzeugen(), L(
                            'Der neue Code ersetzt den alten. Notiere ihn, bevor du weitermachst.',
                            'The new code replaces the old one. Note it down before you continue.')));
                    });
                }
            };
        };
    }

    // Seite: Uebergang von Klartext (vor v8.1.0) — die eine Frage, die der
    // Nutzer ausdruecklich wollte: vorher den Cloud-Stand holen oder nicht.
    function seiteUebergang() {
        return function () {
            return {
                html:
                    '<h2 class="e2e-t" id="e2eT">' + L('Cloud-Sync wird Ende-zu-Ende verschlüsselt', 'Cloud sync becomes end-to-end encrypted') + '</h2>' +
                    '<p class="e2e-p">' + L(
                        'Ab jetzt kann deine Cloud-Kopie nur noch lesen, wer deinen Wiederherstellungs-Code hat, auch MyWorkLog nicht. Bis der Code festgelegt ist, ist der Sync pausiert.',
                        'From now on only someone with your recovery code can read your cloud copy, not even MyWorkLog. Sync is paused until the code is set.') + '</p>' +
                    '<p class="e2e-q">' + L('Möchtest du vorher den neuesten Stand aus der Cloud wiederherstellen?', 'Do you want to restore the latest state from the cloud first?') + '</p>' +
                    '<p class="e2e-p">' + L(
                        'Sinnvoll, wenn du zuletzt auf einem anderen Gerät gearbeitet hast. Danach wird dieser Stand verschlüsselt hochgeladen. Mit „Weiter“ gilt der Stand dieses Geräts.',
                        'Useful if you last worked on another device. That state is then uploaded encrypted. With “Continue” the data on this device is used.') + '</p>' +
                    '<div class="e2e-foot">' +
                    '<button type="button" class="e2e-btn" data-e2e="spaeter">' + L('Später', 'Later') + '</button>' +
                    '<button type="button" class="e2e-btn" data-e2e="weiter">' + L('Weiter mit diesem Gerät', 'Continue with this device') + '</button>' +
                    '<button type="button" class="e2e-btn e2e-btn--main" data-e2e="laden">' + L('Erst aus der Cloud wiederherstellen', 'Restore from the cloud first') + '</button>' +
                    '</div>',
                binden: function (card, fertig, seite) {
                    var neu = codeErzeugen();
                    var unter = L('Damit wird deine Cloud-Kopie ab jetzt verschlüsselt.', 'Your cloud copy is encrypted with it from now on.');
                    card.querySelector('[data-e2e="spaeter"]').addEventListener('click', function () { fertig({ aktion: 'abbrechen' }); });
                    card.querySelector('[data-e2e="weiter"]').addEventListener('click', function () {
                        seite(seiteCodeNeu(neu, unter));
                    });
                    card.querySelector('[data-e2e="laden"]').addEventListener('click', function () {
                        // Merker fuer den Upload: erst Klartext holen, dann verschluesselt hoch
                        card.dataset.erstLaden = '1';
                        seite(function () {
                            var s = seiteCodeNeu(neu, unter)();
                            var alt = s.binden;
                            s.binden = function (c, f, sei) {
                                alt(c, function (e) { if (e && e.aktion === 'code') e.erstLaden = true; f(e); }, sei);
                            };
                            return s;
                        });
                    });
                }
            };
        };
    }

    // ── Oeffentliche Schnittstelle fuer supabase-integration.js ─────────
    function abbruch() {
        var e = new Error(L('Cloud-Sync ist pausiert, bis der Wiederherstellungs-Code festgelegt ist.', 'Cloud sync is paused until the recovery code is set.'));
        e.e2eAbbruch = true;
        return e;
    }

    // Liefert { schluessel, erstLaden } fuer einen Upload, oder wirft abbruch().
    // `zustand` = 'leer' (keine Zeile) | 'klartext' (vor v8.1.0) |
    // { salt, laden() } (verschluesselt; laden() holt den vollen Umschlag).
    async function schluesselFuerUpload(uid, zustand) {
        var abgelegt = await ablageLesen(uid);
        if (abgelegt && abgelegt.key) {
            // Wurde die Cloud inzwischen auf einem anderen Geraet mit einem
            // NEUEN Code verschluesselt, passt unser Schluessel nicht mehr — dann
            // nicht drueberschreiben, sondern den neuen Code verlangen.
            // Der Salt wechselt mit jedem neuen Code; ein Vergleich reicht.
            if (zustand && typeof zustand === 'object' && zustand.salt !== abgelegt.salt) {
                await vergessen(uid);
            } else {
                return { schluessel: { key: abgelegt.key, salt: abgelegt.salt } };
            }
        }
        var e;
        if (zustand === 'klartext') e = await dialog(seiteUebergang());
        else if (zustand && typeof zustand === 'object') e = await dialog(seiteCodeEingeben(await zustand.laden(), uid));
        else e = await dialog(seiteCodeNeu(codeErzeugen(), L(
            'Dein Cloud-Sync ist Ende-zu-Ende verschlüsselt. Den Schlüssel dazu bildet dieser Code, und nur du hast ihn.',
            'Your cloud sync is end-to-end encrypted. This code is the key, and only you have it.')));

        if (!e || e.aktion === 'abbrechen') throw abbruch();
        if (e.aktion === 'entsperrt') return { schluessel: e.schluessel };
        var s = await schluesselAusCode(e.code, null);
        await ablageSchreiben(uid, s);
        return { schluessel: s, erstLaden: !!e.erstLaden, neu: true };
    }

    // Liefert den Schluessel fuer einen verschluesselten Umschlag, oder wirft.
    async function schluesselFuerDownload(uid, umschlag) {
        var abgelegt = await ablageLesen(uid);
        if (abgelegt && abgelegt.key && abgelegt.salt === umschlag.salt) {
            try { await entschluesseln(umschlag, abgelegt.key); return abgelegt.key; }
            catch (e) { await vergessen(uid); }
        }
        var r = await dialog(seiteCodeEingeben(umschlag, uid));
        if (!r || r.aktion !== 'entsperrt') {
            // "Neu anlegen" beim HERUNTERladen ergibt keinen Sinn: es gibt
            // nichts zu laden. Der Nutzer bekommt den Weg beim naechsten Upload.
            throw abbruch();
        }
        return r.schluessel.key;
    }

    // Nur den Code eingeben und ablegen — ohne Upload und ohne Download.
    async function entsperren(uid, zustand) {
        var r = await dialog(seiteCodeEingeben(await zustand.laden(), uid));
        if (!r || r.aktion !== 'entsperrt') throw abbruch();
        return true;
    }

    async function hatSchluessel(uid) {
        var a = await ablageLesen(uid);
        return !!(a && a.key);
    }

    window.MWLE2E = {
        UMSCHLAG: UMSCHLAG,
        istUmschlag: istUmschlag,
        verschluesseln: verschluesseln,
        entschluesseln: entschluesseln,
        schluesselFuerUpload: schluesselFuerUpload,
        schluesselFuerDownload: schluesselFuerDownload,
        hatSchluessel: hatSchluessel,
        entsperren: entsperren,
        vergessen: vergessen,
        // fuer Tests
        _codeErzeugen: codeErzeugen,
        _codeNormalisieren: codeNormalisieren,
        _codeAnzeigen: codeAnzeigen,
        _schluesselAusCode: schluesselAusCode,
        _uebergang: function () { return dialog(seiteUebergang()); }
    };
})();
