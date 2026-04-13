// =========================================
//  KONFIGURATION
// =========================================
const WEBSITE_ID = '1ad00d56-ca9d-4fc7-a252-26ca5bd8acf8';
const API_URL = 'https://api.umami.is/v1';
let API_TOKEN = localStorage.getItem('umami_api_token') || 'api_zPctNoDxbOj59ZEltLxqLXBBEXpWDUwo';
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

function saveToken() {
    const input = document.getElementById('apiTokenInput');
    API_TOKEN = input.value.trim();
    if (API_TOKEN) {
        localStorage.setItem('umami_api_token', API_TOKEN);
        document.getElementById('configNotice').style.display = 'none';
        loadAll();
    }
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
//  API
// =========================================
async function api(endpoint, params = {}) {
    const url = new URL(API_URL + '/websites/' + WEBSITE_ID + endpoint);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.append(k, v);
    });

    const res = await fetch(url, {
        headers: { 'x-umami-api-key': API_TOKEN, 'Accept': 'application/json' }
    });

    if (!res.ok) {
        var errText = await res.text().catch(function() { return ''; });
        console.error('API Error:', res.status, res.statusText, url.toString(), errText);
        throw new Error('API ' + res.status + ': ' + res.statusText);
    }
    var json = await res.json();
    console.log('API OK:', endpoint, json);
    return json;
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

    var W   = Math.max(el.offsetWidth || 480, 160);
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

    var W   = Math.max(el.offsetWidth || 480, 160);
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
//  SKELETON LOADING
// =========================================
function showSkeletons() {
    document.getElementById('mainKpis').style.display = 'none';
    document.getElementById('mainKpisSkeletons').style.display = 'grid';
    document.getElementById('pageviewsChart').parentElement.parentElement.style.display = 'none';
    document.getElementById('visitorsChart').parentElement.parentElement.style.display = 'none';
    document.getElementById('pageviewsChartSkeleton').parentElement.parentElement.style.display = 'grid';
    document.getElementById('visitorsChartSkeleton').parentElement.parentElement.style.display = 'grid';
    document.getElementById('tableSkeletonContainer').style.display = 'block';
    document.querySelector('.section-card:has(#topPagesTable)').style.display = 'none';
}

function hideSkeletons() {
    document.getElementById('mainKpis').style.display = 'grid';
    document.getElementById('mainKpisSkeletons').style.display = 'none';
    document.getElementById('pageviewsChart').parentElement.parentElement.style.display = 'grid';
    document.getElementById('visitorsChart').parentElement.parentElement.style.display = 'grid';
    document.getElementById('pageviewsChartSkeleton').parentElement.parentElement.style.display = 'none';
    document.getElementById('visitorsChartSkeleton').parentElement.parentElement.style.display = 'none';
    document.getElementById('tableSkeletonContainer').style.display = 'none';
    document.querySelector('.section-card:has(#topPagesTable)').style.display = 'block';
}

// =========================================
//  LOAD ALL DATA
// =========================================
async function loadAll() {
    if (!API_TOKEN) {
        document.getElementById('configNotice').style.display = 'block';
        return;
    }

    var btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ Laden...';

    showSkeletons();

    try {
        var range = getRange(currentRange);
        var prevRange = getRange(currentRange * 2);
        prevRange.endAt = range.startAt;
        var unit = getUnit(currentRange);

        // All API calls in parallel
        var results = await Promise.all([
            api('/active').catch(function() { return { visitors: 0 }; }),                                   // 0
            api('/stats', range),                                                                            // 1
            api('/stats', prevRange).catch(function() { return null; }),                                      // 2
            api('/pageviews', { startAt: range.startAt, endAt: range.endAt, unit: unit, timezone: 'Europe/Berlin' }), // 3
            api('/metrics/expanded', { startAt: range.startAt, endAt: range.endAt, type: 'path', limit: 20 }) // 4
                .catch(function() {
                    return api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'path', limit: 20 });
                }),
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'entry', limit: 15 }),       // 5
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'exit', limit: 15 }),         // 6
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'referrer', limit: 15 }),     // 7
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'channel', limit: 10 })      // 8
                .catch(function() { return []; }),
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'browser', limit: 10 }),     // 9
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'os', limit: 10 }),          // 10
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'device', limit: 5 }),       // 11
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'country', limit: 15 }),     // 12
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'city', limit: 15 }),        // 13
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'language', limit: 10 }),    // 14
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'screen', limit: 10 }),      // 15
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'event', limit: 15 })        // 16
                .catch(function() { return []; }),
            api('/metrics', { startAt: range.startAt, endAt: range.endAt, type: 'title', limit: 15 }),       // 17
        ]);

        var active       = results[0];
        var stats        = results[1];
        var prevStats    = results[2];
        var pageviewsData= results[3];
        var topPagesExp  = results[4];
        var entryPages   = Array.isArray(results[5]) ? results[5] : [];
        var exitPages    = Array.isArray(results[6]) ? results[6] : [];
        var referrers    = Array.isArray(results[7]) ? results[7] : [];
        var channels     = Array.isArray(results[8]) ? results[8] : [];
        var browsers     = Array.isArray(results[9]) ? results[9] : [];
        var os           = Array.isArray(results[10]) ? results[10] : [];
        var devices      = Array.isArray(results[11]) ? results[11] : [];
        var countries    = Array.isArray(results[12]) ? results[12] : [];
        var cities       = Array.isArray(results[13]) ? results[13] : [];
        var languages    = Array.isArray(results[14]) ? results[14] : [];
        var screens      = Array.isArray(results[15]) ? results[15] : [];
        var events       = Array.isArray(results[16]) ? results[16] : [];
        var titles       = Array.isArray(results[17]) ? results[17] : [];

        // 🤖 APPLY BOT FILTERING
        // Removes known crawlers, bots, and datacenter traffic from analytics
        browsers = filterBotMetrics(browsers);
        os = filterBotMetrics(os);
        referrers = filterBotMetrics(referrers);
        channels = filterBotMetrics(channels);
        console.log('🤖 Analytics Filtering: Bot-Metriken gefiltert. Browser nach Filter:', browsers.length, 'OS nach Filter:', os.length);

        // ── Active Users ──
        document.getElementById('activeUsers').innerHTML =
            '<div class="live-dot" style="width:8px;height:8px;"></div> ' + (active.visitors || 0) + ' aktiv';

        // ── Main KPIs ──
        var pv = (typeof stats.pageviews === 'object' && stats.pageviews !== null) ? (stats.pageviews.value || 0) : (stats.pageviews || 0);
        var vis = (typeof stats.visitors === 'object' && stats.visitors !== null) ? (stats.visitors.value || 0) : (stats.visitors || 0);
        var visits = (typeof stats.visits === 'object' && stats.visits !== null) ? (stats.visits.value || 0) : (stats.visits || 0);
        var bounces = (typeof stats.bounces === 'object' && stats.bounces !== null) ? (stats.bounces.value || 0) : (stats.bounces || 0);
        var totaltime = (typeof stats.totaltime === 'object' && stats.totaltime !== null) ? (stats.totaltime.value || 0) : (stats.totaltime || 0);

        document.getElementById('kpiPageviews').textContent = fmt(pv);
        document.getElementById('kpiVisitors').textContent = fmt(vis);
        document.getElementById('kpiVisits').textContent = fmt(visits);

        // Animated counters
        animateValue(document.getElementById('kpiPageviews'), pv, '');
        animateValue(document.getElementById('kpiVisitors'), vis, '');
        animateValue(document.getElementById('kpiVisits'), visits, '');

        var avgTime = visits > 0 ? totaltime / visits : 0;
        document.getElementById('kpiDuration').textContent = fmtDuration(avgTime);
        document.getElementById('kpiTotalTime').textContent = 'Gesamt: ' + fmtDuration(totaltime);

        var bounceRate = visits > 0 ? ((bounces / visits) * 100).toFixed(1) : 0;
        document.getElementById('kpiBounce').textContent = bounceRate + '%';

        // New KPIs: Pages/Session & Engagement Score
        var pagesPerSession = visits > 0 ? (pv / visits) : 0;
        document.getElementById('kpiPagesPerSession').textContent = pagesPerSession.toFixed(1);
        document.getElementById('kpiPagesPerSessionSub').textContent = fmt(pv) + ' Seiten / ' + fmt(visits) + ' Sessions';

        // Engagement = weighted score from bounce, time, pages/session
        var engBounce = Math.max(0, 100 - parseFloat(bounceRate)); // lower bounce = better
        var engTime = Math.min(100, (avgTime / 300) * 100);       // up to 5min = 100
        var engPages = Math.min(100, (pagesPerSession / 5) * 100); // up to 5 pages = 100
        var engScore = Math.round(engBounce * 0.35 + engTime * 0.4 + engPages * 0.25);
        document.getElementById('kpiEngagement').textContent = engScore + '%';
        var engLabel = engScore >= 75 ? 'Hervorragend' : engScore >= 50 ? 'Gut' : engScore >= 25 ? 'Ausbaufähig' : 'Niedrig';
        document.getElementById('kpiEngagementSub').textContent = engLabel;

        // ── Trends vs previous period ──
        if (prevStats) {
            var ppv = (typeof prevStats.pageviews === 'object' && prevStats.pageviews !== null) ? (prevStats.pageviews.value || 0) : (prevStats.pageviews || 0);
            var pvis = (typeof prevStats.visitors === 'object' && prevStats.visitors !== null) ? (prevStats.visitors.value || 0) : (prevStats.visitors || 0);
            var pvisits = (typeof prevStats.visits === 'object' && prevStats.visits !== null) ? (prevStats.visits.value || 0) : (prevStats.visits || 0);
            var pbounces = (typeof prevStats.bounces === 'object' && prevStats.bounces !== null) ? (prevStats.bounces.value || 0) : (prevStats.bounces || 0);

            setTrend('kpiPageviewsTrend', pv, ppv);
            setTrend('kpiVisitorsTrend', vis, pvis);
            setTrend('kpiVisitsTrend', visits, pvisits);

            var prevBounceRate = pvisits > 0 ? (pbounces / pvisits) * 100 : 0;
            var bounceDiff = bounceRate - prevBounceRate;
            var bEl = document.getElementById('kpiBouncesTrend');
            if (bounceDiff > 1) {
                bEl.className = 'kpi-trend down'; bEl.textContent = '↑ +' + bounceDiff.toFixed(1) + '%';
            } else if (bounceDiff < -1) {
                bEl.className = 'kpi-trend up'; bEl.textContent = '↓ ' + bounceDiff.toFixed(1) + '%';
            } else {
                bEl.className = 'kpi-trend neutral'; bEl.textContent = '→ 0%';
            }
        }

        // ── Charts ── (aggregate weekly if range >= 30 days)
        var chartPV = pageviewsData.pageviews;
        var chartSessions = pageviewsData.sessions;
        if (currentRange >= 30 && currentRange <= 90) {
            chartPV = aggregateWeekly(chartPV);
            chartSessions = aggregateWeekly(chartSessions);
        }
        renderBarChartDual('pageviewsChart', chartPV, chartSessions);
        renderBarChartSingle('visitorsChart', chartSessions, 'visitor');

        // ── Tab Tables (filtered & normalized) ──
        topPagesExp = cleanExpandedPageData(topPagesExp);
        entryPages  = cleanSimplePageData(entryPages);
        exitPages   = cleanSimplePageData(exitPages);

        renderExpandedTable('topPagesTable', topPagesExp);

        renderSimpleTable('entryPagesTable', entryPages, function(x) { return x || '/'; }, 'green');
        renderSimpleTable('exitPagesTable', exitPages, function(x) { return x || '/'; }, 'cyan');
        renderSimpleTable('referrersTable', referrers.map(function(r) {
            return { x: r.x || '(Direkt)', y: r.y };
        }), function(x) { return x; }, 'purple');
        renderSimpleTable('channelsTable', channels, function(x) { return x; }, 'yellow');
        renderSimpleTable('titlesTable', titles, function(x) { return x; }, 'purple');

        // ── Audience ──
        renderDevicesDonut(devices);
        renderSimpleTableNoRank('browsersTable', browsers, function(x) { return x; }, 'purple');
        renderSimpleTableNoRank('osTable', os, function(x) { return x; }, 'cyan');

        // ── Geo ──
        renderSimpleTableNoRank('countriesTable', countries, countryName, 'green');
        renderSimpleTableNoRank('citiesTable', cities, function(x) { return x; }, 'yellow');

        // ── Tech ──
        renderSimpleTableNoRank('languagesTable', languages, langName, 'cyan');
        renderSimpleTableNoRank('screensTable', screens, function(x) { return x; }, 'purple');

        // ── Events ──
        renderSimpleTable('eventsTable', events, function(x) { return x; }, 'yellow');

        // ── Insights ──
        var insights = generateInsights(stats, prevStats, devices, pageviewsData, topPagesExp);
        renderInsights(insights);

        // ── Timestamp ──
        document.getElementById('lastUpdated').textContent = 'Zuletzt aktualisiert: ' + new Date().toLocaleString('de-DE');

        hideSkeletons();

    } catch (err) {
        console.error('Analytics Error:', err);
        hideSkeletons();
        if (err.message.indexOf('401') !== -1 || err.message.indexOf('403') !== -1) {
            document.getElementById('configNotice').style.display = 'block';
            alert('❌ Ungültiger API Token!\n\nBitte neuen Token erstellen unter:\nUmami Cloud → Settings → API Keys');
        } else {
            alert('❌ Fehler beim Laden!\n\n' + err.message);
        }
    }

    btn.disabled = false;
    btn.innerHTML = '🔄 Aktualisieren';
}

// =========================================
//  INIT
// =========================================
document.addEventListener('DOMContentLoaded', function() {
    if (!API_TOKEN) {
        document.getElementById('configNotice').style.display = 'block';
    } else {
        loadAll();
    }

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

    // Auto-refresh active users every 30s
    setInterval(async function() {
        try {
            var active = await api('/active');
            document.getElementById('activeUsers').innerHTML =
                '<div class="live-dot" style="width:8px;height:8px;"></div> ' + (active.visitors || 0) + ' aktiv';
        } catch(e) { /* silent */ }
    }, 30000);

    // Auto-refresh all data every 5 minutes
    setInterval(function() { loadAll(); }, 300000);
});
