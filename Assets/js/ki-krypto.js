// ═══ KI-KRYPTO MODULE ═══
//
// Gemeinsame Verschluesselung der KI-Briefkaesten (MCP-Server mcp.myworklog.de,
// workers/mcp-proxy). Geladen vom Schatten-Berichtsheft (ki-briefkasten.js),
// von der App und vom Berichtsheft (ki-app-briefkasten.js). EINE Datei, weil
// drei Kopien derselben Entschluesselung auseinanderlaufen — dann liegen
// Entwuerfe im Briefkasten, die eine der Seiten nicht mehr oeffnen kann.
//
// Schluesselpaar ECDH P-256 je Konto und Bereich. Der private Teil wird mit
// einem AES-GCM-Schluessel verpackt, der auf allen Geraeten gleich ist:
//   schatten → Tresor-Hauptschluessel (aus dem Tresor-Passwort)
//   app      → Cloud-E2E-Schluessel (aus dem Wiederherstellungs-Code)
// Verpackt im Umschlag {iv, data} (Base64) — dasselbe Format wie encrypt() im
// Schatten-Modul, damit vorhandene Schatten-Schluessel lesbar bleiben.
//
// Format eines Entwurfs: siehe verschluesseln() im Worker. Aenderungen nur mit
// neuer Versionsnummer `v`, sonst kann eine Inbox alte Entwuerfe nicht lesen.
// Test: workers/mcp-proxy/mcp.test.mjs entschluesselt mit DIESER Datei.

const KI_HKDF_INFO = 'mwl-ki-entwurf/1';

function kiB64ToU8(b64) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }

function kiU8ToB64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
}

async function kiVerpacken(text, aesKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aesKey, new TextEncoder().encode(text));
    return { iv: kiU8ToB64(iv), data: kiU8ToB64(new Uint8Array(ct)) };
}

async function kiAuspacken(umschlag, aesKey) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: kiB64ToU8(umschlag.iv), tagLength: 128 }, aesKey, kiB64ToU8(umschlag.data));
    return new TextDecoder().decode(pt);
}

async function kiSchluesselpaarErzeugen(aesKey) {
    const paar = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const pub = await crypto.subtle.exportKey('jwk', paar.publicKey);
    const priv = await crypto.subtle.exportKey('jwk', paar.privateKey);
    const verpackt = await kiVerpacken(JSON.stringify(priv), aesKey);
    priv.d = '';   // Rohwert nicht laenger als noetig herumliegen lassen
    return { publicKey: { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y }, privateKey: verpackt };
}

async function kiPrivatSchluesselAuspacken(verpackt, aesKey) {
    const jwk = JSON.parse(await kiAuspacken(verpackt, aesKey));
    // extractable:false — aus dem laufenden Code nicht wieder auslesbar.
    return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
}

async function kiEntwurfEntschluesseln(payload, privKey) {
    if (!payload || payload.v !== 1) throw new Error('Unbekanntes Format');
    const epk = await crypto.subtle.importKey('jwk',
        { kty: 'EC', crv: 'P-256', x: payload.epk.x, y: payload.epk.y },
        { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: epk }, privKey, 256);
    const hk = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: kiB64ToU8(payload.salt), info: new TextEncoder().encode(KI_HKDF_INFO) },
        hk, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: kiB64ToU8(payload.iv) }, key, kiB64ToU8(payload.ct));
    return JSON.parse(new TextDecoder().decode(pt));
}

// Die eine Zeile fuer den Agenten (Vorbild Cloudflare). Die Anleitung samt
// Wegen je App liefert der Worker unter /setup.md.
function kiAgentZeile(en) {
    return en
        ? 'Fetch the instructions from https://mcp.myworklog.de/en/setup.md and use them to set me up for MyWorkLog.'
        : 'Hol dir die Anleitung von https://mcp.myworklog.de/setup.md und richte mich damit für MyWorkLog ein.';
}
