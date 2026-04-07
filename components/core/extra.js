(function initGhostMode() {
        let ghostActive = false;

        // ===== GHOST MODE ANNOUNCEMENT =====
        function showGhostAnnounce() {
            if (localStorage.getItem('tg_ghost_announced')) return;
            const m = document.getElementById('ghostAnnounceModal');
            if (!m) return;
            m.style.display = 'flex';
            requestAnimationFrame(() => {
                m.style.opacity = '1';
                m.style.pointerEvents = 'auto';
            });
        }

        window.dismissGhostAnnounce = function() {
            const m = document.getElementById('ghostAnnounceModal');
            if (!m) return;
            const cb = document.getElementById('ghostAnnounceDismiss');
            if (cb && cb.checked) {
                localStorage.setItem('tg_ghost_announced', '1');
            }
            m.style.opacity = '0';
            m.style.pointerEvents = 'none';
            setTimeout(() => { m.style.display = 'none'; }, 400);
        };

        // Expose for other modules
        window.showGhostAnnounce = showGhostAnnounce;

        // Show announcement ONLY after intro is done (never during intro!)
        // and only after accumulated active visit time reaches 20 minutes.
        function scheduleGhostAnnounceByTime() {
            const REQUIRED_MS = 20 * 60 * 1000; // 20 Minuten
            const TOTAL_KEY = 'ghost_total_time_ms';
            const START_KEY = 'ghost_visit_start';

            // Simple elapsed-time approach: store total accumulated ms
            function getAccumulated() { return parseInt(localStorage.getItem(TOTAL_KEY) || '0', 10); }
            function setAccumulated(ms) { localStorage.setItem(TOTAL_KEY, Math.max(0, ms).toString()); }

            function startSession() {
                try { localStorage.setItem(START_KEY, Date.now().toString()); } catch (e) {}
            }

            function endSession() {
                try {
                    const s = parseInt(localStorage.getItem(START_KEY) || '0', 10);
                    if (s && s > 0) {
                        const delta = Date.now() - s;
                        if (delta > 0 && delta < 24 * 60 * 60 * 1000) { // sanity: max 24h
                            setAccumulated(getAccumulated() + delta);
                        }
                        localStorage.removeItem(START_KEY);
                    }
                } catch (e) {}
            }

            function visibilityHandler() {
                if (document.visibilityState === 'hidden') endSession();
                else startSession();
            }

            let showTimeout = null;
            function maybeShow() {
                const intro = document.getElementById('pro-intro');
                if (intro && intro.style.display !== 'none') {
                    setTimeout(maybeShow, 1000);
                    return;
                }
                // Flush current session to get accurate total
                endSession();
                const total = getAccumulated();
                if (total >= REQUIRED_MS) {
                    showGhostAnnounce();
                    document.removeEventListener('visibilitychange', visibilityHandler);
                    window.removeEventListener('beforeunload', endSession);
                    if (showTimeout) { clearTimeout(showTimeout); showTimeout = null; }
                } else {
                    const remaining = REQUIRED_MS - total;
                    if (showTimeout) clearTimeout(showTimeout);
                    showTimeout = setTimeout(maybeShow, Math.min(remaining, 10000)); // check every 10s max
                }
                startSession(); // restart session tracking
            }

            startSession();
            document.addEventListener('visibilitychange', visibilityHandler);
            window.addEventListener('beforeunload', endSession);
            maybeShow();
        }

        scheduleGhostAnnounceByTime();

        // Determine which ghost skin to use based on job
        function getGhostSkin() {
            const job = (data && data.settings && data.settings.job) || '';
            const itJobs = ['fachinformatiker-anwendung', 'fachinformatiker-system', 'fachinformatiker-daten', 'fachinformatiker-digital', 'it-systemelektroniker', 'it-kaufmann', 'it-digitalisierung', 'mediengestalter', 'gestaltungstechnischer-assistent'];
            return itJobs.includes(job) ? 'vscode' : 'excel';
        }

        // Generate fake Excel data that looks like real work tracking
        function generateGhostData() {
            const headers = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const colLabels = ['Datum', 'Wochentag', 'Abteilung', 'Stunden', 'Beginn', 'Ende', 'Pause (min)', 'Bemerkung'];
            const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
            const depts = ['IT-Abteilung', 'Entwicklung', 'Netzwerk', 'Support', 'Schulung', 'Berufsschule'];
            const remarks = [
                'Server-Migration', 'Ticket-Bearbeitung', 'Netzwerk-Doku', 'Firewall-Konfiguration',
                'Active Directory', 'Windows-Setup', 'Backup-Prüfung', 'User-Support',
                'Inventarisierung', 'Patch-Management', 'Schulungsunterlagen', 'VLAN-Konfiguration',
                'Projektmeeting', 'Code-Review', 'Datenbank-Wartung', 'Monitoring einrichten',
                'IP-Adressvergabe', 'Exchange-Admin', 'Linux-Grundlagen', 'PowerShell-Skripte'
            ];

            const rows = [];
            let dateObj = new Date(2026, 2, 2); // Start March 2, 2026
            for (let i = 0; i < 22; i++) {
                while (dateObj.getDay() === 0 || dateObj.getDay() === 6) dateObj.setDate(dateObj.getDate() + 1);
                const d = String(dateObj.getDate()).padStart(2, '0') + '.' + String(dateObj.getMonth() + 1).padStart(2, '0') + '.' + dateObj.getFullYear();
                const day = days[dateObj.getDay() - 1];
                const dept = depts[Math.floor(Math.random() * depts.length)];
                const hrs = (7 + Math.random() * 2).toFixed(1).replace('.', ',');
                const startH = 7 + Math.floor(Math.random() * 2);
                const startM = Math.floor(Math.random() * 4) * 15;
                const begin = String(startH).padStart(2, '0') + ':' + String(startM).padStart(2, '0');
                const totalMin = parseFloat(hrs.replace(',', '.')) * 60 + 30;
                const endDate = new Date(2026, 0, 1, startH, startM + totalMin);
                const end = String(endDate.getHours()).padStart(2, '0') + ':' + String(endDate.getMinutes()).padStart(2, '0');
                const pause = '30';
                const remark = remarks[Math.floor(Math.random() * remarks.length)];
                rows.push([d, day, dept, hrs, begin, end, pause, remark]);
                dateObj.setDate(dateObj.getDate() + 1);
            }
            return { headers, colLabels, rows };
        }

        function renderGhostSheet() {
            const table = document.getElementById('ghostSheetTable');
            if (!table || table.rows.length > 1) return;
            const { headers, colLabels, rows } = generateGhostData();

            let html = '<thead><tr>';
            headers.forEach((h, i) => {
                html += i === 0
                    ? '<th class="ghost-corner ghost-row-head"></th>'
                    : '<th>' + h + '</th>';
            });
            html += '</tr></thead><tbody>';

            // Column labels row
            html += '<tr><td class="ghost-row-num">1</td>';
            colLabels.forEach(l => { html += '<td style="font-weight:600;background:#f8f8f8">' + l + '</td>'; });
            html += '</tr>';

            rows.forEach((row, idx) => {
                html += '<tr><td class="ghost-row-num">' + (idx + 2) + '</td>';
                row.forEach((cell, ci) => {
                    const cls = (idx === 2 && ci === 3) ? ' class="ghost-selected"' : '';
                    html += '<td' + cls + '>' + cell + '</td>';
                });
                html += '</tr>';
            });

            // Empty rows to fill screen
            for (let e = rows.length + 2; e < 40; e++) {
                html += '<tr><td class="ghost-row-num">' + e + '</td>';
                for (let c = 0; c < 8; c++) html += '<td></td>';
                html += '</tr>';
            }

            html += '</tbody>';
            table.innerHTML = html;
        }

        // ===== Ghost Button Display Logic =====
        // Zentrale Funktion: Ghost Button sichtbar machen (display:none → flex)
        window._showGhostButton = function() {
            const btn = document.getElementById('ghostPanicBtn');
            if (btn) {
                btn.style.display = 'flex';
            }
        };

        // Beim Laden: Ghost Button NUR zeigen wenn Intro bereits gesehen wurde
        // Neu: Zeige Ghost-Button erst nach kumulierter Besuchszeit (10 Minuten)
        window.initGhostButtonTimer = function() {
            const REQUIRED_MS = 10 * 60 * 1000; // 10 Minuten
            const TOTAL_KEY = 'ghost_total_time_ms';
            const START_KEY = 'ghost_visit_start';
            const MODE_KEY = 'ghost_countdown_mode';

            (function migrateIfNeeded(){
                try {
                    const raw = localStorage.getItem(TOTAL_KEY);
                    const mode = localStorage.getItem(MODE_KEY);
                    if (raw != null && mode !== '1') {
                        const parsed = parseInt(raw || '0', 10);
                        const remaining = Math.max(0, REQUIRED_MS - parsed);
                        localStorage.setItem(TOTAL_KEY, remaining.toString());
                        localStorage.setItem(MODE_KEY, '1');
                    } else if (raw == null) {
                        localStorage.setItem(TOTAL_KEY, REQUIRED_MS.toString());
                        localStorage.setItem(MODE_KEY, '1');
                    }
                } catch (e) {}
            })();

            function getTotal() { return parseInt(localStorage.getItem(TOTAL_KEY) || REQUIRED_MS.toString(), 10); }
            function setTotal(ms) { localStorage.setItem(TOTAL_KEY, Math.max(0, ms).toString()); }

            let countdownInterval = null;
            let sessionBase = 0;

            function startSession() {
                try {
                    const now = Date.now();
                    localStorage.setItem(START_KEY, now.toString());
                    sessionBase = getTotal();
                    if (countdownInterval) clearInterval(countdownInterval);
                    countdownInterval = setInterval(() => {
                        try {
                            const s = parseInt(localStorage.getItem(START_KEY) || '0', 10);
                            if (!s) return;
                            const remaining = Math.max(0, sessionBase - (Date.now() - s));
                            setTotal(remaining);
                            if (remaining <= 0) {
                                clearInterval(countdownInterval);
                                countdownInterval = null;
                            }
                        } catch (e) {}
                    }, 1000);
                } catch (e) {}
            }

            function endSession() {
                try {
                    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
                    localStorage.removeItem(START_KEY);
                } catch (e) {}
            }

            function visibilityHandler() { if (document.visibilityState === 'hidden') endSession(); else startSession(); }

            let showTimeout = null;
            function maybeShow() {
                endSession();
                const total = getTotal();
                if (total <= 0) {
                    window._showGhostButton();
                    // cleanup
                    document.removeEventListener('visibilitychange', visibilityHandler);
                    window.removeEventListener('beforeunload', endSession);
                    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
                    if (showTimeout) { clearTimeout(showTimeout); showTimeout = null; }
                } else {
                    const remaining = total;
                    if (showTimeout) clearTimeout(showTimeout);
                    showTimeout = setTimeout(maybeShow, remaining);
                }
                startSession();
            }

            // Start tracking
            startSession();
            document.addEventListener('visibilitychange', visibilityHandler);
            window.addEventListener('beforeunload', endSession);
            // Initial check
            maybeShow();
        };

        document.addEventListener('DOMContentLoaded', function() {
            if (localStorage.getItem('pro_intro_seen') === 'true') {
                    if (window._showGhostButton) window._showGhostButton();
            }
        });

        // Toggle Ghost Mode
        let vscTypingInterval = null;

        window.toggleGhostMode = function() {
            const excelOverlay = document.getElementById('ghostModeOverlay');
            const vscOverlay = document.getElementById('ghostModeVSCode');
            if (!excelOverlay || !vscOverlay) return;

            ghostActive = !ghostActive;

            if (ghostActive) {
                const skin = getGhostSkin();
                if (skin === 'vscode') {
                    renderVSCodeEditor();
                    vscOverlay.classList.add('active');
                    document.title = 'server-migration.tsx \u2014 MyProject \u2014 Visual Studio Code';
                } else {
                    renderGhostSheet();
                    excelOverlay.classList.add('active');
                    document.title = 'Arbeitszeiterfassung_2026.xlsx - Excel';
                }
            } else {
                excelOverlay.classList.remove('active');
                vscOverlay.classList.remove('active');
                document.title = 'MyWorkLog \u2013 Zeiterfassung';
                if (vscTypingInterval) { clearInterval(vscTypingInterval); vscTypingInterval = null; }
            }
        };

        // Global Keyboard Shortcut: Ctrl+Shift+K
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'K') {
                e.preventDefault();
                e.stopPropagation();
                toggleGhostMode();
            }
            // Also allow Escape to exit Ghost Mode
            if (e.key === 'Escape' && ghostActive) {
                e.preventDefault();
                e.stopPropagation();
                toggleGhostMode();
            }
        }, true); // capture phase for maximum priority

        // ===== VS CODE GHOST MODE — Fake Code Editor =====
        let vscCodeLines = [];
        let vscCurrentLine = 0;

        function generateFakeCode() {
            return [
'<span class="vsc-cmt">/**</span>',
'<span class="vsc-cmt"> * ServerMigrationController — Enterprise Data Pipeline v3.2.1</span>',
'<span class="vsc-cmt"> * Handles real-time WebSocket streams with automatic failover</span>',
'<span class="vsc-cmt"> * @author DevOps Team</span>',
'<span class="vsc-cmt"> */</span>',
'',
'<span class="vsc-kw">import</span> <span class="vsc-op">{</span> <span class="vsc-type">Injectable</span><span class="vsc-op">,</span> <span class="vsc-type">OnModuleInit</span> <span class="vsc-op">}</span> <span class="vsc-kw">from</span> <span class="vsc-str">\'@nestjs/common\'</span><span class="vsc-op">;</span>',
'<span class="vsc-kw">import</span> <span class="vsc-op">{</span> <span class="vsc-type">WebSocketGateway</span><span class="vsc-op">,</span> <span class="vsc-type">SubscribeMessage</span> <span class="vsc-op">}</span> <span class="vsc-kw">from</span> <span class="vsc-str">\'@nestjs/websockets\'</span><span class="vsc-op">;</span>',
'<span class="vsc-kw">import</span> <span class="vsc-op">{</span> <span class="vsc-type">KafkaProducer</span><span class="vsc-op">,</span> <span class="vsc-type">ConsumerGroup</span> <span class="vsc-op">}</span> <span class="vsc-kw">from</span> <span class="vsc-str">\'@confluentinc/kafka-js\'</span><span class="vsc-op">;</span>',
'<span class="vsc-kw">import</span> <span class="vsc-op">{</span> <span class="vsc-type">RedisCluster</span> <span class="vsc-op">}</span> <span class="vsc-kw">from</span> <span class="vsc-str">\'ioredis\'</span><span class="vsc-op">;</span>',
'<span class="vsc-kw">import</span> <span class="vsc-op">{</span> <span class="vsc-fn">createHash</span><span class="vsc-op">,</span> <span class="vsc-fn">randomUUID</span> <span class="vsc-op">}</span> <span class="vsc-kw">from</span> <span class="vsc-str">\'node:crypto\'</span><span class="vsc-op">;</span>',
'<span class="vsc-kw">import</span> <span class="vsc-kw">type</span> <span class="vsc-op">{</span> <span class="vsc-type">MigrationPayload</span><span class="vsc-op">,</span> <span class="vsc-type">ClusterNode</span><span class="vsc-op">,</span> <span class="vsc-type">HealthCheck</span> <span class="vsc-op">}</span> <span class="vsc-kw">from</span> <span class="vsc-str">\'./types/infrastructure\'</span><span class="vsc-op">;</span>',
'',
'<span class="vsc-kw">interface</span> <span class="vsc-type">ReplicationConfig</span> <span class="vsc-op">{</span>',
'  <span class="vsc-var">primaryEndpoint</span><span class="vsc-op">:</span> <span class="vsc-type">string</span><span class="vsc-op">;</span>',
'  <span class="vsc-var">replicaNodes</span><span class="vsc-op">:</span> <span class="vsc-type">ClusterNode</span><span class="vsc-op">[];</span>',
'  <span class="vsc-var">consistencyLevel</span><span class="vsc-op">:</span> <span class="vsc-str">\'strong\'</span> <span class="vsc-op">|</span> <span class="vsc-str">\'eventual\'</span> <span class="vsc-op">|</span> <span class="vsc-str">\'quorum\'</span><span class="vsc-op">;</span>',
'  <span class="vsc-var">maxRetries</span><span class="vsc-op">:</span> <span class="vsc-type">number</span><span class="vsc-op">;</span>',
'  <span class="vsc-var">heartbeatMs</span><span class="vsc-op">:</span> <span class="vsc-type">number</span><span class="vsc-op">;</span>',
'<span class="vsc-op">}</span>',
'',
'<span class="vsc-dec">@Injectable</span><span class="vsc-op">()</span>',
'<span class="vsc-dec">@WebSocketGateway</span><span class="vsc-op">(</span><span class="vsc-num">8443</span><span class="vsc-op">,</span> <span class="vsc-op">{</span> <span class="vsc-var">namespace</span><span class="vsc-op">:</span> <span class="vsc-str">\'/migration\'</span><span class="vsc-op">,</span> <span class="vsc-var">cors</span><span class="vsc-op">:</span> <span class="vsc-kw">true</span> <span class="vsc-op">})</span>',
'<span class="vsc-kw">export class</span> <span class="vsc-type">ServerMigrationController</span> <span class="vsc-kw">implements</span> <span class="vsc-type">OnModuleInit</span> <span class="vsc-op">{</span>',
'  <span class="vsc-kw">private readonly</span> <span class="vsc-var">kafka</span><span class="vsc-op">:</span> <span class="vsc-type">KafkaProducer</span><span class="vsc-op">;</span>',
'  <span class="vsc-kw">private readonly</span> <span class="vsc-var">redis</span><span class="vsc-op">:</span> <span class="vsc-type">RedisCluster</span><span class="vsc-op">;</span>',
'  <span class="vsc-kw">private</span> <span class="vsc-var">activeNodes</span><span class="vsc-op">:</span> <span class="vsc-type">Map</span><span class="vsc-op">&lt;</span><span class="vsc-type">string</span><span class="vsc-op">,</span> <span class="vsc-type">ClusterNode</span><span class="vsc-op">&gt;</span> <span class="vsc-op">=</span> <span class="vsc-kw">new</span> <span class="vsc-type">Map</span><span class="vsc-op">();</span>',
'  <span class="vsc-kw">private</span> <span class="vsc-var">migrationLock</span><span class="vsc-op">:</span> <span class="vsc-type">boolean</span> <span class="vsc-op">=</span> <span class="vsc-kw">false</span><span class="vsc-op">;</span>',
'',
'  <span class="vsc-kw">constructor</span><span class="vsc-op">(</span>',
'    <span class="vsc-kw">private readonly</span> <span class="vsc-var">config</span><span class="vsc-op">:</span> <span class="vsc-type">ReplicationConfig</span><span class="vsc-op">,</span>',
'    <span class="vsc-kw">private readonly</span> <span class="vsc-var">logger</span><span class="vsc-op">:</span> <span class="vsc-type">Logger</span><span class="vsc-op">,</span>',
'  <span class="vsc-op">) {</span>',
'    <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">kafka</span> <span class="vsc-op">=</span> <span class="vsc-kw">new</span> <span class="vsc-type">KafkaProducer</span><span class="vsc-op">({</span>',
'      <span class="vsc-var">brokers</span><span class="vsc-op">:</span> <span class="vsc-op">[</span><span class="vsc-str">\'kafka-01.internal:9092\'</span><span class="vsc-op">,</span> <span class="vsc-str">\'kafka-02.internal:9092\'</span><span class="vsc-op">],</span>',
'      <span class="vsc-var">clientId</span><span class="vsc-op">:</span> <span class="vsc-str">\'migration-service\'</span><span class="vsc-op">,</span>',
'      <span class="vsc-var">ssl</span><span class="vsc-op">:</span> <span class="vsc-kw">true</span><span class="vsc-op">,</span>',
'      <span class="vsc-var">sasl</span><span class="vsc-op">:</span> <span class="vsc-op">{</span> <span class="vsc-var">mechanism</span><span class="vsc-op">:</span> <span class="vsc-str">\'scram-sha-512\'</span><span class="vsc-op">,</span> <span class="vsc-var">username</span><span class="vsc-op">:</span> <span class="vsc-var">process</span><span class="vsc-op">.</span><span class="vsc-var">env</span><span class="vsc-op">.</span><span class="vsc-var">KAFKA_USER</span><span class="vsc-op">,</span> <span class="vsc-var">password</span><span class="vsc-op">:</span> <span class="vsc-var">process</span><span class="vsc-op">.</span><span class="vsc-var">env</span><span class="vsc-op">.</span><span class="vsc-var">KAFKA_PASS</span> <span class="vsc-op">},</span>',
'    <span class="vsc-op">});</span>',
'    <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">redis</span> <span class="vsc-op">=</span> <span class="vsc-kw">new</span> <span class="vsc-type">RedisCluster</span><span class="vsc-op">([{</span> <span class="vsc-var">host</span><span class="vsc-op">:</span> <span class="vsc-str">\'redis-sentinel.internal\'</span><span class="vsc-op">,</span> <span class="vsc-var">port</span><span class="vsc-op">:</span> <span class="vsc-num">26379</span> <span class="vsc-op">}]);</span>',
'  <span class="vsc-op">}</span>',
'',
'  <span class="vsc-kw">async</span> <span class="vsc-fn">onModuleInit</span><span class="vsc-op">(): </span><span class="vsc-type">Promise</span><span class="vsc-op">&lt;</span><span class="vsc-type">void</span><span class="vsc-op">&gt; {</span>',
'    <span class="vsc-kw">await</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-fn">initializeCluster</span><span class="vsc-op">();</span>',
'    <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-fn">startHealthMonitor</span><span class="vsc-op">();</span>',
'    <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">logger</span><span class="vsc-op">.</span><span class="vsc-fn">log</span><span class="vsc-op">(</span><span class="vsc-str">\'Migration controller initialized — \'</span> <span class="vsc-op">+</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">config</span><span class="vsc-op">.</span><span class="vsc-var">replicaNodes</span><span class="vsc-op">.</span><span class="vsc-var">length</span> <span class="vsc-op">+</span> <span class="vsc-str">\'nodes\'</span><span class="vsc-op">);</span>',
'  <span class="vsc-op">}</span>',
'',
'  <span class="vsc-kw">private async</span> <span class="vsc-fn">initializeCluster</span><span class="vsc-op">(): </span><span class="vsc-type">Promise</span><span class="vsc-op">&lt;</span><span class="vsc-type">void</span><span class="vsc-op">&gt; {</span>',
'    <span class="vsc-kw">const</span> <span class="vsc-var">promises</span> <span class="vsc-op">=</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">config</span><span class="vsc-op">.</span><span class="vsc-var">replicaNodes</span><span class="vsc-op">.</span><span class="vsc-fn">map</span><span class="vsc-op">(</span><span class="vsc-kw">async</span> <span class="vsc-op">(</span><span class="vsc-var">node</span><span class="vsc-op">)</span> <span class="vsc-op">=&gt; {</span>',
'      <span class="vsc-kw">const</span> <span class="vsc-var">health</span> <span class="vsc-op">=</span> <span class="vsc-kw">await</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-fn">checkNodeHealth</span><span class="vsc-op">(</span><span class="vsc-var">node</span><span class="vsc-op">);</span>',
'      <span class="vsc-kw">if</span> <span class="vsc-op">(</span><span class="vsc-var">health</span><span class="vsc-op">.</span><span class="vsc-var">status</span> <span class="vsc-op">===</span> <span class="vsc-str">\'healthy\'</span><span class="vsc-op">)</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">activeNodes</span><span class="vsc-op">.</span><span class="vsc-fn">set</span><span class="vsc-op">(</span><span class="vsc-var">node</span><span class="vsc-op">.</span><span class="vsc-var">id</span><span class="vsc-op">,</span> <span class="vsc-var">node</span><span class="vsc-op">);</span>',
'    <span class="vsc-op">});</span>',
'    <span class="vsc-kw">await</span> <span class="vsc-type">Promise</span><span class="vsc-op">.</span><span class="vsc-fn">allSettled</span><span class="vsc-op">(</span><span class="vsc-var">promises</span><span class="vsc-op">);</span>',
'  <span class="vsc-op">}</span>',
'',
'  <span class="vsc-dec">@SubscribeMessage</span><span class="vsc-op">(</span><span class="vsc-str">\'migrate:start\'</span><span class="vsc-op">)</span>',
'  <span class="vsc-kw">async</span> <span class="vsc-fn">handleMigration</span><span class="vsc-op">(</span><span class="vsc-var">client</span><span class="vsc-op">:</span> <span class="vsc-type">Socket</span><span class="vsc-op">,</span> <span class="vsc-var">payload</span><span class="vsc-op">:</span> <span class="vsc-type">MigrationPayload</span><span class="vsc-op">): </span><span class="vsc-type">Promise</span><span class="vsc-op">&lt;</span><span class="vsc-type">void</span><span class="vsc-op">&gt; {</span>',
'    <span class="vsc-kw">if</span> <span class="vsc-op">(</span><span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">migrationLock</span><span class="vsc-op">) {</span>',
'      <span class="vsc-var">client</span><span class="vsc-op">.</span><span class="vsc-fn">emit</span><span class="vsc-op">(</span><span class="vsc-str">\'migrate:error\'</span><span class="vsc-op">,</span> <span class="vsc-op">{</span> <span class="vsc-var">code</span><span class="vsc-op">:</span> <span class="vsc-str">\'LOCK_ACTIVE\'</span><span class="vsc-op">,</span> <span class="vsc-var">retryAfter</span><span class="vsc-op">:</span> <span class="vsc-num">30000</span> <span class="vsc-op">});</span>',
'      <span class="vsc-kw">return</span><span class="vsc-op">;</span>',
'    <span class="vsc-op">}</span>',
'',
'    <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">migrationLock</span> <span class="vsc-op">=</span> <span class="vsc-kw">true</span><span class="vsc-op">;</span>',
'    <span class="vsc-kw">const</span> <span class="vsc-var">traceId</span> <span class="vsc-op">=</span> <span class="vsc-fn">randomUUID</span><span class="vsc-op">();</span>',
'    <span class="vsc-kw">const</span> <span class="vsc-var">checksum</span> <span class="vsc-op">=</span> <span class="vsc-fn">createHash</span><span class="vsc-op">(</span><span class="vsc-str">\'sha256\'</span><span class="vsc-op">).</span><span class="vsc-fn">update</span><span class="vsc-op">(</span><span class="vsc-type">JSON</span><span class="vsc-op">.</span><span class="vsc-fn">stringify</span><span class="vsc-op">(</span><span class="vsc-var">payload</span><span class="vsc-op">)).</span><span class="vsc-fn">digest</span><span class="vsc-op">(</span><span class="vsc-str">\'hex\'</span><span class="vsc-op">);</span>',
'',
'    <span class="vsc-kw">try</span> <span class="vsc-op">{</span>',
'      <span class="vsc-cmt">// Phase 1: Validate cluster quorum</span>',
'      <span class="vsc-kw">const</span> <span class="vsc-var">quorum</span> <span class="vsc-op">=</span> <span class="vsc-kw">await</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-fn">validateQuorum</span><span class="vsc-op">();</span>',
'      <span class="vsc-kw">if</span> <span class="vsc-op">(!</span><span class="vsc-var">quorum</span><span class="vsc-op">.</span><span class="vsc-var">isReady</span><span class="vsc-op">) </span><span class="vsc-kw">throw new</span> <span class="vsc-type">Error</span><span class="vsc-op">(</span><span class="vsc-str">\'Quorum not met: \'</span> <span class="vsc-op">+</span> <span class="vsc-var">quorum</span><span class="vsc-op">.</span><span class="vsc-var">available</span> <span class="vsc-op">+</span> <span class="vsc-str">\'/\'</span> <span class="vsc-op">+</span> <span class="vsc-var">quorum</span><span class="vsc-op">.</span><span class="vsc-var">required</span><span class="vsc-op">);</span>',
'',
'      <span class="vsc-cmt">// Phase 2: Distribute shards across replicas</span>',
'      <span class="vsc-kw">for</span> <span class="vsc-op">(</span><span class="vsc-kw">const</span> <span class="vsc-op">[</span><span class="vsc-var">nodeId</span><span class="vsc-op">,</span> <span class="vsc-var">node</span><span class="vsc-op">]</span> <span class="vsc-kw">of</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">activeNodes</span><span class="vsc-op">) {</span>',
'        <span class="vsc-kw">const</span> <span class="vsc-var">shardKey</span> <span class="vsc-op">=</span> <span class="vsc-fn">createHash</span><span class="vsc-op">(</span><span class="vsc-str">\'md5\'</span><span class="vsc-op">).</span><span class="vsc-fn">update</span><span class="vsc-op">(</span><span class="vsc-var">nodeId</span> <span class="vsc-op">+</span> <span class="vsc-var">traceId</span><span class="vsc-op">).</span><span class="vsc-fn">digest</span><span class="vsc-op">(</span><span class="vsc-str">\'hex\'</span><span class="vsc-op">).</span><span class="vsc-fn">slice</span><span class="vsc-op">(</span><span class="vsc-num">0</span><span class="vsc-op">,</span> <span class="vsc-num">8</span><span class="vsc-op">);</span>',
'        <span class="vsc-kw">await</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">kafka</span><span class="vsc-op">.</span><span class="vsc-fn">send</span><span class="vsc-op">({</span>',
'          <span class="vsc-var">topic</span><span class="vsc-op">:</span> <span class="vsc-str">\'migration.shard.distribute\'</span><span class="vsc-op">,</span>',
'          <span class="vsc-var">messages</span><span class="vsc-op">:</span> <span class="vsc-op">[{</span> <span class="vsc-var">key</span><span class="vsc-op">:</span> <span class="vsc-var">shardKey</span><span class="vsc-op">,</span> <span class="vsc-var">value</span><span class="vsc-op">:</span> <span class="vsc-type">JSON</span><span class="vsc-op">.</span><span class="vsc-fn">stringify</span><span class="vsc-op">({</span> <span class="vsc-var">traceId</span><span class="vsc-op">,</span> <span class="vsc-var">nodeId</span><span class="vsc-op">,</span> <span class="vsc-var">payload</span><span class="vsc-op">,</span> <span class="vsc-var">checksum</span> <span class="vsc-op">})</span> <span class="vsc-op">}],</span>',
'        <span class="vsc-op">});</span>',
'        <span class="vsc-kw">await</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">redis</span><span class="vsc-op">.</span><span class="vsc-fn">hset</span><span class="vsc-op">(</span><span class="vsc-str">\'migration:\'</span> <span class="vsc-op">+</span> <span class="vsc-var">traceId</span><span class="vsc-op">,</span> <span class="vsc-var">nodeId</span><span class="vsc-op">,</span> <span class="vsc-str">\'pending\'</span><span class="vsc-op">);</span>',
'      <span class="vsc-op">}</span>',
'',
'      <span class="vsc-cmt">// Phase 3: Await consensus with exponential backoff</span>',
'      <span class="vsc-kw">let</span> <span class="vsc-var">retries</span> <span class="vsc-op">=</span> <span class="vsc-num">0</span><span class="vsc-op">;</span>',
'      <span class="vsc-kw">while</span> <span class="vsc-op">(</span><span class="vsc-var">retries</span> <span class="vsc-op">&lt;</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">config</span><span class="vsc-op">.</span><span class="vsc-var">maxRetries</span><span class="vsc-op">) {</span>',
'        <span class="vsc-kw">const</span> <span class="vsc-var">states</span> <span class="vsc-op">=</span> <span class="vsc-kw">await</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">redis</span><span class="vsc-op">.</span><span class="vsc-fn">hgetall</span><span class="vsc-op">(</span><span class="vsc-str">\'migration:\'</span> <span class="vsc-op">+</span> <span class="vsc-var">traceId</span><span class="vsc-op">);</span>',
'        <span class="vsc-kw">const</span> <span class="vsc-var">completed</span> <span class="vsc-op">=</span> <span class="vsc-type">Object</span><span class="vsc-op">.</span><span class="vsc-fn">values</span><span class="vsc-op">(</span><span class="vsc-var">states</span><span class="vsc-op">).</span><span class="vsc-fn">filter</span><span class="vsc-op">(</span><span class="vsc-var">s</span> <span class="vsc-op">=&gt;</span> <span class="vsc-var">s</span> <span class="vsc-op">===</span> <span class="vsc-str">\'done\'</span><span class="vsc-op">).</span><span class="vsc-var">length</span><span class="vsc-op">;</span>',
'        <span class="vsc-kw">if</span> <span class="vsc-op">(</span><span class="vsc-var">completed</span> <span class="vsc-op">===</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">activeNodes</span><span class="vsc-op">.</span><span class="vsc-var">size</span><span class="vsc-op">) </span><span class="vsc-kw">break</span><span class="vsc-op">;</span>',
'        <span class="vsc-kw">await</span> <span class="vsc-kw">new</span> <span class="vsc-type">Promise</span><span class="vsc-op">(</span><span class="vsc-var">r</span> <span class="vsc-op">=&gt;</span> <span class="vsc-fn">setTimeout</span><span class="vsc-op">(</span><span class="vsc-var">r</span><span class="vsc-op">,</span> <span class="vsc-type">Math</span><span class="vsc-op">.</span><span class="vsc-fn">min</span><span class="vsc-op">(</span><span class="vsc-num">1000</span> <span class="vsc-op">*</span> <span class="vsc-num">2</span> <span class="vsc-op">**</span> <span class="vsc-var">retries</span><span class="vsc-op">,</span> <span class="vsc-num">30000</span><span class="vsc-op">)));</span>',
'        <span class="vsc-var">retries</span><span class="vsc-op">++;</span>',
'      <span class="vsc-op">}</span>',
'',
'      <span class="vsc-var">client</span><span class="vsc-op">.</span><span class="vsc-fn">emit</span><span class="vsc-op">(</span><span class="vsc-str">\'migrate:complete\'</span><span class="vsc-op">,</span> <span class="vsc-op">{</span> <span class="vsc-var">traceId</span><span class="vsc-op">,</span> <span class="vsc-var">checksum</span><span class="vsc-op">,</span> <span class="vsc-var">nodesAffected</span><span class="vsc-op">:</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">activeNodes</span><span class="vsc-op">.</span><span class="vsc-var">size</span> <span class="vsc-op">});</span>',
'    <span class="vsc-op">}</span> <span class="vsc-kw">catch</span> <span class="vsc-op">(</span><span class="vsc-var">err</span><span class="vsc-op">) {</span>',
'      <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">logger</span><span class="vsc-op">.</span><span class="vsc-fn">error</span><span class="vsc-op">(</span><span class="vsc-str">\'Migration failed [\'</span> <span class="vsc-op">+</span> <span class="vsc-var">traceId</span> <span class="vsc-op">+</span> <span class="vsc-str">\']:\'</span><span class="vsc-op">,</span> <span class="vsc-var">err</span><span class="vsc-op">.</span><span class="vsc-var">stack</span><span class="vsc-op">);</span>',
'      <span class="vsc-var">client</span><span class="vsc-op">.</span><span class="vsc-fn">emit</span><span class="vsc-op">(</span><span class="vsc-str">\'migrate:error\'</span><span class="vsc-op">,</span> <span class="vsc-op">{</span> <span class="vsc-var">code</span><span class="vsc-op">:</span> <span class="vsc-str">\'MIGRATION_FAILED\'</span><span class="vsc-op">,</span> <span class="vsc-var">traceId</span><span class="vsc-op">,</span> <span class="vsc-var">message</span><span class="vsc-op">:</span> <span class="vsc-var">err</span><span class="vsc-op">.</span><span class="vsc-var">message</span> <span class="vsc-op">});</span>',
'    <span class="vsc-op">}</span> <span class="vsc-kw">finally</span> <span class="vsc-op">{</span>',
'      <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">migrationLock</span> <span class="vsc-op">=</span> <span class="vsc-kw">false</span><span class="vsc-op">;</span>',
'    <span class="vsc-op">}</span>',
'  <span class="vsc-op">}</span>',
'',
'  <span class="vsc-kw">private</span> <span class="vsc-fn">startHealthMonitor</span><span class="vsc-op">(): </span><span class="vsc-type">void</span> <span class="vsc-op">{</span>',
'    <span class="vsc-fn">setInterval</span><span class="vsc-op">(</span><span class="vsc-kw">async</span> <span class="vsc-op">() =&gt; {</span>',
'      <span class="vsc-kw">for</span> <span class="vsc-op">(</span><span class="vsc-kw">const</span> <span class="vsc-op">[</span><span class="vsc-var">id</span><span class="vsc-op">,</span> <span class="vsc-var">node</span><span class="vsc-op">]</span> <span class="vsc-kw">of</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">activeNodes</span><span class="vsc-op">) {</span>',
'        <span class="vsc-kw">const</span> <span class="vsc-var">h</span> <span class="vsc-op">=</span> <span class="vsc-kw">await</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-fn">checkNodeHealth</span><span class="vsc-op">(</span><span class="vsc-var">node</span><span class="vsc-op">).</span><span class="vsc-fn">catch</span><span class="vsc-op">(() =&gt; ({</span> <span class="vsc-var">status</span><span class="vsc-op">:</span> <span class="vsc-str">\'unreachable\'</span> <span class="vsc-op">}));</span>',
'        <span class="vsc-kw">if</span> <span class="vsc-op">(</span><span class="vsc-var">h</span><span class="vsc-op">.</span><span class="vsc-var">status</span> <span class="vsc-op">!==</span> <span class="vsc-str">\'healthy\'</span><span class="vsc-op">) {</span>',
'          <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">logger</span><span class="vsc-op">.</span><span class="vsc-fn">warn</span><span class="vsc-op">(</span><span class="vsc-str">\'Node \'</span> <span class="vsc-op">+</span> <span class="vsc-var">id</span> <span class="vsc-op">+</span> <span class="vsc-str">\'degraded — initiating failover\'</span><span class="vsc-op">);</span>',
'          <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">activeNodes</span><span class="vsc-op">.</span><span class="vsc-fn">delete</span><span class="vsc-op">(</span><span class="vsc-var">id</span><span class="vsc-op">);</span>',
'        <span class="vsc-op">}</span>',
'      <span class="vsc-op">}</span>',
'    <span class="vsc-op">},</span> <span class="vsc-kw">this</span><span class="vsc-op">.</span><span class="vsc-var">config</span><span class="vsc-op">.</span><span class="vsc-var">heartbeatMs</span><span class="vsc-op">);</span>',
'  <span class="vsc-op">}</span>',
'<span class="vsc-op">}</span>',
            ];
        }

        function renderVSCodeEditor() {
            var editor = document.getElementById('vscEditorContent');
            if (!editor) return;
            // Reset on each activation
            if (vscTypingInterval) { clearInterval(vscTypingInterval); vscTypingInterval = null; }
            editor.innerHTML = '';
            vscCodeLines = generateFakeCode();
            vscCurrentLine = 0;
            // Render first batch instantly
            var initialBatch = Math.min(35, vscCodeLines.length);
            for (var i = 0; i < initialBatch; i++) {
                appendVSCLine(editor, i);
            }
            vscCurrentLine = initialBatch;
            // Then slowly type remaining lines
            if (vscCurrentLine < vscCodeLines.length) {
                vscTypingInterval = setInterval(function() {
                    if (vscCurrentLine >= vscCodeLines.length) {
                        clearInterval(vscTypingInterval);
                        vscTypingInterval = null;
                        return;
                    }
                    appendVSCLine(editor, vscCurrentLine);
                    // Remove previous active-line
                    var prev = editor.querySelector('.vsc-active-line');
                    if (prev) prev.classList.remove('vsc-active-line');
                    // Mark current as active
                    var lines = editor.querySelectorAll('.vsc-line');
                    if (lines.length) lines[lines.length - 1].classList.add('vsc-active-line');
                    editor.scrollTop = editor.scrollHeight;
                    vscCurrentLine++;
                }, 800 + Math.random() * 1500);
            }
        }

        function appendVSCLine(editor, idx) {
            var div = document.createElement('div');
            div.className = 'vsc-line';
            div.innerHTML = '<span class="vsc-line-num">' + (idx + 1) + '</span><span class="vsc-line-code">' + vscCodeLines[idx] + '</span>';
            editor.appendChild(div);
        }

    })();