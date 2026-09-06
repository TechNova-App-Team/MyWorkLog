// ═══ CORE: P2P-SYNC ═══
    // === NEUE FUNKTIONEN: TEAM FEATURES ===

    /**
     * Lädt Team-Settings aus data.settings.team und füllt die UI
     */
    function loadTeamSettings() {
        if (!data.settings.team) {
            data.settings.team = {
                enabled: false,
                name: '',
                teamId: '',
                features: {
                    sharedDashboard: false,
                    notifications: false,
                    timeSheetSync: false,
                    workloadAnalytics: false,
                    teamAlerts: false
                },
                privacy: {
                    profileVisibility: 'private',
                    shareWorkHours: false,
                    shareTimeOff: false
                }
            };
        }

        const team = data.settings.team;
        
        // P2P Sync Settings (nur diese existieren noch)
        const autoSyncEl = document.getElementById('p2pAutoSync');
        const offlineQueueEl = document.getElementById('p2pOfflineQueue');
        
        if (autoSyncEl) autoSyncEl.checked = team.autoSync !== false;
        if (offlineQueueEl) offlineQueueEl.checked = team.offlineQueue !== false;

        // Verschluesselung ist kein Schalter, sondern ein Zustand: sie laeuft oder
        // sie laeuft nicht, und der Nutzer erfaehrt welches von beidem. Vorher
        // stand hier ein Haken "Ende-zu-Ende verschluesseln", der nur sich selbst
        // setzte — gelesen hat ihn nie jemand wieder.
        p2pRenderCryptoState();
    }

    // ========== === P2P WebRTC SYNC SYSTEM v2.0 === ==========
    // Vollständig serverless, 3-Schritt Handshake mit gzip-komprimierten Codes
    // Chunked Transfer, Delta Sync, Heartbeat, Conflict Resolution

    // Global P2P State
    let p2pSync = {
        peer: null,
        role: null, // 'host' | 'client'
        connected: false,
        crypto: { keyPair: null, pub: null, key: null, sas: null, active: false },
        syncStats: { sent: 0, received: 0, merged: 0 },
        heartbeatInterval: null,
        lastSyncTime: null,
        deviceId: localStorage.getItem('p2p_deviceId') || (() => {
            const id = 'dev_' + crypto.randomUUID().substring(0, 8);
            localStorage.setItem('p2p_deviceId', id);
            return id;
        })()
    };

    // === SIMPLEPEER LAZY-LOADER ===
    function _loadSimplePeer(callback) {
        if (typeof SimplePeer !== 'undefined') { callback(); return; }
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/simple-peer@9/simplepeer.min.js';
        s.onload = callback;
        s.onerror = function() { console.error('[P2P] SimplePeer konnte nicht geladen werden'); };
        document.head.appendChild(s);
    }

    // === COMPRESSION UTILITIES ===
    async function p2pCompress(obj) {
        try {
            const json = JSON.stringify(obj);
            const blob = new Blob([json]);
            const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
            const compressed = await new Response(stream).arrayBuffer();
            const bytes = new Uint8Array(compressed);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        } catch (e) {
            console.warn('Compression failed, using raw base64:', e);
            return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
        }
    }

    async function p2pDecompress(str) {
        try {
            const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
            const binary = atob(padded);
            const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
            const blob = new Blob([bytes]);
            const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
            const text = await new Response(stream).text();
            return JSON.parse(text);
        } catch (e) {
            console.warn('Decompression failed, trying raw base64:', e);
            try {
                return JSON.parse(decodeURIComponent(escape(atob(str))));
            } catch (e2) {
                return JSON.parse(atob(str));
            }
        }
    }

    // === ENDE-ZU-ENDE-VERSCHLUESSELUNG ===
    // WebRTC verschluesselt den DataChannel bereits per DTLS. Was DTLS NICHT
    // abdeckt, ist der Kopplungscode: wer ihn unterwegs abfaengt und durch einen
    // eigenen ersetzt, sitzt sauber in der Mitte — und beide Seiten sehen eine
    // gueltige, "verschluesselte" Verbindung. Deshalb hier eine zweite Schicht:
    // ephemeres ECDH ueber die Codes, AES-GCM auf jeder Nachricht, und eine
    // sechsstellige Pruefziffer aus dem gemeinsamen Geheimnis. Stimmt sie auf
    // beiden Geraeten ueberein, war niemand dazwischen — faelschen koennte ein
    // Dritter sie nur, wenn er den Schluessel kennt, und den hat er nicht.
    const P2P_KDF_KEY = 'MyWorkLog-P2P-Key-v1';
    const P2P_KDF_SAS = 'MyWorkLog-P2P-SAS-v1';

    // crypto.subtle gibt es NUR in sicheren Kontexten (https + localhost). Auf
    // http://192.168.x.x im Heimnetz ist es schlicht undefined — dann laeuft die
    // Uebertragung unverschluesselt, und genau das muss dann auch dranstehen.
    function p2pCryptoAvailable() {
        return typeof crypto !== 'undefined' && !!crypto.subtle && typeof crypto.subtle.deriveBits === 'function';
    }

    function p2pBytesToB64(bytes) {
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
    }

    function p2pB64ToBytes(str) {
        return Uint8Array.from(atob(str), c => c.charCodeAt(0));
    }

    function p2pCryptoReset() {
        p2pSync.crypto = { keyPair: null, pub: null, key: null, sas: null, active: false };
    }

    // Eigenes Schluesselpaar. Der oeffentliche Teil (65 Byte roh) reist im
    // Kopplungscode mit, der private verlaesst das Geraet nie — deshalb
    // extractable = false. Oeffentliche Schluessel sind laut WebCrypto-Spec
    // trotzdem immer exportierbar.
    async function p2pCryptoInit() {
        if (!p2pCryptoAvailable()) return null;
        try {
            const pair = await crypto.subtle.generateKey(
                { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']
            );
            const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
            p2pSync.crypto.keyPair = pair;
            p2pSync.crypto.pub = p2pBytesToB64(raw);
            return p2pSync.crypto.pub;
        } catch (e) {
            console.warn('[P2P] Schluesselpaar fehlgeschlagen:', e);
            p2pCryptoReset();
            return null;
        }
    }

    // Gemeinsames Geheimnis, daraus per HKDF zwei Dinge: Sitzungsschluessel und
    // Pruefziffer. Das Salz enthaelt beide oeffentlichen Schluessel in SORTIERTER
    // Reihenfolge — sonst rechnen Host und Client verschiedene Salze und damit
    // verschiedene Schluessel, und nichts entschluesselt mehr.
    async function p2pCryptoDerive(peerPubB64) {
        if (!p2pCryptoAvailable() || !p2pSync.crypto.keyPair || !peerPubB64) return false;
        try {
            const enc = new TextEncoder();
            const peerKey = await crypto.subtle.importKey(
                'raw', p2pB64ToBytes(peerPubB64),
                { name: 'ECDH', namedCurve: 'P-256' }, false, []
            );
            const shared = await crypto.subtle.deriveBits(
                { name: 'ECDH', public: peerKey }, p2pSync.crypto.keyPair.privateKey, 256
            );
            const base = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveBits', 'deriveKey']);
            const salt = enc.encode([p2pSync.crypto.pub, peerPubB64].sort().join('|'));

            p2pSync.crypto.key = await crypto.subtle.deriveKey(
                { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode(P2P_KDF_KEY) },
                base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
            );

            const sasBits = await crypto.subtle.deriveBits(
                { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode(P2P_KDF_SAS) },
                base, 32
            );
            p2pSync.crypto.sas = String(new DataView(sasBits).getUint32(0) % 1000000).padStart(6, '0');
            p2pSync.crypto.active = true;
            console.log('[P2P] Ende-zu-Ende-Schluessel steht. Pruefziffer:', p2pSync.crypto.sas);
            return true;
        } catch (e) {
            console.warn('[P2P] Schluesselableitung fehlgeschlagen:', e);
            p2pCryptoReset();
            return false;
        }
    }

    async function p2pEncrypt(msg) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const pt = new TextEncoder().encode(JSON.stringify(msg));
        const ct = new Uint8Array(await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv, tagLength: 128 }, p2pSync.crypto.key, pt
        ));
        return { e: 1, i: p2pBytesToB64(iv), c: p2pBytesToB64(ct) };
    }

    async function p2pDecrypt(env) {
        const pt = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: p2pB64ToBytes(env.i), tagLength: 128 },
            p2pSync.crypto.key, p2pB64ToBytes(env.c)
        );
        return JSON.parse(new TextDecoder().decode(pt));
    }

    // Zeigt den WAHREN Zustand — in den Einstellungen und im Assistenten.
    function p2pRenderCryptoState() {
        const on = !!p2pSync.crypto.active;
        const possible = p2pCryptoAvailable();

        const badge = document.getElementById('p2pCryptoBadge');
        const sub = document.getElementById('p2pCryptoSub');
        // Vier Zustaende, und 'Bereit' ist NICHT derselbe wie 'verbunden, aber
        // ohne Verschluesselung'. Genau diese Unterscheidung hat vorher gefehlt.
        if (badge) {
            badge.textContent = on ? p2pL('Aktiv', 'On')
                : !possible ? p2pL('Nicht möglich', 'Unavailable')
                : p2pSync.connected ? p2pL('Nicht aktiv', 'Off')
                : p2pL('Bereit', 'Ready');
            badge.dataset.state = on ? 'on' : (possible && !p2pSync.connected) ? '' : 'warn';
        }
        if (sub) {
            sub.textContent = on
                ? p2pL('AES-256-GCM. Der Schlüssel entsteht auf beiden Geräten und wird nie übertragen.',
                       'AES-256-GCM. The key is created on both devices and never sent.')
                : !possible
                    ? p2pL('Nur über HTTPS verfügbar. Die Übertragung bleibt durch WebRTC geschützt.',
                           'Requires HTTPS. The transfer stays protected by WebRTC.')
                : p2pSync.connected
                    ? p2pL('Die Gegenstelle unterstützt sie nicht. Die Übertragung bleibt durch WebRTC geschützt.',
                           'The other device does not support it. The transfer stays protected by WebRTC.')
                    : p2pL('Wird beim Verbinden ausgehandelt.', 'Negotiated when you connect.');
        }

        const block = document.getElementById('p2pSasBlock');
        const code = document.getElementById('p2pSasCode');
        const foot = document.getElementById('p2pSasFoot');
        if (!block) return;
        if (on && p2pSync.crypto.sas) {
            block.style.display = '';
            block.dataset.state = 'on';
            if (code) code.textContent = p2pSync.crypto.sas.slice(0, 3) + ' ' + p2pSync.crypto.sas.slice(3);
            if (foot) foot.textContent = p2pL(
                'Auf beiden Geräten muss dieselbe Zahl stehen. Weicht sie ab, trenne die Verbindung.',
                'Both devices must show the same number. If they differ, disconnect.');
        } else if (p2pSync.connected) {
            block.style.display = '';
            block.dataset.state = 'off';
            if (code) code.textContent = '— — —';
            if (foot) foot.textContent = p2pL(
                'Keine zusätzliche Verschlüsselung: die Gegenstelle nutzt eine ältere Version oder kein HTTPS. Die Übertragung läuft weiterhin direkt und WebRTC-gesichert.',
                'No extra encryption: the other device runs an older version or no HTTPS. The transfer still runs directly and WebRTC-secured.');
        } else {
            block.style.display = 'none';
        }
    }

    // === WIZARD UI CONTROL ===
    function openP2PWizard() {
        // Schließe Settings Modal zuerst, damit P2P Modal oben ist
        closeSettings();
        const modal = document.getElementById('p2pWizardModal');
        modal.classList.add('active');
        p2pWizardReset();
    }

    function closeP2PWizard() {
        document.getElementById('p2pWizardModal').classList.remove('active');
    }

    function p2pWizardReset() {
        document.getElementById('p2pWizStep1').style.display = '';
        document.getElementById('p2pWizStep2Host').style.display = 'none';
        document.getElementById('p2pWizStep2Client').style.display = 'none';
        document.getElementById('p2pWizStep3').style.display = 'none';
        document.getElementById('p2pStep1Dot').className = 'p2p-step-dot active';
        document.getElementById('p2pStep2Dot').className = 'p2p-step-dot';
        document.getElementById('p2pStep3Dot').className = 'p2p-step-dot';
        document.getElementById('p2pWizardSubtitle').textContent = 'Rolle wählen';

        // Ein Schluessel gehoert zu GENAU einer Verbindung. Bleibt ein alter liegen,
        // verschluesselt der zweite Versuch gegen ein Geheimnis, das die neue
        // Gegenstelle nie hatte — und nichts geht mehr auf.
        p2pCryptoReset();
        p2pRenderCryptoState();

        // Auch die Zwischenzustände zurücksetzen — sonst zeigt ein zweiter Versuch
        // nach einem Fehlschlag noch den alten Code, die alte Statuszeile usw.
        const clear = (id, prop, val) => { const el = document.getElementById(id); if (el) el[prop] = val; };
        const hide  = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
        const show  = (id) => { const el = document.getElementById(id); if (el) el.style.display = ''; };

        show('p2pHostSpinner');
        hide('p2pHostReady');
        hide('p2pOfferCodeBox');
        hide('p2pClientGathering');
        hide('p2pAnswerCodeBox');
        hide('p2pHostConnecting');
        clear('p2pOfferCode', 'value', '');
        clear('p2pAnswerCode', 'value', '');
        clear('p2pOfferInput', 'value', '');
        clear('p2pAnswerInput', 'value', '');
        clear('p2pHostIceSummary', 'textContent', '');
        clear('p2pClientIceSummary', 'textContent', '');
        clear('p2pLogContent', 'textContent', '');
        ['p2pHostGatherBar', 'p2pClientGatherBar', 'p2pSyncBar'].forEach(id => {
            const el = document.getElementById(id); if (el) el.style.width = '0%';
        });

        const cBtn = document.getElementById('p2pClientConnectBtn');
        if (cBtn) { cBtn.disabled = false; cBtn.textContent = 'Code verarbeiten'; }
        const hBtn = document.getElementById('p2pHostConnectBtn');
        if (hBtn) { hBtn.disabled = false; hBtn.textContent = 'Verbindung herstellen'; hBtn.style.opacity = '1'; hBtn.style.cursor = 'pointer'; }

        p2pSync.offerGenerated = false;
        p2pSync.answerGenerated = false;
        p2pSync.answerApplied = false;
        if (p2pSync._connectBarInterval) { clearInterval(p2pSync._connectBarInterval); p2pSync._connectBarInterval = null; }
    }

    function p2pShowStep(step) {
        document.getElementById('p2pWizStep1').style.display = 'none';
        document.getElementById('p2pWizStep2Host').style.display = 'none';
        document.getElementById('p2pWizStep2Client').style.display = 'none';
        document.getElementById('p2pWizStep3').style.display = 'none';

        const dots = ['p2pStep1Dot', 'p2pStep2Dot', 'p2pStep3Dot'];
        dots.forEach((d, i) => {
            const el = document.getElementById(d);
            if (i < step - 1) el.className = 'p2p-step-dot done';
            else if (i === step - 1) el.className = 'p2p-step-dot active';
            else el.className = 'p2p-step-dot';
        });
    }

    function p2pLog(msg) {
        const logEl = document.getElementById('p2pLogContent');
        if (!logEl) return;
        const time = new Date().toLocaleTimeString(mwlLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const line = document.createElement('div');
        line.style.marginBottom = '3px';
        line.textContent = `[${time}] ${msg}`;
        logEl.appendChild(line);
        const container = document.getElementById('p2pSyncLog');
        if (container) container.scrollTop = container.scrollHeight;
    }

    function p2pUpdateProgress(percent, status) {
        const bar = document.getElementById('p2pSyncBar');
        const pct = document.getElementById('p2pSyncPercent');
        const stat = document.getElementById('p2pSyncStatus');
        if (bar) bar.style.width = percent + '%';
        if (pct) pct.textContent = Math.round(percent) + '%';
        if (stat) stat.textContent = status;
    }

    function p2pUpdateStats() {
        const els = {
            sent: document.getElementById('p2pStatSent'),
            received: document.getElementById('p2pStatReceived'),
            merged: document.getElementById('p2pStatMerged')
        };
        if (els.sent) els.sent.textContent = p2pSync.syncStats.sent;
        if (els.received) els.received.textContent = p2pSync.syncStats.received;
        if (els.merged) els.merged.textContent = p2pSync.syncStats.merged;
    }

    function p2pUpdateConnectionUI(connected) {
        const statusEl = document.getElementById('p2pStatus');
        const dotEl = document.getElementById('p2pStatusDot');
        const peersEl = document.getElementById('connectedPeers');
        const quickEl = document.getElementById('p2pQuickActions');
        const lastSyncEl = document.getElementById('p2pLastSync');

        // Farben kommen aus dem CSS (data-state), nicht aus Inline-Styles —
        // sonst kleben Hex-Werte im JS und folgen dem Theme nicht.
        if (connected) {
            if (statusEl) statusEl.textContent = 'Verbunden';
            if (dotEl) dotEl.dataset.state = 'on';
            if (peersEl) { peersEl.textContent = '1 Gerät'; peersEl.dataset.state = 'on'; }
            if (quickEl) quickEl.style.display = 'grid';
        } else {
            if (statusEl) statusEl.textContent = 'Nicht verbunden';
            if (dotEl) dotEl.dataset.state = '';
            if (peersEl) { peersEl.textContent = 'Offline'; peersEl.dataset.state = ''; }
            if (quickEl) quickEl.style.display = 'none';
        }

        if (p2pSync.lastSyncTime && lastSyncEl) {
            lastSyncEl.style.display = '';
            const timeEl = document.getElementById('p2pLastSyncTime');
            if (timeEl) timeEl.textContent = new Date(p2pSync.lastSyncTime).toLocaleString(mwlLocale());
        }
    }

    // === ICE CONFIG (shared) ===
    // 🔴 Jeder Eintrag hier kostet Wartezeit: mit trickle:false gibt SimplePeer den
    // Code ERST raus, wenn das ICE-Gathering über ALLE Server durch ist. Ein Ziel,
    // das nicht antwortet, blockiert den kompletten Handshake.
    // Gemessen (Chrome, gathering bis 'complete'):
    //   leer .......................... 0.1s
    //   nur Google-STUN ............... 0.1s
    //   metered.ca (5 Einträge) ....... 0.3s
    //   freeturn.net (3 Einträge) .... 22.2s   ← deshalb entfernt
    // Neue Server nur nach derselben Messung aufnehmen (p2pMeasureIceServers()).
    function p2pGetIceConfig() {
        return {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun.cloudflare.com:3478' },
                { urls: 'stun:stun.relay.metered.ca:80' },
                {
                    urls: 'turn:global.relay.metered.ca:80',
                    username: 'e8dd65b92a0d1172e8810b28',
                    credential: 'zHCzO/N6+Ogv7jnq'
                },
                {
                    urls: 'turn:global.relay.metered.ca:80?transport=tcp',
                    username: 'e8dd65b92a0d1172e8810b28',
                    credential: 'zHCzO/N6+Ogv7jnq'
                },
                {
                    urls: 'turn:global.relay.metered.ca:443',
                    username: 'e8dd65b92a0d1172e8810b28',
                    credential: 'zHCzO/N6+Ogv7jnq'
                },
                {
                    urls: 'turns:global.relay.metered.ca:443?transport=tcp',
                    username: 'e8dd65b92a0d1172e8810b28',
                    credential: 'zHCzO/N6+Ogv7jnq'
                }
            ],
            iceCandidatePoolSize: 2
        };
    }

    // Obergrenze fürs ICE-Gathering. Läuft die ab, wird der Code aus der bis dahin
    // gesammelten localDescription gebaut statt weiter auf 'complete' zu warten.
    const P2P_GATHER_TIMEOUT = 5000;
    // Obergrenze für den Verbindungsaufbau nach dem Antwort-Code. ICE meldet bei
    // striktem NAT oft weder 'connected' noch 'failed' — ohne Limit hängt die UI.
    const P2P_CONNECT_TIMEOUT = 25000;

    // Verbindungsversuch abbrechen und die UI zurück in einen bedienbaren Zustand
    // bringen (vorher blieb der Button für immer deaktiviert).
    function p2pAbortConnect(reason) {
        const diag = p2pSync.iceDiag || { host: 0, srflx: 0, relay: 0 };
        const connectBtn = document.getElementById('p2pHostConnectBtn');
        if (connectBtn) {
            connectBtn.disabled = false;
            connectBtn.textContent = 'Erneut versuchen';
            connectBtn.style.opacity = '1';
            connectBtn.style.cursor = 'pointer';
        }
        const connectingDiv = document.getElementById('p2pHostConnecting');
        if (connectingDiv) connectingDiv.style.display = 'none';
        p2pSync.answerApplied = false; // Retry erlauben

        p2pLog('Abbruch: ' + reason);
        showCustomMessage('Verbindung fehlgeschlagen',
            reason + '. ' + (diag.relay
                ? 'Ein Relay war verfügbar, die Gegenstelle war aber nicht erreichbar. Sind beide Codes frisch und vom richtigen Gerät?'
                : 'Es stand kein Relay-Server bereit, deshalb geht es nur direkt — dafür müssen beide Geräte im selben Netzwerk sein. Alternativ VPN ausschalten.'),
            'error');
    }

    // Diagnose-Helfer: misst pro Server-Gruppe, wie lange Gathering braucht.
    // Konsole: await p2pMeasureIceServers()
    async function p2pMeasureIceServers(groups) {
        const list = groups || [
            ['leer', null],
            ['App-Config', p2pGetIceConfig().iceServers]
        ];
        const out = [];
        for (const [label, iceServers] of list) {
            const pc = new RTCPeerConnection(iceServers ? { iceServers } : undefined);
            pc.createDataChannel('probe');
            const t0 = Date.now();
            let done = false;
            await new Promise(async (res) => {
                const to = setTimeout(res, 40000);
                pc.onicecandidate = (e) => { if (!e.candidate) { done = true; clearTimeout(to); res(); } };
                try { await pc.setLocalDescription(await pc.createOffer()); } catch (e) { clearTimeout(to); res(); }
            });
            const cands = (pc.localDescription && pc.localDescription.sdp.match(/a=candidate:/g) || []).length;
            pc.close();
            out.push({ label, sekunden: ((Date.now() - t0) / 1000).toFixed(1), fertig: done, kandidaten: cands });
        }
        console.table(out);
        return out;
    }

    // === ICE DIAGNOSTICS ===
    function p2pAnalyzeSDP(sdp) {
        if (!sdp) return { host: 0, srflx: 0, relay: 0, total: 0 };
        const candidates = sdp.match(/a=candidate:.+/g) || [];
        const types = { host: 0, srflx: 0, relay: 0, total: candidates.length };
        candidates.forEach(c => {
            if (c.includes('typ relay')) types.relay++;
            else if (c.includes('typ srflx')) types.srflx++;
            else if (c.includes('typ host')) types.host++;
        });
        return types;
    }

    async function p2pTestTURN() {
        console.log('🧪 TURN Server Test gestartet...');
        p2pLog('Teste Relay-Server …');
        const config = p2pGetIceConfig();
        const pc = new RTCPeerConnection(config);
        pc.createDataChannel('turntest');

        const candidates = { host: 0, srflx: 0, relay: 0 };
        const relayDetails = [];

        return new Promise(async (resolve) => {
            const timeout = setTimeout(() => {
                pc.close();
                const result = { ...candidates, working: candidates.relay > 0, details: relayDetails };
                console.log('🧪 TURN Test Ergebnis:', result);
                p2pLog(result.working
                    ? `Relay OK: ${candidates.relay} Relay, ${candidates.srflx} STUN, ${candidates.host} lokal`
                    : `Kein Relay: ${candidates.srflx} STUN, ${candidates.host} lokal`);
                resolve(result);
            }, 8000);

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    const c = event.candidate.candidate;
                    if (c.includes('typ relay')) { candidates.relay++; relayDetails.push(c); }
                    else if (c.includes('typ srflx')) candidates.srflx++;
                    else if (c.includes('typ host')) candidates.host++;
                    console.log(`🧊 [TEST] ${c.includes('typ relay') ? '🔄 RELAY' : c.includes('typ srflx') ? '📡 STUN' : '🏠 HOST'}: ${c.substring(0, 80)}...`);
                }
                if (!event.candidate) {
                    clearTimeout(timeout);
                    pc.close();
                    const result = { ...candidates, working: candidates.relay > 0, details: relayDetails };
                    console.log('🧪 TURN Test Ergebnis:', result);
                    p2pLog(result.working
                        ? `Relay OK: ${candidates.relay} Relay, ${candidates.srflx} STUN, ${candidates.host} lokal`
                        : `Kein Relay: ${candidates.srflx} STUN, ${candidates.host} lokal`);
                    resolve(result);
                }
            };

            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
            } catch (e) {
                clearTimeout(timeout);
                pc.close();
                console.error('🧪 TURN Test Error:', e);
                p2pLog('Relay-Test fehlgeschlagen: ' + e.message);
                resolve({ ...candidates, working: false, error: e.message });
            }
        });
    }

    // === ICE-GATHERING: TIMEOUT + LIVE-FEEDBACK ===
    // Kern des Fixes. Mit trickle:false feuert SimplePeer 'signal' erst, wenn das
    // Gathering über ALLE ICE-Server durch ist — hängt einer, gibt es nie einen Code
    // und der User sieht endlos einen Spinner ("da passiert nix").
    // Deshalb: `publish` wird genau EINMAL aufgerufen, je nachdem was zuerst kommt —
    // SimplePeers 'signal' oder der Timeout (dann aus der bis dahin gefüllten
    // localDescription, die alle bereits gesammelten Kandidaten enthält).
    function p2pAwaitLocalDescription(peer, kind, publish) {
        const pc = peer._pc;
        const cands = { host: 0, srflx: 0, relay: 0 };
        const t0 = Date.now();
        let fired = false;

        function finish(signalData, viaTimeout) {
            if (fired || !signalData) return;
            fired = true;
            clearTimeout(timer);
            clearInterval(ticker);
            const diag = p2pAnalyzeSDP(signalData.sdp);
            // Der Timeout-Pfad liest die Kandidaten aus dem SDP; wenn dort (noch)
            // keine stehen, sind die live gezählten die ehrlichere Zahl.
            if (!diag.total && (cands.host + cands.srflx + cands.relay)) {
                diag.host = cands.host; diag.srflx = cands.srflx; diag.relay = cands.relay;
                diag.total = cands.host + cands.srflx + cands.relay;
            }
            publish(signalData, diag, viaTimeout, ((Date.now() - t0) / 1000).toFixed(1));
        }

        if (pc) {
            pc.addEventListener('icecandidate', (e) => {
                if (!e.candidate) return;
                const c = e.candidate.candidate || '';
                if (c.includes('typ relay')) cands.relay++;
                else if (c.includes('typ srflx')) cands.srflx++;
                else if (c.includes('typ host')) cands.host++;
            });
        }

        const ticker = setInterval(() => {
            p2pRenderGathering(kind, (Date.now() - t0) / 1000, cands);
        }, 200);
        p2pRenderGathering(kind, 0, cands);

        const timer = setTimeout(() => {
            const ld = pc && pc.localDescription;
            if (ld && ld.type) {
                console.warn('[P2P] ICE-Gathering nach ' + P2P_GATHER_TIMEOUT + 'ms nicht fertig — nutze die bisher gesammelten Kandidaten.');
                p2pLog('Gathering abgekürzt nach ' + (P2P_GATHER_TIMEOUT / 1000) + 's');
                finish({ type: ld.type, sdp: ld.sdp }, true);
            }
        }, P2P_GATHER_TIMEOUT);

        peer.on('signal', (signalData) => finish(signalData, false));
    }

    // Fortschritt während des Gatherings: echte Kandidatenzahl statt Fake-Balken.
    function p2pRenderGathering(kind, secs, cands) {
        const total = cands.host + cands.srflx + cands.relay;
        const el = document.getElementById(kind === 'offer' ? 'p2pHostGatherStatus' : 'p2pClientGatherStatus');
        if (el) {
            el.textContent = total
                ? 'Netzwerkwege gefunden: ' + total + '  ·  ' + secs.toFixed(1) + 's'
                : 'Suche Netzwerkwege …  ' + secs.toFixed(1) + 's';
        }
        const bar = document.getElementById(kind === 'offer' ? 'p2pHostGatherBar' : 'p2pClientGatherBar');
        if (bar) bar.style.width = Math.min(100, (secs * 1000 / P2P_GATHER_TIMEOUT) * 100) + '%';
    }

    // Sprach-Helfer für JS-erzeugte Texte (die statische i18n-Pipeline erfasst JS
    // nicht). Gleiches Muster wie L() in jobs.js, aber lokal — nicht auf die
    // Ladereihenfolge einer anderen Komponente verlassen.
    function p2pL(de, en) { return document.documentElement.lang === 'en' ? en : de; }

    // ICE-Zustände in Klartext. Rohnamen wie 'checking' sagen dem User nichts.
    // Direkt zweisprachig, weil der Wert in längere Strings eingesetzt wird
    // ("Netzwerk: …") — ein MAP-Eintrag greift dort nicht, der braucht den
    // ganzen Textknoten.
    function p2pIceLabel(state) {
        return ({
            'new':          p2pL('wird vorbereitet', 'getting ready'),
            'checking':     p2pL('Route wird gesucht', 'looking for a route'),
            'connected':    p2pL('verbunden', 'connected'),
            'completed':    p2pL('verbunden', 'connected'),
            'failed':       p2pL('fehlgeschlagen', 'failed'),
            'disconnected': p2pL('unterbrochen', 'interrupted'),
            'closed':       p2pL('geschlossen', 'closed')
        })[state] || state;
    }

    // Ein SDP ohne einen einzigen Kandidaten kann NIE eine Verbindung aufbauen.
    // Vorher wurde so ein toter Code trotzdem ausgegeben — der Gegenpart wartete
    // dann ewig. Jetzt: Klartext statt unbrauchbarem Code.
    function p2pReportNoCandidates(diag) {
        const msg = 'Der Browser hat keinen einzigen Netzwerkweg gefunden (0 Kandidaten). '
            + 'Ein Verbindungscode wäre wertlos. Häufige Ursachen: WebRTC ist im Browser '
            + 'oder per Erweiterung/Richtlinie deaktiviert, ein VPN blockiert es, oder das '
            + 'Netzwerk lässt UDP nicht zu.';
        console.error('[P2P] 0 ICE-Kandidaten — Abbruch.', diag);
        p2pLog('Abbruch: keine Netzwerkwege gefunden');
        showCustomMessage('Keine Verbindung möglich', msg, 'error');
    }

    // === STEP 1: HOST - Create Offer ===
    async function p2pStartHost() {
        p2pSync.role = 'host';
        p2pSync.offerGenerated = false;
        p2pSync.answerApplied = false;
        p2pSync.iceDiag = { host: 0, srflx: 0, relay: 0 };
        p2pShowStep(2);
        document.getElementById('p2pWizStep2Host').style.display = '';
        document.getElementById('p2pWizardSubtitle').textContent = 'Sendet · Code weitergeben';

        // Destroy old peer if exists
        if (p2pSync.peer) { try { p2pSync.peer.destroy(); } catch(e){} p2pSync.peer = null; }

        if (typeof SimplePeer === 'undefined') {
            _loadSimplePeer(function() { p2pStartHost(); });
            return;
        }

        console.log('🏗️ P2P Host: Erstelle Offer mit trickle:false...');

        const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            config: p2pGetIceConfig()
        });

        // WICHTIG: Erst Events registrieren, DANN peer zuweisen
        p2pSetupPeerEvents(peer);

        p2pAwaitLocalDescription(peer, 'offer', async (signalData, sdpDiag, viaTimeout, secs) => {
            if (p2pSync.offerGenerated) return;
            p2pSync.offerGenerated = true;

            console.log(`📡 Host: Offer nach ${secs}s (${viaTimeout ? 'Timeout-Pfad' : 'Gathering komplett'})`);
            console.log(`🧊 ICE: ${sdpDiag.total} total → Host: ${sdpDiag.host}, STUN: ${sdpDiag.srflx}, RELAY: ${sdpDiag.relay}`);
            p2pSync.iceDiag = sdpDiag;

            if (!sdpDiag.total) {
                document.getElementById('p2pHostSpinner').style.display = 'none';
                p2pReportNoCandidates(sdpDiag);
                return;
            }
            p2pLog(sdpDiag.relay
                ? sdpDiag.relay + ' Relay-Weg(e) verfügbar'
                : 'Kein Relay — Verbindung nur direkt oder im selben Netz');

            try {
                // Schluesselpaar VOR dem Code erzeugen — der oeffentliche Teil
                // reist als 'k' mit. Aeltere Fassungen kennen das Feld nicht und
                // ignorieren es stillschweigend.
                p2pCryptoReset();
                const ownPub = await p2pCryptoInit();

                const payload = {
                    v: 2,
                    t: 'offer',
                    s: signalData,
                    d: p2pSync.deviceId,
                    n: data.settings?.name || 'Gerät',
                    ts: Date.now()
                };
                if (ownPub) payload.k = ownPub;
                const compressed = await p2pCompress(payload);
                console.log(`📦 Offer komprimiert: ${JSON.stringify(signalData).length} → ${compressed.length} Zeichen`);

                document.getElementById('p2pHostSpinner').style.display = 'none';
                document.getElementById('p2pHostReady').style.display = '';
                document.getElementById('p2pOfferCodeBox').style.display = '';
                document.getElementById('p2pOfferCode').value = compressed;
                p2pSetIceSummary('p2pHostIceSummary', sdpDiag);
            } catch (e) {
                console.error('❌ Offer-Kompression fehlgeschlagen:', e);
                showCustomMessage('Code fehlgeschlagen', 'Der Einladungscode konnte nicht erstellt werden: ' + e.message, 'error');
            }
        });

        p2pSync.peer = peer;
    }

    // Kleine, ehrliche Zusammenfassung der Netzwerkwege unter dem Code.
    function p2pSetIceSummary(elId, diag) {
        const el = document.getElementById(elId);
        if (!el) return;
        const parts = [];
        if (diag.host) parts.push(diag.host + '× lokal');
        if (diag.srflx) parts.push(diag.srflx + '× über STUN');
        if (diag.relay) parts.push(diag.relay + '× über Relay');
        el.textContent = parts.length ? parts.join('  ·  ') : 'keine Netzwerkwege';
        el.dataset.warn = diag.relay ? '' : '1';
    }

    // === STEP 1: CLIENT - Paste Offer ===
    function p2pStartClient() {
        p2pSync.role = 'client';
        p2pShowStep(2);
        document.getElementById('p2pWizStep2Client').style.display = '';
        document.getElementById('p2pWizardSubtitle').textContent = 'Empfängt · Code eingeben';
    }

    // === STEP 2: CLIENT - Process Offer & Generate Answer ===
    async function p2pClientProcessOffer() {
        if (typeof SimplePeer === 'undefined') {
            _loadSimplePeer(function() { p2pClientProcessOffer(); });
            return;
        }

        const input = document.getElementById('p2pOfferInput').value.trim();
        if (!input) {
            showCustomMessage('Code fehlt', 'Füge den Einladungscode vom anderen Gerät ein.', 'error');
            return;
        }

        const btn = document.getElementById('p2pClientConnectBtn');
        btn.textContent = 'Verarbeite …';
        btn.disabled = true;

        try {
            const offerPayload = await p2pDecompress(input);
            console.log('📥 Client: Offer dekomprimiert. Version:', offerPayload.v, 'Type:', offerPayload.t);

            if (!offerPayload || !offerPayload.s || offerPayload.t !== 'offer') {
                throw new Error('Ungültiger Einladungscode (kein offer)');
            }

            if (!offerPayload.s.type || offerPayload.s.type !== 'offer') {
                throw new Error('SDP-Signal ist kein offer (type: ' + (offerPayload.s.type || 'undefined') + ')');
            }

            // Destroy old peer
            if (p2pSync.peer) { try { p2pSync.peer.destroy(); } catch(e){} p2pSync.peer = null; }

            // Schluesselaustausch — nur wenn die Gegenstelle einen oeffentlichen
            // Schluessel mitgeschickt hat. Fehlt er, laeuft es unverschluesselt
            // weiter, aber sichtbar: p2pRenderCryptoState() sagt es dem Nutzer.
            p2pCryptoReset();
            let ownPub = null;
            if (offerPayload.k) {
                ownPub = await p2pCryptoInit();
                if (ownPub) await p2pCryptoDerive(offerPayload.k);
            }

            p2pSync.answerGenerated = false;

            const peer = new SimplePeer({
                initiator: false,
                trickle: false,
                config: p2pGetIceConfig()
            });

            // WICHTIG: Events zuerst registrieren
            p2pSetupPeerEvents(peer);

            const gatherBox = document.getElementById('p2pClientGathering');
            if (gatherBox) gatherBox.style.display = '';

            p2pAwaitLocalDescription(peer, 'answer', async (signalData, sdpDiag, viaTimeout, secs) => {
                if (p2pSync.answerGenerated) return;
                p2pSync.answerGenerated = true;

                console.log(`📡 Client: Answer nach ${secs}s (${viaTimeout ? 'Timeout-Pfad' : 'Gathering komplett'})`);
                console.log(`🧊 ICE: ${sdpDiag.total} total → Host: ${sdpDiag.host}, STUN: ${sdpDiag.srflx}, RELAY: ${sdpDiag.relay}`);
                p2pSync.iceDiag = sdpDiag;

                if (gatherBox) gatherBox.style.display = 'none';

                if (!sdpDiag.total) {
                    p2pReportNoCandidates(sdpDiag);
                    p2pSync.answerGenerated = false;
                    btn.textContent = 'Code verarbeiten';
                    btn.disabled = false;
                    return;
                }
                p2pLog(sdpDiag.relay
                    ? sdpDiag.relay + ' Relay-Weg(e) verfügbar'
                    : 'Kein Relay — Verbindung nur direkt oder im selben Netz');

                try {
                    const payload = {
                        v: 2,
                        t: 'answer',
                        s: signalData,
                        d: p2pSync.deviceId,
                        n: data.settings?.name || 'Gerät',
                        ts: Date.now()
                    };
                    // Nur mitschicken, wenn die Ableitung wirklich geklappt hat —
                    // sonst glaubt der Host an einen Schluessel, den es nicht gibt.
                    if (ownPub && p2pSync.crypto.active) payload.k = ownPub;
                    const compressed = await p2pCompress(payload);
                    console.log(`📦 Answer komprimiert: ${compressed.length} Zeichen`);

                    // Show answer code
                    document.getElementById('p2pAnswerCodeBox').style.display = '';
                    document.getElementById('p2pAnswerCode').value = compressed;
                    p2pSetIceSummary('p2pClientIceSummary', sdpDiag);
                    btn.textContent = 'Antwort-Code erzeugt';
                } catch (e) {
                    console.error('❌ Answer-Kompression fehlgeschlagen:', e);
                    showCustomMessage('Code fehlgeschlagen', 'Der Antwort-Code konnte nicht erstellt werden.', 'error');
                }
            });

            p2pSync.peer = peer;

            // Signal the offer to our peer NACH setup (this triggers answer generation)
            console.log('📡 Client: Signalisiere Offer an Peer...');
            peer.signal(offerPayload.s);

            const devInfo = document.getElementById('p2pDeviceInfo');
            if (devInfo) {
                devInfo.textContent = `Verbunden mit: ${offerPayload.n || 'Unbekannt'} (${offerPayload.d || '?'})`;
                devInfo.style.display = '';
            }

        } catch (e) {
            console.error('❌ Offer-Verarbeitung fehlgeschlagen:', e);
            showCustomMessage('Code ungültig', 'Der Einladungscode konnte nicht gelesen werden: ' + e.message, 'error');
            btn.textContent = 'Code verarbeiten';
            btn.disabled = false;
        }
    }

    // === STEP 2: HOST - Process Answer ===
    async function p2pHostProcessAnswer() {
        const input = document.getElementById('p2pAnswerInput').value.trim();
        if (!input) {
            showCustomMessage('Code fehlt', 'Füge den Antwort-Code vom anderen Gerät ein.', 'error');
            return;
        }

        if (p2pSync.answerApplied) {
            showCustomMessage('Schon verarbeitet', 'Dieser Antwort-Code wurde bereits angewendet. Starte den Vorgang neu, wenn die Verbindung nicht steht.', 'warning');
            return;
        }

        try {
            const answerPayload = await p2pDecompress(input);
            console.log('📥 Host: Answer dekomprimiert. Version:', answerPayload.v, 'Type:', answerPayload.t);

            if (!answerPayload || !answerPayload.s || answerPayload.t !== 'answer') {
                throw new Error('Ungültiger Antwort-Code (kein answer)');
            }

            if (!answerPayload.s.type || answerPayload.s.type !== 'answer') {
                throw new Error('SDP-Signal ist kein answer (type: ' + (answerPayload.s.type || 'undefined') + ')');
            }

            if (!p2pSync.peer) {
                throw new Error('Kein aktiver Peer. Bitte starte den Vorgang neu.');
            }

            // Check RTCPeerConnection state
            const pc = p2pSync.peer._pc;
            if (pc) {
                console.log('📊 Host RTCPeerConnection State:', pc.signalingState, '| ICE:', pc.iceConnectionState);
                if (pc.signalingState !== 'have-local-offer') {
                    console.error('❌ Falsche Signaling-State:', pc.signalingState, '(erwartet: have-local-offer)');
                    throw new Error('Verbindung ist in falschem Zustand (' + pc.signalingState + '). Bitte klicke "Daten senden" erneut und generiere einen neuen Code.');
                }
            }

            p2pSync.answerApplied = true;

            // Show loading UI
            const connectBtn = document.getElementById('p2pHostConnectBtn');
            const connectingDiv = document.getElementById('p2pHostConnecting');
            if (connectBtn) { connectBtn.disabled = true; connectBtn.textContent = 'Verbinde …'; connectBtn.style.opacity = '0.6'; connectBtn.style.cursor = 'not-allowed'; }
            if (connectingDiv) connectingDiv.style.display = '';

            // Echter ICE-Zustand + verstrichene Zeit statt Fake-Balken (der lief
            // stur auf 90%, egal ob die Verbindung stand oder längst tot war).
            const connT0 = Date.now();
            p2pSync._connectBarInterval = setInterval(() => {
                const status = document.getElementById('p2pHostConnectStatus');
                const secs = (Date.now() - connT0) / 1000;
                const st = (p2pSync.peer && p2pSync.peer._pc) ? p2pSync.peer._pc.iceConnectionState : 'new';
                if (status) status.textContent = p2pIceLabel(st) + '  ·  ' + secs.toFixed(0) + 's';

                // Harte Obergrenze: ohne sie hängt der Spinner endlos, wenn ICE
                // weder 'connected' noch 'failed' meldet (häufig bei striktem NAT).
                if (!p2pSync.connected && secs > P2P_CONNECT_TIMEOUT / 1000) {
                    clearInterval(p2pSync._connectBarInterval);
                    p2pSync._connectBarInterval = null;
                    p2pAbortConnect('Zeitüberschreitung nach ' + Math.round(P2P_CONNECT_TIMEOUT / 1000) + 's');
                }
            }, 250);

            const devInfo = document.getElementById('p2pDeviceInfo');
            if (devInfo) {
                // Noch NICHT verbunden — nur die Gegenstelle ist bekannt.
                devInfo.textContent = `Gegenstelle: ${answerPayload.n || 'Unbekannt'} (${answerPayload.d || '?'})`;
                devInfo.style.display = '';
            }

            // Ableiten MUSS vor dem Signalisieren passieren: gleich danach kann
            // 'connect' feuern und der Auto-Sync losschicken. Steht der Schluessel
            // dann noch nicht, ginge das erste Paket im Klartext raus.
            if (answerPayload.k) {
                await p2pCryptoDerive(answerPayload.k);
            } else {
                // Gegenstelle kann kein ECDH — dann auch nicht so tun als ob.
                p2pCryptoReset();
            }
            p2pRenderCryptoState();

            // Signal the answer to our peer (this completes the handshake!)
            console.log('📡 Host: Signalisiere Answer an Peer...');
            p2pSync.peer.signal(answerPayload.s);
            console.log('✅ Host: Answer signalisiert. Warte auf connect...');

        } catch (e) {
            console.error('❌ Answer-Verarbeitung fehlgeschlagen:', e);
            showCustomMessage('Verbindung fehlgeschlagen', e.message, 'error');
            p2pSync.answerApplied = false; // allow retry
        }
    }

    // === SHARED PEER EVENT HANDLERS ===
    function p2pSetupPeerEvents(peer) {
        // ICE Diagnostik: Verbindungszustand überwachen
        try {
            const pc = peer._pc;
            if (pc) {
                pc.addEventListener('iceconnectionstatechange', () => {
                    console.log(`🧊 ICE Connection: ${pc.iceConnectionState}`);
                    p2pLog('Netzwerk: ' + p2pIceLabel(pc.iceConnectionState));
                });
                pc.addEventListener('icegatheringstatechange', () => {
                    console.log(`🧊 ICE Gathering: ${pc.iceGatheringState}`);
                });
                pc.addEventListener('connectionstatechange', () => {
                    console.log(`🧊 Connection State: ${pc.connectionState}`);
                });
                pc.addEventListener('icecandidate', (event) => {
                    if (event.candidate) {
                        const c = event.candidate.candidate;
                        const type = c.includes('typ relay') ? '🔄 RELAY' : c.includes('typ srflx') ? '📡 STUN' : '🏠 HOST';
                        console.log(`🧊 ICE Candidate: ${type} | ${c.substring(0, 100)}`);
                    }
                });
            }
        } catch(e) { console.warn('ICE Diagnostik konnte nicht initialisiert werden:', e); }

        peer.on('connect', () => {
            console.log('✅ P2P VERBUNDEN! Rolle:', p2pSync.role);
            p2pSync.connected = true;
            p2pSync.syncStats = { sent: 0, received: 0, merged: 0 };

            // Clear connecting animation
            if (p2pSync._connectBarInterval) { clearInterval(p2pSync._connectBarInterval); p2pSync._connectBarInterval = null; }

            // Show step 3
            p2pShowStep(3);
            document.getElementById('p2pWizStep3').style.display = '';
            document.getElementById('p2pWizardSubtitle').textContent = 'Verbunden';

            // Update settings UI
            p2pUpdateConnectionUI(true);
            p2pRenderCryptoState();

            if (p2pSync.crypto.active) {
                p2pLog('Ende-zu-Ende verschlüsselt · Prüfziffer ' + p2pSync.crypto.sas);
                showCustomMessage('Verbunden',
                    'Direkte Verbindung steht, Ende-zu-Ende verschlüsselt. Vergleiche die Prüfziffer auf beiden Geräten.', 'success');
            } else {
                p2pLog('Ohne zusätzliche Verschlüsselung verbunden');
                showCustomMessage('Verbunden', 'Direkte Verbindung steht. Daten werden übertragen.', 'success');
            }

            // Start heartbeat
            p2pStartHeartbeat();

            // Auto-sync if enabled
            if (document.getElementById('p2pAutoSync')?.checked) {
                setTimeout(() => p2pExecuteSync(), 500);
            }

            p2pLog('Verbindung hergestellt');
        });

        peer.on('data', (rawData) => {
            // Entschluesseln ist async, der Empfang war es nicht. Ohne Kette
            // koennten sich zwei Pakete ueberholen — dann kaeme 'sync-complete'
            // womoeglich vor dem letzten Chunk an und der Merge liefe zu frueh.
            p2pRecvChain = p2pRecvChain.then(async () => {
                const wire = JSON.parse(rawData.toString());

                if (p2pSync.crypto.active) {
                    // Steht der Schluessel, wird Klartext NICHT mehr angenommen.
                    // Sonst genuegte es, unverschluesselt zu senden, um die
                    // Verschluesselung auszuhebeln — ein klassisches Downgrade.
                    if (!wire || wire.e !== 1) {
                        console.warn('[P2P] Klartext-Paket bei aktiver Verschluesselung verworfen');
                        p2pLog('Unverschlüsseltes Paket verworfen');
                        return;
                    }
                    p2pHandleMessage(await p2pDecrypt(wire));
                    return;
                }

                p2pHandleMessage(wire);
            }).catch(e => {
                console.error('❌ P2P Message Error:', e);
            });
        });

        peer.on('error', (err) => {
            console.error('❌ P2P Peer Error:', err);
            p2pLog('Fehler: ' + err.message);
            // Clear connecting animation
            if (p2pSync._connectBarInterval) { clearInterval(p2pSync._connectBarInterval); p2pSync._connectBarInterval = null; }
            // Reset connect button
            const connectBtn = document.getElementById('p2pHostConnectBtn');
            if (connectBtn) { connectBtn.disabled = false; connectBtn.textContent = 'Verbindung herstellen'; connectBtn.style.opacity = '1'; connectBtn.style.cursor = 'pointer'; }
            const connectingDiv = document.getElementById('p2pHostConnecting');
            if (connectingDiv) connectingDiv.style.display = 'none';
            // Allow retry
            p2pSync.answerApplied = false;

            if (err.message === 'Connection failed.' || err.code === 'ERR_ICE_CONNECTION_FAILURE') {
                const diag = p2pSync.iceDiag || { host: '?', srflx: '?', relay: '?' };
                const hasRelay = diag.relay > 0;
                const diagText = `\n\n(Diagnose: ${diag.host} lokal, ${diag.srflx} öffentlich, ${diag.relay} Relay)`;
                
                let msgText = 'Die direkte Verbindung kam nicht zustande.\n' +
                    (hasRelay ? '• Ein Relay war verfügbar, die Gegenstelle blieb aber unerreichbar\n' : '• Kein Relay verfügbar — dann klappt es nur im selben Netzwerk\n') +
                    '• Firewall oder striktes NAT blockiert den Aufbau\n' +
                    '• VPN aktiv? Dann ausschalten und neu versuchen\n' +
                    '• Beide Geräte im selben WLAN? Dann sollte es direkt gehen';

                if (diag.host === 0) {
                    msgText = 'Dein Gerät versteckt sich im lokalen Netzwerk. Die Geräte können sich daher nicht sehen, obwohl sie im selben WLAN sind!\n\n' +
                        '👉 Nutzt du NordVPN? Gehe dort in die Einstellungen und schalte "Zugriff auf lokales Netzwerk zulassen" EIN (oder "Unsichtbarkeit im LAN" aus).\n' +
                        '👉 Nutzt du AdGuard (Stealth Mode) oder uBlock Origin? Schalte dort zwingend "WebRTC blockieren" für diese Seite AUS.\n\n' +
                        'Sobald dein Browser sein Heimnetzwerk wieder sehen darf, klappt die Verbindung sofort.';
                }

                showCustomMessage('Verbindung fehlgeschlagen', msgText + diagText, 'error');
                console.error('🔍 P2P Diagnostik:', diag);
            }
        });

        peer.on('close', () => {
            console.log('🔴 P2P Verbindung geschlossen');
            p2pSync.connected = false;
            p2pCryptoReset();
            p2pRenderCryptoState();
            p2pStopHeartbeat();
            if (p2pSync._connectBarInterval) { clearInterval(p2pSync._connectBarInterval); p2pSync._connectBarInterval = null; }
            p2pUpdateConnectionUI(false);
            p2pLog('Verbindung getrennt');
        });
    }

    // === HEARTBEAT (Connection Health) ===
    function p2pStartHeartbeat() {
        p2pStopHeartbeat();
        p2pSync.heartbeatInterval = setInterval(() => {
            // Ueber p2pSendMessage, nicht direkt an peer.send: sonst ginge der
            // Heartbeat als einziges Paket unverschlüsselt raus — und die
            // Gegenstelle wuerde ihn wegen der Downgrade-Sperre verwerfen.
            if (p2pSync.peer && p2pSync.connected) {
                p2pSendMessage({ type: 'heartbeat', ts: Date.now(), d: p2pSync.deviceId });
            }
        }, 5000);
    }

    function p2pStopHeartbeat() {
        if (p2pSync.heartbeatInterval) {
            clearInterval(p2pSync.heartbeatInterval);
            p2pSync.heartbeatInterval = null;
        }
    }

    // === DATA SYNC ENGINE ===
    function p2pExecuteSync() {
        if (!p2pSync.peer || !p2pSync.connected) {
            console.warn('P2P: Nicht verbunden, Sync nicht möglich');
            return;
        }

        p2pLog('Starte Übertragung …');
        p2pUpdateProgress(10, 'Bereite Daten vor...');

        // Prepare sync package
        const entries = data.entries || [];
        const totalEntries = entries.length;

        // Calculate checksum for conflict detection
        const checksum = entries.reduce((sum, e) => sum + (e.timestamp || 0), 0).toString(36);

        // Send handshake first
        const handshake = {
            type: 'sync-handshake',
            deviceId: p2pSync.deviceId,
            deviceName: data.settings?.name || 'Gerät',
            entryCount: totalEntries,
            checksum: checksum,
            timestamp: Date.now(),
            settings: {
                name: data.settings?.name,
                weeklyHours: data.settings?.weeklyHours,
                expectedDaily: data.settings?.expectedDaily
            }
        };

        p2pSendMessage(handshake);
        p2pUpdateProgress(20, 'Handshake gesendet...');

        // Chunk entries for reliable transfer
        const CHUNK_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
            chunks.push(entries.slice(i, i + CHUNK_SIZE));
        }

        // Send chunks with delay for reliability
        chunks.forEach((chunk, idx) => {
            setTimeout(() => {
                p2pSendMessage({
                    type: 'sync-chunk',
                    chunkIndex: idx,
                    totalChunks: chunks.length,
                    entries: chunk,
                    timestamp: Date.now()
                });

                const progress = 20 + ((idx + 1) / chunks.length) * 70;
                p2pUpdateProgress(progress, `Sende Chunk ${idx + 1}/${chunks.length}...`);
                p2pSync.syncStats.sent += chunk.length;
                p2pUpdateStats();
                p2pLog(`Paket ${idx + 1}/${chunks.length} gesendet (${chunk.length} Einträge)`);

                if (idx === chunks.length - 1) {
                    // Final chunk sent
                    setTimeout(() => {
                        p2pSendMessage({ type: 'sync-complete', timestamp: Date.now() });
                        p2pUpdateProgress(95, 'Warte auf Bestätigung...');
                        p2pLog('Alle Daten gesendet, warte auf Bestätigung …');
                    }, 100);
                }
            }, idx * 150); // 150ms delay between chunks
        });

        // Handle empty data
        if (entries.length === 0) {
            p2pSendMessage({ type: 'sync-complete', timestamp: Date.now(), empty: true });
            p2pUpdateProgress(95, 'Keine Einträge zum Senden');
            p2pLog('Keine Einträge vorhanden');
        }
    }

    // Beide Richtungen laufen streng seriell durch je eine Promise-Kette, damit
    // die Reihenfolge trotz asynchroner Krypto erhalten bleibt.
    let p2pSendChain = Promise.resolve();
    let p2pRecvChain = Promise.resolve();

    function p2pSendMessage(msg) {
        if (!p2pSync.peer || !p2pSync.connected) return;
        p2pSendChain = p2pSendChain.then(async () => {
            if (!p2pSync.peer || !p2pSync.connected) return;

            let wire;
            try {
                wire = p2pSync.crypto.active ? await p2pEncrypt(msg) : msg;
            } catch (e) {
                // Lieber nichts senden als versehentlich im Klartext.
                console.error('[P2P] Verschlüsselung fehlgeschlagen, Paket verworfen:', e);
                return;
            }

            try {
                p2pSync.peer.send(JSON.stringify(wire));
            } catch (e) {
                // Senden schlaegt fehl = Kanal ist zu. Das merkte bisher nur der
                // Heartbeat alle 5 s; jetzt merkt es jede Nachricht sofort.
                console.warn('[P2P] Senden fehlgeschlagen:', e);
                p2pSync.connected = false;
                p2pUpdateConnectionUI(false);
                p2pStopHeartbeat();
            }
        });
    }

    // === MESSAGE HANDLER ===
    let p2pReceivedChunks = [];
    let p2pExpectedChunks = 0;

    function p2pHandleMessage(msg) {
        switch (msg.type) {
            case 'heartbeat':
                // Peer is alive
                break;

            case 'sync-handshake':
                console.log('🤝 Sync-Handshake empfangen:', msg);
                p2pLog(`Gegenstelle "${msg.deviceName}" meldet ${msg.entryCount} Einträge`);
                p2pReceivedChunks = [];
                p2pExpectedChunks = 0;
                p2pUpdateProgress(15, 'Handshake empfangen...');
                break;

            case 'sync-chunk':
                console.log(`📦 Chunk ${msg.chunkIndex + 1}/${msg.totalChunks} empfangen (${msg.entries.length} Einträge)`);
                p2pReceivedChunks.push(...msg.entries);
                p2pExpectedChunks = msg.totalChunks;
                p2pSync.syncStats.received += msg.entries.length;
                p2pUpdateStats();

                const progress = 20 + ((msg.chunkIndex + 1) / msg.totalChunks) * 60;
                p2pUpdateProgress(progress, `Empfange ${msg.chunkIndex + 1}/${msg.totalChunks}...`);
                p2pLog(`Paket ${msg.chunkIndex + 1}/${msg.totalChunks} empfangen`);
                break;

            case 'sync-complete':
                console.log('✅ Sync-Complete empfangen. Merging', p2pReceivedChunks.length, 'Einträge...');
                p2pUpdateProgress(85, 'Merge läuft...');
                p2pLog('Führe Einträge zusammen …');

                const mergeResult = p2pSmartMerge(p2pReceivedChunks);
                p2pSync.syncStats.merged = mergeResult.new + mergeResult.updated;
                p2pUpdateStats();

                p2pLog(`Zusammengeführt: ${mergeResult.new} neu, ${mergeResult.updated} aktualisiert, ${mergeResult.skipped} unverändert`);

                // Send ACK
                p2pSendMessage({
                    type: 'sync-ack',
                    received: p2pReceivedChunks.length,
                    merged: mergeResult.new + mergeResult.updated,
                    timestamp: Date.now()
                });

                p2pReceivedChunks = [];
                p2pSync.lastSyncTime = Date.now();
                localStorage.setItem('p2p_lastSync', p2pSync.lastSyncTime);

                p2pUpdateProgress(100, 'Sync abgeschlossen!');
                p2pLog('Synchronisation abgeschlossen');

                showCustomMessage('Synchronisiert',
                    `${mergeResult.new} neue & ${mergeResult.updated} aktualisierte Einträge empfangen.`, 'success');

                // Update all UI
                if (typeof renderEntries === 'function') renderEntries();
                if (typeof computeAll === 'function') computeAll();
                p2pUpdateConnectionUI(true);
                break;

            case 'sync-ack':
                console.log('✅ Sync-ACK empfangen:', msg);
                p2pUpdateProgress(100, 'Bestätigt!');
                p2pLog(`Gegenstelle bestätigt: ${msg.received} empfangen, ${msg.merged} übernommen`);
                p2pSync.lastSyncTime = Date.now();
                localStorage.setItem('p2p_lastSync', p2pSync.lastSyncTime);
                p2pUpdateConnectionUI(true);

                showCustomMessage('Übertragung bestätigt',
                    `${msg.received} Einträge erfolgreich übertragen. ${msg.merged} gemergt.`, 'success');
                break;

            default:
                console.log('P2P: Unbekannter Message-Typ:', msg.type);
        }
    }

    // === SMART MERGE ENGINE ===
    function p2pSmartMerge(remoteEntries) {
        let newCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        if (!remoteEntries || !Array.isArray(remoteEntries)) {
            return { new: 0, updated: 0, skipped: 0 };
        }

        remoteEntries.forEach(remoteEntry => {
            if (!remoteEntry || !remoteEntry.id) {
                skippedCount++;
                return;
            }

            const localEntry = data.entries.find(e => e.id === remoteEntry.id);

            if (!localEntry) {
                // Neuer Eintrag → hinzufügen
                data.entries.push({ ...remoteEntry });
                newCount++;
            } else {
                const remoteTs = remoteEntry.timestamp || 0;
                const localTs = localEntry.timestamp || 0;

                if (remoteTs > localTs) {
                    // Remote ist neuer → überschreiben (Last-Write-Wins)
                    Object.assign(localEntry, remoteEntry);
                    updatedCount++;
                } else {
                    // Lokal ist neuer oder gleich → nichts tun
                    skippedCount++;
                }
            }
        });

        // Sort entries by date after merge
        data.entries.sort((a, b) => {
            const da = a.date || '';
            const db = b.date || '';
            return da.localeCompare(db);
        });

        save();
        console.log(`✅ Smart-Merge: ${newCount} neu, ${updatedCount} aktualisiert, ${skippedCount} übersprungen`);
        return { new: newCount, updated: updatedCount, skipped: skippedCount };
    }

    // === USER ACTIONS ===
    function p2pManualSync() {
        if (!p2pSync.connected) {
            showCustomMessage('Nicht verbunden', 'Stelle zuerst eine Verbindung zu einem Gerät her.', 'warning');
            return;
        }
        p2pSync.syncStats = { sent: 0, received: 0, merged: 0 };
        p2pUpdateStats();
        p2pExecuteSync();
    }

    function p2pDisconnect() {
        if (p2pSync.peer) {
            try { p2pSync.peer.destroy(); } catch(e) {}
            p2pSync.peer = null;
        }
        p2pSync.connected = false;
        p2pSync.role = null;
        p2pCryptoReset();
        p2pStopHeartbeat();
        p2pUpdateConnectionUI(false);
        p2pRenderCryptoState();

        // Reset wizard to step 1 if open
        const modal = document.getElementById('p2pWizardModal');
        if (modal && modal.classList.contains('active')) {
            p2pWizardReset();
        }

        showCustomMessage('Getrennt', 'Die Verbindung wurde beendet.', 'info');
    }

    function p2pCopyOffer() {
        const code = document.getElementById('p2pOfferCode').value;
        navigator.clipboard.writeText(code).then(() => {
            showCustomMessage('Kopiert', 'Einladungscode liegt in der Zwischenablage.', 'success');
        }).catch(() => {
            // Fallback
            const el = document.getElementById('p2pOfferCode');
            el.select();
            document.execCommand('copy');
            showCustomMessage('Kopiert', 'Einladungscode liegt in der Zwischenablage.', 'success');
        });
    }

    function p2pCopyAnswer() {
        const code = document.getElementById('p2pAnswerCode').value;
        navigator.clipboard.writeText(code).then(() => {
            showCustomMessage('Kopiert', 'Antwort-Code liegt in der Zwischenablage.', 'success');
        }).catch(() => {
            const el = document.getElementById('p2pAnswerCode');
            el.select();
            document.execCommand('copy');
            showCustomMessage('Kopiert', 'Antwort-Code liegt in der Zwischenablage.', 'success');
        });
    }

    // === LEGACY COMPAT (alte Button-Handler redirigieren) ===
    function initiateP2PShare() { openP2PWizard(); }
    function showJoinModal() { openP2PWizard(); }
    function closeJoinModal() { closeP2PWizard(); }
    function joinP2PTeam() { openP2PWizard(); }
    function stopP2PShare() { p2pDisconnect(); }

    // === QR-CODE (optional, Anzeige-Seite) ===
    // Die Lib (Assets/js/qrcode.min.js) kann NUR erzeugen, nicht lesen. Gescannt wird
    // deshalb mit der Kamera-App des anderen Geraets: der QR enthaelt einen Deep-Link
    // auf diese Seite, der Code steckt im Hash. Ein eigener Scanner im Modal wuerde
    // einen Decoder brauchen (BarcodeDetector fehlt auf Desktop-Chrome).
    // Geladen wird erst beim Aufklappen — vorher hing die Lib per preload+defer an
    // JEDEM Seitenaufruf, ohne je instanziiert zu werden.
    let _p2pQrLoading = null;

    function p2pLoadQrLib() {
        if (typeof QRCode !== 'undefined') return Promise.resolve();
        if (_p2pQrLoading) return _p2pQrLoading;
        _p2pQrLoading = new Promise(function (resolve, reject) {
            // stamp-assets.js stempelt nur .html — den ?v= deshalb von einem bereits
            // gestempelten Script-Tag abschauen, statt hier eine Version zu pflegen.
            let v = '';
            try {
                const stamped = document.querySelector('script[src*="/Assets/js/"][src*="?v="]');
                if (stamped) v = '?v=' + new URL(stamped.src, location.href).searchParams.get('v');
            } catch (e) { /* ohne Stempel laden ist ok, der SW cached nach Version */ }
            const s = document.createElement('script');
            s.src = '/Assets/js/qrcode.min.js' + v;
            s.onload = function () { resolve(); };
            s.onerror = function () {
                _p2pQrLoading = null;
                reject(new Error('QR-Bibliothek konnte nicht geladen werden'));
            };
            document.head.appendChild(s);
        });
        return _p2pQrLoading;
    }

    function p2pQrLink(code) {
        // Hash statt Query: das SDP enthaelt lokale IP-Adressen, und ein Fragment
        // wird nicht an den Server gesendet.
        return location.origin + location.pathname + '#p2p=' + code;
    }

    // Beide Codes zusammen: welcher Block gehoert zu welchem Feld
    const P2P_QR_TARGETS = {
        offer:  { code: 'p2pOfferCode',  box: 'p2pOfferQrBox',  canvas: 'p2pOfferQrCanvas',  btn: 'p2pOfferQrBtn' },
        answer: { code: 'p2pAnswerCode', box: 'p2pAnswerQrBox', canvas: 'p2pAnswerQrCanvas', btn: 'p2pAnswerQrBtn' }
    };

    async function p2pToggleQr(which) {
        const t = P2P_QR_TARGETS[which];
        if (!t) return;
        const box = document.getElementById(t.box);
        const btn = document.getElementById(t.btn);
        if (!box) return;

        const offen = box.style.display !== 'none' && box.style.display !== '';
        if (offen) {
            box.style.display = 'none';
            if (btn) btn.setAttribute('aria-expanded', 'false');
            return;
        }

        const code = (document.getElementById(t.code) || {}).value || '';
        if (!code) return;

        box.style.display = 'block';
        if (btn) btn.setAttribute('aria-expanded', 'true');

        const host = document.getElementById(t.canvas);
        if (!host) return;
        host.innerHTML = '<span class="p2p-qr-loading">' + p2pL('QR-Code wird erzeugt …', 'Generating QR code …') + '</span>';

        try {
            await p2pLoadQrLib();
            const link = p2pQrLink(code);
            host.innerHTML = '';
            // Level L: der Code ist mit ~700–1100 Zeichen lang, hoehere Fehlerkorrektur
            // kostet Kapazitaet und macht die Module noch kleiner (= schlechter scannbar).
            // 420px ist kein Deko-Wert: bei 703 Zeichen entstehen 130x130 Module, auf
            // 260px waeren das 2 px/Modul — Handykameras brauchen ~3. 1:1 rendern und
            // NICHT herunterskalieren, sonst werden die Modulkanten uneben.
            new QRCode(host, {
                text: link,
                width: 420,
                height: 420,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.L
            });
        } catch (e) {
            console.error('[P2P] QR fehlgeschlagen:', e);
            host.innerHTML = '<span class="p2p-qr-loading">' +
                p2pL('QR-Code nicht verfügbar — bitte den Code kopieren.',
                     'QR code unavailable — please copy the code instead.') + '</span>';
        }
    }

    // === DEEP-LINK: #p2p=<code> ===
    // Das Intro (#pro-intro) liegt auf z-index 99999 und setzt body{overflow:hidden},
    // der Wizard nur auf 200. Laeuft es noch, oeffnet sich der Wizard unsichtbar
    // dahinter: nichts scrollt, nichts laesst sich tippen, P2P scheint gar nicht zu
    // starten — von aussen ununterscheidbar von einem Absturz. landing.js ueberspringt
    // das Intro bei einem #p2p=-Link bereits beim Laden; hier faengt es den Fall ab,
    // dass der Hash erst spaeter ankommt (Android fokussiert beim Scannen oft den
    // bestehenden Tab, dann laedt nichts neu und landing.js ist laengst durch).
    function p2pDismissIntro() {
        const intro = document.getElementById('pro-intro');
        if (!intro || intro.style.display === 'none' || intro.style.display === '') return;
        intro.style.display = 'none';
        document.body.style.overflow = '';
        // 'pro_intro_seen' bewusst NICHT setzen — das Intro kommt beim naechsten
        // normalen Aufruf ganz regulaer.
        try { if (window._showGhostButton) window._showGhostButton(); } catch (e) {}
    }

    async function p2pHandleDeepLink() {
        const m = (location.hash || '').match(/[#&]p2p=([A-Za-z0-9\-_]+)/);
        if (!m) return;
        const code = m[1];

        p2pDismissIntro();

        // Hash sofort entfernen: der Code enthaelt lokale IP-Adressen aus dem SDP und
        // hat in History, Bookmarks und im Referrer nichts verloren.
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}

        let payload;
        try {
            payload = await p2pDecompress(code);
        } catch (e) {
            showCustomMessage(
                p2pL('Code unlesbar', 'Unreadable code'),
                p2pL('Der gescannte Code konnte nicht gelesen werden. Bitte den Code stattdessen kopieren und einfügen.',
                     'The scanned code could not be read. Please copy and paste the code instead.'),
                'error');
            return;
        }

        if (payload && payload.t === 'answer') {
            // Der Antwort-Code gehoert zum Host — und der braucht sein Peer-Objekt aus
            // DIESEM Tab. Nach einem Reload ist es weg, dann hilft nur Einfuegen.
            if (p2pSync.role === 'host' && p2pSync.peer) {
                openP2PWizard_keepState();
                const inp = document.getElementById('p2pAnswerInput');
                if (inp) inp.value = code;
                p2pHostProcessAnswer();
            } else {
                showCustomMessage(
                    p2pL('Einladung nicht mehr offen', 'Invitation no longer open'),
                    p2pL('Dieser Antwort-Code gehört zu einer Einladung, die in diesem Tab nicht mehr läuft. Starte die Einladung neu oder füge den Code von Hand ein.',
                         'This answer code belongs to an invitation that is no longer running in this tab. Start the invitation again or paste the code manually.'),
                    'info');
            }
            return;
        }

        // Standardfall: Einladung gescannt -> direkt in die Empfaenger-Rolle
        openP2PWizard();
        p2pStartClient();
        const inp = document.getElementById('p2pOfferInput');
        if (inp) inp.value = code;
        p2pClientProcessOffer();
    }

    // Wie openP2PWizard, aber OHNE p2pWizardReset() — sonst wirft der Reset den
    // laufenden Host-Zustand weg, den der Antwort-Code gerade braucht.
    function openP2PWizard_keepState() {
        const modal = document.getElementById('p2pWizardModal');
        if (modal) modal.classList.add('active');
    }

    // Kaltstart (per Kamera-App geoeffnet) UND Hash-Wechsel im schon offenen Tab —
    // Android fokussiert beim Scannen oft den bestehenden Tab, dann laedt nichts neu.
    window.addEventListener('hashchange', function () { p2pHandleDeepLink(); });

    // Bewusst 'load' und nicht 'DOMContentLoaded': der Client-Pfad liest data.settings,
    // und `data` ist ein let aus state-config.js — vor seiner Initialisierung wirft
    // schon der Zugriff (TDZ). 'load' liegt sicher hinter der App-Init.
    if (document.readyState === 'complete') {
        setTimeout(p2pHandleDeepLink, 0);
    } else {
        window.addEventListener('load', function () { p2pHandleDeepLink(); });
    }
