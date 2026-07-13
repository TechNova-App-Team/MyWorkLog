// =========================================
//  KONFIGURATION
// =========================================
const CF_PROXY = 'https://analytics-proxy.myworklog.workers.dev';
let currentRange = 7;

// =========================================
//  HELPERS
// =========================================
// Standalone-Seite: utils.js der SPA laeuft hier nicht, esc() also selbst mitbringen.
// Pflicht — Laender-, Stadt- und Event-Namen kommen aus PostHog und landen in innerHTML.
function esc(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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

function fmtBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    i = Math.min(i, units.length - 1);
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
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

// Normalize path: collapse index.html, strip hashes/query
// Frueher wurde "/" auf "/MyWorkLog/" umgeschrieben — ein GitHub-Pages-Relikt.
// Auf der eigenen Domain ist die Startseite schlicht "/".
function normalizePath(path) {
    if (!path) return '/';
    // Remove hash fragments entirely
    var hashIdx = path.indexOf('#');
    if (hashIdx !== -1) path = path.substring(0, hashIdx);
    // Remove query strings
    var qIdx = path.indexOf('?');
    if (qIdx !== -1) path = path.substring(0, qIdx);
    // /index.html → /  (collapse index.html to directory)
    path = path.replace(/\/index\.html$/i, '/');
    // Legacy-Basepath aus der GitHub-Pages-Zeit einsammeln
    path = path.replace(/^\/MyWorkLog(\/|$)/i, '/');
    if (path === '') path = '/';
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
            '<td title="' + esc(label) + '">' + esc(shortLabel) + '</td>' +
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
        var label = esc(labelFn(item.x || '(unbekannt)'));
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
        var label = esc(labelFn(item.x || '(unbekannt)'));
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
//  RENDER: Sparkline (Mini-Trend in der KPI-Karte)
// =========================================
// Bewusst ohne Achsen, Gitter und Labels — eine Sparkline zeigt die FORM
// des Verlaufs, nicht seine Werte. Die exakte Zahl steht daneben in der Kachel.
function renderSparkline(containerId, points, color) {
    var el = document.getElementById(containerId);
    if (!el) return;

    // Unter 2 Punkten gibt es keinen Verlauf. Dann die Kachel NICHT mit einer
    // leeren Flaeche aufblaehen — Platz komplett rausnehmen.
    if (!points || points.length < 2) {
        el.innerHTML = '';
        el.style.display = 'none';
        return;
    }
    el.style.display = '';

    var W = 100, H = 26, PAD = 2;
    var max = 0, min = Infinity;
    points.forEach(function(v) {
        if (v > max) max = v;
        if (v < min) min = v;
    });
    if (max === min) { max = min + 1; }

    var n = points.length;
    var uid = containerId;
    var xs = function(i) { return (i / (n - 1)) * W; };
    var ys = function(v) { return H - PAD - ((v - min) / (max - min)) * (H - PAD * 2); };

    var line = '', area = '';
    points.forEach(function(v, i) {
        var x = xs(i).toFixed(1), y = ys(v).toFixed(1);
        line += (i === 0 ? 'M' : 'L') + x + ' ' + y;
    });
    area = line + 'L' + W + ' ' + H + 'L0 ' + H + 'Z';

    var lastX = xs(n - 1).toFixed(1);
    var lastY = ys(points[n - 1]).toFixed(1);

    el.innerHTML =
        '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="spark-svg" aria-hidden="true">' +
            '<defs><linearGradient id="sp' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.28"/>' +
                '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
            '</linearGradient></defs>' +
            '<path d="' + area + '" fill="url(#sp' + uid + ')"/>' +
            '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="1.6" ' +
                'stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
            '<circle cx="' + lastX + '" cy="' + lastY + '" r="1.8" fill="' + color + '" ' +
                'vector-effect="non-scaling-stroke"/>' +
        '</svg>';
}

// =========================================
//  RENDER: Aktivitäts-Puls (7 Wochentage × 24 Stunden)
// =========================================
var PULSE_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function renderActivityPulse(activity) {
    var el = document.getElementById('activityPulse');
    if (!el) return;

    if (!activity || !activity.length) {
        el.innerHTML = '<p class="ch-empty">Noch keine Aktivitätsdaten</p>';
        return;
    }

    // dow: 1=Mo … 7=So  →  Index 0..6
    var grid = [];
    for (var d = 0; d < 7; d++) {
        grid.push(new Array(24).fill(0));
    }
    var max = 0;
    var peak = { pv: 0, dow: 0, hour: 0 };

    activity.forEach(function(a) {
        var di = (a.dow || 1) - 1;
        var hi = a.hour || 0;
        if (di < 0 || di > 6 || hi < 0 || hi > 23) return;
        var pv = a.pageviews || 0;
        grid[di][hi] = pv;
        if (pv > max) max = pv;
        if (pv > peak.pv) peak = { pv: pv, dow: di, hour: hi };
    });

    // 5 Stufen. Alles > 0 bekommt mindestens Stufe 1 — sonst verschwinden
    // einzelne Aufrufe optisch komplett und die Karte lügt.
    function level(v) {
        if (v <= 0) return 0;
        if (max <= 1) return 4;
        var r = v / max;
        if (r <= 0.25) return 1;
        if (r <= 0.5)  return 2;
        if (r <= 0.75) return 3;
        return 4;
    }

    var html = '<div class="pulse-hours">';
    for (var h = 0; h < 24; h++) {
        html += '<span class="pulse-hour">' + (h % 3 === 0 ? h : '') + '</span>';
    }
    html += '</div>';

    for (var dd = 0; dd < 7; dd++) {
        html += '<div class="pulse-row">';
        html += '<span class="pulse-day">' + PULSE_DAYS[dd] + '</span>';
        html += '<div class="pulse-cells">';
        for (var hh = 0; hh < 24; hh++) {
            var v = grid[dd][hh];
            html += '<span class="pulse-cell" data-lvl="' + level(v) + '" title="' +
                    PULSE_DAYS[dd] + ' ' + hh + ':00 — ' + fmt(v) + ' Aufrufe"></span>';
        }
        html += '</div></div>';
    }

    el.innerHTML = html;

    var peakEl = document.getElementById('pulsePeak');
    if (peakEl && peak.pv > 0) {
        peakEl.textContent = 'Spitze: ' + PULSE_DAYS[peak.dow] + ' ' + peak.hour + ':00 (' + fmt(peak.pv) + ')';
    }
}

// =========================================
//  RENDER: Karten (Welt + Deutschland)
// =========================================
var _mapData = { countries: [], regions: [], cities: [] };

// Sequential-Rampe: EINE Hue, dunkel → hell. Diskrete Stufen statt stufenlosem
// Alpha-Verlauf — Stufen sind ablesbar, ein Verlauf ist es nicht (die Legende
// kann sonst nichts erklären). "Keine Daten" ist bewusst neutral-grau und NICHT
// die hellste/dunkelste Stufe der Rampe, sonst liest man 0 als Wert.
var MAP_EMPTY = 'rgba(255,255,255,0.05)';
var MAP_RAMP = [
    '#2b2150',   // 1 — kaum Traffic
    '#453081',
    '#6344b8',
    '#8b64e3',
    '#b794f6',   // 5 — Spitze
];

// Gleiche Klassengrenzen fuer Karte und Legende — sonst luegt die Legende.
function _mapBucket(v, max) {
    if (!v || v <= 0 || max <= 0) return -1;
    var r = v / max;
    if (r <= 0.2) return 0;
    if (r <= 0.4) return 1;
    if (r <= 0.6) return 2;
    if (r <= 0.8) return 3;
    return 4;
}

function _mapShade(v, max) {
    var b = _mapBucket(v, max);
    return b < 0 ? MAP_EMPTY : MAP_RAMP[b];
}

// Gradnetz — gibt der Karte kartografische Glaubwuerdigkeit statt "Klumpen im Nichts"
function _graticule(project, ext, scale, W, H) {
    var out = '';
    function pt(lon, lat) {
        var p = project(lon, lat);
        return [((p[0] - ext.minX) * scale).toFixed(1), ((p[1] - ext.minY) * scale).toFixed(1)];
    }
    var lon, lat, d, i;
    for (lon = -150; lon <= 150; lon += 30) {
        d = '';
        for (lat = -90; lat <= 90; lat += 5) {
            var a = pt(lon, lat);
            d += (d ? 'L' : 'M') + a[0] + ' ' + a[1];
        }
        out += '<path d="' + d + '" class="map-grat"/>';
    }
    for (lat = -60; lat <= 80; lat += 30) {
        d = '';
        for (lon = -180; lon <= 180; lon += 5) {
            var b = pt(lon, lat);
            d += (d ? 'L' : 'M') + b[0] + ' ' + b[1];
        }
        out += '<path d="' + d + '" class="map-grat"/>';
    }
    return '<g class="map-graticule">' + out + '</g>';
}

function _renderMapSvg(containerId, geo, valueByKey, labelByKey, cities, graticule) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!geo || !geo.paths) {
        el.innerHTML = '<p class="ch-empty">Kartendaten nicht geladen</p>';
        return;
    }

    var max = 0;
    Object.keys(valueByKey).forEach(function(k) {
        if (valueByKey[k] > max) max = valueByKey[k];
    });

    var vb = geo.viewBox.split(' ').map(Number);
    var uid = containerId;

    var defs =
        '<defs>' +
            '<radialGradient id="ocean' + uid + '" cx="50%" cy="42%" r="72%">' +
                '<stop offset="0%" stop-color="rgba(129,140,248,0.09)"/>' +
                '<stop offset="100%" stop-color="rgba(129,140,248,0)"/>' +
            '</radialGradient>' +
            '<filter id="glow' + uid + '" x="-60%" y="-60%" width="220%" height="220%">' +
                '<feGaussianBlur stdDeviation="2.2" result="b"/>' +
                '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
            '</filter>' +
        '</defs>';

    var ocean = '<rect x="0" y="0" width="' + vb[2] + '" height="' + vb[3] + '" fill="url(#ocean' + uid + ')"/>';

    var shapes = '';
    geo.paths.forEach(function(p) {
        var v = valueByKey[p.id] || 0;
        var label = labelByKey[p.id] || p.name || p.id;
        shapes += '<path d="' + p.d + '"' +
               ' fill="' + _mapShade(v, max) + '"' +
               ' class="map-shape' + (v > 0 ? ' has-data' : '') + '"' +
               ' data-label="' + esc(label) + '"' +
               ' data-value="' + v + '"></path>';
    });

    // Städte-Marker. Die staerkste Stadt bekommt einen pulsierenden Ring —
    // EIN Akzent, nicht alle, sonst flimmert die halbe Karte.
    var markers = '';
    if (cities && cities.length) {
        var top = cities.reduce(function(a, b) {
            return (b.visitors || 0) > (a.visitors || 0) ? b : a;
        }, cities[0]);

        cities.forEach(function(c) {
            if (c.x == null || c.y == null) return;
            var isTop = (c === top);
            var r = 2.2 + Math.min(3.4, Math.sqrt(c.visitors || 1) * 1.4);
            if (isTop) {
                markers += '<circle cx="' + c.x + '" cy="' + c.y + '" r="' + r.toFixed(1) + '"' +
                           ' class="map-city-pulse"></circle>';
            }
            markers += '<circle cx="' + c.x + '" cy="' + c.y + '" r="' + r.toFixed(1) + '"' +
                       ' class="map-city' + (isTop ? ' is-top' : '') + '"' +
                       (isTop ? ' filter="url(#glow' + uid + ')"' : '') +
                       ' data-label="' + esc(c.city) + '"' +
                       ' data-value="' + (c.visitors || 0) + '"></circle>';
        });
    }

    var grat = graticule || '';

    el.innerHTML = '<svg viewBox="' + geo.viewBox + '" xmlns="http://www.w3.org/2000/svg" ' +
                   'preserveAspectRatio="xMidYMid meet" class="map-svg">' +
                   defs + ocean + grat +
                   '<g class="map-shapes">' + shapes + '</g>' +
                   '<g class="map-cities">' + markers + '</g>' +
                   '</svg>';

    _bindMapTooltip(el);
}

function _bindMapTooltip(el) {
    var tip = document.getElementById('mapTooltip');
    if (!tip) return;
    var svg = el.querySelector('svg');

    el.querySelectorAll('.map-shape, .map-city').forEach(function(node) {
        node.addEventListener('mouseenter', function(e) {
            var label = node.getAttribute('data-label');
            var val = node.getAttribute('data-value');
            tip.innerHTML = '<strong>' + label + '</strong><span>' + fmt(+val) + ' Besucher</span>';
            tip.classList.add('show');
            // Fokus/Kontext: das Gehoverte bleibt, der Rest tritt zurueck.
            if (svg) svg.classList.add('is-focused');
            node.classList.add('is-hot');
            _moveTip(e, tip, el);
        });
        node.addEventListener('mousemove', function(e) { _moveTip(e, tip, el); });
        node.addEventListener('mouseleave', function() {
            tip.classList.remove('show');
            if (svg) svg.classList.remove('is-focused');
            node.classList.remove('is-hot');
        });
    });
}

function _moveTip(e, tip, stage) {
    var r = stage.getBoundingClientRect();
    tip.style.left = (e.clientX - r.left) + 'px';
    tip.style.top  = (e.clientY - r.top) + 'px';
}

// Equal-Earth-Projektion — MUSS identisch zu tools/geo/build-maps.js sein,
// sonst landen die Städte-Marker neben der Karte.
function _projectEqualEarth(lon, lat) {
    var A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796;
    var l = lon * Math.PI / 180;
    var p = lat * Math.PI / 180;
    var th = Math.asin((Math.sqrt(3) / 2) * Math.sin(p));
    var th2 = th * th, th6 = th2 * th2 * th2;
    var den = 3 * (9 * A4 * th6 * th2 + 7 * A3 * th6 + 3 * A2 * th2 + A1);
    var x = 2 * Math.sqrt(3) * l * Math.cos(th) / den;
    var y = A4 * th6 * th2 * th + A3 * th6 * th + A2 * th2 * th + A1 * th;
    return [x, -y];
}

// Die Weltkarte wurde beim Bauen auf viewBox 0..1000 normiert. Um Städte
// hineinzusetzen, brauchen wir dieselbe Normierung — die Eckpunkte der
// Projektion sind konstant, also einmal ausrechnen.
var _worldBounds = null;
function _worldExtent() {
    if (_worldBounds) return _worldBounds;
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var lon = -180; lon <= 180; lon += 2) {
        for (var lat = -90; lat <= 90; lat += 2) {
            var p = _projectEqualEarth(lon, lat);
            if (p[0] < minX) minX = p[0];
            if (p[0] > maxX) maxX = p[0];
            if (p[1] < minY) minY = p[1];
            if (p[1] > maxY) maxY = p[1];
        }
    }
    _worldBounds = { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
    return _worldBounds;
}

function renderMaps(countries, regions, cities) {
    _mapData.countries = countries || [];
    _mapData.regions   = regions   || [];
    _mapData.cities    = cities    || [];

    // ── Weltkarte ──
    var cVals = {}, cLabels = {};
    (countries || []).forEach(function(c) {
        if (!c.code) return;
        cVals[c.code]   = c.visitors || 0;
        cLabels[c.code] = c.country || c.code;
    });

    // Städte-Marker auf Weltkoordinaten projizieren.
    // ACHTUNG: Die Karte wurde OHNE Antarktis gebaut, deshalb kann die
    // rechnerische Extent-Box nicht 1:1 verwendet werden — wir nehmen die
    // tatsächlich verbaute viewBox als Referenz.
    var cityMarkers = [];
    var world = window.__GEO_WORLD__;
    if (world && cities && cities.length) {
        var vb = world.viewBox.split(' ').map(Number);   // [0,0,W,H]
        var W = vb[2], H = vb[3];
        var ext = _worldExtent();
        var scale = W / (ext.maxX - ext.minX);
        cities.forEach(function(c) {
            if (c.lat == null || c.lon == null) return;
            var p = _projectEqualEarth(c.lon, c.lat);
            var x = (p[0] - ext.minX) * scale;
            var y = (p[1] - ext.minY) * scale;
            if (x < 0 || x > W || y < 0 || y > H) return;
            cityMarkers.push({ x: x.toFixed(1), y: y.toFixed(1), city: c.city, visitors: c.visitors });
        });
    }

    var grat = '';
    if (world) {
        var wvb = world.viewBox.split(' ').map(Number);
        var we = _worldExtent();
        grat = _graticule(_projectEqualEarth, we, wvb[2] / (we.maxX - we.minX), wvb[2], wvb[3]);
    }
    _renderMapSvg('mapWorld', world, cVals, cLabels, cityMarkers, grat);

    // ── Deutschland ──
    var rVals = {}, rLabels = {};
    (regions || []).forEach(function(r) {
        if (!r.id) return;
        rVals[r.id]   = r.visitors || 0;
        rLabels[r.id] = r.region || r.id;
    });
    // Labels aus der Kartendatei bevorzugen — sie sind deutsch,
    // PostHog liefert englische Namen ("Bavaria").
    var deGeo = window.__GEO_DE__;
    if (deGeo && deGeo.paths) {
        deGeo.paths.forEach(function(p) {
            if (p.name) rLabels[p.id] = p.name;
        });
    }
    _renderMapSvg('mapDE', deGeo, rVals, rLabels, null);

    // ── Seiten-Tabellen ──
    renderSimpleTableNoRank('countriesTable',
        (countries || []).map(function(c) { return { x: c.country, y: c.visitors }; }),
        function(x) { return x; }, 'green');

    renderSimpleTableNoRank('regionsTable',
        (regions || []).map(function(r) {
            return { x: rLabels[r.id] || r.region, y: r.visitors };
        }),
        function(x) { return x; }, 'purple');

    renderMapLegend(Math.max.apply(null, [0].concat((countries || []).map(function(c) { return c.visitors || 0; }))));
}

function renderMapLegend(max) {
    var el = document.getElementById('mapLegend');
    if (!el) return;
    if (!max) { el.innerHTML = ''; return; }
    // Zeigt exakt die Stufen, die die Karte auch benutzt (_mapBucket).
    var cells = MAP_RAMP.map(function(c, i) {
        var lo = i === 0 ? 1 : Math.ceil(max * (i * 0.2));
        var hi = Math.round(max * ((i + 1) * 0.2));
        return '<span class="map-legend-cell" style="background:' + c + '"' +
               ' title="' + lo + (hi > lo ? '–' + hi : '') + ' Besucher"></span>';
    }).join('');
    el.innerHTML = '<span class="map-legend-label">1</span>' + cells +
                   '<span class="map-legend-label">' + fmt(max) + '</span>';
}

function switchMap(which) {
    document.querySelectorAll('.map-switch-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.map === which);
    });
    var w = document.getElementById('mapWorld');
    var d = document.getElementById('mapDE');
    if (w) w.classList.toggle('active', which === 'world');
    if (d) d.classList.toggle('active', which === 'de');

    var head = document.getElementById('mapSideHead');
    if (head) head.textContent = which === 'de' ? 'Bundesländer' : 'Länder';

    var ct = document.getElementById('countriesTable');
    var rt = document.getElementById('regionsTable');
    if (ct) ct.style.display = which === 'de' ? 'none' : '';
    if (rt) rt.style.display = which === 'de' ? '' : 'none';

    var maxVal = which === 'de'
        ? Math.max.apply(null, [0].concat(_mapData.regions.map(function(r) { return r.visitors || 0; })))
        : Math.max.apply(null, [0].concat(_mapData.countries.map(function(c) { return c.visitors || 0; })));
    renderMapLegend(maxVal);
}

// =========================================
//  RENDER: Web Vitals (LCP)
// =========================================
var VITAL_COLORS = {
    'Good': '#34d399',
    'Needs': '#fbbf24',
    'Poor': '#f87171',
};

function _vitalColor(rating) {
    if (/good/i.test(rating)) return VITAL_COLORS.Good;
    if (/needs/i.test(rating)) return VITAL_COLORS.Needs;
    return VITAL_COLORS.Poor;
}

function renderVitals(lcp) {
    var card = document.getElementById('vitalsCard');
    var bar  = document.getElementById('vitalsBar');
    var tbody = document.querySelector('#vitalsTable tbody');

    if (!lcp || !lcp.length) {
        // Ehrlich bleiben: leerer Block statt erfundener Werte
        if (bar) bar.innerHTML = '';
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">Noch keine Messwerte — Web Vitals werden erst seit dem letzten Update erfasst.</td></tr>';
        return;
    }

    var total = lcp.reduce(function(s, l) { return s + (l.sessions || 0); }, 0);

    if (bar) {
        bar.innerHTML = lcp.map(function(l) {
            var pct = total > 0 ? (l.sessions / total * 100) : 0;
            return '<span class="vitals-seg" style="width:' + pct.toFixed(1) + '%;background:' + _vitalColor(l.rating) + '"' +
                   ' title="' + esc(l.rating) + ': ' + fmt(l.sessions) + '"></span>';
        }).join('');
    }

    if (tbody) {
        tbody.innerHTML = lcp.map(function(l) {
            var pct = total > 0 ? (l.sessions / total * 100).toFixed(1) : 0;
            return '<tr>' +
                '<td><span class="vitals-dot" style="background:' + _vitalColor(l.rating) + '"></span>' + esc(l.rating) + '</td>' +
                '<td class="value">' + fmt(l.sessions) + '</td>' +
                '<td>' + (l.avgMs ? (l.avgMs / 1000).toFixed(2) + 's' : '—') + '</td>' +
                '<td>' + pct + '%<div class="progress-bar"><div class="progress-fill purple" style="width:' + pct + '%"></div></div></td>' +
            '</tr>';
        }).join('');
    }
    if (card) card.style.display = '';
}

// =========================================
//  RENDER: Feature-Nutzung (Custom Events)
// =========================================
// Event-Namen sind technische Keys — hier bekommen sie ein lesbares Label.
var EVENT_LABELS = {
    'entry_created': 'Eintrag erstellt',
    'entry_updated': 'Eintrag bearbeitet',
    'timer_action':  'Timer benutzt',
    'data_exported': 'Daten exportiert',
};

function renderCustomEvents(events) {
    var tbody = document.querySelector('#eventsTable tbody');
    if (!tbody) return;

    if (!events || !events.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">Noch keine Events — die Feature-Erfassung läuft erst seit dem letzten Update.</td></tr>';
        return;
    }

    var total = events.reduce(function(s, e) { return s + (e.count || 0); }, 0);

    tbody.innerHTML = events.map(function(e, i) {
        var pct = total > 0 ? ((e.count / total) * 100).toFixed(1) : 0;
        var label = EVENT_LABELS[e.name] || e.name;
        return '<tr>' +
            '<td class="rank">' + (i + 1) + '</td>' +
            '<td>' + esc(label) + '</td>' +
            '<td class="value">' + fmt(e.count) + '</td>' +
            '<td>' + pct + '%<div class="progress-bar"><div class="progress-fill yellow" style="width:' + pct + '%"></div></div></td>' +
        '</tr>';
    }).join('');
}

// =========================================
//  LOAD ALL DATA — PostHog via Worker-Proxy
// =========================================
async function loadAll() {
    var btn = document.getElementById('refreshBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Laden...'; }

    setLiveStatus('connecting');
    showSkeletons();

    var noticeEl = document.getElementById('adblockNotice');
    if (noticeEl) noticeEl.style.display = 'none';
    var detailEl = document.getElementById('errorDetail');
    if (detailEl) detailEl.style.display = 'none';

    // Ohne Timeout haengt ein stiller Proxy-Stall die Seite dauerhaft im Ladezustand
    var ctrl = new AbortController();
    var timeoutId = setTimeout(function() { ctrl.abort(); }, 30000);

    try {
        var res;
        try {
            res = await fetch(CF_PROXY + '?range=' + currentRange, { cache: 'no-store', signal: ctrl.signal });
        } catch (netErr) {
            if (netErr.name === 'AbortError') throw new Error('Zeitüberschreitung: Backend hat nach 30s nicht geantwortet.');
            throw new Error('Netzwerkfehler: ' + netErr.message + ' (Adblocker? Offline?)');
        } finally {
            clearTimeout(timeoutId);
        }

        if (!res.ok) {
            var errTxt = await res.text().catch(function() { return ''; });
            var errMsg = errTxt;
            try { errMsg = JSON.parse(errTxt).error || errTxt; } catch (e) { /* Rohtext */ }
            throw new Error('HTTP ' + res.status + ' — ' + String(errMsg).slice(0, 300));
        }
        var d = await res.json();
        if (d.error) throw new Error(d.error);

        // Teilausfaelle: Seite rendert, aber die kaputten Queries stehen in der Console
        if (d._errors) {
            console.warn('Analytics: Teil-Queries fehlgeschlagen:', d._errors);
        }

        var sum      = d.summary             || {};
        var series   = d.series              || [];
        var topPages = d.topPages            || [];
        var entry    = d.entryPages          || [];
        var exit     = d.exitPages           || [];
        var refs     = d.referrers           || [];
        var channels = d.channels            || [];
        var utm      = d.utm                 || {};
        var countries= d.countries           || [];
        var regions  = d.regions             || [];
        var cities   = d.cities              || [];
        var langs    = d.languages           || [];
        var browsers = d.browsers            || [];
        var os       = d.os                  || [];
        var devices  = d.devices             || [];
        var resolut  = d.resolutions         || [];
        var activity = d.activity            || [];
        var custEv   = d.customEvents        || [];
        var nvr      = d.newVsReturning      || [];
        var durBkts  = d.sessionDurationBuckets || [];
        var pvpSess  = d.pageviewsPerSession || [];
        var lcp      = (d.webVitals && d.webVitals.lcp) || [];

        // ── KPI Hauptmetriken ──────────────────────────────────────────────
        var pv       = sum.pageviews       || 0;
        var visitors = sum.visitors        || 0;
        var sessions = sum.sessions        || 0;
        var bounce   = sum.bounceRate      || 0;   // 0–1
        var avgDur   = sum.avgSessionDuration || 0; // string "Xs" or seconds

        var pvEl      = document.getElementById('kpiPageviews');
        var visEl     = document.getElementById('kpiVisitors');
        var visitsEl  = document.getElementById('kpiVisits');
        if (pvEl)     { pvEl.textContent = fmt(pv);       animateValue(pvEl, pv, ''); }
        if (visEl)    { visEl.textContent = fmt(visitors); animateValue(visEl, visitors, ''); }
        if (visitsEl) { visitsEl.textContent = fmt(sessions); animateValue(visitsEl, sessions, ''); }

        // Pages / Session
        var pps    = sessions > 0 ? (pv / sessions) : 0;
        var ppsEl  = document.getElementById('kpiPagesPerSession');
        var ppsSub = document.getElementById('kpiPagesPerSessionSub');
        if (ppsEl)  ppsEl.textContent  = pps.toFixed(1);
        if (ppsSub) ppsSub.textContent = fmt(pv) + ' Seiten / ' + fmt(sessions) + ' Sessions';

        // Bounce Rate
        var bounceEl = document.getElementById('kpiBounce');
        if (bounceEl) bounceEl.textContent = (bounce * 100).toFixed(1) + '%';

        // Avg Session Duration
        var durEl      = document.getElementById('kpiDuration');
        var totalTimeEl= document.getElementById('kpiTotalTime');
        var durDisplay = typeof avgDur === 'string' ? avgDur : fmtDuration(avgDur);
        if (durEl)       durEl.textContent      = durDisplay;
        if (totalTimeEl) totalTimeEl.textContent = 'Ø pro Session';

        // Engagement Score (basiert auf Bounce Rate + Pages/Session)
        var engScore = Math.min(100, Math.round(((1 - bounce) * 0.5 + Math.min(pps / 5, 1) * 0.5) * 100));
        var engEl    = document.getElementById('kpiEngagement');
        var engSubEl = document.getElementById('kpiEngagementSub');
        if (engEl)    engEl.textContent    = engScore + '%';
        if (engSubEl) engSubEl.textContent = engScore >= 75 ? 'Hervorragend' :
                                              engScore >= 50 ? 'Gut' :
                                              engScore >= 25 ? 'Ausbaufähig' : 'Niedrig';

        // Neue vs. Wiederkehrende Besucher (Active Users Badge)
        var activeEl = document.getElementById('activeUsers');
        if (activeEl) {
            var newU = nvr.find(function(r) { return r.type === 'Neu'; });
            activeEl.innerHTML = '<div class="live-dot" style="width:8px;height:8px;"></div> '
                + (newU ? fmt(newU.visitors) + ' neu' : '–');
        }

        // ── Trend Indikatoren ──────────────────────────────────────────────
        setTrend('kpiPageviewsTrend', sum.pageviews,  sum.pageviewsPrev);
        setTrend('kpiVisitorsTrend',  sum.visitors,   sum.visitorsPrev);
        setTrend('kpiVisitsTrend',    sum.sessions,   sum.sessionsPrev);
        setTrend('kpiBouncesTrend',   sum.bounceRate, sum.bounceRatePrev);

        // ── Zeitreihe Charts ───────────────────────────────────────────────
        var seriesPV  = series.map(function(s) { return { x: s.ts, y: s.pageviews || 0 }; });
        var seriesSes = series.map(function(s) { return { x: s.ts, y: s.sessions  || 0 }; });
        if (currentRange >= 30 && currentRange <= 90) {
            seriesPV  = aggregateWeekly(seriesPV);
            seriesSes = aggregateWeekly(seriesSes);
        }
        renderBarChartDual('pageviewsChart', seriesPV, seriesSes);
        renderBarChartSingle('visitorsChart', series.map(function(s) { return { x: s.ts, y: s.visitors || 0 }; }));

        // ── Sparklines in den KPI-Kacheln ──────────────────────────────────
        renderSparkline('sparkPageviews', series.map(function(s) { return s.pageviews || 0; }), '#a78bfa');
        renderSparkline('sparkVisitors',  series.map(function(s) { return s.visitors  || 0; }), '#34d399');
        renderSparkline('sparkSessions',  series.map(function(s) { return s.sessions  || 0; }), '#22d3ee');

        // ── Top Pages ──────────────────────────────────────────────────────
        var topPagesNorm = cleanExpandedPageData(topPages.map(function(p) {
            return { name: p.path, pageviews: p.pageviews, visitors: p.visitors, visits: p.sessions || 0, bounces: 0, totaltime: 0 };
        }));
        renderExpandedTable('topPagesTable', topPagesNorm);

        // ── Entry / Exit Pages ─────────────────────────────────────────────
        renderSimpleTable('entryPagesTable',
            entry.map(function(p) { return { x: p.path, y: p.entries }; }),
            function(x) { return x || '/'; }, 'green');
        renderSimpleTable('exitPagesTable',
            exit.map(function(p) { return { x: p.path, y: p.exits }; }),
            function(x) { return x || '/'; }, 'cyan');

        // ── Referrers ──────────────────────────────────────────────────────
        renderSimpleTable('referrersTable',
            refs.map(function(r) { return { x: r.source, y: r.visitors }; }),
            function(x) { return x; }, 'purple');

        // ── Channels ───────────────────────────────────────────────────────
        renderSimpleTable('channelsTable',
            channels.map(function(c) { return { x: c.channel, y: c.sessions }; }),
            function(x) { return x; }, 'yellow');

        // ── UTM → Titles Tab ───────────────────────────────────────────────
        var utmData = (utm.sources || []).map(function(u) { return { x: u.value, y: u.sessions }; });
        renderSimpleTable('titlesTable', utmData, function(x) { return x; }, 'purple');

        // ── Audience: Devices, Browsers, OS ───────────────────────────────
        renderDevicesDonut(devices.map(function(d) { return { x: d.device, y: d.visitors }; }));
        renderSimpleTableNoRank('browsersTable',
            filterBotMetrics(browsers.map(function(b) { return { x: b.browser, y: b.visitors }; })),
            function(x) { return x; }, 'purple');
        renderSimpleTableNoRank('osTable',
            filterBotMetrics(os.map(function(o) { return { x: o.os, y: o.visitors }; })),
            function(x) { return x; }, 'cyan');

        // ── Auflösungen (exakt statt Buckets) ──────────────────────────────
        renderSimpleTableNoRank('screensTable',
            resolut.map(function(s) { return { x: s.res, y: s.visitors }; }),
            function(x) { return x; }, 'purple');

        // ── Geo: Karten + Städte ───────────────────────────────────────────
        renderMaps(countries, regions, cities);
        renderSimpleTableNoRank('citiesTable',
            cities.map(function(c) { return { x: c.city, y: c.visitors }; }),
            function(x) { return x; }, 'yellow');

        // ── Sprachen ───────────────────────────────────────────────────────
        renderSimpleTableNoRank('languagesTable',
            langs.map(function(l) { return { x: l.lang, y: l.visitors }; }),
            langName, 'cyan');

        // ── Session-Verhalten ──────────────────────────────────────────────
        renderSimpleTableNoRank('durationTable',
            durBkts.map(function(b) { return { x: b.bucket, y: b.sessions }; }),
            function(x) { return x; }, 'yellow');
        renderSimpleTableNoRank('pagesPerSessionTable',
            pvpSess.map(function(b) { return { x: b.bucket, y: b.sessions }; }),
            function(x) { return x; }, 'green');

        // ── Aktivitäts-Puls, Ladeperformance, Feature-Nutzung ──────────────
        renderActivityPulse(activity);
        renderVitals(lcp);
        renderCustomEvents(custEv);

        // ── Insights ───────────────────────────────────────────────────────
        var insights = generateInsights(
            { pageviews: pv, visitors: visitors, visits: sessions, bounces: Math.round(bounce * sessions), totaltime: (typeof avgDur === 'number' ? avgDur * sessions : 0) },
            { pageviews: sum.pageviewsPrev || 0, visitors: sum.visitorsPrev || 0, visits: sum.sessionsPrev || 0, bounces: 0, totaltime: 0 },
            devices.map(function(d) { return { x: d.device, y: d.visitors }; }),
            { pageviews: seriesPV, sessions: seriesSes },
            topPagesNorm
        );

        // Zusätzliche PostHog Insights
        if (lcp.length > 0) {
            var goodLcp = lcp.find(function(l) { return l.rating && l.rating.includes('Good'); });
            if (goodLcp) {
                var goodPct = lcp.reduce(function(s, l) { return s + l.sessions; }, 0);
                goodPct = goodPct > 0 ? Math.round(goodLcp.sessions / goodPct * 100) : 0;
                insights.unshift({ icon: '⚡', text: '<strong>' + goodPct + '% gute LCP-Werte</strong> — Seite lädt schnell für die meisten Nutzer.' });
            }
        }
        if (nvr.length > 0) {
            var retU = nvr.find(function(r) { return r.type === 'Wiederkehrend'; });
            if (retU && retU.visitors > 0) {
                var retPct = Math.round(retU.visitors / visitors * 100);
                insights.push({ icon: '🔄', text: '<strong>' + retPct + '% wiederkehrende Nutzer</strong> — die App bindet ihre User.' });
            }
        }

        renderInsights(insights);

        // ── Timestamp ──────────────────────────────────────────────────────
        var lu = document.getElementById('lastUpdated');
        if (lu) lu.textContent = 'Zuletzt aktualisiert: ' + new Date().toLocaleString('de-DE');

        setLiveStatus('live');
        hideSkeletons();

    } catch (err) {
        console.error('Analytics Error:', err);
        setLiveStatus('error');
        hideSkeletons();
        var adEl = document.getElementById('adblockNotice');
        if (adEl) adEl.style.display = 'block';
        var detEl = document.getElementById('errorDetail');
        if (detEl) {
            detEl.textContent = err.message || String(err);
            detEl.style.display = 'block';
        }
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '🔄 Aktualisieren'; }
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

    // Auto-refresh alle 5 Minuten
    setInterval(function() { loadAll(); }, 300000);
});
