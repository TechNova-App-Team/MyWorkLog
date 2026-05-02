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
        const encryptionEl = document.getElementById('p2pEncryption');
        
        if (autoSyncEl) autoSyncEl.checked = team.autoSync !== false;
        if (offlineQueueEl) offlineQueueEl.checked = team.offlineQueue !== false;
        if (encryptionEl) encryptionEl.checked = team.encryption !== false;
    }

    // ========== === P2P WebRTC SYNC SYSTEM v2.0 === ==========
    // Vollständig serverless, 3-Schritt Handshake mit gzip-komprimierten Codes
    // Chunked Transfer, Delta Sync, Heartbeat, Conflict Resolution

    // Global P2P State
    let p2pSync = {
        peer: null,
        role: null, // 'host' | 'client'
        connected: false,
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
        document.getElementById('p2pWizardSubtitle').textContent = 'Wähle eine Rolle';
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
        const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

        if (connected) {
            if (statusEl) statusEl.textContent = 'Verbunden';
            if (statusEl) statusEl.style.color = '#10b981';
            if (dotEl) { dotEl.style.background = '#10b981'; dotEl.style.boxShadow = '0 0 8px rgba(16,185,129,0.5)'; }
            if (peersEl) { peersEl.textContent = '1 Peer'; peersEl.style.color = '#10b981'; }
            if (quickEl) quickEl.style.display = 'grid';
        } else {
            if (statusEl) statusEl.textContent = 'Nicht verbunden';
            if (statusEl) statusEl.style.color = 'var(--text-muted)';
            if (dotEl) { dotEl.style.background = '#6b7280'; dotEl.style.boxShadow = 'none'; }
            if (peersEl) { peersEl.textContent = 'Offline'; peersEl.style.color = 'var(--text-muted)'; }
            if (quickEl) quickEl.style.display = 'none';
        }

        if (p2pSync.lastSyncTime && lastSyncEl) {
            lastSyncEl.style.display = '';
            const timeEl = document.getElementById('p2pLastSyncTime');
            if (timeEl) timeEl.textContent = new Date(p2pSync.lastSyncTime).toLocaleString('de-DE');
        }
    }

    // === ICE CONFIG (shared) ===
    function p2pGetIceConfig() {
        return {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:freeturn.net:5349' },
                { urls: 'stun:stun.relay.metered.ca:80' },
                {
                    urls: 'turn:freeturn.net:5349',
                    username: 'free',
                    credential: 'free'
                },
                {
                    urls: 'turns:freeturn.net:5349',
                    username: 'free',
                    credential: 'free'
                },
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
        p2pLog('🧪 Teste TURN Server...');
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
                    ? `✅ TURN OK: ${candidates.relay} Relay, ${candidates.srflx} STUN, ${candidates.host} Host`
                    : `⚠️ TURN fehlgeschlagen: nur ${candidates.srflx} STUN, ${candidates.host} Host (kein Relay)`);
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
                        ? `✅ TURN OK: ${candidates.relay} Relay, ${candidates.srflx} STUN, ${candidates.host} Host`
                        : `⚠️ Kein TURN Relay: ${candidates.srflx} STUN, ${candidates.host} Host`);
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
                p2pLog('❌ TURN Test fehlgeschlagen: ' + e.message);
                resolve({ ...candidates, working: false, error: e.message });
            }
        });
    }

    // === STEP 1: HOST - Create Offer ===
    async function p2pStartHost() {
        p2pSync.role = 'host';
        p2pSync.offerGenerated = false;
        p2pSync.answerApplied = false;
        p2pSync.iceDiag = { host: 0, srflx: 0, relay: 0 };
        p2pShowStep(2);
        document.getElementById('p2pWizStep2Host').style.display = '';
        document.getElementById('p2pWizardSubtitle').textContent = 'Schritt 1/2 — Einladungscode';

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

        peer.on('signal', async (signalData) => {
            // trickle:false → nur 1 Signal mit allen ICE Candidates
            if (p2pSync.offerGenerated) {
                console.log('⏭️ Host: Doppeltes Signal ignoriert (Offer bereits generiert)');
                return;
            }
            p2pSync.offerGenerated = true;

            // ICE Diagnostik: SDP auf Relay-Kandidaten prüfen
            const sdpDiag = p2pAnalyzeSDP(signalData.sdp);
            console.log(`📡 Host: Offer-Signal generiert. SDP type: ${signalData.type}`);
            console.log(`🧊 ICE Candidates im SDP: ${sdpDiag.total} total → Host: ${sdpDiag.host}, STUN: ${sdpDiag.srflx}, RELAY: ${sdpDiag.relay}`);
            if (sdpDiag.relay === 0) {
                console.warn('⚠️ KEIN RELAY Candidate im Offer! TURN-Server funktionieren möglicherweise nicht.');
                p2pLog('⚠️ Kein TURN-Relay — nur direkte Verbindung möglich');
            } else {
                p2pLog(`✅ ${sdpDiag.relay} TURN-Relay Candidate(s) gefunden`);
            }
            p2pSync.iceDiag = sdpDiag;

            try {
                const payload = {
                    v: 2,
                    t: 'offer',
                    s: signalData,
                    d: p2pSync.deviceId,
                    n: data.settings?.name || 'Gerät',
                    ts: Date.now()
                };
                const compressed = await p2pCompress(payload);
                console.log(`📦 Offer komprimiert: ${JSON.stringify(signalData).length} → ${compressed.length} Zeichen`);

                document.getElementById('p2pHostSpinner').style.display = 'none';
                document.getElementById('p2pHostReady').style.display = '';
                document.getElementById('p2pOfferCodeBox').style.display = '';
                document.getElementById('p2pOfferCode').value = compressed;
            } catch (e) {
                console.error('❌ Offer-Kompression fehlgeschlagen:', e);
                showCustomMessage('❌ Fehler', 'Konnte Einladungscode nicht erstellen: ' + e.message, 'error');
            }
        });

        p2pSync.peer = peer;
    }

    // === STEP 1: CLIENT - Paste Offer ===
    function p2pStartClient() {
        p2pSync.role = 'client';
        p2pShowStep(2);
        document.getElementById('p2pWizStep2Client').style.display = '';
        document.getElementById('p2pWizardSubtitle').textContent = 'Schritt 1/2 — Code eingeben';
    }

    // === STEP 2: CLIENT - Process Offer & Generate Answer ===
    async function p2pClientProcessOffer() {
        if (typeof SimplePeer === 'undefined') {
            _loadSimplePeer(function() { p2pClientProcessOffer(); });
            return;
        }

        const input = document.getElementById('p2pOfferInput').value.trim();
        if (!input) {
            showCustomMessage('❌ Fehler', 'Bitte füge den Einladungscode ein.', 'error');
            return;
        }

        const btn = document.getElementById('p2pClientConnectBtn');
        btn.textContent = '⏳ Verarbeite...';
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

            p2pSync.answerGenerated = false;

            const peer = new SimplePeer({
                initiator: false,
                trickle: false,
                config: p2pGetIceConfig()
            });

            // WICHTIG: Events zuerst registrieren
            p2pSetupPeerEvents(peer);

            peer.on('signal', async (signalData) => {
                // trickle:false → nur 1 answer Signal
                if (p2pSync.answerGenerated) {
                    console.log('⏭️ Client: Doppeltes Signal ignoriert (Answer bereits generiert)');
                    return;
                }
                p2pSync.answerGenerated = true;

                // ICE Diagnostik: SDP auf Relay-Kandidaten prüfen
                const sdpDiag = p2pAnalyzeSDP(signalData.sdp);
                console.log(`📡 Client: Answer-Signal generiert. SDP type: ${signalData.type}`);
                console.log(`🧊 ICE Candidates im SDP: ${sdpDiag.total} total → Host: ${sdpDiag.host}, STUN: ${sdpDiag.srflx}, RELAY: ${sdpDiag.relay}`);
                if (sdpDiag.relay === 0) {
                    console.warn('⚠️ KEIN RELAY Candidate im Answer! TURN-Server funktionieren möglicherweise nicht.');
                    p2pLog('⚠️ Kein TURN-Relay — nur direkte Verbindung möglich');
                } else {
                    p2pLog(`✅ ${sdpDiag.relay} TURN-Relay Candidate(s) gefunden`);
                }
                p2pSync.iceDiag = sdpDiag;

                try {
                    const payload = {
                        v: 2,
                        t: 'answer',
                        s: signalData,
                        d: p2pSync.deviceId,
                        n: data.settings?.name || 'Gerät',
                        ts: Date.now()
                    };
                    const compressed = await p2pCompress(payload);
                    console.log(`📦 Answer komprimiert: ${compressed.length} Zeichen`);

                    // Show answer code
                    document.getElementById('p2pAnswerCodeBox').style.display = '';
                    document.getElementById('p2pAnswerCode').value = compressed;
                    btn.textContent = '✅ Answer generiert';
                } catch (e) {
                    console.error('❌ Answer-Kompression fehlgeschlagen:', e);
                    showCustomMessage('❌ Fehler', 'Answer-Code konnte nicht erstellt werden.', 'error');
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
            showCustomMessage('❌ Ungültiger Code', 'Der Einladungscode konnte nicht verarbeitet werden: ' + e.message, 'error');
            btn.textContent = '🔗 Code verarbeiten';
            btn.disabled = false;
        }
    }

    // === STEP 2: HOST - Process Answer ===
    async function p2pHostProcessAnswer() {
        const input = document.getElementById('p2pAnswerInput').value.trim();
        if (!input) {
            showCustomMessage('❌ Fehler', 'Bitte füge den Antwort-Code ein.', 'error');
            return;
        }

        if (p2pSync.answerApplied) {
            showCustomMessage('⚠️ Bereits verarbeitet', 'Der Antwort-Code wurde bereits eingegeben. Starte neu falls nötig.', 'warning');
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
            if (connectBtn) { connectBtn.disabled = true; connectBtn.textContent = '⏳ Verbinde...'; connectBtn.style.opacity = '0.6'; connectBtn.style.cursor = 'not-allowed'; }
            if (connectingDiv) connectingDiv.style.display = '';

            // Animate progress bar
            p2pSync._connectBarInterval = setInterval(() => {
                const bar = document.getElementById('p2pHostConnectBar');
                const status = document.getElementById('p2pHostConnectStatus');
                if (!bar) return;
                const current = parseFloat(bar.style.width) || 0;
                if (current < 90) {
                    bar.style.width = (current + 2) + '%';
                }
                // Show ICE state if available
                if (p2pSync.peer && p2pSync.peer._pc && status) {
                    const iceState = p2pSync.peer._pc.iceConnectionState;
                    const stateLabels = { 'new': 'Initialisiere...', 'checking': 'Suche Route...', 'connected': 'Verbunden!', 'completed': 'Verbunden!', 'failed': 'Fehlgeschlagen', 'disconnected': 'Getrennt', 'closed': 'Geschlossen' };
                    status.textContent = stateLabels[iceState] || 'Verbinde...';
                    if (iceState === 'failed') { status.style.color = '#f87171'; bar.style.background = '#ef4444'; }
                }
            }, 300);

            const devInfo = document.getElementById('p2pDeviceInfo');
            if (devInfo) {
                devInfo.textContent = `Verbunden mit: ${answerPayload.n || 'Unbekannt'} (${answerPayload.d || '?'})`;
                devInfo.style.display = '';
            }

            // Signal the answer to our peer (this completes the handshake!)
            console.log('📡 Host: Signalisiere Answer an Peer...');
            p2pSync.peer.signal(answerPayload.s);
            console.log('✅ Host: Answer signalisiert. Warte auf connect...');

        } catch (e) {
            console.error('❌ Answer-Verarbeitung fehlgeschlagen:', e);
            showCustomMessage('❌ Fehler', e.message, 'error');
            p2pSync.answerApplied = false; // allow retry
        }
    }

    // === SHARED PEER EVENT HANDLERS ===
    function p2pSetupPeerEvents(peer) {
        // ICE Diagnostik: Verbindungszustand überwachen
        try {
            if (peer._pc) {
                peer._pc.addEventListener('iceconnectionstatechange', () => {
                    console.log(`🧊 ICE Connection: ${peer._pc.iceConnectionState}`);
                    p2pLog(`🧊 ICE: ${peer._pc.iceConnectionState}`);
                });
                peer._pc.addEventListener('icegatheringstatechange', () => {
                    console.log(`🧊 ICE Gathering: ${peer._pc.iceGatheringState}`);
                });
                peer._pc.addEventListener('connectionstatechange', () => {
                    console.log(`🧊 Connection State: ${peer._pc.connectionState}`);
                });
                peer._pc.addEventListener('icecandidate', (event) => {
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
            document.getElementById('p2pWizardSubtitle').textContent = 'Verbunden!';

            // Update settings UI
            p2pUpdateConnectionUI(true);

            showCustomMessage('✅ P2P Verbunden!', 'Direkte Verbindung hergestellt. Daten werden synchronisiert...', 'success');

            // Start heartbeat
            p2pStartHeartbeat();

            // Auto-sync if enabled
            if (document.getElementById('p2pAutoSync')?.checked) {
                setTimeout(() => p2pExecuteSync(), 500);
            }

            p2pLog('✅ Verbindung hergestellt');
        });

        peer.on('data', (rawData) => {
            try {
                const msg = JSON.parse(rawData.toString());
                p2pHandleMessage(msg);
            } catch (e) {
                console.error('❌ P2P Message Parse Error:', e);
            }
        });

        peer.on('error', (err) => {
            console.error('❌ P2P Peer Error:', err);
            p2pLog('❌ Fehler: ' + err.message);
            // Clear connecting animation
            if (p2pSync._connectBarInterval) { clearInterval(p2pSync._connectBarInterval); p2pSync._connectBarInterval = null; }
            // Reset connect button
            const connectBtn = document.getElementById('p2pHostConnectBtn');
            if (connectBtn) { connectBtn.disabled = false; connectBtn.textContent = '🔗 Verbindung herstellen'; connectBtn.style.opacity = '1'; connectBtn.style.cursor = 'pointer'; }
            const connectingDiv = document.getElementById('p2pHostConnecting');
            if (connectingDiv) connectingDiv.style.display = 'none';
            // Allow retry
            p2pSync.answerApplied = false;

            if (err.message === 'Connection failed.' || err.code === 'ERR_ICE_CONNECTION_FAILURE') {
                const diag = p2pSync.iceDiag || { host: '?', srflx: '?', relay: '?' };
                const hasRelay = diag.relay > 0;
                const diagText = `\n\n📊 Diagnostik: Host=${diag.host}, STUN=${diag.srflx}, RELAY=${diag.relay}`;
                const turnHint = hasRelay
                    ? '\n• TURN-Relay war verfügbar, aber Verbindung schlug trotzdem fehl'
                    : '\n• ⚠️ KEIN TURN-Relay verfügbar — TURN-Server antwortet nicht';

                showCustomMessage('❌ Verbindung fehlgeschlagen',
                    'Die P2P-Verbindung konnte nicht hergestellt werden.' + turnHint + '\n' +
                    '• Firewall oder striktes NAT blockiert die Verbindung\n' +
                    '• VPN aktiv? Bitte deaktivieren\n' +
                    '• Beide Geräte im selben WLAN? Dann sollte es direkt gehen\n\n' +
                    'Tipp: Öffne die Konsole (F12) → teste mit p2pTestTURN()' + diagText, 'error');
                console.error('🔍 P2P Diagnostik:', diag);
            }
        });

        peer.on('close', () => {
            console.log('🔴 P2P Verbindung geschlossen');
            p2pSync.connected = false;
            p2pStopHeartbeat();
            if (p2pSync._connectBarInterval) { clearInterval(p2pSync._connectBarInterval); p2pSync._connectBarInterval = null; }
            p2pUpdateConnectionUI(false);
            p2pLog('🔴 Verbindung getrennt');
        });
    }

    // === HEARTBEAT (Connection Health) ===
    function p2pStartHeartbeat() {
        p2pStopHeartbeat();
        p2pSync.heartbeatInterval = setInterval(() => {
            if (p2pSync.peer && p2pSync.connected) {
                try {
                    p2pSync.peer.send(JSON.stringify({ type: 'heartbeat', ts: Date.now(), d: p2pSync.deviceId }));
                } catch (e) {
                    console.warn('Heartbeat failed:', e);
                    p2pSync.connected = false;
                    p2pUpdateConnectionUI(false);
                    p2pStopHeartbeat();
                }
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

        p2pLog('📤 Starte Sync...');
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
                p2pLog(`📦 Chunk ${idx + 1}/${chunks.length} gesendet (${chunk.length} Einträge)`);

                if (idx === chunks.length - 1) {
                    // Final chunk sent
                    setTimeout(() => {
                        p2pSendMessage({ type: 'sync-complete', timestamp: Date.now() });
                        p2pUpdateProgress(95, 'Warte auf Bestätigung...');
                        p2pLog('📤 Alle Daten gesendet, warte auf ACK...');
                    }, 100);
                }
            }, idx * 150); // 150ms delay between chunks
        });

        // Handle empty data
        if (entries.length === 0) {
            p2pSendMessage({ type: 'sync-complete', timestamp: Date.now(), empty: true });
            p2pUpdateProgress(95, 'Keine Einträge zum Senden');
            p2pLog('ℹ️ Keine Einträge vorhanden');
        }
    }

    function p2pSendMessage(msg) {
        if (!p2pSync.peer || !p2pSync.connected) return;
        try {
            p2pSync.peer.send(JSON.stringify(msg));
        } catch (e) {
            console.error('P2P Send Error:', e);
        }
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
                p2pLog(`🤝 Handshake von "${msg.deviceName}" (${msg.entryCount} Einträge)`);
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
                p2pLog(`📥 Chunk ${msg.chunkIndex + 1}/${msg.totalChunks} empfangen`);
                break;

            case 'sync-complete':
                console.log('✅ Sync-Complete empfangen. Merging', p2pReceivedChunks.length, 'Einträge...');
                p2pUpdateProgress(85, 'Merge läuft...');
                p2pLog('🔄 Starte Smart-Merge...');

                const mergeResult = p2pSmartMerge(p2pReceivedChunks);
                p2pSync.syncStats.merged = mergeResult.new + mergeResult.updated;
                p2pUpdateStats();

                p2pLog(`✅ Merge: ${mergeResult.new} neu, ${mergeResult.updated} aktualisiert, ${mergeResult.skipped} übersprungen`);

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
                p2pLog('🎉 Synchronisation erfolgreich abgeschlossen!');

                showCustomMessage('✅ Sync erfolgreich!',
                    `${mergeResult.new} neue & ${mergeResult.updated} aktualisierte Einträge empfangen.`, 'success');

                // Update all UI
                if (typeof renderEntries === 'function') renderEntries();
                if (typeof computeAll === 'function') computeAll();
                p2pUpdateConnectionUI(true);
                break;

            case 'sync-ack':
                console.log('✅ Sync-ACK empfangen:', msg);
                p2pUpdateProgress(100, 'Bestätigt!');
                p2pLog(`✅ Empfänger bestätigt: ${msg.received} empfangen, ${msg.merged} gemergt`);
                p2pSync.lastSyncTime = Date.now();
                localStorage.setItem('p2p_lastSync', p2pSync.lastSyncTime);
                p2pUpdateConnectionUI(true);

                showCustomMessage('✅ Sync bestätigt!',
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
            showCustomMessage('⚠️ Nicht verbunden', 'Stelle zuerst eine P2P-Verbindung her.', 'warning');
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
        p2pStopHeartbeat();
        p2pUpdateConnectionUI(false);

        // Reset wizard to step 1 if open
        const modal = document.getElementById('p2pWizardModal');
        if (modal && modal.classList.contains('active')) {
            p2pWizardReset();
        }

        showCustomMessage('🔴 Getrennt', 'P2P-Verbindung wurde beendet.', 'info');
    }

    function p2pCopyOffer() {
        const code = document.getElementById('p2pOfferCode').value;
        navigator.clipboard.writeText(code).then(() => {
            showCustomMessage('📋 Kopiert!', 'Einladungscode in die Zwischenablage kopiert.', 'success');
        }).catch(() => {
            // Fallback
            const el = document.getElementById('p2pOfferCode');
            el.select();
            document.execCommand('copy');
            showCustomMessage('📋 Kopiert!', 'Einladungscode kopiert (Fallback).', 'success');
        });
    }

    function p2pCopyAnswer() {
        const code = document.getElementById('p2pAnswerCode').value;
        navigator.clipboard.writeText(code).then(() => {
            showCustomMessage('📋 Kopiert!', 'Antwort-Code in die Zwischenablage kopiert.', 'success');
        }).catch(() => {
            const el = document.getElementById('p2pAnswerCode');
            el.select();
            document.execCommand('copy');
            showCustomMessage('📋 Kopiert!', 'Antwort-Code kopiert (Fallback).', 'success');
        });
    }

    // === LEGACY COMPAT (alte Button-Handler redirigieren) ===
    function initiateP2PShare() { openP2PWizard(); }
    function showJoinModal() { openP2PWizard(); }
    function closeJoinModal() { closeP2PWizard(); }
    function joinP2PTeam() { openP2PWizard(); }
    function stopP2PShare() { p2pDisconnect(); }