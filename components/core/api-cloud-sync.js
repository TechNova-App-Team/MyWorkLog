// ═══ CORE: API-CLOUD-SYNC ═══
    window._clsBC = 'api-cloud-sync.js-start';
    // ============================================
    // API STATUS MONITOR (Edge Logs Style)
    // ============================================

    // AdBlocker detection via network fetch — cached 60s
    // pagead2.googlesyndication.com is in every major block list (uBlock, AdBlock, etc.)
    // mode:'no-cors' → CORS kein Problem, opaque response = kein Fehler = nicht geblockt
    let _adblockCache = { result: null, ts: 0 };
    async function detectAdBlocker() {
        if (_adblockCache.result !== null && Date.now() - _adblockCache.ts < 60000) {
            return _adblockCache.result;
        }
        let detected = false;
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 2000);
            await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(tid);
            detected = false; // Request kam durch → kein AdBlocker
        } catch(e) {
            // AbortError = Timeout (langsames Netz), kein AdBlocker-Indiz
            detected = e.name !== 'AbortError';
        }
        _adblockCache = { result: detected, ts: Date.now() };
        return detected;
    }

    const apiStatusMonitor = {
        logs: JSON.parse(localStorage.getItem('api_status_logs') || '[]'),
        currentRange: '24h',

        // Record an API call result
        record(method, path, status, timestamp, adblocked) {
            const entry = {
                method: (method || 'GET').toUpperCase(),
                path: path || '/',
                status: parseInt(status) || 0,
                ts: timestamp || Date.now(),
                adblocked: adblocked === true
            };
            this.logs.push(entry);
            // Keep max 2000 entries (roughly 30 days of moderate usage)
            if (this.logs.length > 2000) this.logs = this.logs.slice(-2000);
            this.save();
        },
        
        save() {
            try { localStorage.setItem('api_status_logs', JSON.stringify(this.logs)); } catch(e) {}
        },
        
        getFilteredLogs(range) {
            const now = Date.now();
            const ranges = {
                '1h': 3600000,
                '24h': 86400000,
                '7d': 604800000,
                '30d': 2592000000
            };
            const cutoff = now - (ranges[range] || ranges['24h']);
            return this.logs.filter(l => l.ts >= cutoff).sort((a, b) => b.ts - a.ts);
        },
        
        render() {
            const range = this.currentRange;
            const logs = this.getFilteredLogs(range);
            const now = Date.now();
            
            // --- Uptime bar (segments representing time buckets) ---
            const barEl = document.getElementById('apiUptimeBar');
            const totalSegments = 45;
            const ranges = { '1h': 3600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
            const totalMs = ranges[range] || ranges['24h'];
            const segmentMs = totalMs / totalSegments;
            
            let uptimeSegments = '';
            let totalOk = 0, totalErr = 0;
            
            for (let i = 0; i < totalSegments; i++) {
                const segStart = now - totalMs + (i * segmentMs);
                const segEnd = segStart + segmentMs;
                const segLogs = this.logs.filter(l => l.ts >= segStart && l.ts < segEnd);
                
                let color = 'rgba(255,255,255,0.04)'; // No data
                let tooltip = 'Keine Daten';
                
                if (segLogs.length > 0) {
                    const errors = segLogs.filter(l => l.status >= 500);
                    const warnings = segLogs.filter(l => l.status >= 400 && l.status < 500);
                    totalOk += segLogs.length - errors.length;
                    totalErr += errors.length;
                    
                    if (errors.length > 0) {
                        color = '#ef4444';
                        tooltip = `${errors.length} Fehler / ${segLogs.length} Requests`;
                    } else if (warnings.length > segLogs.length * 0.5) {
                        color = '#f59e0b';
                        tooltip = `${warnings.length} Warnings / ${segLogs.length} Requests`;
                    } else {
                        color = '#10b981';
                        tooltip = `${segLogs.length} Requests — alles OK`;
                    }
                }
                
                uptimeSegments += `<div title="${tooltip}" style="flex:1; height:100%; background:${color}; border-radius:2px; transition:opacity 0.15s; cursor:pointer;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'"></div>`;
            }
            barEl.innerHTML = uptimeSegments;
            
            // Uptime percentage
            const totalAll = totalOk + totalErr;
            const uptime = totalAll > 0 ? ((totalOk / totalAll) * 100) : 100;
            const uptimeEl = document.getElementById('apiUptimePercent');
            uptimeEl.textContent = uptime.toFixed(uptime >= 99.9 ? 2 : 1) + '%';
            uptimeEl.style.color = uptime >= 99 ? '#10b981' : uptime >= 95 ? '#f59e0b' : '#ef4444';
            
            // Range labels
            const rangeLabels = { '1h': 'Vor 1 Stunde', '24h': 'Vor 24h', '7d': 'Vor 7 Tagen', '30d': 'Vor 30 Tagen' };
            document.getElementById('apiRangeStart').textContent = rangeLabels[range] || '—';
            
            // Overall status
            const statusDot = document.getElementById('apiStatusDot');
            const statusText = document.getElementById('apiStatusText');
            const diagBanner = document.getElementById('apiDiagBanner');
            const recentLogs = this.getFilteredLogs('1h');
            const recent5xx = recentLogs.filter(l => l.status >= 500).length;
            const recent503 = recentLogs.filter(l => l.status === 503).length;
            const recent4xx = recentLogs.filter(l => l.status >= 400 && l.status < 500).length;
            const recentAdblocked = recentLogs.filter(l => l.adblocked === true).length;
            const recentNetErr = recentLogs.filter(l => l.status === 0 && !l.adblocked).length;

            // Diagnose banner
            if (diagBanner) {
                if (recent503 > 0) {
                    diagBanner.style.display = 'block';
                    diagBanner.innerHTML = `<div class="api-diag-banner server503">
                        <span class="api-diag-icon">🔴</span>
                        <div><div class="api-diag-title">Service Unavailable — HTTP 503</div>
                        Der Server antwortet, ist aber überlastet oder im Wartungsmodus. Das ist ein echtes Server-Problem, kein AdBlocker. Warte einige Minuten und versuche es erneut.</div>
                    </div>`;
                } else if (recentAdblocked > 0 && recent5xx === 0) {
                    diagBanner.style.display = 'block';
                    diagBanner.innerHTML = `<div class="api-diag-banner adblock">
                        <span class="api-diag-icon">🛡️</span>
                        <div><div class="api-diag-title">AdBlocker blockiert API-Zugriff</div>
                        Die API ist wahrscheinlich online, aber dein AdBlocker verhindert den Zugriff. Deaktiviere den AdBlocker für diese Seite oder füge myworklog.de zur Whitelist hinzu.</div>
                    </div>`;
                } else if (recentNetErr > 0 && recent5xx === 0 && recentAdblocked === 0) {
                    diagBanner.style.display = 'block';
                    diagBanner.innerHTML = `<div class="api-diag-banner neterr">
                        <span class="api-diag-icon">📡</span>
                        <div><div class="api-diag-title">Verbindungsfehler</div>
                        Kein AdBlocker erkannt — prüfe deine Netzwerkverbindung oder ob die API-URL korrekt konfiguriert ist.</div>
                    </div>`;
                } else {
                    diagBanner.style.display = 'none';
                    diagBanner.innerHTML = '';
                }
            }

            if (recent5xx > 0) {
                statusDot.style.background = '#ef4444';
                statusDot.style.boxShadow = '0 0 8px rgba(239,68,68,0.5)';
                statusText.textContent = recent503 > 0
                    ? `Service Unavailable (503) — Server offline`
                    : `${recent5xx} Server-Fehler in der letzten Stunde`;
                statusText.style.color = '#ef4444';
            } else if (recentAdblocked > 0) {
                statusDot.style.background = '#f59e0b';
                statusDot.style.boxShadow = '0 0 8px rgba(245,158,11,0.5)';
                statusText.textContent = 'AdBlocker blockiert API-Zugriff';
                statusText.style.color = '#f59e0b';
            } else if (recentNetErr > 0) {
                statusDot.style.background = '#f59e0b';
                statusDot.style.boxShadow = '0 0 8px rgba(245,158,11,0.5)';
                statusText.textContent = 'Verbindungsfehler — Netzwerk prüfen';
                statusText.style.color = '#f59e0b';
            } else if (recent4xx > 2) {
                statusDot.style.background = '#f59e0b';
                statusDot.style.boxShadow = '0 0 8px rgba(245,158,11,0.5)';
                statusText.textContent = `${recent4xx} Client-Fehler — prüfen`;
                statusText.style.color = '#f59e0b';
            } else if (logs.length === 0) {
                statusDot.style.background = 'rgba(255,255,255,0.15)';
                statusDot.style.boxShadow = 'none';
                statusText.textContent = 'Keine Daten im Zeitraum';
                statusText.style.color = 'rgba(255,255,255,0.4)';
            } else {
                statusDot.style.background = '#10b981';
                statusDot.style.boxShadow = '0 0 8px rgba(16,185,129,0.5)';
                statusText.textContent = 'Alle Systeme operational';
                statusText.style.color = 'rgba(255,255,255,0.4)';
            }
            
            // --- Status Code Breakdown ---
            const codesEl = document.getElementById('apiStatusCodes');
            const codeCounts = {};
            let adblockCount = 0, netErrCount = 0;
            logs.forEach(l => {
                if (l.adblocked) { adblockCount++; return; }
                if (l.status === 0) { netErrCount++; return; }
                const code = l.status;
                codeCounts[code] = (codeCounts[code] || 0) + 1;
            });

            if (Object.keys(codeCounts).length === 0 && adblockCount === 0 && netErrCount === 0) {
                codesEl.innerHTML = '<span style="font-size:0.72rem; color:rgba(255,255,255,0.2);">Noch keine Requests aufgezeichnet</span>';
            } else {
                const sorted = Object.entries(codeCounts).sort((a, b) => {
                    const ca = Math.floor(parseInt(a[0]) / 100);
                    const cb = Math.floor(parseInt(b[0]) / 100);
                    if (cb !== ca) return cb - ca;
                    return parseInt(b[0]) - parseInt(a[0]);
                });
                let pillsHTML = sorted.map(([code, count]) => {
                    const cat = Math.floor(parseInt(code) / 100);
                    const cls = cat >= 5 ? 's5xx' : cat >= 4 ? 's4xx' : cat >= 3 ? 's3xx' : 's2xx';
                    return `<span class="api-status-pill ${cls}">${code} <span style="opacity:0.7; font-weight:500;">×${count}</span></span>`;
                }).join('');
                if (adblockCount > 0) pillsHTML += `<span class="api-status-pill s-adblock">BLOCKED <span style="opacity:0.7; font-weight:500;">×${adblockCount}</span></span>`;
                if (netErrCount > 0) pillsHTML += `<span class="api-status-pill s-neterr">ERR <span style="opacity:0.7; font-weight:500;">×${netErrCount}</span></span>`;
                codesEl.innerHTML = pillsHTML;
            }
            
            // --- Endpoint Health ---
            const endpointEl = document.getElementById('apiEndpointList');
            const endpoints = {};
            logs.forEach(l => {
                const key = l.path;
                if (!endpoints[key]) endpoints[key] = { path: key, methods: new Set(), total: 0, errors: 0, lastStatus: 0 };
                endpoints[key].methods.add(l.method);
                endpoints[key].total++;
                if (l.status >= 400) endpoints[key].errors++;
                endpoints[key].lastStatus = l.status;
            });
            
            const endpointArr = Object.values(endpoints).sort((a, b) => b.total - a.total).slice(0, 8);
            
            if (endpointArr.length === 0) {
                endpointEl.innerHTML = '<div style="padding:12px; text-align:center; color:rgba(255,255,255,0.2); font-size:0.72rem;">Keine Endpoints erfasst</div>';
            } else {
                endpointEl.innerHTML = endpointArr.map(ep => {
                    const errorRate = ep.total > 0 ? (ep.errors / ep.total * 100) : 0;
                    const healthColor = errorRate > 20 ? '#ef4444' : errorRate > 5 ? '#f59e0b' : '#10b981';
                    const methodArr = [...ep.methods];
                    const methodBadges = methodArr.map(m => {
                        const cls = m === 'GET' ? 'get' : m === 'POST' ? 'post' : m === 'HEAD' ? 'head' : m === 'PUT' ? 'put' : m === 'DELETE' ? 'del' : 'opt';
                        return `<span class="api-method-badge ${cls}">${m}</span>`;
                    }).join('');
                    
                    return `<div class="api-endpoint-row">
                        <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                            <div style="width:6px; height:6px; border-radius:50%; background:${healthColor}; flex-shrink:0;"></div>
                            ${methodBadges}
                            <span style="font-family:var(--font-mono); font-size:0.7rem; color:rgba(255,255,255,0.55); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${ep.path}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.65rem; color:rgba(255,255,255,0.25); font-family:var(--font-mono);">${ep.total}×</span>
                            ${ep.errors > 0 ? `<span style="font-size:0.62rem; color:#ef4444; font-family:var(--font-mono);">${ep.errors} err</span>` : ''}
                        </div>
                    </div>`;
                }).join('');
            }
            
            // --- Request Log ---
            const logEl = document.getElementById('apiRequestLog');
            const totalEl = document.getElementById('apiTotalRequests');
            totalEl.textContent = `${logs.length} total`;
            
            if (logs.length === 0) {
                logEl.innerHTML = '<div style="padding:20px; text-align:center; color:rgba(255,255,255,0.15); font-size:0.75rem;">Noch keine API Requests aufgezeichnet.<br><span style="font-size:0.68rem;">Requests werden automatisch beim Sync erfasst.</span></div>';
            } else {
                const displayLogs = logs.slice(0, 50);
                logEl.innerHTML = displayLogs.map(l => {
                    const isAdblocked = l.adblocked === true;
                    const isNetErr = !isAdblocked && l.status === 0;
                    const cat = Math.floor(l.status / 100);
                    const statusCls = isAdblocked ? 'c-adblock' : isNetErr ? 'c-neterr' : cat >= 5 ? 'c5' : cat >= 4 ? 'c4' : cat >= 3 ? 'c3' : 'c2';
                    const statusLabel = isAdblocked ? 'BLK' : isNetErr ? 'ERR' : l.status;
                    const methodCls = l.method === 'GET' ? 'get' : l.method === 'POST' ? 'post' : l.method === 'HEAD' ? 'head' : l.method === 'PUT' ? 'put' : l.method === 'DELETE' ? 'del' : 'opt';
                    const timeAgo = formatTimeAgo(l.ts);
                    const pathLabel = isAdblocked ? l.path + ' 🛡️' : isNetErr ? l.path + ' 📡' : l.path;

                    return `<div class="api-log-row">
                        <span class="api-log-status ${statusCls}">${statusLabel}</span>
                        <span class="api-method-badge ${methodCls}">${l.method}</span>
                        <span class="api-log-path" title="${l.path}">${pathLabel}</span>
                        <span class="api-log-time">${timeAgo}</span>
                    </div>`;
                }).join('');
            }
            
            // Last checked
            document.getElementById('apiLastChecked').textContent = 'Zuletzt geprüft: ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        }
    };
    
    function formatTimeAgo(ts) {
        const diff = Date.now() - ts;
        if (diff < 60000) return 'gerade eben';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'min';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
        return Math.floor(diff / 86400000) + 'd';
    }
    
    function setApiRange(range, btn) {
        apiStatusMonitor.currentRange = range;
        document.querySelectorAll('.api-range-tab').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
        apiStatusMonitor.render();
    }
    
    function refreshApiStatus() {
        // Ping Supabase health endpoints and record results
        const baseUrl = typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.URL : null;
        if (!baseUrl) {
            apiStatusMonitor.render();
            return;
        }
        
        const healthChecks = [
            { method: 'GET', path: '/auth/v1/health', url: baseUrl + '/auth/v1/health' },
            { method: 'HEAD', path: '/rest-admin/v1/ready', url: baseUrl + '/rest/v1/' }
        ];
        
        healthChecks.forEach(check => {
            const startTime = Date.now();
            fetch(check.url, { method: check.method === 'HEAD' ? 'HEAD' : 'GET', mode: 'cors', headers: { 'apikey': typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.ANON_KEY : '' } })
                .then(resp => {
                    apiStatusMonitor.record(check.method, check.path, resp.status, startTime, false);
                    apiStatusMonitor.render();
                })
                .catch(async () => {
                    const isAdBlocked = await detectAdBlocker();
                    apiStatusMonitor.record(check.method, check.path, 0, startTime, isAdBlocked);
                    apiStatusMonitor.render();
                });
        });
    }
    
    // Intercept Supabase fetch calls to auto-log
    (function patchSupabaseFetch() {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const input = args[0];
            const init = args[1] || {};
            let url = '';
            let method = (init.method || 'GET').toUpperCase();
            
            if (typeof input === 'string') url = input;
            else if (input instanceof Request) { url = input.url; method = (input.method || method).toUpperCase(); }
            else if (input && input.href) url = input.href;
            
            // Only track Supabase API calls  
            const isSupabase = typeof SUPABASE_CONFIG !== 'undefined' && url.includes(SUPABASE_CONFIG.URL);
            
            if (isSupabase) {
                const ts = Date.now();
                try {
                    const urlObj = new URL(url);
                    const path = urlObj.pathname;
                    
                    return originalFetch.apply(this, args).then(resp => {
                        apiStatusMonitor.record(method, path, resp.status, ts);
                        // Debounce render to avoid flooding
                        clearTimeout(apiStatusMonitor._renderTimer);
                        apiStatusMonitor._renderTimer = setTimeout(() => apiStatusMonitor.render(), 500);
                        return resp;
                    }).catch(async err => {
                        const isAdBlocked = await detectAdBlocker();
                        apiStatusMonitor.record(method, path, 0, ts, isAdBlocked);
                        clearTimeout(apiStatusMonitor._renderTimer);
                        apiStatusMonitor._renderTimer = setTimeout(() => apiStatusMonitor.render(), 500);
                        throw err;
                    });
                } catch(e) {
                    // URL parsing failed, proceed normally
                }
            }
            
            return originalFetch.apply(this, args);
        };
    })();
    
    // Render on cloud tab open
    const _origSwitchTabCloud = window.switchSettingsTab;
    if (typeof _origSwitchTabCloud === 'function') {
        window.switchSettingsTab = function(tab) {
            _origSwitchTabCloud.call(this, tab);
            if (tab === 'cloud') {
                apiStatusMonitor.render();
            }
        };
    }
    
    // Initial render if cloud tab visible
    setTimeout(() => { try { apiStatusMonitor.render(); } catch(e){} }, 2000);

    // ============================================
    // CLOUD SYNC INTEGRATION (ECHTE PRODUKTIVE INTEGRATION!)
    // ============================================
    
    function setupCloudSyncIntegration() {
        // Registriere Auth-State Callbacks
        if (window.cloudSync && window.cloudSync.onAuthStateChanged) {
            const originalCallback = window.cloudSync.onAuthStateChanged;
            window.cloudSync.onAuthStateChanged = function(isLoggedIn, user) {
                if (typeof originalCallback === 'function') {
                    originalCallback.call(this, isLoggedIn, user);
                }
                updateCloudSyncUI(isLoggedIn, user);
            };
        }
        
        // Initialisiere UI sofort mit aktuellem Status
        if (window.cloudSync) {
            const isLoggedIn = window.cloudSync.isLoggedIn ? window.cloudSync.isLoggedIn() : false;
            const user = window.cloudSync.getCurrentUser ? window.cloudSync.getCurrentUser() : null;
            updateCloudSyncUI(isLoggedIn, user);
        }
        
        // Auto-Sync beim Speichern aktivieren
        setupAutoSync();
    }
    
    function updateCloudSyncUI(isLoggedIn, user) {
        // Update Cloud Sync Buttons in Settings
        const loginBtn = document.getElementById('cloudSyncLoginBtn');
        const logoutBtn = document.getElementById('cloudSyncLogoutBtn');
        const uploadBtn = document.getElementById('cloudSyncUploadBtn');
        const downloadBtn = document.getElementById('cloudSyncDownloadBtn');
        const statusDiv = document.getElementById('cloudSyncStatus');
        
        if (isLoggedIn && user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.style.opacity = '1';
            }
            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.style.opacity = '1';
            }
            if (statusDiv) {
                statusDiv.innerHTML = `<p>🟢 <strong>Angemeldet als:</strong> ${user.email}</p><p style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">Nutze die Buttons um manuell hoch- oder runterzuladen.</p>`;
            }
            console.log('[Cloud Sync] User angemeldet:', user.email);
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.style.opacity = '0.5';
            }
            if (downloadBtn) {
                downloadBtn.disabled = true;
                downloadBtn.style.opacity = '0.5';
            }
            if (statusDiv) {
                statusDiv.innerHTML = `<p>🔴 <strong>Nicht angemeldet</strong></p><p style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">Klick auf "Cloud Login" um dich anzumelden.</p>`;
            }
            console.log('[Cloud Sync] User abgemeldet');
        }
    }
    
    function createCloudSyncButtons() {
        // DEPRECATED - Cloud Sync Buttons sind jetzt FEST im Settings Modal
        // Diese Funktion wird nicht mehr verwendet
    }
    
    function openCloudLoginModal() {
        if (window.cloudSyncUI && typeof window.cloudSyncUI.openLoginModal === 'function') {
            window.cloudSyncUI.openLoginModal();
        } else {
            console.warn('[Cloud] cloudSyncUI nicht bereit — Seite neu laden');
        }
    }
    
    async function handleCloudLogout() {
        if (!window.cloudSync) return;

        const logoutBtn = document.getElementById('cloudSyncLogoutBtn');
        const originalHTML = logoutBtn ? logoutBtn.innerHTML : '';

        try {
            await window.cloudSync.logout();
            if (logoutBtn) cloudBtnSuccess(logoutBtn, originalHTML);
        } catch (error) {
            console.error('[Logout] Fehler:', error);
            if (logoutBtn) cloudBtnError(logoutBtn, originalHTML);
        }
    }
    
    function cloudBtnSuccess(btn, originalHTML) {
        btn.disabled = true;
        btn.innerHTML = '✅ Erfolgreich';
        btn.classList.add('cloud-btn-success');
        setTimeout(() => {
            btn.classList.remove('cloud-btn-success');
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }, 2200);
    }

    function cloudBtnError(btn, originalHTML) {
        btn.disabled = true;
        btn.innerHTML = '❌ Fehler';
        btn.classList.add('cloud-btn-error');
        setTimeout(() => {
            btn.classList.remove('cloud-btn-error');
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }, 2200);
    }

    async function handleCloudUpload() {
        const uploadBtn = document.getElementById('cloudSyncUploadBtn');
        if (!uploadBtn || !window.cloudSync) {
            console.warn('[Upload] Button oder cloudSync nicht verfügbar');
            return;
        }

        const originalHTML = uploadBtn.innerHTML;
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '⏳ Lädt...';

        try {
            console.log('[Upload] Starte Upload...');
            await window.cloudSync.uploadToCloud();
            cloudBtnSuccess(uploadBtn, originalHTML);
        } catch (error) {
            console.error('[Upload] Fehler:', error);
            cloudBtnError(uploadBtn, originalHTML);
        }
    }

    async function handleCloudDownload() {
        const downloadBtn = document.getElementById('cloudSyncDownloadBtn');
        if (!downloadBtn || !window.cloudSync) {
            console.warn('[Download] Button oder cloudSync nicht verfügbar');
            return;
        }

        const originalHTML = downloadBtn.innerHTML;
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '⏳ Lädt...';

        try {
            console.log('[Download] Starte Download...');
            await window.cloudSync.downloadFromCloud();
            cloudBtnSuccess(downloadBtn, originalHTML);
            setTimeout(() => location.reload(), 2400);
        } catch (error) {
            console.error('[Download] Fehler:', error);
            cloudBtnError(downloadBtn, originalHTML);
        }
    }
    
    function setupAutoSync() {
        // Auto-Sync DEAKTIVIERT — User steuert manuell über Upload/Download Buttons
        console.log('[Cloud Sync] Manueller Modus — kein Auto-Sync');
    }

    function updateAchievements() {
        const achievements = data.achievements || [];
        const display = document.getElementById('achievementsDisplay');
        if (!display) return;

        const achievementLabels = {
            'total_10': '10h Total',
            'total_50': '50h Total',
            'total_100': '100h Total',
            'total_500': '500h Total',
            'total_1000': '1000h Total',
            'week_40': '40h/Woche'
        };

    }


