// ═══ MWL-SIGN MODULE ═══
//
// Signiert Freigabe-Entscheidungen des Ausbilders (ECDSA P-256, WebCrypto) und
// prueft sie auf der Azubi-Seite.
//
// 🔴 WAS DAS LEISTET — und was nicht:
// Ohne Server gibt es keine Identitaetspruefung. Es gibt keine Stelle, die
// bestaetigt, dass ein Schluessel wirklich "Herrn Schneider" gehoert.
// Was hier funktioniert, ist Trust-on-first-use: der Azubi merkt sich beim
// ERSTEN Mal den oeffentlichen Schluessel, und ab dann kann die App sagen
// "dieselbe Person/dasselbe Geraet wie beim ersten Mal" oder eben "anderes
// Geraet". Und der Azubi kann eine Freigabe nicht selbst faelschen, ohne an
// das Geraet des Ausbilders zu kommen — dafuer ist der private Schluessel
// nicht exportierbar (extractable:false) und liegt in IndexedDB, nicht im
// localStorage.
// Die Sperre des Eintrags liegt weiterhin in den lokalen Daten des Azubis, er
// kann sie also zuruecknehmen. Das ist eine Arbeitshilfe, kein faelschungs-
// sicherer Nachweis, und genau so steht es auch in der Oberflaeche.

(function (global) {
    'use strict';

    const DB_NAME  = 'mwl_ausbilder';
    const STORE    = 'keys';
    const KEY_ID   = 'signing-key';
    const ALGO     = { name: 'ECDSA', namedCurve: 'P-256' };
    const SIGN_ALGO = { name: 'ECDSA', hash: { name: 'SHA-256' } };

    function b64url(bytes) {
        let bin = '';
        const arr = new Uint8Array(bytes);
        for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function unb64url(str) {
        const b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
        return Uint8Array.from(atob(padded), function (c) { return c.charCodeAt(0); });
    }

    // ── IndexedDB (nur ein Datensatz: das Schluesselpaar) ────────────────
    function openDb() {
        return new Promise(function (resolve, reject) {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = function () {
                if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
            };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
    }

    function idbGet(db, key) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(key);
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
    }

    function idbPut(db, key, val) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(val, key);
            tx.oncomplete = function () { resolve(); };
            tx.onerror = function () { reject(tx.error); };
        });
    }

    // ── Schluesselpaar ───────────────────────────────────────────────────
    // CryptoKey-Objekte ueberleben den structured clone, der private Teil
    // bleibt dabei extractable:false — er kann also auch aus der Konsole
    // nicht ausgelesen werden.
    let _cached = null;

    async function getKeypair() {
        if (_cached) return _cached;
        const db = await openDb();
        let pair = await idbGet(db, KEY_ID);
        if (!pair || !pair.privateKey) {
            pair = await crypto.subtle.generateKey(ALGO, false, ['sign', 'verify']);
            await idbPut(db, KEY_ID, pair);
        }
        _cached = pair;
        return pair;
    }

    // Rohformat (65 Byte unkomprimiert) statt JWK — im QR zaehlt jedes Zeichen.
    async function publicKeyId(pair) {
        const raw = await crypto.subtle.exportKey('raw', pair.publicKey);
        return b64url(raw);
    }

    // ── Kanonische Form ──────────────────────────────────────────────────
    // Signiert wird ein fest zusammengesetzter String, NICHT das JSON-Objekt:
    // die Schluesselreihenfolge in JSON.stringify ist keine Garantie, und eine
    // Pruefung, die von ihr abhaengt, bricht beim ersten Feld, das dazukommt.
    function canonical(d) {
        return [
            'mwl-freigabe/1',
            d.r || '',
            String(d.y || ''),
            String(d.w || ''),
            d.s || '',
            d.at || '',
            d.by || '',
            d.n || ''
        ].join('');
    }

    async function sign(decision) {
        const pair = await getKeypair();
        const data = new TextEncoder().encode(canonical(decision));
        const sig = await crypto.subtle.sign(SIGN_ALGO, pair.privateKey, data);
        return {
            k: await publicKeyId(pair),
            g: b64url(sig)
        };
    }

    async function verify(decision) {
        if (!decision || !decision.k || !decision.g) return false;
        try {
            const pub = await crypto.subtle.importKey('raw', unb64url(decision.k), ALGO, false, ['verify']);
            const data = new TextEncoder().encode(canonical(decision));
            return await crypto.subtle.verify(SIGN_ALGO, pub, unb64url(decision.g), data);
        } catch (e) {
            console.warn('[mwl-sign] Pruefung fehlgeschlagen:', e);
            return false;
        }
    }

    function available() {
        return typeof crypto !== 'undefined' && !!crypto.subtle && typeof indexedDB !== 'undefined';
    }

    global.MWLSign = {
        getKeypair: getKeypair,
        publicKeyId: publicKeyId,
        sign: sign,
        verify: verify,
        available: available
    };

})(window);
