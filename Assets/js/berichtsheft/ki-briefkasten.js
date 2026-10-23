// ═══ KI-BRIEFKASTEN MODULE ═══
//
// Entwuerfe aus KI-Assistenten (Claude, ChatGPT …) fuer das Schatten-Berichtsheft.
// Zwei Wege, eine Inbox:
//   1. MCP-Verbindung: der Assistent wirft ueber mcp.myworklog.de einen
//      verschluesselten Entwurf ein (workers/mcp-proxy, gitignored).
//   2. Aus Chat einfuegen: jeder Chatbot liefert einen JSON-Block nach unserer
//      Vorlage, der Nutzer fuegt ihn hier ein. Ohne Konto, ohne Server.
// Beide enden im normalen Eintragsformular. Ein Eintrag entsteht nur durch
// „Speichern" dort — nie automatisch.
//
// 🔴 SCHLUESSEL: ECDH P-256. Der oeffentliche Teil liegt im Klartext in
// `schatten_ki_schluessel`, der private mit dem Tresor-Hauptschluessel
// (derivedKey) verpackt daneben. Der Hauptschluessel ist auf allen Geraeten
// desselben Tresors gleich, deshalb muss der private Schluessel NICHT mit dem
// Tresor-Spiegel reisen. Nach einem Tresor-Reset passt er nicht mehr — dann
// meldet kiLaden() 'fremd' und bietet Neu-Einrichten an.
//
// Format eines Entwurfs: siehe verschluesseln() im Worker. Aenderungen nur mit
// neuer Versionsnummer `v`, sonst kann die Inbox alte Entwuerfe nicht mehr lesen.
//
// Laeuft nach schatten-berichtsheft.js und benutzt dessen Globals (derivedKey,
// encrypt, decrypt, L, escapeHtml, openModal, closeModal, showToast,
// getCategory, categoryExists, categoryFields, SEVERITY_LABELS …).

const KI_MCP_URL = 'https://mcp.myworklog.de/mcp';
const KI_HKDF_INFO = 'mwl-ki-entwurf/1';
const KI_SCHWERE = ['critical', 'high', 'medium', 'low', 'note'];

let kiPrivKey = null;        // CryptoKey, nur solange der Tresor offen ist
let kiStatus = 'aus';        // 'aus' | 'an' | 'konto' (keine Anmeldung) | 'fremd' | 'fehler'
let kiEntwuerfe = [];        // [{id, created_at, daten, fehler}]
let kiPending = null;        // Entwurf, der gerade im Eintragsformular liegt
let kiVerbindungen = [];     // [{client_id, client_name, created_at}] aus Supabase-OAuth

function kiB64ToU8(b64) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }

// ── Krypto ────────────────────────────────────────────────────────────────
async function kiSchluesselpaarErzeugen(masterKey) {
    const paar = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const pub = await crypto.subtle.exportKey('jwk', paar.publicKey);
    const priv = await crypto.subtle.exportKey('jwk', paar.privateKey);
    const verpackt = await encrypt(JSON.stringify(priv), masterKey);
    priv.d = '';   // Rohwert nicht laenger als noetig herumliegen lassen
    return { publicKey: { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y }, privateKey: verpackt, cryptoKey: paar.privateKey };
}

async function kiPrivatSchluesselAuspacken(verpackt, masterKey) {
    const jwk = JSON.parse(await decrypt(verpackt, masterKey));
    // extractable:false — aus dem laufenden Code nicht wieder auslesbar,
    // wie der Tresor-Hauptschluessel.
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

// ── Normalisieren ─────────────────────────────────────────────────────────
// Gilt fuer BEIDE Wege. Der MCP-Server prueft schon, ein eingefuegter Block
// aber kommt ungeprueft aus irgendeinem Chat — und auch dem Server traut die
// Inbox nicht blind: was hier rausfaellt, landet nie im Formular.
function kiText(v, max) {
    return typeof v === 'string' ? v.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim().slice(0, max) : '';
}

function kiNormalisieren(d) {
    d = d && typeof d === 'object' ? d : {};
    const kategorie = (typeof d.kategorie === 'string' && categoryExists(d.kategorie)) ? d.kategorie : 'other';
    const felder = categoryFields(kategorie);
    const details = {};
    const roh = d.details && typeof d.details === 'object' ? d.details : {};
    felder.forEach(f => {
        const v = roh[f.key];
        if (v === undefined || v === null || v === '') return;
        if (f.type === 'select') { if (f.options.some(o => o[0] === v)) details[f.key] = v; }
        else if (f.type === 'number') { const n = parseFloat(String(v).replace(',', '.')); if (isFinite(n) && n >= 0) details[f.key] = String(n); }
        else if (f.type === 'date') { if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) details[f.key] = String(v); }
        else { const t = kiText(String(v), 300); if (t) details[f.key] = t; }
    });
    return {
        kategorie,
        kategorieUnbekannt: kategorie !== d.kategorie,
        schwere: KI_SCHWERE.includes(d.schwere) ? d.schwere : 'medium',
        beschreibung: kiText(d.beschreibung, 8000),
        datum: /^\d{4}-\d{2}-\d{2}$/.test(String(d.vorfall_datum || '')) ? String(d.vorfall_datum) : '',
        uhrzeit: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(d.vorfall_uhrzeit || '')) ? String(d.vorfall_uhrzeit) : '',
        zeugen: (Array.isArray(d.zeugen) ? d.zeugen : []).map(z => kiText(String(z), 120)).filter(Boolean).slice(0, 20),
        details,
        originalworte: kiText(d.originalworte, 8000),
        client: kiText(d.client, 40),
        eingeworfen: kiText(d.eingeworfen, 40),
    };
}

// ── Laden / Status ────────────────────────────────────────────────────────
async function kiLaden() {
    kiPrivKey = null;
    kiEntwuerfe = [];
    if (typeof window.vcAngemeldet !== 'function' || !window.vcAngemeldet() || !window.vcKi) {
        kiStatus = 'konto';
        kiRender();
        return;
    }
    try {
        const zeile = await window.vcKi.schluesselLesen();
        if (!zeile) {
            kiStatus = 'aus';
            // Wer den Knopf gedrueckt hat, bevor er hier angemeldet war, will den
            // Briefkasten — dann jetzt einschalten, statt ihn nochmal fragen zu lassen.
            let wunsch = false;
            try { wunsch = localStorage.getItem(KI_WUNSCH) === '1'; } catch (e) { /* nein */ }
            if (wunsch && derivedKey) { await kiEinschalten({ leise: true }); return; }
            kiRender();
            return;
        }
        try {
            kiPrivKey = await kiPrivatSchluesselAuspacken(zeile.private_key, derivedKey);
        } catch (e) {
            kiStatus = 'fremd';
            kiRender();
            return;
        }
        kiStatus = 'an';
        await kiEntwuerfeHolen();
        kiVerbindungen = await window.vcKi.verbindungen().catch(() => []);
    } catch (e) {
        kiStatus = 'fehler';
        console.warn('[KI-Briefkasten]', e && e.message);
    }
    kiRender();
}

async function kiEntwuerfeHolen() {
    if (!kiPrivKey) return;
    const zeilen = await window.vcKi.entwuerfe();
    const jetzt = Date.now();
    const out = [];
    for (const z of zeilen) {
        if (Date.parse(z.expires_at) < jetzt) {
            window.vcKi.entwurfLoeschen(z.id).catch(() => {});
            continue;
        }
        try {
            out.push({ id: z.id, created_at: z.created_at, daten: kiNormalisieren(await kiEntwurfEntschluesseln(z.payload, kiPrivKey)) });
        } catch (e) {
            out.push({ id: z.id, created_at: z.created_at, fehler: true });
        }
    }
    kiEntwuerfe = out;
}

function kiVergessen() {
    kiPrivKey = null;
    kiEntwuerfe = [];
    kiPending = null;
    kiRender();
}

// ── Einschalten / Ausschalten ─────────────────────────────────────────────
async function kiEinschalten(opts) {
    const leise = !!(opts && opts.leise);
    if (!derivedKey) return;
    const btn = document.getElementById('kiToggleBtn');
    if (btn) btn.disabled = true;
    try {
        const p = await kiSchluesselpaarErzeugen(derivedKey);
        // Ein neues Paar macht alte Entwuerfe unlesbar — die gehoeren dann weg,
        // sonst stuenden sie fuer immer als „nicht lesbar" in der Inbox.
        if (kiStatus === 'fremd') await window.vcKi.schluesselLoeschen();
        await window.vcKi.schluesselSchreiben(p.publicKey, p.privateKey);
        kiPrivKey = await kiPrivatSchluesselAuspacken(p.privateKey, derivedKey);
        kiStatus = 'an';
        kiEntwuerfe = [];
        if (!leise) showToast(L('KI-Entwürfe sind eingeschaltet', 'AI drafts are switched on'), 'success');
    } catch (e) {
        showToast(L('Einschalten fehlgeschlagen — bist du online und angemeldet?', 'Switching on failed — are you online and signed in?'), 'error');
    } finally {
        if (btn) btn.disabled = false;
        kiRender();
    }
}

async function kiAusschalten() {
    const offen = kiEntwuerfe.length;
    const ok = await window.mwlConfirm({
        title: L('KI-Entwürfe ausschalten?', 'Switch AI drafts off?'),
        text: L('Verbundene Assistenten können danach nichts mehr einwerfen.', 'Connected assistants can no longer drop anything in.') +
            (offen ? ' ' + L(offen + ' offene Entwürfe werden gelöscht.', offen + ' open drafts will be deleted.') : ''),
        confirmText: L('Ausschalten', 'Switch off'),
    });
    if (!ok) return;
    try {
        await window.vcKi.schluesselLoeschen();
        kiPrivKey = null;
        kiEntwuerfe = [];
        kiStatus = 'aus';
        try { localStorage.removeItem(KI_WUNSCH); } catch (e) { /* egal */ }
        showToast(L('KI-Entwürfe sind ausgeschaltet', 'AI drafts are switched off'), 'info');
    } catch (e) {
        showToast(L('Ausschalten fehlgeschlagen — bitte erneut versuchen', 'Switching off failed — please try again'), 'error');
    }
    kiRender();
}

// ── Formular ──────────────────────────────────────────────────────────────
function kiEntwurfInsFormular(d, herkunft) {
    openNewEntry();
    kiPending = herkunft;
    document.getElementById('entryModalTitle').textContent = L('Entwurf prüfen', 'Review draft');
    if (d.datum) {
        document.getElementById('entryDate').value = d.datum;
        document.getElementById('entryTime').value = d.uhrzeit || '';
    }
    selectedSeverity = d.schwere;
    selectSeverity(d.schwere);
    document.getElementById('entryCategory').value = d.kategorie;
    renderCategoryFields(d.kategorie, d.details);
    if (typeof syncCategoryPickerButton === 'function') syncCategoryPickerButton();
    document.getElementById('entryText').value = d.beschreibung;
    document.getElementById('entryWitnesses').value = d.zeugen.join(', ');

    const box = document.getElementById('kiFormHinweis');
    if (box) {
        const quelle = herkunft.draftId
            ? L('Eingeworfen über eine KI-Verbindung', 'Dropped in via an AI connection') + (d.client ? ' (' + L('laut Client: ', 'client says: ') + escapeHtml(d.client) + ')' : '')
            : L('Aus einem Chat eingefügt', 'Pasted from a chat');
        box.innerHTML =
            '<p class="ki-form-lead">' + quelle + '. ' +
            L('Prüf jede Angabe — gespeichert wird erst, was du hier bestätigst. Der Eintrag wird als „mit KI formuliert" gekennzeichnet.',
              'Check every detail — only what you confirm here gets saved. The entry is marked as "worded with AI".') + '</p>' +
            (d.kategorieUnbekannt ? '<p class="ki-form-warn">' + L('Die vorgeschlagene Kategorie gibt es nicht, deshalb steht „Sonstiges" da.', 'The suggested category does not exist, so "Other" is selected.') + '</p>' : '') +
            (d.originalworte ? '<details class="ki-form-orig"><summary>' + L('Deine Originalworte', 'Your original words') + '</summary><p>' +
                escapeHtml(d.originalworte) + '</p><small>' + L('Werden nicht gespeichert.', 'Not saved.') + '</small></details>' : '');
        box.hidden = false;
    }
}

function kiFormularZuruecksetzen() {
    kiPending = null;
    const box = document.getElementById('kiFormHinweis');
    if (box) { box.hidden = true; box.innerHTML = ''; }
}

// Von saveEntry() nach erfolgreichem Speichern eines NEUEN Eintrags gerufen.
async function kiNachSpeichern() {
    const p = kiPending;
    kiFormularZuruecksetzen();
    if (!p || !p.draftId) return;
    kiEntwuerfe = kiEntwuerfe.filter(x => x.id !== p.draftId);
    kiRender();
    try { await window.vcKi.entwurfLoeschen(p.draftId); }
    catch (e) { console.warn('[KI-Briefkasten] Entwurf bleibt liegen:', e && e.message); }
}

// ── Inbox-Aktionen ────────────────────────────────────────────────────────
function kiEntwurfOeffnen(id) {
    const e = kiEntwuerfe.find(x => x.id === id);
    if (!e || e.fehler) return;
    closeModal('kiInboxModal');
    kiEntwurfInsFormular(e.daten, { draftId: id, client: e.daten.client });
}

async function kiEntwurfVerwerfen(id) {
    const ok = await window.mwlConfirm({
        title: L('Entwurf verwerfen?', 'Discard draft?'),
        text: L('Er wird gelöscht und kann nicht zurückgeholt werden.', 'It will be deleted and cannot be restored.'),
        confirmText: L('Verwerfen', 'Discard'),
    });
    if (!ok) return;
    try {
        await window.vcKi.entwurfLoeschen(id);
        kiEntwuerfe = kiEntwuerfe.filter(x => x.id !== id);
        showToast(L('Entwurf verworfen', 'Draft discarded'), 'info');
    } catch (e) {
        showToast(L('Verwerfen fehlgeschlagen', 'Discarding failed'), 'error');
    }
    kiRender();
    if (!kiEntwuerfe.length) closeModal('kiInboxModal');
}

async function kiInboxAktualisieren() {
    const btn = document.getElementById('kiRefreshBtn');
    if (btn) btn.disabled = true;
    await kiLaden();
    if (btn) btn.disabled = false;
}

// ── Aus Chat einfuegen ────────────────────────────────────────────────────
// Kein Link mit Base64: Sprachmodelle kodieren lange Texte mit Umlauten
// unzuverlaessig. Einen JSON-Block abschreiben koennen sie.
function kiChatVorlage() {
    const kats = allCategoryEntries().filter(x => !x.cat.custom).map(x => x.key + ' = ' + catExportLabel(x.cat)).join('\n');
    const felder = allCategoryEntries().filter(x => !x.cat.custom && CATEGORY_FIELDS[x.key])
        .map(x => x.key + ': ' + CATEGORY_FIELDS[x.key].map(f => f.key + (f.options ? ' (' + f.options.map(o => o[0]).join('|') + ')' : ' (' + f.type + ')')).join(', ')).join('\n');
    return [
        L('Hilf mir, einen Vorfall aus meiner Ausbildung für mein Schatten-Berichtsheft (MyWorkLog) festzuhalten.',
          'Help me record an incident from my apprenticeship for my shadow report book (MyWorkLog).'),
        L('Frag nach, was fehlt (wann, wo, wer war dabei, wie oft, bei ausbildungsfremden Tätigkeiten die Dauer). Erfinde nichts.',
          'Ask about what is missing (when, where, who was there, how often, for non-training tasks the duration). Do not invent anything.'),
        L('Schreib die Beschreibung sachlich in der Ich-Form: erst was passiert ist, dann ein Absatz „Bewertung für die Ausbildung:". Fakten und Vermutungen trennen, keine Beleidigungen.',
          'Write the description factually in the first person: first what happened, then a paragraph "Assessment for the training:". Separate facts from assumptions, no insults.'),
        L('Gib am Ende NUR einen JSON-Codeblock in dieser Form aus:', 'At the end, output ONLY a JSON code block in this form:'),
        '{"myworklog_entwurf":1,"kategorie":"unrelated","schwere":"medium","beschreibung":"...","vorfall_datum":"2026-10-23","vorfall_uhrzeit":"14:30","zeugen":["..."],"details":{},"originalworte":"..."}',
        L('schwere: critical, high, medium, low oder note. Weglassen, was unbekannt ist.', 'schwere: critical, high, medium, low or note. Leave out what is unknown.'),
        '',
        L('Kategorien:', 'Categories:'),
        kats,
        '',
        L('Zusatzfelder (details) je Kategorie, sonst location und frequency (once|repeated|ongoing):',
          'Extra fields (details) per category, otherwise location and frequency (once|repeated|ongoing):'),
        felder,
    ].join('\n');
}

async function kiVorlageKopieren() {
    try {
        await navigator.clipboard.writeText(kiChatVorlage());
        showToast(L('Vorlage kopiert — in den Chat einfügen', 'Template copied — paste it into the chat'), 'success');
    } catch (e) {
        showToast(L('Kopieren nicht erlaubt', 'Copying not allowed'), 'error');
    }
}

// ── Ein Knopf fuer den Agenten (Wunsch des Nutzers, 24.10.2026, nach
// Cloudflares „Connect to your agent"): klicken, kopieren, im Chat einfuegen.
// Der Text erklaert dem Agenten die Einrichtung selbst — wer MCP-Server
// anlegen kann (Claude Code, Cursor …), tut es; wer nicht, nennt dem Nutzer
// den Connector-Weg oder arbeitet mit dem Vorlagenformat. Deshalb steckt die
// komplette Chat-Vorlage als Rueckfallebene mit drin.
const KI_WUNSCH = 'mwl_ki_wunsch';       // Klick gemerkt → Briefkasten nach dem Anmelden von selbst an
const KI_BANNER_WEG = 'mwl_ki_banner_weg';

function kiAgentPrompt() {
    return [
        L('Verbinde dich bitte mit meinem MyWorkLog Schatten-Berichtsheft. Das ist mein verschlüsseltes Protokoll über Probleme in meiner Ausbildung.',
          'Please connect to my MyWorkLog shadow report book. It is my encrypted record of problems during my apprenticeship.'),
        '',
        L('MCP-Server: ' + KI_MCP_URL + ' (Remote, Streamable HTTP, Anmeldung per OAuth im Browser)',
          'MCP server: ' + KI_MCP_URL + ' (remote, Streamable HTTP, OAuth sign-in in the browser)'),
        '',
        L('Nimm den ersten Weg, der bei dir geht:', 'Take the first route that works for you:'),
        L('1. Kannst du MCP-Server selbst einrichten (z. B. Claude Code: `claude mcp add --transport http myworklog ' + KI_MCP_URL + '`, oder Cursor, VS Code, Windsurf über deine MCP-Konfiguration), dann richte ihn ein und starte die Anmeldung. Ich bestätige sie im Browser.',
          '1. If you can set up MCP servers yourself (e.g. Claude Code: `claude mcp add --transport http myworklog ' + KI_MCP_URL + '`, or Cursor, VS Code, Windsurf via your MCP config), set it up and start the sign-in. I confirm it in the browser.'),
        L('2. Kann deine App Connectors, die nur ich hinzufügen darf (z. B. Claude im Browser), sag mir in einem Satz, wo ich die Adresse eintrage.',
          '2. If your app supports connectors that only I can add (e.g. Claude in the browser), tell me in one sentence where to enter the address.'),
        L('3. Geht beides nicht, arbeite mit dem Vorlagenformat unten — ich füge deine Antwort dann selbst ein.',
          '3. If neither works, use the template format below — I will paste your answer myself.'),
        '',
        L('Danach: Wenn ich dir von einem Vorfall erzähle, biete an, daraus einen Entwurf zu machen, frag nach, was fehlt, und leg ihn erst nach meinem OK ab. Einträge bestätige ich selbst.',
          'After that: when I tell you about an incident, offer to turn it into a draft, ask about what is missing and only drop it after my OK. I confirm entries myself.'),
        '',
        '── ' + L('Vorlagenformat (nur für Weg 3)', 'Template format (route 3 only)') + ' ──',
        kiChatVorlage(),
    ].join('\n');
}

function kiKopierKnopf(id) {
    return '<button type="button" class="btn btn-cta ki-copy" id="' + id + '" onclick="kiAgentKopieren(this)">' +
        '<span class="ki-copy-face ki-copy-face--an">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' +
            L('Für deinen Assistenten kopieren', 'Copy for your assistant') + '</span>' +
        '<span class="ki-copy-face ki-copy-face--ok" aria-hidden="true">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>' +
            L('Kopiert — im Chat einfügen', 'Copied — paste it in the chat') + '</span>' +
    '</button>';
}

function kiKopieren(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    // Rueckfall fuer Browser ohne Clipboard-API (aeltere WebViews).
    return new Promise((ok, nein) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
        document.body.appendChild(ta);
        ta.select();
        const gut = document.execCommand('copy');
        ta.remove();
        gut ? ok() : nein(new Error('copy'));
    });
}

async function kiAgentKopieren(btn) {
    // ZUERST kopieren, im selben Klick: die Kopier-Erlaubnis des Browsers haengt
    // an der Nutzergeste und waere nach einem Netzabruf evtl. verfallen.
    const kopiert = kiKopieren(kiAgentPrompt());
    try { localStorage.setItem(KI_WUNSCH, '1'); } catch (e) { /* ohne Merker */ }
    try {
        await kopiert;
    } catch (e) {
        showToast(L('Kopieren nicht erlaubt — gib dem Browser die Erlaubnis und versuch es erneut', 'Copying not allowed — allow it in your browser and try again'), 'error');
        return;
    }
    if (typeof mwlEvent === 'function') mwlEvent('ki_agent_kopiert', { status: kiStatus });
    document.querySelectorAll('.ki-copy').forEach(b => b.classList.add('is-copied'));
    const banner = document.getElementById('kiConnect');
    if (banner) banner.classList.add('is-done');
    setTimeout(() => document.querySelectorAll('.ki-copy').forEach(b => b.classList.remove('is-copied')), 2600);
    // Briefkasten im Hintergrund bereitstellen — der Agent soll gleich einwerfen koennen.
    if ((kiStatus === 'aus' || kiStatus === 'fremd') && derivedKey) kiEinschalten({ leise: true });
}

function kiBannerWeg() {
    try { localStorage.setItem(KI_BANNER_WEG, '1'); } catch (e) { /* dann eben nur fuer diese Sitzung */ }
    const el = document.getElementById('kiConnect');
    if (el) { el.hidden = true; el.innerHTML = ''; }
}

function kiRenderBanner() {
    const el = document.getElementById('kiConnect');
    if (!el) return;
    let weg = false;
    try { weg = localStorage.getItem(KI_BANNER_WEG) === '1'; } catch (e) { /* zeigen */ }
    // Nur solange noch nichts verbunden ist. Laeuft der Briefkasten, uebernimmt
    // die Inbox-Leiste diesen Platz.
    // Nach dem Kopieren bleibt der Hinweis mit „Fertig" stehen, auch wenn der
    // Briefkasten dabei angesprungen ist — sonst verschwaende er, bevor man liest.
    if (!el.hidden && el.classList.contains('is-done') && derivedKey) return;
    if (weg || !derivedKey || kiStatus === 'an' || kiStatus === 'fehler') { el.hidden = true; el.innerHTML = ''; delete el.dataset.gebaut; return; }
    if (el.dataset.gebaut === kiStatus && !el.hidden) return;
    el.dataset.gebaut = kiStatus;
    el.classList.remove('is-done');
    el.hidden = false;
    el.innerHTML =
        '<span class="ki-inbox-ico">' + KI_ICON + '</span>' +
        '<div class="ki-connect-text">' +
            '<p class="ki-connect-title">' + L('Verbinde dein Schatten-Berichtsheft mit deinem KI-Assistenten', 'Connect your shadow report book to your AI assistant') + '</p>' +
            '<p class="ki-connect-sub ki-connect-sub--vorher">' + L('Erzähl dem Assistenten, was passiert ist — er legt den Entwurf hier ab, du bestätigst.', 'Tell the assistant what happened — it drops the draft here, you confirm.') + '</p>' +
            '<p class="ki-connect-sub ki-connect-sub--nachher">' + L('Fertig. Füg den Text bei Claude, ChatGPT & Co. ein — den Rest richtet der Assistent selbst ein.', 'Done. Paste the text into Claude, ChatGPT & co. — the assistant sets up the rest.') + '</p>' +
        '</div>' +
        kiKopierKnopf('kiCopyBanner') +
        '<button type="button" class="ki-connect-x" onclick="kiBannerWeg()" aria-label="' + L('Hinweis ausblenden', 'Hide this') + '">' + KI_SCHLIESSEN + '</button>';
}

// Sucht den ersten JSON-Block im eingefuegten Text — Chatbots setzen gern
// Saetze und ```json-Zaeune drumherum.
function kiBlockAusText(t) {
    const s = String(t || '');
    for (let i = s.indexOf('{'); i !== -1; i = s.indexOf('{', i + 1)) {
        let tiefe = 0, inStr = false, esc = false;
        for (let j = i; j < s.length; j++) {
            const c = s[j];
            if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
            if (c === '"') inStr = true;
            else if (c === '{') tiefe++;
            else if (c === '}' && --tiefe === 0) {
                try {
                    const o = JSON.parse(s.slice(i, j + 1));
                    if (o && typeof o === 'object' && (o.myworklog_entwurf || o.beschreibung)) return o;
                } catch (e) { /* naechster Kandidat */ }
                break;
            }
        }
    }
    return null;
}

function kiEinfuegenOeffnen() {
    closeModal('kiModal');
    closeModal('kiInboxModal');
    const ta = document.getElementById('kiPasteText');
    ta.value = '';
    document.getElementById('kiPasteError').textContent = '';
    openModal('kiPasteModal');
    setTimeout(() => ta.focus(), 250);
}

function kiEinfuegenUebernehmen() {
    const o = kiBlockAusText(document.getElementById('kiPasteText').value);
    const err = document.getElementById('kiPasteError');
    if (!o) {
        err.textContent = L('Kein Entwurf gefunden. Füg die ganze Antwort des Chats ein, samt JSON-Block.', 'No draft found. Paste the whole chat answer including the JSON block.');
        return;
    }
    const d = kiNormalisieren(o);
    if (d.beschreibung.length < 10) {
        err.textContent = L('Im Block fehlt die Beschreibung.', 'The block has no description.');
        return;
    }
    closeModal('kiPasteModal');
    kiEntwurfInsFormular(d, { draftId: null, client: '' });
}

// ── Oberflaeche ───────────────────────────────────────────────────────────
const KI_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"></path><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>';
const KI_SCHLIESSEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';

function kiModalShell(id, titel, breite) {
    if (document.getElementById(id)) return;
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.id = id;
    el.innerHTML = '<div class="modal" style="max-width:' + breite + 'px;"><div class="modal-head"><h2>' + titel + '</h2>' +
        '<button class="modal-close" onclick="closeModal(\'' + id + '\')" aria-label="' + L('Schließen', 'Close') + '">' + KI_SCHLIESSEN + '</button></div>' +
        '<div class="modal-body" id="' + id + 'Body"></div></div>';
    document.body.appendChild(el);
}

function kiModalsAnlegen() {
    kiModalShell('kiModal', L('KI-Entwürfe', 'AI drafts'), 540);
    kiModalShell('kiInboxModal', L('Entwürfe zum Prüfen', 'Drafts to review'), 600);
    kiModalShell('kiPasteModal', L('Entwurf aus einem Chat einfügen', 'Paste a draft from a chat'), 540);
    document.getElementById('kiPasteModalBody').innerHTML =
        '<p class="vc-lead">' + L('Füg die Antwort deines Chats ein. Gesucht wird der JSON-Block aus der Vorlage; Text drumherum stört nicht.',
            'Paste your chat\'s answer. The JSON block from the template is picked out; text around it does no harm.') + '</p>' +
        '<textarea class="form-textarea ki-paste" id="kiPasteText" rows="9" spellcheck="false" aria-label="' + L('Antwort des Chats', 'Chat answer') + '"></textarea>' +
        '<div class="lock-error" id="kiPasteError"></div>' +
        '<div class="modal-footer">' +
            '<button class="btn" onclick="kiVorlageKopieren()">' + L('Vorlage kopieren', 'Copy template') + '</button>' +
            '<button class="btn btn-cta" onclick="kiEinfuegenUebernehmen()">' + L('Prüfen', 'Review') + '</button>' +
        '</div>';
}

function kiOeffnen() {
    const m = document.getElementById('vaultMenu');
    if (m) m.classList.remove('open');
    kiRender();
    openModal('kiModal');
}

function kiInboxOeffnen() {
    kiRender();
    openModal('kiInboxModal');
}

async function kiVerbindungTrennen(clientId) {
    const v = kiVerbindungen.find(x => x.client_id === clientId);
    const ok = await window.mwlConfirm({
        title: L('Verbindung trennen?', 'Disconnect?'),
        text: L((v && v.client_name ? v.client_name : 'Der Assistent') + ' kann danach nichts mehr einwerfen, bis du ihn neu verbindest.',
                (v && v.client_name ? v.client_name : 'The assistant') + ' can no longer drop anything in until you connect it again.'),
        confirmText: L('Trennen', 'Disconnect'),
    });
    if (!ok) return;
    try {
        await window.vcKi.verbindungTrennen(clientId);
        kiVerbindungen = kiVerbindungen.filter(x => x.client_id !== clientId);
        showToast(L('Verbindung getrennt', 'Disconnected'), 'info');
    } catch (e) {
        showToast(L('Trennen fehlgeschlagen', 'Disconnecting failed'), 'error');
    }
    kiRender();
}

async function kiAdresseKopieren() {
    try {
        await navigator.clipboard.writeText(KI_MCP_URL);
        showToast(L('Adresse kopiert', 'Address copied'), 'success');
    } catch (e) {
        showToast(L('Kopieren nicht erlaubt', 'Copying not allowed'), 'error');
    }
}

function kiRenderEinrichten() {
    const body = document.getElementById('kiModalBody');
    if (!body) return;
    const facts =
        '<ul class="vc-facts">' +
        '<li>' + KI_ICON + '<span>' + L('Erzähl einem KI-Assistenten, was passiert ist. Er fragt nach, was fehlt, und legt einen Entwurf in diesen Briefkasten.',
            'Tell an AI assistant what happened. It asks about what is missing and drops a draft into this mailbox.') + '</span></li>' +
        '<li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>' +
            L('Der Assistent kann nur einwerfen. Deine Einträge lesen, ändern oder löschen kann er nicht — der Server sieht nur verschlüsselte Entwürfe, aufschließen kann sie nur dieser Tresor.',
              'The assistant can only drop drafts in. It cannot read, change or delete your entries — the server only sees encrypted drafts, and only this vault can open them.') + '</span></li>' +
        '<li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle></svg><span>' +
            L('Ein Eintrag entsteht erst, wenn du den Entwurf hier prüfst und speicherst. Er trägt dann den Vermerk „mit KI formuliert".',
              'An entry only exists once you review and save the draft here. It is then marked "worded with AI".') + '</span></li>' +
        '</ul>';
    const paste =
        '<div class="ki-paste-row"><div><p class="ki-sub">' + L('Ohne Verbindung', 'Without a connection') + '</p><p class="ki-small">' +
        L('Geht mit jedem Chat (auch Gemini) und ohne Konto: Vorlage in den Chat kopieren, Antwort hier einfügen.',
          'Works with any chat (Gemini too) and without an account: copy the template into the chat, paste the answer here.') + '</p></div>' +
        '<div class="ki-paste-actions"><button class="btn btn-sm" onclick="kiVorlageKopieren()">' + L('Vorlage kopieren', 'Copy template') + '</button>' +
        '<button class="btn btn-sm" onclick="kiEinfuegenOeffnen()">' + L('Antwort einfügen', 'Paste answer') + '</button></div></div>';

    // Der eine Knopf steht in jedem Zustand gleich da; was er nebenbei tun muss
    // (Briefkasten einschalten, alten Schluessel ersetzen), erledigt kiAgentKopieren.
    const knopf = '<div class="ki-copy-row">' + kiKopierKnopf('kiCopyModal') + '</div>' +
        '<p class="ki-small ki-copy-hint">' + L('Der Text sagt deinem Assistenten, wie er sich verbindet. Du bestätigst danach nur noch einmal mit deinem MyWorkLog-Konto.',
            'The text tells your assistant how to connect. Afterwards you only confirm once with your MyWorkLog account.') + '</p>';
    const selbst = '<details class="ki-self"><summary>' + L('Lieber selbst einrichten', 'Set it up yourself') + '</summary>' +
        '<div class="ki-url"><code>' + KI_MCP_URL + '</code><button class="btn btn-sm" onclick="kiAdresseKopieren()">' + L('Kopieren', 'Copy') + '</button></div>' +
        '<ol class="ki-steps">' +
            '<li><b>Claude</b> — ' + L('Einstellungen → Connectors → eigenen Connector hinzufügen, Adresse einfügen. Danach meldest du dich mit deinem MyWorkLog-Konto an und erlaubst den Zugriff.',
                'Settings → Connectors → add custom connector, paste the address. Then sign in with your MyWorkLog account and allow access.') + '</li>' +
            '<li><b>Claude Code</b> — <code>claude mcp add --transport http myworklog ' + KI_MCP_URL + '</code></li>' +
            '<li>' + L('Andere Apps mit MCP-Unterstützung: dieselbe Adresse als Remote-Server eintragen.', 'Other apps with MCP support: add the same address as a remote server.') + '</li>' +
        '</ol></details>';

    let teil = '';
    if (kiStatus === 'fehler') {
        teil = '<div class="vc-note">' + L('Der Briefkasten ist gerade nicht erreichbar. Prüf deine Verbindung und versuch es erneut.',
            'The mailbox cannot be reached right now. Check your connection and try again.') + '</div>' +
            '<div class="modal-footer"><button class="btn btn-cta" onclick="kiInboxAktualisieren()">' + L('Erneut versuchen', 'Try again') + '</button></div>';
    } else if (kiStatus !== 'an') {
        teil = knopf + selbst +
            (kiStatus === 'konto'
                ? '<div class="vc-note">' + L('Du bist auf diesem Gerät nicht angemeldet. Das macht nichts: Beim Verbinden fragt dein Assistent nach deinem MyWorkLog-Konto. Damit Entwürfe hier ankommen, melde dich danach auch hier an.',
                    'You are not signed in on this device. That is fine: your assistant asks for your MyWorkLog account when connecting. For drafts to arrive here, sign in here afterwards too.') +
                  ' <a href="' + L('/', '/en/') + '?cloud=login&amp;back=schatten-berichtsheft">' + L('Jetzt anmelden', 'Sign in now') + '</a></div>'
                : '') +
            (kiStatus === 'fremd'
                ? '<div class="vc-note">' + L('Der Briefkasten gehört zu einem früheren Tresor. Beim Kopieren wird er neu eingerichtet; liegende Entwürfe sind mit dem alten Schlüssel verschlossen und werden gelöscht.',
                    'The mailbox belongs to an earlier vault. Copying sets it up again; waiting drafts are locked with the old key and will be deleted.') + '</div>'
                : '');
    } else {
        teil = knopf + selbst +
            (kiVerbindungen.length
                ? '<p class="ki-sub">' + L('Verbundene Assistenten', 'Connected assistants') + '</p><ul class="ki-conn">' +
                    kiVerbindungen.map(v => '<li><span>' + escapeHtml(v.client_name || v.client_id) + '<small>' +
                        L(' seit ', ' since ') + formatDate(String(v.created_at || '').slice(0, 10)) + '</small></span>' +
                        '<button class="btn btn-sm" onclick="kiVerbindungTrennen(\'' + escapeHtml(v.client_id) + '\')">' + L('Trennen', 'Disconnect') + '</button></li>').join('') + '</ul>'
                : '') +
            '<div class="modal-footer"><button class="btn btn-danger" onclick="kiAusschalten()">' + L('Ausschalten', 'Switch off') + '</button></div>';
    }
    body.innerHTML = '<p class="vc-lead">' + L('Halte Vorfälle fest, solange sie frisch sind: im Gespräch mit einem KI-Assistenten statt abends aus dem Gedächtnis.',
        'Record incidents while they are fresh: in a conversation with an AI assistant instead of from memory in the evening.') + '</p>' +
        facts + teil + paste;
}

function kiRenderInbox() {
    const body = document.getElementById('kiInboxModalBody');
    if (!body) return;
    if (!kiEntwuerfe.length) {
        body.innerHTML = '<p class="vc-lead">' + L('Keine Entwürfe. Sobald ein verbundener Assistent etwas einwirft, liegt es hier.', 'No drafts. As soon as a connected assistant drops something in, it shows up here.') + '</p>';
        return;
    }
    body.innerHTML = '<ul class="ki-list">' + kiEntwuerfe.map(e => {
        const wann = new Date(e.created_at).toLocaleString(mwlLocale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        if (e.fehler) {
            return '<li class="ki-item ki-item--kaputt"><p class="ki-item-meta">' + wann + '</p><p class="ki-item-text">' +
                L('Dieser Entwurf lässt sich nicht entschlüsseln.', 'This draft cannot be decrypted.') + '</p>' +
                '<div class="ki-item-actions"><button class="btn btn-sm" onclick="kiEntwurfVerwerfen(\'' + e.id + '\')">' + L('Verwerfen', 'Discard') + '</button></div></li>';
        }
        const d = e.daten;
        const cat = getCategory(d.kategorie);
        const vorschau = d.beschreibung.length > 220 ? d.beschreibung.slice(0, 220) + ' …' : d.beschreibung;
        return '<li class="ki-item">' +
            '<div class="ki-item-head"><span class="entry-category"><span class="cat-icon">' + categoryIcon(cat) + '</span>' + escapeHtml(cat.label) + '</span>' +
            '<span class="entry-severity sev-' + d.schwere + '">' + (SEVERITY_LABELS[d.schwere] || d.schwere) + '</span></div>' +
            '<p class="ki-item-meta">' + (d.datum ? L('Passiert ', 'Happened ') + formatDate(d.datum) + ' · ' : '') + L('eingeworfen ', 'dropped in ') + wann +
                (d.client ? ' · ' + L('laut Client: ', 'client says: ') + escapeHtml(d.client) : '') + '</p>' +
            '<p class="ki-item-text">' + escapeHtml(vorschau) + '</p>' +
            '<div class="ki-item-actions">' +
                '<button class="btn btn-sm btn-cta" onclick="kiEntwurfOeffnen(\'' + e.id + '\')">' + L('Prüfen und übernehmen', 'Review and keep') + '</button>' +
                '<button class="btn btn-sm" onclick="kiEntwurfVerwerfen(\'' + e.id + '\')">' + L('Verwerfen', 'Discard') + '</button>' +
            '</div></li>';
    }).join('') + '</ul>' +
    '<p class="ki-small">' + L('Nicht übernommene Entwürfe werden nach 30 Tagen gelöscht.', 'Drafts not kept are deleted after 30 days.') + '</p>';
}

function kiRenderLeiste() {
    const el = document.getElementById('kiInbox');
    if (!el) return;
    const n = kiEntwuerfe.length;
    if (kiStatus !== 'an' || !n) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<span class="ki-inbox-ico">' + KI_ICON + '</span>' +
        '<span class="ki-inbox-text">' + (n === 1
            ? L('Ein Entwurf wartet auf deine Prüfung', 'One draft is waiting for your review')
            : L(n + ' Entwürfe warten auf deine Prüfung', n + ' drafts are waiting for your review')) + '</span>' +
        '<button class="btn btn-sm" onclick="kiInboxOeffnen()">' + L('Ansehen', 'View') + '</button>';
}

function kiRenderMenue() {
    const st = document.getElementById('kiMenuState');
    if (!st) return;
    const an = kiStatus === 'an';
    st.textContent = an ? (kiEntwuerfe.length ? String(kiEntwuerfe.length) : L('An', 'On')) : L('Aus', 'Off');
    st.classList.toggle('is-on', an);
}

function kiRender() {
    kiRenderMenue();
    kiRenderBanner();
    kiRenderLeiste();
    kiRenderEinrichten();
    kiRenderInbox();
}

// Neu holen, wenn man vom Chat zurueck in den Tab kommt — genau dann liegt
// meist ein frischer Entwurf da. Hoechstens alle 20 s, und nur bei offenem Tresor.
let kiLetzterAbruf = 0;
document.addEventListener('visibilitychange', () => {
    if (document.hidden || kiStatus !== 'an' || !derivedKey) return;
    if (Date.now() - kiLetzterAbruf < 20000) return;
    kiLetzterAbruf = Date.now();
    kiEntwuerfeHolen().then(kiRender).catch(() => {});
});

kiModalsAnlegen();
