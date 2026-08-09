// ═══ MWL-CODEC MODULE ═══
//
// Geteilter Nutzlast-Codec fuer Link-/QR-Uebergaben zwischen zwei Geraeten.
// Genutzt von pages/berichtsheft (Hinweg: Woche -> Ausbilder) und
// pages/ausbilder (Rueckweg: Freigabe -> Azubi).
//
// Bewusst OHNE Verbindung: die Nutzlast steht im Fragment (#...) der URL und
// wird deshalb nie an einen Server geschickt. WebRTC waere hier das falsche
// Werkzeug — es braucht beide Geraete gleichzeitig online, und Firmennetze
// sind genau die Umgebung, die den ICE-Handshake blockiert.
//
// p2p-sync.js hat eine eigene, aeltere Fassung von compress/decompress. Die
// bleibt unangetastet (laeuft produktiv); wer dort etwas aendert, sollte diese
// Datei mitlesen, damit die Formate nicht auseinanderlaufen.

(function (global) {
    'use strict';

    // ── Base64url ────────────────────────────────────────────────────────
    // In 32k-Schritten ueber subarray: String.fromCharCode.apply(null, bigArr)
    // kippt ab ca. 65k Elementen mit einem Stack-Overflow.
    const CHUNK = 0x8000;

    function bytesToB64url(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function b64urlToBytes(str) {
        const base64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        const binary = atob(padded);
        return Uint8Array.from(binary, function (c) { return c.charCodeAt(0); });
    }

    // ── gzip ─────────────────────────────────────────────────────────────
    // CompressionStream fehlt in aelteren Safari-Versionen. Dann faellt der
    // Codec auf reines Base64 zurueck: laenger, aber funktionsfaehig. Das
    // Praefix im ersten Zeichen sagt der Gegenseite, was sie bekommt.
    const P_GZIP = 'A';
    const P_PLAIN = 'B';

    function hasCompressionStream() {
        return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
    }

    async function encode(obj) {
        const json = JSON.stringify(obj);
        if (hasCompressionStream()) {
            try {
                const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
                const buf = await new Response(stream).arrayBuffer();
                return P_GZIP + bytesToB64url(new Uint8Array(buf));
            } catch (e) {
                console.warn('[mwl-codec] gzip fehlgeschlagen, nutze Base64:', e);
            }
        }
        return P_PLAIN + bytesToB64url(new TextEncoder().encode(json));
    }

    async function decode(str) {
        if (!str || typeof str !== 'string' || str.length < 2) throw new Error('Leere Nutzlast');
        const prefix = str.charAt(0);
        const body = str.slice(1);

        if (prefix === P_PLAIN) {
            return JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
        }
        if (prefix === P_GZIP) {
            if (!hasCompressionStream()) throw new Error('Dieser Browser kann gzip nicht auspacken');
            const stream = new Blob([b64urlToBytes(body)]).stream().pipeThrough(new DecompressionStream('gzip'));
            return JSON.parse(await new Response(stream).text());
        }
        throw new Error('Unbekanntes Format');
    }

    // ── QR-Code ──────────────────────────────────────────────────────────
    // Die Lib (Assets/js/qrcode.min.js) kann NUR erzeugen, nicht lesen.
    // Gescannt wird deshalb mit der Kamera-App des anderen Geraets — der QR
    // enthaelt einen ganz normalen Link.
    let _qrLoading = null;

    function loadQr() {
        if (typeof QRCode !== 'undefined') return Promise.resolve();
        if (_qrLoading) return _qrLoading;
        _qrLoading = new Promise(function (resolve, reject) {
            // stamp-assets.js stempelt nur .html — den ?v= deshalb von einem
            // bereits gestempelten Script-Tag abschauen statt hier zu pflegen.
            let v = '';
            try {
                const stamped = document.querySelector('script[src*="/Assets/js/"][src*="?v="]');
                if (stamped) v = '?v=' + new URL(stamped.src, location.href).searchParams.get('v');
            } catch (e) { /* ohne Stempel laden ist ok, der SW cached nach Version */ }
            const s = document.createElement('script');
            s.src = '/Assets/js/qrcode.min.js' + v;
            s.onload = function () { resolve(); };
            s.onerror = function () { _qrLoading = null; reject(new Error('QR-Bibliothek nicht ladbar')); };
            document.head.appendChild(s);
        });
        return _qrLoading;
    }

    // Ab dieser Laenge wird der QR so dicht, dass Handykameras ihn nur noch
    // mit Muehe lesen (< ~3 px pro Modul bei 460 px Kantenlaenge). Darueber
    // zeigen die Aufrufer den Link statt eines unlesbaren Bildes.
    const QR_SAFE_LEN = 1100;

    function qrFits(text) { return String(text).length <= QR_SAFE_LEN; }

    // 1:1 rendern und NICHT herunterskalieren, sonst werden die Modulkanten
    // uneben und der Code wird schlechter erkannt.
    async function renderQr(host, text, size) {
        if (!host) return;
        await loadQr();
        host.innerHTML = '';
        new QRCode(host, {
            text: text,
            width: size || 460,
            height: size || 460,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L
        });
    }

    global.MWLCodec = {
        encode: encode,
        decode: decode,
        loadQr: loadQr,
        renderQr: renderQr,
        qrFits: qrFits,
        QR_SAFE_LEN: QR_SAFE_LEN
    };

})(window);
