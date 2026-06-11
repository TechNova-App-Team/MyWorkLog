// =========================================
//  KONFIGURATION
// =========================================
let currentRange = 7;

// =========================================
//  HELPERS
// =========================================
function fmt(n) {
    if (n == null) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}

function fmtDuration(seconds) {
    if (!seconds || seconds <= 0) return '0s';
    var totalSecs = Math.round(seconds);
    var hrs = Math.floor(totalSecs / 3600);
    var mins = Math.floor((totalSecs % 3600) / 60);
    var secs = totalSecs % 60;
    if (hrs > 0) return hrs + 'h ' + mins + 'm';
    if (mins > 0) return mins + 'm ' + secs + 's';
    return secs + 's';
}

function getRange(days) {
    const end = Date.now();
    const start = end - (days * 24 * 60 * 60 * 1000);
    return { startAt: start, endAt: end };
}

function getUnit(days) {
    if (days <= 1) return 'hour';
    if (days <= 90) return 'day';
    return 'month';
}

function setTimeRange(days) {
    currentRange = days;
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.range) === days);
    });
    const labels = { 1: '24h', 7: '7 Tage', 30: '30 Tage', 90: '90 Tage', 365: '1 Jahr' };
    document.getElementById('chartPeriodLabel').textContent = labels[days] || days + ' Tage';
    document.getElementById('chartPeriodLabel2').textContent = labels[days] || days + ' Tage';
    loadAll();
}

function switchTab(btn, tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
}

const COUNTRY_FLAGS = {
    'DE':'🇩🇪','AT':'🇦🇹','CH':'🇨🇭','US':'🇺🇸','GB':'🇬🇧','FR':'🇫🇷','NL':'🇳🇱',
    'PL':'🇵🇱','IT':'🇮🇹','ES':'🇪🇸','SE':'🇸🇪','NO':'🇳🇴','DK':'🇩🇰','FI':'🇫🇮',
    'BE':'🇧🇪','CZ':'🇨🇿','RO':'🇷🇴','PT':'🇵🇹','HU':'🇭🇺','RU':'🇷🇺','CN':'🇨🇳',
    'JP':'🇯🇵','KR':'🇰🇷','IN':'🇮🇳','BR':'🇧🇷','CA':'🇨🇦','AU':'🇦🇺','MX':'🇲🇽',
    'TR':'🇹🇷','UA':'🇺🇦','IE':'🇮🇪','ZA':'🇿🇦','AR':'🇦🇷','CL':'🇨🇱','CO':'🇨🇴',
    'GR':'🇬🇷','HR':'🇭🇷','SK':'🇸🇰','SI':'🇸🇮','BG':'🇧🇬','LT':'🇱🇹','LV':'🇱🇻',
    'EE':'🇪🇪','LU':'🇱🇺','IL':'🇮🇱','TW':'🇹🇼','SG':'🇸🇬','HK':'🇭🇰','NZ':'🇳🇿',
};

function countryName(code) {
    const flag = COUNTRY_FLAGS[code] || '🏳️';
    try {
        const name = new Intl.DisplayNames(['de'], { type: 'region' }).of(code);
        return flag + ' ' + name;
    } catch { return flag + ' ' + code; }
}

function langName(code) {
    try {
        const base = code.split('-')[0];
        return new Intl.DisplayNames(['de'], { type: 'language' }).of(base) + ' (' + code + ')';
    } catch { return code; }
}

const DEVICE_ICONS = { 'desktop': '🖥️', 'mobile': '📱', 'tablet': '📱', 'laptop': '💻' };
const DEVICE_COLORS = { 'desktop': 'var(--primary)', 'mobile': 'var(--success)', 'tablet': 'var(--warning)', 'laptop': 'var(--info)' };

// =========================================
//  ANIMATED COUNTER
// =========================================
function animateValue(el, target, suffix, duration) {
    if (!el) return;
    suffix = suffix || '';
    duration = duration || 800;
    var start = 0;
    var startTime = null;
    var isFloat = String(target).includes('.');
    function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        var current = start + (target - start) * eased;
        el.textContent = (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// =========================================
//  INSIGHTS ENGINE
// =========================================
function generateInsights(stats, prevStats, devices, pageviewsData, topPages) {
    var insights = [];
    var pv = extractVal(stats.pageviews);
    var vis = extractVal(stats.visitors);
    var visits = extractVal(stats.visits);
    var bounces = extractVal(stats.bounces);
    var totaltime = extractVal(stats.totaltime);

    // Traffic trend
    if (prevStats) {
        var ppv = extractVal(prevStats.pageviews);
        if (ppv > 0) {
            var change = ((pv - ppv) / ppv * 100).toFixed(0);
            if (change > 10) {
                insights.push({ icon: '📈', text: '<strong>Traffic ↑' + change + '%</strong> im Vergleich zum Vorzeitraum — starkes Wachstum!' });
            } else if (change < -10) {
                insights.push({ icon: '📉', text: 'Traffic <strong>↓' + Math.abs(change) + '%</strong> im Vergleich zum Vorzeitraum. Evtl. saisonale Schwankung.' });
            } else {
                insights.push({ icon: '📊', text: 'Traffic ist <strong>stabil</strong> im Vergleich zum Vorzeitraum (' + (change >= 0 ? '+' : '') + change + '%).' });
            }
        }
    }

    // Bounce rate insight
    var br = visits > 0 ? (bounces / visits * 100) : 0;
    if (br < 30) {
        insights.push({ icon: '🎯', text: 'Bounce Rate nur <strong>' + br.toFixed(0) + '%</strong> — Nutzer interagieren aktiv mit der App!' });
    } else if (br > 60) {
        insights.push({ icon: '⚠️', text: 'Bounce Rate bei <strong>' + br.toFixed(0) + '%</strong> — viele Nutzer verlassen die Seite sofort.' });
    }

    // Average time insight
    var avgTime = visits > 0 ? totaltime / visits : 0;
    if (avgTime > 300) {
        insights.push({ icon: '⏱️', text: 'Nutzer verbringen durchschnittlich <strong>' + fmtDuration(avgTime) + '</strong> — hohe Engagement-Zeit!' });
    } else if (avgTime > 60) {
        insights.push({ icon: '⏱️', text: 'Ø Verweildauer: <strong>' + fmtDuration(avgTime) + '</strong> pro Session.' });
    }

    // Devices insight
    if (devices && devices.length > 0) {
        var totalDevices = devices.reduce(function(s,d) { return s + d.y; }, 0);
        var mobile = devices.find(function(d) { return d.x === 'mobile'; });
        var mobilePct = mobile ? ((mobile.y / totalDevices) * 100).toFixed(0) : 0;
        if (mobilePct > 50) {
            insights.push({ icon: '📱', text: '<strong>' + mobilePct + '% mobile Nutzer</strong> — die PWA wird hauptsächlich am Handy genutzt.' });
        } else if (mobilePct > 0) {
            insights.push({ icon: '🖥️', text: '<strong>' + (100 - mobilePct) + '% Desktop</strong>, ' + mobilePct + '% Mobile — ausgewogene Nutzung.' });
        }
    }

    // Pages/session insight
    var pps = visits > 0 ? (pv / visits) : 0;
    if (pps > 3) {
        insights.push({ icon: '🔥', text: '<strong>' + pps.toFixed(1) + ' Seiten pro Session</strong> — Nutzer erkunden verschiedene Features.' });
    }

    // Top page insight
    if (topPages && topPages.length > 0) {
        var top = topPages[0];
        var topPct = pv > 0 ? ((top.pageviews || top.y || 0) / pv * 100).toFixed(0) : 0;
        insights.push({ icon: '🏆', text: 'Beliebteste Seite: <strong>' + (top.name || top.x) + '</strong> mit ' + topPct + '% aller Aufrufe.' });
    }

    // Total time insight
    if (totaltime > 3600) {
        var hrs = (totaltime / 3600).toFixed(1);
        insights.push({ icon: '📅', text: 'Insgesamt <strong>' + hrs + ' Stunden</strong> Nutzungszeit im ausgewählten Zeitraum.' });
    }

    if (insights.length === 0) {
        insights.push({ icon: '📊', text: 'Noch nicht genug Daten für automatische Insights. Schau in ein paar Tagen nochmal rein!' });
    }

    return insights;
}

function renderInsights(insights) {
    var el = document.getElementById('insightsGrid');
    if (!el) return;
    el.innerHTML = insights.map(function(ins) {
        return '<div class="insight-item"><div class="insight-icon">' + ins.icon + '</div><div class="insight-text">' + ins.text + '</div></div>';
    }).join('');
}

function extractVal(v) {
    return (typeof v === 'object' && v !== null) ? (v.value || 0) : (v || 0);
}

// =========================================
//  BOT DETECTION & FILTERING
//  Removes known crawler, bot, and datacenter traffic from analytics
// =========================================
function isKnownBot(name) {
    if (!name) return false;
    const lower = name.toLowerCase();
    
    // Known bot/crawler patterns in browser/os/referrer names
    const botPatterns = [
        // Search engine bots
        /googlebot|google-/i,
        /bingbot|bingpreview/i,
        /slurp|yahoobot/i,
        /duckduck|qwant|baidu|yandexbot|sogou|exabot/i,
        /teoma|msnbot|ccbot|naverbot|yona/i,
        
        // Social media crawlers
        /facebookexternal|fbbot|twitterbot|pinterest|LinkedIn|WhatsApp|Telegram/i,
        /slack|discord|viber|skype|whatsapp|wechat|line|kakao/i,
        /reddit|redditbot|instagram|tiktok|snapchat/i,
        
        // Security scanners & penetration testing
        /nessus|openvas|nmap|masscan|zmap|sqlmap|havij|commix|xsstrike|nikto|dirbuster|zap|burp|acunetix/i,
        /netsparker|mandiant|coreimpact|metasploit/i,
        
        // Monitoring & uptime robots
        /monitoring-bot|uptime|healthcheck|pingdom|statuspage|uptimerobot|monitis|nagios|zabbix|datadog|dynatrace|newrelic|elastic|splunk|sentry|prometheus/i,
        /apptio|stackify|papertrail|sumo|logz/i,
        
        // Web scrapers & automation
        /scrapy|selenium|puppeteer|watir|phantomjs|headless|chrome-headless/i,
        /webdriver|apify|diffbot|scraperapi|scrapinghub/i,
        
        // Content aggregators
        /ahrefs|semrush|majestic|mj12bot|ahrefsbot|semrushbot/i,
        /feedburner|superfeedr|feedpress|rsscloud|ifeedbot/i,
        
        // Infrastructure & cloud
        /aws|ec2|elasticbeanstalk|azure|gce|google-cloud|cloudflare|fastly/i,
        /digitalocean|linode|vultr|ovh|hetzner|vps|virtualhost/i,
        
        // Misc tools
        /curl|wget|python|java|node|ruby|perl|node-fetch|http-client/i,
        /postman|insomnia|thunder|httpie|rest-client/i,
        /archive\.org|ia_archiver|wayback|preservation/i,
        /bot[-_]?user|spider|crawler|scraper|robot|agent/i,
    ];
    
    return botPatterns.some(pattern => pattern.test(lower));
}

function filterBotMetrics(data) {
    if (!Array.isArray(data)) return data;
    return data.filter(item => {
        // Item should have .x (name) or .name property
        const name = item.x || item.name || '';
        return !isKnownBot(name);
    });
}

// =========================================
//  FILTER: Clean & normalize page paths
// =========================================

// Paths that should be completely excluded (tokens, fragments with sensitive data, etc.)
function isIrrelevantPage(path) {
    if (!path) return true;
    // Filter out URLs with access tokens, auth fragments, or other sensitive data
    if (/#(access_token|token|code|state|session|error|id_token)[\s=]/i.test(path)) return true;
    if (/#access_token=/i.test(path)) return true;
    // Filter out very long hash fragments (likely tokens)
    var hashIdx = path.indexOf('#');
    if (hashIdx !== -1 && path.substring(hashIdx).length > 40) return true;
    return false;
}

// Normalize path: collapse index.html, strip hashes/query, unify base path
function normalizePath(path) {
    if (!path) return '/MyWorkLog/';
    // Remove hash fragments entirely
    var hashIdx = path.indexOf('#');
    if (hashIdx !== -1) path = path.substring(0, hashIdx);
    // Remove query strings
    var qIdx = path.indexOf('?');
    if (qIdx !== -1) path = path.substring(0, qIdx);
    // /index.html → /  (collapse index.html to directory)
    path = path.replace(/\/index\.html$/i, '/');
    // Normalize bare "/" or empty to the actual site root "/MyWorkLog/"
    if (path === '/' || path === '') path = '/MyWorkLog/';
    // Ensure starts with /
    if (path[0] !== '/') path = '/' + path;
    return path;
}

// Clean expanded table data (has .name, .pageviews, .visitors, .visits, .bounces, .totaltime)
function cleanExpandedPageData(data) {
    if (!data || !data.length) return data;
    var merged = {};
    data.forEach(function(item) {
        var key = item.name || item.x || '';
        if (isIrrelevantPage(key)) return;
        var norm = normalizePath(key);
        if (!merged[norm]) {
            merged[norm] = { name: norm, pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 };
        }
        merged[norm].pageviews += (item.pageviews || item.y || 0);
        merged[norm].visitors  += (item.visitors || 0);
        merged[norm].visits    += (item.visits || 0);
        merged[norm].bounces   += (item.bounces || 0);
        merged[norm].totaltime += (item.totaltime || 0);
    });
    return Object.values(merged).sort(function(a, b) { return b.pageviews - a.pageviews; });
}

// Clean simple metrics data (has .x = path, .y = count)
function cleanSimplePageData(data) {
    if (!data || !data.length) return data;
    var merged = {};
    data.forEach(function(item) {
        var key = item.x || '';
        if (isIrrelevantPage(key)) return;
        var norm = normalizePath(key);
        if (!merged[norm]) {
            merged[norm] = { x: norm, y: 0 };
        }
        merged[norm].y += (item.y || 0);
    });
    return Object.values(merged).sort(function(a, b) { return b.y - a.y; });
}

// =========================================
//  HELPER: Aggregate daily data into weekly buckets
// =========================================
function aggregateWeekly(dailyData) {
    if (!dailyData || !dailyData.length) return dailyData;
    var weeks = {};
    dailyData.forEach(function(item) {
        var d = new Date(item.x);
        // Get Monday of that week (ISO week start)
        var day = d.getDay();
        var diff = d.getDate() - day + (day === 0 ? -6 : 1);
        var monday = new Date(d);
        monday.setDate(diff);
        var key = monday.toISOString().substring(0, 10);
        if (!weeks[key]) weeks[key] = { x: monday.toISOString(), y: 0 };
        weeks[key].y += (item.y || 0);
    });
    return Object.values(weeks).sort(function(a, b) { return new Date(a.x) - new Date(b.x); });
}

// =========================================
//  CHART HELPERS
// =========================================
function _chartGrad(id, hex, alphaLow, alphaHigh) {
    return '<defs><linearGradient id="' + id + '" x1="0" y1="1" x2="0" y2="0">' +
        '<stop offset="0%" stop-color="' + hex + '" stop-opacity="' + alphaLow + '"/>' +
        '<stop offset="100%" stop-color="' + hex + '" stop-opacity="' + alphaHigh + '"/>' +
    '</linearGradient></defs>';
}

function _chartLabel(x, i, n) {
    var d   = new Date(x);
    var mon = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    var lbl;
    if (currentRange <= 1)        lbl = d.getHours() + 'h';
    else if (currentRange >= 365) lbl = mon[d.getMonth()];
    else                          lbl = d.getDate() + '.' + (d.getMonth() + 1) + '.';
    var skip = n > 16 ? Math.ceil(n / 12) : 1;
    return (i % skip === 0) ? lbl : '';
}

// Inline SVG text — avoids all CSS-fill browser quirks
function _svgText(x, y, txt, anchor, size, fillColor, bold) {
    return '<text x="' + x + '" y="' + y + '"' +
        ' text-anchor="' + (anchor || 'middle') + '"' +
        ' font-family="IBM Plex Mono,monospace"' +
        ' font-size="' + (size || 9) + '"' +
        (bold ? ' font-weight="700"' : '') +
        ' fill="' + fillColor + '"' +
        ' pointer-events="none">' + txt + '</text>';
}

// =========================================
//  RENDER: Dual Bar Chart (Pageviews + Sessions)
// =========================================
function renderBarChartDual(containerId, pageviews, sessions) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!pageviews || !pageviews.length) {
        el.innerHTML = '<p class="ch-empty">Keine Daten verfügbar</p>';
        return;
    }

    var vw = window.innerWidth;
    var fallbackW = vw <= 768 ? Math.max(vw - 64, 260) : 480;
    var W   = Math.max(el.offsetWidth || fallbackW, 160);
    var VAL = 16;   // top padding for value labels
    var CH  = 126;  // bar area height
    var LBL = 20;   // bottom area for date labels
    var TH  = VAL + CH + LBL;  // total SVG height
    var BASE = VAL + CH;        // y-coordinate of baseline (bottom of bars)
    var n   = pageviews.length;

    var maxVal = 1;
    pageviews.forEach(function(d) { if (d.y > maxVal) maxVal = d.y; });
    if (sessions) sessions.forEach(function(d) { if (d.y > maxVal) maxVal = d.y; });

    var slotW = W / n;
    var bW    = Math.max(2, Math.min(14, slotW * 0.33));
    var bGap  = Math.max(1, slotW * 0.05);
    var uid   = containerId.replace(/[^a-z0-9]/gi, '');
    var showVals = n <= 20; // only show value numbers if not too crowded

    var out = _chartGrad('gPV' + uid, '#a78bfa', 0.22, 0.90);
    out    += _chartGrad('gSS' + uid, '#22d3ee', 0.10, 0.50);

    // grid lines
    [0.25, 0.5, 0.75, 1].forEach(function(p) {
        var gy = +(BASE - CH * p).toFixed(1);
        out += '<line x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy +
               '" stroke="rgba(255,255,255,' + (p === 1 ? '0.07' : '0.025') + ')" stroke-width="1"/>';
    });

    pageviews.forEach(function(pv, i) {
        var sv  = (sessions && sessions[i]) ? sessions[i].y : 0;
        var pvH = Math.max(2, (pv.y / maxVal) * CH);
        var svH = Math.max(2, (sv  / maxVal) * CH);
        var cx  = parseFloat((i * slotW + slotW / 2).toFixed(1));
        var pvX = (cx - bW - bGap / 2).toFixed(1);
        var svX = (cx + bGap / 2).toFixed(1);
        var pvY = (BASE - pvH).toFixed(1);
        var svY = (BASE - svH).toFixed(1);
        var bWs = bW.toFixed(1);

        // PV bar
        out += '<rect x="' + pvX + '" y="' + pvY + '" width="' + bWs + '" height="' + pvH.toFixed(1) +
               '" rx="2" fill="url(#gPV' + uid + ')" style="cursor:crosshair;transition:filter .15s">' +
               '<title>Pageviews: ' + fmt(pv.y) + '</title></rect>';
        // SS bar
        out += '<rect x="' + svX + '" y="' + svY + '" width="' + bWs + '" height="' + svH.toFixed(1) +
               '" rx="2" fill="url(#gSS' + uid + ')" opacity="0.7" style="cursor:crosshair">' +
               '<title>Sessions: ' + fmt(sv) + '</title></rect>';

        // Value label above PV bar (skip if bar is very short)
        if (showVals && pvH > 12) {
            out += _svgText(cx, parseFloat(pvY) - 3, fmt(pv.y), 'middle', 8, 'rgba(232,230,240,0.65)');
        }

        // Date label below
        var lbl = _chartLabel(pv.x, i, n);
        if (lbl) out += _svgText(cx, TH - 3, lbl, 'middle', 8, 'rgba(232,230,240,0.60)');
    });

    el.innerHTML = '<svg width="' + W + '" height="' + TH + '" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;">' + out + '</svg>';
}

// =========================================
//  RENDER: Single Bar Chart (Sessions / Visitors)
// =========================================
function renderBarChartSingle(containerId, data) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!data || !data.length) {
        el.innerHTML = '<p class="ch-empty">Keine Daten verfügbar</p>';
        return;
    }

    var vw = window.innerWidth;
    var fallbackW = vw <= 768 ? Math.max(vw - 64, 260) : 480;
    var W   = Math.max(el.offsetWidth || fallbackW, 160);
    var VAL = 16;
    var CH  = 126;
    var LBL = 20;
    var TH  = VAL + CH + LBL;
    var BASE = VAL + CH;
    var n   = data.length;

    var maxVal = 1;
    data.forEach(function(d) { if (d.y > maxVal) maxVal = d.y; });

    var slotW    = W / n;
    var bW       = Math.max(3, Math.min(22, slotW * 0.62));
    var uid      = containerId.replace(/[^a-z0-9]/gi, '');
    var showVals = n <= 20;

    var out = _chartGrad('gVIS' + uid, '#34d399', 0.22, 0.88);

    [0.25, 0.5, 0.75, 1].forEach(function(p) {
        var gy = +(BASE - CH * p).toFixed(1);
        out += '<line x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy +
               '" stroke="rgba(255,255,255,' + (p === 1 ? '0.07' : '0.025') + ')" stroke-width="1"/>';
    });

    data.forEach(function(item, i) {
        var h  = Math.max(2, (item.y / maxVal) * CH);
        var cx = parseFloat((i * slotW + slotW / 2).toFixed(1));
        var bx = (cx - bW / 2).toFixed(1);
        var by = (BASE - h).toFixed(1);

        out += '<rect x="' + bx + '" y="' + by + '" width="' + bW.toFixed(1) + '" height="' + h.toFixed(1) +
               '" rx="2" fill="url(#gVIS' + uid + ')" style="cursor:crosshair;transition:filter .15s">' +
               '<title>' + fmt(item.y) + '</title></rect>';

        // Value label above bar
        if (showVals && h > 12) {
            out += _svgText(cx, parseFloat(by) - 3, fmt(item.y), 'middle', 8, 'rgba(232,230,240,0.65)');
        }

        // Date label below
        var lbl = _chartLabel(item.x, i, n);
        if (lbl) out += _svgText(cx, TH - 3, lbl, 'middle', 8, 'rgba(232,230,240,0.60)');
    });

    el.innerHTML = '<svg width="' + W + '" height="' + TH + '" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;">' + out + '</svg>';
}

// =========================================
//  RENDER: Expanded Metrics Table (path)
// =========================================
function renderExpandedTable(tableId, data) {
    var tbody = document.querySelector('#' + tableId + ' tbody');
    if (!data || !data.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">Keine Daten</td></tr>';
        return;
    }

    var totalPV = data.reduce(function(s, d) { return s + (d.pageviews || d.y || 0); }, 0);

    tbody.innerHTML = data.map(function(item, i) {
        var pageviews = item.pageviews || item.y || 0;
        var visitors = item.visitors || 0;
        var visits = item.visits || 0;
        var bounces = item.bounces || 0;
        var totaltime = item.totaltime || 0;
        var pct = totalPV > 0 ? ((pageviews / totalPV) * 100).toFixed(1) : 0;
        var avgTime = visits > 0 ? fmtDuration(totaltime / visits) : '--';
        var bounceRate = visits > 0 ? ((bounces / visits) * 100).toFixed(0) + '%' : '--';
        var label = item.name || item.x || '(unbekannt)';
        var shortLabel = label.length > 45 ? label.substring(0, 45) + '…' : label;

        return '<tr>' +
            '<td class="rank">' + (i + 1) + '</td>' +
            '<td title="' + label + '">' + shortLabel + '</td>' +
            '<td class="value">' + fmt(pageviews) + '</td>' +
            '<td>' + fmt(visitors) + '</td>' +
            '<td>' + bounceRate + '</td>' +
            '<td>' + avgTime + '</td>' +
            '<td>' + pct + '%<div class="progress-bar"><div class="progress-fill purple" style="width:' + pct + '%"></div></div></td>' +
        '</tr>';
    }).join('');
}

// =========================================
//  RENDER: Simple Metrics Table (with rank)
// =========================================
function renderSimpleTable(tableId, data, labelFn, colorClass) {
    labelFn = labelFn || function(x) { return x; };
    colorClass = colorClass || 'purple';
    var tbody = document.querySelector('#' + tableId + ' tbody');
    if (!data || !data.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">Keine Daten</td></tr>';
        return;
    }

    var total = data.reduce(function(s, d) { return s + (d.y || 0); }, 0);

    tbody.innerHTML = data.map(function(item, i) {
        var pct = total > 0 ? ((item.y / total) * 100).toFixed(1) : 0;
        var label = labelFn(item.x || '(unbekannt)');
        return '<tr>' +
            '<td class="rank">' + (i + 1) + '</td>' +
            '<td>' + label + '</td>' +
            '<td class="value">' + fmt(item.y) + '</td>' +
            '<td>' + pct + '%<div class="progress-bar"><div class="progress-fill ' + colorClass + '" style="width:' + pct + '%"></div></div></td>' +
        '</tr>';
    }).join('');
}

// =========================================
//  RENDER: Simple Table (no rank)
// =========================================
function renderSimpleTableNoRank(tableId, data, labelFn, colorClass) {
    labelFn = labelFn || function(x) { return x; };
    colorClass = colorClass || 'purple';
    var tbody = document.querySelector('#' + tableId + ' tbody');
    if (!data || !data.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:2rem;">Keine Daten</td></tr>';
        return;
    }

    var total = data.reduce(function(s, d) { return s + (d.y || 0); }, 0);

    tbody.innerHTML = data.map(function(item) {
        var pct = total > 0 ? ((item.y / total) * 100).toFixed(1) : 0;
        var label = labelFn(item.x || '(unbekannt)');
        return '<tr>' +
            '<td>' + label + '</td>' +
            '<td class="value">' + fmt(item.y) + '</td>' +
            '<td>' + pct + '%<div class="progress-bar"><div class="progress-fill ' + colorClass + '" style="width:' + pct + '%"></div></div></td>' +
        '</tr>';
    }).join('');
}

// =========================================
//  RENDER: Donut Chart (Devices)
//  Uses stroke-dasharray on SVG circles — bulletproof across all browsers
// =========================================
function renderDevicesDonut(data) {
    var el = document.getElementById('devicesDonut');
    if (!el) return;

    // Normalize + filter
    var items = (data || []).filter(function(d) { return d && d.x && typeof d.y === 'number' && d.y > 0; });

    if (!items.length) {
        el.innerHTML = '<p class="ch-empty">Keine Gerätedaten</p>';
        return;
    }

    var total = items.reduce(function(s, d) { return s + d.y; }, 0);
    if (total === 0) { el.innerHTML = '<p class="ch-empty">Keine Gerätedaten</p>'; return; }

    var PALETTE  = { desktop: '#a78bfa', mobile: '#34d399', tablet: '#fbbf24', laptop: '#22d3ee' };
    var FALLBACK = ['#a78bfa', '#34d399', '#fbbf24', '#22d3ee', '#f87171'];
    var ICONS    = { desktop: '🖥️', mobile: '📱', tablet: '📱', laptop: '💻' };

    // SVG donut geometry
    var SZ    = 160;                      // SVG canvas size
    var CX    = SZ / 2;                   // center x
    var CY    = SZ / 2;                   // center y
    var R     = 58;                       // ring radius (midline)
    var SW    = 20;                       // stroke-width = ring thickness
    var CIRC  = 2 * Math.PI * R;         // full circumference ≈ 364.4 px
    var GAP   = items.length > 1 ? 5 : 0; // gap in pixels between segments

    // Background track
    var circles = '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '"' +
        ' fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="' + SW + '"/>';

    var rows = '';
    var cumOffset = 0; // pixels consumed so far along circumference

    items.forEach(function(d, idx) {
        var color  = PALETTE[d.x] || FALLBACK[idx % FALLBACK.length];
        var pct    = d.y / total;
        var segLen = Math.max(3, pct * CIRC - GAP); // visible length minus gap
        var pctStr = (pct * 100).toFixed(1);
        var icon   = ICONS[d.x] || '●';

        // stroke-dasharray: [visible dash] [invisible gap filling the rest]
        // stroke-dashoffset: negative = shift start of pattern forward along path
        // rotate(-90) = start from 12 o'clock
        circles += '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '"' +
            ' fill="none"' +
            ' stroke="' + color + '"' +
            ' stroke-width="' + SW + '"' +
            ' stroke-dasharray="' + segLen.toFixed(2) + ' ' + (CIRC + 1).toFixed(2) + '"' +
            ' stroke-dashoffset="-' + cumOffset.toFixed(2) + '"' +
            ' transform="rotate(-90 ' + CX + ' ' + CY + ')"' +
            ' style="cursor:pointer;transition:opacity .2s">' +
            '<title>' + (d.x || '?') + ': ' + fmt(d.y) + ' (' + pctStr + '%)</title>' +
            '</circle>';

        rows += '<div class="dl-row">' +
            '<span class="dl-dot" style="background:' + color + '"></span>' +
            '<span class="dl-name">' + icon + ' ' + (d.x || '?') + '</span>' +
            '<span class="dl-pct">' + pctStr + '%</span>' +
            '<span class="dl-cnt">' + fmt(d.y) + '</span>' +
        '</div>';

        cumOffset += pct * CIRC; // advance by full share (gap appears between segments)
    });

    // Center text — inline attributes, no CSS classes needed
    var centerText =
        '<text x="' + CX + '" y="' + (CY - 4) + '"' +
        ' text-anchor="middle" font-family="IBM Plex Mono,monospace"' +
        ' font-size="18" font-weight="700" fill="rgba(232,230,240,0.92)">' + fmt(total) + '</text>' +
        '<text x="' + CX + '" y="' + (CY + 13) + '"' +
        ' text-anchor="middle" font-family="IBM Plex Mono,monospace"' +
        ' font-size="7" fill="rgba(232,230,240,0.32)" letter-spacing="1.5">BESUCHER</text>';

    var svg = '<svg width="' + SZ + '" height="' + SZ + '" viewBox="0 0 ' + SZ + ' ' + SZ +
              '" xmlns="http://www.w3.org/2000/svg" style="display:block;">' +
              circles + centerText + '</svg>';

    el.innerHTML = '<div class="dnt-ring">' + svg + '</div><div class="dnt-list">' + rows + '</div>';
}

// =========================================
//  RENDER: Trend Indicator
// =========================================
function setTrend(elId, current, previous) {
    var el = document.getElementById(elId);
    if (!el || previous === undefined || previous === null) {
        el.className = 'kpi-trend neutral';
        el.textContent = '--';
        return;
    }
    if (previous === 0 && current === 0) {
        el.className = 'kpi-trend neutral';
        el.textContent = '→ 0%';
        return;
    }
    if (previous === 0) {
        el.className = 'kpi-trend up';
        el.textContent = '↑ neu';
        return;
    }

    var diff = ((current - previous) / previous) * 100;
    if (diff > 0) {
        el.className = 'kpi-trend up';
        el.textContent = '↑ +' + diff.toFixed(1) + '%';
    } else if (diff < 0) {
        el.className = 'kpi-trend down';
        el.textContent = '↓ ' + diff.toFixed(1) + '%';
    } else {
        el.className = 'kpi-trend neutral';
        el.textContent = '→ 0%';
    }
}

// =========================================
//  LIVE STATUS BADGE
// =========================================
function setLiveStatus(status) {
    var dot = document.getElementById('liveDot');
    var label = document.getElementById('liveLabel');
    if (!dot || !label) return;
    dot.className = 'live-dot';
    if (status === 'live') {
        label.textContent = 'Live';
    } else if (status === 'error') {
        dot.classList.add('error');
        label.textContent = 'Offline';
    } else {
        dot.classList.add('connecting');
        label.textContent = 'Verbinde…';
    }
}

// =========================================
//  SKELETON LOADING
// =========================================
function showSkeletons() {
    document.getElementById('mainKpis').style.display = 'none';
    document.getElementById('mainKpisSkeletons').style.display = 'grid';
    document.getElementById('pageviewsChart').parentElement.parentElement.style.display = 'none';
    document.getElementById('pageviewsChartSkeleton').parentElement.parentElement.style.display = 'grid';
    document.getElementById('tableSkeletonContainer').style.display = 'block';
    var tabCard = document.getElementById('topPagesTable').closest('.section-card');
    if (tabCard) tabCard.style.display = 'none';
}

function hideSkeletons() {
    document.getElementById('mainKpis').style.display = 'grid';
    document.getElementById('mainKpisSkeletons').style.display = 'none';
    document.getElementById('pageviewsChart').parentElement.parentElement.style.display = 'grid';
    document.getElementById('pageviewsChartSkeleton').parentElement.parentElement.style.display = 'none';
    document.getElementById('tableSkeletonContainer').style.display = 'none';
    var tabCard = document.getElementById('topPagesTable').closest('.section-card');
    if (tabCard) tabCard.style.display = 'block';
}

// =========================================
//  LOAD ALL DATA
//  Datenquelle entfernt — UI zeigt leere Tabellen/Charts.
// =========================================
function loadAll() {
    var btn = document.getElementById('refreshBtn');
    if (btn) { btn.disabled = false; btn.innerHTML = '🔄 Aktualisieren'; }

    hideSkeletons();
    setLiveStatus('error');

    var activeEl = document.getElementById('activeUsers');
    if (activeEl) activeEl.innerHTML = '<div class="live-dot error" style="width:8px;height:8px;"></div> 0 aktiv';

    ['kpiPageviews','kpiVisitors','kpiVisits','kpiBounce','kpiPagesPerSession','kpiEngagement']
        .forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = '–'; });
    ['kpiDuration','kpiTotalTime','kpiPagesPerSessionSub','kpiEngagementSub']
        .forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = ''; });
    ['kpiPageviewsTrend','kpiVisitorsTrend','kpiVisitsTrend','kpiBouncesTrend'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.className = 'kpi-trend neutral'; el.textContent = '--'; }
    });

    renderBarChartDual('pageviewsChart', [], []);
    renderBarChartSingle('visitorsChart', []);
    renderExpandedTable('topPagesTable', []);
    renderSimpleTable('entryPagesTable', [], function(x) { return x || '/'; }, 'green');
    renderSimpleTable('exitPagesTable', [], function(x) { return x || '/'; }, 'cyan');
    renderSimpleTable('referrersTable', [], function(x) { return x; }, 'purple');
    renderSimpleTable('channelsTable', [], function(x) { return x; }, 'yellow');
    renderSimpleTable('titlesTable', [], function(x) { return x; }, 'purple');
    renderDevicesDonut([]);
    renderSimpleTableNoRank('browsersTable', [], function(x) { return x; }, 'purple');
    renderSimpleTableNoRank('osTable', [], function(x) { return x; }, 'cyan');
    renderSimpleTableNoRank('countriesTable', [], countryName, 'green');
    renderSimpleTableNoRank('citiesTable', [], function(x) { return x; }, 'yellow');
    renderSimpleTableNoRank('languagesTable', [], langName, 'cyan');
    renderSimpleTableNoRank('screensTable', [], function(x) { return x; }, 'purple');
    renderSimpleTable('eventsTable', [], function(x) { return x; }, 'yellow');
    renderInsights([{ icon: '📊', text: 'Keine Daten verfügbar.' }]);

    var lu = document.getElementById('lastUpdated');
    if (lu) lu.textContent = '';
}

// =========================================
//  INIT
// =========================================
document.addEventListener('DOMContentLoaded', function() {
    loadAll();

    // Scroll-to-top visibility
    var scrollBtn = document.getElementById('scrollTopBtn');
    window.addEventListener('scroll', function() {
        if (scrollBtn) scrollBtn.classList.toggle('show', window.scrollY > 400);
    }, { passive: true });

    // Fade-in observer for sections
    var fadeEls = document.querySelectorAll('.fade-in');
    if (fadeEls.length > 0 && 'IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function(entries) {
            entries.forEach(function(e) {
                if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        fadeEls.forEach(function(el) { obs.observe(el); });
    } else {
        fadeEls.forEach(function(el) { el.classList.add('visible'); });
    }
});
