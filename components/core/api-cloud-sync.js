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
                        <span class="api-diag-icon"><svg class="mwl-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg></span>
                        <div><div class="api-diag-title">Service Unavailable — HTTP 503</div>
                        Der Server antwortet, ist aber überlastet oder im Wartungsmodus. Das ist ein echtes Server-Problem, kein AdBlocker. Warte einige Minuten und versuche es erneut.</div>
                    </div>`;
                } else if (recentAdblocked > 0 && recent5xx === 0) {
                    diagBanner.style.display = 'block';
                    diagBanner.innerHTML = `<div class="api-diag-banner adblock">
                        <span class="api-diag-icon"><svg class="mwl-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg></span>
                        <div><div class="api-diag-title">AdBlocker blockiert API-Zugriff</div>
                        Die API ist wahrscheinlich online, aber dein AdBlocker verhindert den Zugriff. Deaktiviere den AdBlocker für diese Seite oder füge myworklog.de zur Whitelist hinzu.</div>
                    </div>`;
                } else if (recentNetErr > 0 && recent5xx === 0 && recentAdblocked === 0) {
                    diagBanner.style.display = 'block';
                    diagBanner.innerHTML = `<div class="api-diag-banner neterr">
                        <span class="api-diag-icon"><svg class="mwl-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/></svg></span>
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
                    const pathLabel = l.path;

                    return `<div class="api-log-row">
                        <span class="api-log-status ${statusCls}">${statusLabel}</span>
                        <span class="api-method-badge ${methodCls}">${l.method}</span>
                        <span class="api-log-path" title="${l.path}">${pathLabel}</span>
                        <span class="api-log-time">${timeAgo}</span>
                    </div>`;
                }).join('');
            }
            
            // Last checked
            document.getElementById('apiLastChecked').textContent = 'Zuletzt geprüft: ' + new Date().toLocaleTimeString(mwlLocale(), { hour: '2-digit', minute: '2-digit' });
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
                statusDiv.innerHTML = `<p>${mwlIcon('checkCircle', 14)} <strong>Angemeldet als:</strong> ${esc(user.email)}</p><p style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">Nutze die Buttons um manuell hoch- oder runterzuladen.</p>`;
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
                statusDiv.innerHTML = `<p>${mwlIcon('xCircle', 14)} <strong>Nicht angemeldet</strong></p><p style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">Klick auf "Cloud Login" um dich anzumelden.</p>`;
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
    
    // SVG-Icons für State-Wechsel (kein Emoji).
    // Wolke bleibt fix, nur der Pfeil animiert — Richtung passend zu Upload/Download.
    const CLOUD_ICON_LOADING_UP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.5A4 4 0 0 0 18 7h-1.3a8 8 0 1 0-13.7 7.3"/><g class="cloud-arrow-move up"><polyline points="8 13 12 9 16 13"/><line x1="12" y1="9" x2="12" y2="21"/></g></svg>';
    const CLOUD_ICON_LOADING_DOWN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.5A4 4 0 0 0 18 7h-1.3a8 8 0 1 0-13.7 7.3"/><g class="cloud-arrow-move down"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="9" x2="12" y2="21"/></g></svg>';
    const CLOUD_ICON_SUCCESS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    const CLOUD_ICON_ERROR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    // Settings-Modal X-Button während Cloud-OP sperren — sonst bricht Sync ab
    // wenn User mitten im Upload/Download das Modal schließt (saveSettings()
    // überschreibt frisch geholte Cloud-Daten, Reload knallt mit halben State).
    function lockSettingsClose(busy) {
        const closeBtn = document.querySelector('#settingsModal .settings-close-btn');
        if (!closeBtn) return;
        if (busy) {
            closeBtn.dataset.cloudBusy = '1';
            closeBtn.setAttribute('disabled', 'disabled');
            closeBtn.setAttribute('aria-disabled', 'true');
            closeBtn.classList.add('settings-close-btn--locked');
            closeBtn.setAttribute('title', 'Cloud-Sync läuft — bitte warten');
        } else {
            delete closeBtn.dataset.cloudBusy;
            closeBtn.removeAttribute('disabled');
            closeBtn.removeAttribute('aria-disabled');
            closeBtn.classList.remove('settings-close-btn--locked');
            closeBtn.setAttribute('title', 'Schließen');
        }
    }

    function cloudBtnSuccess(btn, originalHTML) {
        btn.disabled = true;
        btn.innerHTML = CLOUD_ICON_SUCCESS + '<span>Erfolgreich</span>';
        btn.classList.add('cloud-btn-success');
        setTimeout(() => {
            btn.classList.remove('cloud-btn-success');
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }, 2200);
    }

    function cloudBtnError(btn, originalHTML) {
        btn.disabled = true;
        btn.innerHTML = CLOUD_ICON_ERROR + '<span>Fehler</span>';
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
        uploadBtn.innerHTML = CLOUD_ICON_LOADING_UP + '<span>Lädt hoch…</span>';
        lockSettingsClose(true);

        try {
            console.log('[Upload] Starte Upload...');
            await window.cloudSync.uploadToCloud();
            cloudBtnSuccess(uploadBtn, originalHTML);
        } catch (error) {
            console.error('[Upload] Fehler:', error);
            cloudBtnError(uploadBtn, originalHTML);
        } finally {
            lockSettingsClose(false);
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
        downloadBtn.innerHTML = CLOUD_ICON_LOADING_DOWN + '<span>Wiederherstellen…</span>';
        lockSettingsClose(true);

        try {
            console.log('[Download] Starte Download...');
            await window.cloudSync.downloadFromCloud();
            cloudBtnSuccess(downloadBtn, originalHTML);
            // Lock bleibt bis Reload — sonst kann User in den 2.4s schließen + saveSettings() würde frischen Cloud-State überschreiben
            setTimeout(() => location.reload(), 2400);
        } catch (error) {
            console.error('[Download] Fehler:', error);
            cloudBtnError(downloadBtn, originalHTML);
            lockSettingsClose(false);
        }
    }
    
    function setupAutoSync() {
        // Auto-Sync DEAKTIVIERT — User steuert manuell über Upload/Download Buttons
        console.log('[Cloud Sync] Manueller Modus — kein Auto-Sync');
    }

    // ─── QUICK CLOUD SYNC SHORTCUT ──────────────────────────────────
    // Self-contained 1-Click Upload — funktioniert ohne offene Settings.
    // Aufrufer: Sidebar-Chip, Mobile-More-Sheet, Post-Save Reminder-Toast.
    function _formatRelativeTime(iso) {
        if (!iso) return 'nie';
        const diff = Date.now() - new Date(iso).getTime();
        if (diff < 0 || isNaN(diff)) return 'nie';
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'gerade eben';
        if (m < 60) return 'vor ' + m + ' min';
        const h = Math.floor(m / 60);
        if (h < 24) return 'vor ' + h + 'h';
        const d = Math.floor(h / 24);
        return 'vor ' + d + 'd';
    }

    function updateCloudSyncChip() {
        const chip = document.getElementById('sidebarCloudChip');
        if (!chip) return;
        if (chip.classList.contains('is-syncing') || chip.classList.contains('is-success') || chip.classList.contains('is-error')) {
            return; // Mid-action, lass die Animation laufen
        }
        const wrap = document.getElementById('sidebarCloudWrap');
        const icon = document.getElementById('sidebarCloudIcon');
        const text = document.getElementById('sidebarCloudText');
        const sub = document.getElementById('sidebarCloudSub');
        const loggedIn = !!(window.cloudSync && typeof window.cloudSync.isLoggedIn === 'function' && window.cloudSync.isLoggedIn());
        // Mode aus localStorage (Default upload). Wrap-Class für Pfeil-Rotation.
        const mode = (function(){ try { return localStorage.getItem('mwl_cloud_chip_mode') === 'download' ? 'download' : 'upload'; } catch(e) { return 'upload'; } })();
        if (wrap) wrap.classList.toggle('mode-download', mode === 'download');

        // Icon spiegelt immer den Modus (auch wenn nicht eingeloggt).
        // Pfeil in eigener <g class="sync-arrow"> — bei is-syncing animiert nur
        // der Pfeil (rauf/runter), die Wolke bleibt fix (siehe sidebar.css).
        const ICON_UP = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.5A4 4 0 0 0 18 7h-1.3a8 8 0 1 0-13.7 7.3"/><g class="sync-arrow"><polyline points="8 13 12 9 16 13"/><line x1="12" y1="9" x2="12" y2="21"/></g></svg>';
        const ICON_DOWN = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.5A4 4 0 0 0 18 7h-1.3a8 8 0 1 0-13.7 7.3"/><g class="sync-arrow"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="9" x2="12" y2="21"/></g></svg>';
        if (icon) icon.innerHTML = mode === 'download' ? ICON_DOWN : ICON_UP;

        chip.classList.remove('is-offline');

        if (!loggedIn) {
            chip.classList.add('is-offline');
            if (text) text.textContent = 'Cloud Sync';
            if (sub) sub.textContent = 'Login';
            chip.title = 'Klick: Bei Cloud anmelden';
            return;
        }

        if (mode === 'download') {
            if (text) text.textContent = 'Wiederherstellen';
            if (sub) sub.textContent = 'aus Cloud';
            chip.title = 'Klick: Daten aus der Cloud wiederherstellen (überschreibt lokale Daten)';
            return;
        }

        // Upload-Mode (Default)
        const last = localStorage.getItem('mwl_last_export');
        if (text) text.textContent = 'Sync';
        if (sub) sub.textContent = _formatRelativeTime(last);
        chip.title = last ? ('Klick: Jetzt syncen — letzter Upload ' + _formatRelativeTime(last)) : 'Klick: Erstes Mal in die Cloud hochladen';
    }

    // ─── Helper: Settings öffnen + Cloud-Tab aktivieren ────────────
    // User-Wunsch: Nicht-eingeloggt-Klick auf Cloud-Chip soll in Settings führen
    // (nicht Login-Modal direkt) — dort sieht User den vollen Cloud-Status.
    function openSettingsCloudTab() {
        if (typeof openSettings !== 'function') return;
        openSettings(); // ruft intern switchSettingsTab('profile') auf
        if (typeof switchSettingsTab === 'function') {
            try { switchSettingsTab('cloud'); } catch (e) {} // sofort auf Cloud umschalten
        }
    }

    async function quickCloudSync(triggerEl) {
        const chip = document.getElementById('sidebarCloudChip');
        const sub = document.getElementById('sidebarCloudSub');
        const text = document.getElementById('sidebarCloudText');

        // Kein cloudSync = Supabase-SDK wurde nie geladen = User hat keine Session
        // → genau wie "nicht eingeloggt" behandeln und zum Cloud-Tab führen.
        if (!window.cloudSync || (typeof window.cloudSync.isLoggedIn === 'function' && !window.cloudSync.isLoggedIn())) {
            openSettingsCloudTab();
            return;
        }

        if (chip) {
            chip.classList.remove('is-success', 'is-error', 'is-offline');
            chip.classList.add('is-syncing');
        }
        if (text) text.textContent = 'Lädt hoch';
        if (sub) sub.textContent = '…';

        try {
            await window.cloudSync.uploadToCloud();

            if (chip) {
                chip.classList.remove('is-syncing');
                chip.classList.add('is-success');
            }
            if (text) text.textContent = 'Synct';
            if (sub) sub.textContent = 'gerade eben';

            // Auch andere Trigger (Mobile-Tile) kurz markieren
            if (triggerEl && triggerEl !== chip) {
                const orig = triggerEl.innerHTML;
                if (triggerEl.tagName === 'BUTTON') {
                    triggerEl.disabled = true;
                    triggerEl.style.opacity = '0.8';
                }
                setTimeout(() => {
                    if (triggerEl.tagName === 'BUTTON') {
                        triggerEl.disabled = false;
                        triggerEl.style.opacity = '';
                    }
                }, 1800);
            }

            // Reminder ausblenden, da gerade gesynct
            dismissCloudSyncPrompt(true);

            setTimeout(() => {
                if (chip) chip.classList.remove('is-success');
                updateCloudSyncChip();
            }, 2200);
        } catch (error) {
            console.error('[QuickCloudSync] Fehler:', error);
            if (chip) {
                chip.classList.remove('is-syncing');
                chip.classList.add('is-error');
            }
            if (text) text.textContent = 'Fehler';
            if (sub) sub.textContent = 'erneut?';
            setTimeout(() => {
                if (chip) chip.classList.remove('is-error');
                updateCloudSyncChip();
            }, 2500);
        }
    }

    // ─── CLOUD-RESTORE CONFIRM MODAL (modern, dark, SaaS-Vibe) ─────
    // Eigenes Modal statt generischem showCustomConfirm — Brand-Konsistent.
    // Returnt Promise<boolean>. Backdrop-Click + Escape = Abbrechen.
    function _ensureCloudConfirmStyles() {
        if (document.getElementById('cloudConfirmStyle')) return;
        const style = document.createElement('style');
        style.id = 'cloudConfirmStyle';
        style.textContent = `
            .cc-backdrop {
                position: fixed; inset: 0; z-index: 10000;
                background: rgba(3, 3, 5, 0.72);
                backdrop-filter: blur(8px) saturate(140%);
                -webkit-backdrop-filter: blur(8px) saturate(140%);
                display: flex; align-items: center; justify-content: center;
                padding: 20px;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            .cc-backdrop.show { opacity: 1; }
            .cc-card {
                width: 100%; max-width: 420px;
                background: linear-gradient(180deg, #15151c 0%, #0f0f14 100%);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 18px;
                padding: 0;
                box-shadow:
                    0 24px 64px -12px rgba(0,0,0,0.7),
                    0 0 0 1px rgba(255,255,255,0.02),
                    inset 0 1px 0 0 rgba(255,255,255,0.04);
                transform: translateY(16px) scale(0.96);
                opacity: 0;
                transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease;
                overflow: hidden;
                position: relative;
            }
            .cc-backdrop.show .cc-card {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
            .cc-card::before {
                content: '';
                position: absolute; top: 0; left: 0; right: 0; height: 1px;
                background: linear-gradient(90deg, transparent, rgba(var(--primary-rgb), 0.5), transparent);
            }
            .cc-body {
                padding: 28px 28px 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .cc-icon-ring {
                width: 64px; height: 64px;
                border-radius: 18px;
                background: radial-gradient(circle at 50% 0%, rgba(var(--primary-rgb), 0.22), rgba(var(--primary-rgb), 0.06) 70%);
                border: 1px solid rgba(var(--primary-rgb), 0.28);
                display: flex; align-items: center; justify-content: center;
                color: var(--primary);
                margin-bottom: 18px;
                position: relative;
            }
            .cc-icon-ring::after {
                content: '';
                position: absolute; inset: -1px;
                border-radius: inherit;
                background: linear-gradient(180deg, rgba(var(--primary-rgb), 0.18), transparent 60%);
                opacity: 0.6;
                pointer-events: none;
            }
            .cc-title {
                font-size: 1.15rem;
                font-weight: 700;
                color: var(--text-main);
                letter-spacing: -0.02em;
                margin: 0 0 8px;
                line-height: 1.25;
            }
            .cc-desc {
                font-size: 0.875rem;
                color: var(--text-muted);
                line-height: 1.55;
                margin: 0 0 22px;
                max-width: 320px;
            }
            .cc-warning {
                width: 100%;
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 12px 14px;
                background: rgba(245, 158, 11, 0.08);
                border: 1px solid rgba(245, 158, 11, 0.18);
                border-radius: 12px;
                text-align: left;
                margin-bottom: 4px;
            }
            .cc-warning svg { flex-shrink: 0; color: #f59e0b; margin-top: 1px; }
            .cc-warning-text {
                font-size: 0.78rem;
                color: #fbbf24;
                line-height: 1.5;
                font-weight: 500;
            }
            .cc-warning-text strong { color: #fde68a; font-weight: 700; }
            .cc-footer {
                padding: 22px 28px 24px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            .cc-btn {
                appearance: none;
                border: 0;
                padding: 12px 16px;
                border-radius: 11px;
                font-size: 0.875rem;
                font-weight: 600;
                font-family: inherit;
                cursor: pointer;
                letter-spacing: -0.01em;
                transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                line-height: 1;
            }
            .cc-btn-ghost {
                background: rgba(255,255,255,0.04);
                color: var(--text-main);
                border: 1px solid rgba(255,255,255,0.08);
            }
            .cc-btn-ghost:hover {
                background: rgba(255,255,255,0.08);
                border-color: rgba(255,255,255,0.15);
            }
            .cc-btn-primary {
                background: var(--primary);
                color: #fff;
                box-shadow: 0 4px 16px -4px rgba(var(--primary-rgb), 0.5),
                            inset 0 1px 0 0 rgba(255,255,255,0.18);
            }
            .cc-btn-primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 22px -4px rgba(var(--primary-rgb), 0.65),
                            inset 0 1px 0 0 rgba(255,255,255,0.22);
                filter: brightness(1.08);
            }
            .cc-btn-primary:active {
                transform: translateY(0);
            }
            .cc-btn:focus-visible {
                outline: none;
                box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.35);
            }
            [data-theme="light"] .cc-card {
                background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                border-color: rgba(0,0,0,0.08);
            }
            [data-theme="light"] .cc-btn-ghost {
                background: rgba(0,0,0,0.03);
                border-color: rgba(0,0,0,0.08);
            }
            [data-theme="light"] .cc-btn-ghost:hover {
                background: rgba(0,0,0,0.06);
            }
            @media (max-width: 480px) {
                .cc-body { padding: 24px 22px 0; }
                .cc-footer { padding: 18px 22px 22px; }
                .cc-icon-ring { width: 56px; height: 56px; }
            }
        `;
        document.head.appendChild(style);
    }

    function showCloudRestoreConfirm() {
        _ensureCloudConfirmStyles();
        return new Promise(resolve => {
            const backdrop = document.createElement('div');
            backdrop.className = 'cc-backdrop';
            backdrop.setAttribute('role', 'dialog');
            backdrop.setAttribute('aria-modal', 'true');
            backdrop.setAttribute('aria-labelledby', 'ccTitle');
            backdrop.innerHTML = `
                <div class="cc-card">
                    <div class="cc-body">
                        <div class="cc-icon-ring" aria-hidden="true">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20.4 14.5A4 4 0 0 0 18 7h-1.3a8 8 0 1 0-13.7 7.3"/>
                                <polyline points="8 17 12 21 16 17"/>
                                <line x1="12" y1="9" x2="12" y2="21"/>
                            </svg>
                        </div>
                        <h3 class="cc-title" id="ccTitle">Aus Cloud wiederherstellen</h3>
                        <p class="cc-desc">Die Daten in der Cloud werden auf dieses Gerät geladen — als neuer aktueller Stand.</p>
                        <div class="cc-warning">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 9v4"/><path d="M12 17h.01"/>
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            </svg>
                            <div class="cc-warning-text"><strong>Lokale Änderungen gehen verloren</strong>, wenn sie nicht vorher hochgeladen wurden.</div>
                        </div>
                    </div>
                    <div class="cc-footer">
                        <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="cancel">Abbrechen</button>
                        <button type="button" class="cc-btn cc-btn-primary" data-cc-action="confirm">Wiederherstellen</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
            requestAnimationFrame(() => backdrop.classList.add('show'));

            let resolved = false;
            function close(result) {
                if (resolved) return;
                resolved = true;
                backdrop.classList.remove('show');
                document.removeEventListener('keydown', onKey);
                setTimeout(() => { try { backdrop.remove(); } catch(e) {} }, 240);
                resolve(result);
            }
            function onKey(e) {
                if (e.key === 'Escape') close(false);
                else if (e.key === 'Enter') close(true);
            }
            backdrop.addEventListener('click', e => {
                if (e.target === backdrop) close(false);
                const action = e.target.closest('[data-cc-action]');
                if (action) close(action.dataset.ccAction === 'confirm');
            });
            document.addEventListener('keydown', onKey);
            // Fokus auf primären Button für Tastatur-User
            setTimeout(() => {
                const btn = backdrop.querySelector('.cc-btn-primary');
                if (btn) btn.focus();
            }, 80);
        });
    }

    // ─── QUICK CLOUD DOWNLOAD ──────────────────────────────────────
    // Mirror von quickCloudSync, aber zieht Daten AUS der Cloud.
    // Trigger: Chevron-Menu im Sidebar-Chip + Mobile-More-Sheet-Tile.
    // Triggert nach Erfolg full-reload (genauso wie handleCloudDownload in Settings).
    async function quickCloudDownload() {
        const chip = document.getElementById('sidebarCloudChip');
        const sub = document.getElementById('sidebarCloudSub');
        const text = document.getElementById('sidebarCloudText');

        // Kein cloudSync = nie eingeloggt = direkt zu Settings/Cloud-Tab
        if (!window.cloudSync || (typeof window.cloudSync.isLoggedIn === 'function' && !window.cloudSync.isLoggedIn())) {
            openSettingsCloudTab();
            return;
        }

        // Sicherheitsabfrage — eigenes modernes Modal
        const ok = await showCloudRestoreConfirm();
        if (!ok) return;

        if (chip) {
            chip.classList.remove('is-success', 'is-error', 'is-offline');
            chip.classList.add('is-syncing');
        }
        if (text) text.textContent = 'Lädt runter';
        if (sub) sub.textContent = '…';

        try {
            await window.cloudSync.downloadFromCloud();

            if (chip) {
                chip.classList.remove('is-syncing');
                chip.classList.add('is-success');
            }
            if (text) text.textContent = 'Wiederhergestellt';
            if (sub) sub.textContent = 'Lade neu…';

            // Voller Reload damit alle Komponenten neu rendern (gleiche Strategie wie Settings-Download)
            setTimeout(() => location.reload(), 1200);
        } catch (error) {
            console.error('[QuickCloudDownload] Fehler:', error);
            if (chip) {
                chip.classList.remove('is-syncing');
                chip.classList.add('is-error');
            }
            if (text) text.textContent = 'Fehler';
            if (sub) sub.textContent = 'erneut?';
            setTimeout(() => {
                if (chip) chip.classList.remove('is-error');
                updateCloudSyncChip();
            }, 2500);
        }
    }

    // ─── CHIP-MODE-TOGGLE (Upload ↔ Download) ──────────────────────
    // Pfeil-Button switcht den Modus, Chip-Hauptklick führt aktuellen Modus aus.
    // Modus wird in localStorage gemerkt, damit User-Präferenz Reload überlebt.
    // Rendering läuft komplett über updateCloudSyncChip() — single source of truth.
    const CLOUD_CHIP_MODE_KEY = 'mwl_cloud_chip_mode';

    function getCloudChipMode() {
        try { return localStorage.getItem(CLOUD_CHIP_MODE_KEY) === 'download' ? 'download' : 'upload'; }
        catch (e) { return 'upload'; }
    }

    function toggleCloudChipMode(ev) {
        if (ev) { ev.stopPropagation(); ev.preventDefault(); }
        const next = getCloudChipMode() === 'upload' ? 'download' : 'upload';
        try { localStorage.setItem(CLOUD_CHIP_MODE_KEY, next); } catch (e) {}
        updateCloudSyncChip();
    }

    // Dispatcher: Chip-Klick führt aktuellen Modus aus
    function cloudChipAction() {
        if (getCloudChipMode() === 'download') {
            quickCloudDownload();
        } else {
            quickCloudSync(document.getElementById('sidebarCloudChip'));
        }
    }

    // ─── POST-SAVE REMINDER-TOAST ───────────────────────────────────
    // Erscheint nach save(), wenn eingeloggt + letzter Sync >2h her.
    // - Persistente Cooldown (4h zwischen Anzeigen) damit nach Reload nicht jedes Mal poppt
    // - Grace-Period 8s nach Page-Load (filtert Init-save() raus)
    // - Stale-Threshold 2h (statt 30min) — vermeidet Spam wenn User gerade gesynct hat
    const _cloudPromptPageLoadTs = Date.now();
    const CLOUD_PROMPT_GRACE_MS = 8 * 1000;          // erste 8s nach Load: nie
    const CLOUD_PROMPT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h zwischen Anzeigen
    const CLOUD_PROMPT_STALE_MS = 2 * 60 * 60 * 1000;    // >2h ungesynct = "stale"
    const CLOUD_PROMPT_KEY = 'mwl_cloud_prompt_last';
    let _cloudPromptTimer = null;

    function _cloudPromptLastShown() {
        try { return parseInt(localStorage.getItem(CLOUD_PROMPT_KEY)) || 0; } catch (e) { return 0; }
    }
    function _cloudPromptMarkShown() {
        try { localStorage.setItem(CLOUD_PROMPT_KEY, String(Date.now())); } catch (e) {}
    }

    function showCloudSyncPrompt() {
        // Auch das ist eine ungefragte Meldung und gehoert unter den
        // Hauptschalter der Alerts — sonst schaltet man "alle Meldungen aus"
        // und wird weiter angetippt.
        if (typeof mwlAlertsOn === 'function' && !mwlAlertsOn()) return;
        if (!window.cloudSync || typeof window.cloudSync.isLoggedIn !== 'function' || !window.cloudSync.isLoggedIn()) return;
        // Grace nach Page-Load: filtert das automatische save() beim Initial-Boot
        if (Date.now() - _cloudPromptPageLoadTs < CLOUD_PROMPT_GRACE_MS) return;
        // Persistente Cooldown (überlebt Reload)
        if (Date.now() - _cloudPromptLastShown() < CLOUD_PROMPT_COOLDOWN_MS) return;
        if (document.getElementById('cloudSyncPromptToast')) return;

        const last = localStorage.getItem('mwl_last_export');
        const lastMs = last ? new Date(last).getTime() : 0;
        const stale = !lastMs || (Date.now() - lastMs) > CLOUD_PROMPT_STALE_MS;
        if (!stale) return;

        // Toast bauen
        const toast = document.createElement('div');
        toast.className = 'cloud-sync-prompt';
        toast.id = 'cloudSyncPromptToast';
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
            <div class="cloud-sync-prompt-text">In die Cloud sichern?<small>${last ? 'Letzter Upload ' + _formatRelativeTime(last) : 'Noch nie hochgeladen'}</small></div>
            <button class="cloud-sync-prompt-btn" id="cloudSyncPromptGo">Syncen</button>
            <button class="cloud-sync-prompt-close" id="cloudSyncPromptClose" aria-label="Schließen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        `;
        document.body.appendChild(toast);
        _cloudPromptMarkShown();
        requestAnimationFrame(() => toast.classList.add('show'));

        document.getElementById('cloudSyncPromptGo').addEventListener('click', () => {
            quickCloudSync();
        });
        document.getElementById('cloudSyncPromptClose').addEventListener('click', () => dismissCloudSyncPrompt());

        // Auto-Dismiss nach 12s
        clearTimeout(_cloudPromptTimer);
        _cloudPromptTimer = setTimeout(() => dismissCloudSyncPrompt(), 12000);
    }

    function dismissCloudSyncPrompt(immediate) {
        const toast = document.getElementById('cloudSyncPromptToast');
        if (!toast) return;
        toast.classList.remove('show');
        clearTimeout(_cloudPromptTimer);
        setTimeout(() => toast.remove(), immediate ? 0 : 280);
    }

    // ─── INITIALISIERUNG ────────────────────────────────────────────
    // Chip beim Laden + alle 60s aktualisieren (relative Zeitangaben)
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(updateCloudSyncChip, 600);
        setInterval(updateCloudSyncChip, 60000);

        // Hook: nach jedem save() Cloud-Reminder triggern (mit Delay damit save() nicht blockiert)
        if (typeof window.save === 'function' && !window._saveCloudPromptHooked) {
            const _origSave = window.save;
            window.save = function () {
                const r = _origSave.apply(this, arguments);
                try { setTimeout(showCloudSyncPrompt, 900); } catch (e) {}
                return r;
            };
            window._saveCloudPromptHooked = true;
        }
    });

    // Expose
    window.quickCloudSync = quickCloudSync;
    window.quickCloudDownload = quickCloudDownload;
    window.updateCloudSyncChip = updateCloudSyncChip;
    window.showCloudSyncPrompt = showCloudSyncPrompt;
    window.dismissCloudSyncPrompt = dismissCloudSyncPrompt;
    window.toggleCloudChipMode = toggleCloudChipMode;
    window.cloudChipAction = cloudChipAction;
    window.openSettingsCloudTab = openSettingsCloudTab;

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


