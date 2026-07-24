// Locale-Helfer: diese Datei laeuft auf einer Standalone-Seite ohne utils.js.
// Faellt auf die globale Funktion zurueck, wenn sie doch vorhanden ist.
var mwlLocale = window.mwlLocale || function () {
    return document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE';
};

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

// (Geräte-Icons als SVG in renderDevicesDonut — siehe DEVICE_SVG. Keine Emojis.)
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
// SVG-Icons (Lucide-Style) statt Emojis — färben sich via currentColor mit der
// Tonalität der Karte (siehe tone-* in renderInsights). Keine Emojis im UI.
function icSvg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
}
var INSIGHT_ICONS = {
    trendUp:   icSvg('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'),
    trendDown: icSvg('<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>'),
    bars:      icSvg('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
    target:    icSvg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
    alert:     icSvg('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
    clock:     icSvg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    smartphone:icSvg('<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>'),
    monitor:   icSvg('<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'),
    layers:    icSvg('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'),
    award:     icSvg('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>'),
    calendar:  icSvg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    info:      icSvg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'),
    zap:       icSvg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
    refresh:   icSvg('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>')
};

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
                insights.push({ icon: INSIGHT_ICONS.trendUp, tone: 'good', text: '<strong>Traffic ↑' + change + '%</strong> im Vergleich zum Vorzeitraum — starkes Wachstum!' });
            } else if (change < -10) {
                insights.push({ icon: INSIGHT_ICONS.trendDown, tone: 'bad', text: 'Traffic <strong>↓' + Math.abs(change) + '%</strong> im Vergleich zum Vorzeitraum. Evtl. saisonale Schwankung.' });
            } else {
                insights.push({ icon: INSIGHT_ICONS.bars, tone: 'info', text: 'Traffic ist <strong>stabil</strong> im Vergleich zum Vorzeitraum (' + (change >= 0 ? '+' : '') + change + '%).' });
            }
        }
    }

    // Bounce rate insight
    var br = visits > 0 ? (bounces / visits * 100) : 0;
    if (br < 30) {
        insights.push({ icon: INSIGHT_ICONS.target, tone: 'good', text: 'Bounce Rate nur <strong>' + br.toFixed(0) + '%</strong> — Nutzer interagieren aktiv mit der App!' });
    } else if (br > 60) {
        insights.push({ icon: INSIGHT_ICONS.alert, tone: 'warn', text: 'Bounce Rate bei <strong>' + br.toFixed(0) + '%</strong> — viele Nutzer verlassen die Seite sofort.' });
    }

    // Average time insight
    var avgTime = visits > 0 ? totaltime / visits : 0;
    if (avgTime > 300) {
        insights.push({ icon: INSIGHT_ICONS.clock, tone: 'good', text: 'Nutzer verbringen durchschnittlich <strong>' + fmtDuration(avgTime) + '</strong> — hohe Engagement-Zeit!' });
    } else if (avgTime > 60) {
        insights.push({ icon: INSIGHT_ICONS.clock, tone: 'info', text: 'Ø Verweildauer: <strong>' + fmtDuration(avgTime) + '</strong> pro Session.' });
    }

    // Devices insight
    if (devices && devices.length > 0) {
        var totalDevices = devices.reduce(function(s,d) { return s + d.y; }, 0);
        var mobile = devices.find(function(d) { return d.x === 'mobile'; });
        var mobilePct = mobile ? ((mobile.y / totalDevices) * 100).toFixed(0) : 0;
        if (mobilePct > 50) {
            insights.push({ icon: INSIGHT_ICONS.smartphone, tone: 'info', text: '<strong>' + mobilePct + '% mobile Nutzer</strong> — die PWA wird hauptsächlich am Handy genutzt.' });
        } else if (mobilePct > 0) {
            insights.push({ icon: INSIGHT_ICONS.monitor, tone: 'info', text: '<strong>' + (100 - mobilePct) + '% Desktop</strong>, ' + mobilePct + '% Mobile — ausgewogene Nutzung.' });
        }
    }

    // Pages/session insight
    var pps = visits > 0 ? (pv / visits) : 0;
    if (pps > 3) {
        insights.push({ icon: INSIGHT_ICONS.layers, tone: 'good', text: '<strong>' + pps.toFixed(1) + ' Seiten pro Session</strong> — Nutzer erkunden verschiedene Features.' });
    }

    // Top page insight
    if (topPages && topPages.length > 0) {
        var top = topPages[0];
        var topPct = pv > 0 ? ((top.pageviews || top.y || 0) / pv * 100).toFixed(0) : 0;
        insights.push({ icon: INSIGHT_ICONS.award, tone: 'info', text: 'Beliebteste Seite: <strong>' + (top.name || top.x) + '</strong> mit ' + topPct + '% aller Aufrufe.' });
    }

    // Total time insight
    if (totaltime > 3600) {
        var hrs = (totaltime / 3600).toFixed(1);
        insights.push({ icon: INSIGHT_ICONS.calendar, tone: 'info', text: 'Insgesamt <strong>' + hrs + ' Stunden</strong> Nutzungszeit im ausgewählten Zeitraum.' });
    }

    if (insights.length === 0) {
        insights.push({ icon: INSIGHT_ICONS.info, tone: 'info', text: 'Noch nicht genug Daten für automatische Insights. Schau in ein paar Tagen nochmal rein!' });
    }

    return insights;
}

function renderInsights(insights) {
    var el = document.getElementById('insightsGrid');
    if (!el) return;
    el.innerHTML = insights.map(function(ins) {
        var tone = ins.tone ? ' tone-' + ins.tone : '';
        return '<div class="insight-item"><div class="insight-icon' + tone + '">' + ins.icon + '</div><div class="insight-text">' + ins.text + '</div></div>';
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

// Verweildauer-Buckets nach echter Zeit sortieren (kleinste → größte Dauer),
// NICHT nach Session-Anzahl. So liest sich die Tabelle als Verteilung und man
// sieht, in welchem Zeitfenster die meisten Nutzer liegen. Parst die Untergrenze
// des Bucket-Labels ("0-10s", "10-30s", "1-3min", "30min+", "1-2h") in Sekunden.
function durationBucketSeconds(label) {
    if (label == null) return Infinity;
    var s = String(label).toLowerCase();
    var m = s.match(/(\d+(?:[.,]\d+)?)/);
    if (!m) return Infinity;
    var n = parseFloat(m[1].replace(',', '.'));
    if (/\b\d+\s*(h|std|stunde|hour)/.test(s)) return n * 3600;
    if (/min/.test(s)) return n * 60;
    return n; // Sekunden (Default)
}

// Erste Zahl aus einem Label ziehen ("3-5", "6+", "1" → 3, 6, 1).
// Für "Seiten pro Session": aufsteigend nach Seitenzahl statt nach Session-Anzahl.
function firstNumber(label) {
    if (label == null) return Infinity;
    var m = String(label).match(/(\d+(?:[.,]\d+)?)/);
    return m ? parseFloat(m[1].replace(',', '.')) : Infinity;
}

// Auflösung ("1920x1080") in Pixelfläche für "kleinster → größter Screen".
function resolutionArea(label) {
    if (label == null) return Infinity;
    var m = String(label).toLowerCase().match(/(\d+)\s*[x×]\s*(\d+)/);
    if (m) return parseInt(m[1], 10) * parseInt(m[2], 10);
    var w = String(label).match(/(\d+)/); // Fallback: nur eine Zahl → nach Breite
    return w ? parseInt(w[1], 10) : Infinity;
}

// =========================================
//  RENDER: Städte — Länder-Chips + City-Grid
//  Vollbreite Karte. Chips filtern nach Land (ein Tap, alle sichtbar), die
//  Städte füllen als responsives Grid die Breite. Flaggen-Emoji je Stadt/Land.
// =========================================
var _citiesData = { cities: [], names: {}, active: '' };

// Globus-Icon (Lucide-Style, wie im „Herkunft"-Titel) für den „Alle"-Chip —
// SVG statt Emoji, damit es sich im Aktiv-Zustand mit einfärbt (currentColor).
var GLOBE_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

// ISO-A2-Code → Flaggen-Emoji (Regional Indicator Symbols). Kein Asset-Load.
function flagEmoji(code) {
    if (!code || !/^[a-zA-Z]{2}$/.test(code)) return '🏳️';
    var cc = code.toUpperCase();
    return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65);
}

function renderCities(cities, countries) {
    _citiesData.cities = (cities || []).slice().sort(function(a, b) {
        return (b.visitors || 0) - (a.visitors || 0);
    });
    _citiesData.names  = {};
    (countries || []).forEach(function(c) {
        if (c.code) _citiesData.names[c.code] = c.country || c.code;
    });
    _citiesData.active = ''; // frische Daten → zurück auf „Alle"

    var badge = document.getElementById('citiesBadge');
    if (badge) {
        var n = _citiesData.cities.length;
        var EN = document.documentElement.lang === 'en';
        badge.textContent = n + ' ' + (EN ? (n === 1 ? 'city' : 'cities') : (n === 1 ? 'Stadt' : 'Städte'));
    }
    renderCityChips();
    renderCityGrid();
}

// Chip-Leiste: „Alle" + je Land (Flagge · Name · Besucher), nach Besuchern sortiert.
function renderCityChips() {
    var host = document.getElementById('cityCountryChips');
    if (!host) return;
    var EN = document.documentElement.lang === 'en';
    var byCode = {};
    _citiesData.cities.forEach(function(c) {
        var k = c.code || '??';
        byCode[k] = (byCode[k] || 0) + (c.visitors || 0);
    });
    var codes = Object.keys(byCode).sort(function(a, b) { return byCode[b] - byCode[a]; });
    var total = _citiesData.cities.reduce(function(s, c) { return s + (c.visitors || 0); }, 0);

    var chips = [chipHTML('', GLOBE_SVG, EN ? 'All' : 'Alle', total)];
    codes.forEach(function(code) {
        chips.push(chipHTML(code, flagEmoji(code), _citiesData.names[code] || code, byCode[code]));
    });
    host.innerHTML = chips.join('');
}

function chipHTML(code, flag, label, count) {
    var on = _citiesData.active === code;
    return '<button type="button" class="geo-chip' + (on ? ' active' : '') + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '"' +
        " onclick=\"filterCities('" + esc(code) + "')\">" +
        '<span class="chip-flag">' + flag + '</span>' + esc(label) +
        '<span class="chip-count">' + fmt(count) + '</span></button>';
}

function filterCities(code) {
    _citiesData.active = code || '';
    renderCityChips();
    renderCityGrid();
}

// City-Grid nach aktivem Land. Balken skalieren zum globalen Max (vergleichbar
// über Länder hinweg); Prozent im Tooltip bleibt relativ zu ALLEN Städten, damit
// der Anteil einer Stadt beim Filtern nicht springt.
function renderCityGrid() {
    var host = document.getElementById('citiesGrid');
    if (!host) return;
    var EN = document.documentElement.lang === 'en';
    var all = _citiesData.cities;
    var grandTotal = all.reduce(function(s, c) { return s + (c.visitors || 0); }, 0);
    var maxV = all.reduce(function(m, c) { return Math.max(m, c.visitors || 0); }, 0) || 1;
    var pick = _citiesData.active;
    var list = pick ? all.filter(function(c) { return (c.code || '') === pick; }) : all;

    if (!list.length) {
        host.innerHTML = '<p class="city-empty">' + (EN ? 'No data' : 'Keine Daten') + '</p>';
        return;
    }
    host.innerHTML = list.map(function(c) {
        var v = c.visitors || 0;
        var pct = grandTotal > 0 ? ((v / grandTotal) * 100).toFixed(1) : '0';
        var w = Math.max(4, (v / maxV) * 100);
        var title = fmt(v) + ' ' + (EN ? 'visitors' : 'Besucher') + ' · ' + pct + '%';
        return '<div class="city-row" title="' + esc(title) + '">' +
            '<span class="city-name"><span class="cn-flag">' + flagEmoji(c.code) + '</span>' +
                '<span class="cn-txt">' + esc(c.city || (EN ? '(unknown)' : '(unbekannt)')) + '</span></span>' +
            '<span class="city-val">' + fmt(v) + '</span>' +
            '<span class="city-bar"><i style="width:' + w.toFixed(1) + '%"></i></span>' +
        '</div>';
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
    // Geräte-Icons als SVG (Lucide, currentColor) statt Emoji.
    var ICONS = {
        desktop: icSvg('<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'),
        laptop:  icSvg('<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9"/><line x1="2" y1="20" x2="22" y2="20"/>'),
        mobile:  icSvg('<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>'),
        tablet:  icSvg('<rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>')
    };
    var ICON_FALLBACK = icSvg('<circle cx="12" cy="12" r="8"/>');

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
        var icon   = ICONS[d.x] || ICON_FALLBACK;

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
            '<span class="dl-name"><span class="dl-ic">' + icon + '</span>' + (d.x || '?') + '</span>' +
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
    var EN = document.documentElement.lang === 'en';
    if (status === 'live') {
        label.textContent = 'Live';
    } else if (status === 'error') {
        dot.classList.add('error');
        label.textContent = EN ? 'Offline' : 'Offline';
    } else if (status === 'stale') {
        dot.classList.add('connecting');
        label.textContent = EN ? 'Cached' : 'Cache';
    } else {
        dot.classList.add('connecting');
        label.textContent = EN ? 'Connecting…' : 'Verbinde…';
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

    var grat = graticule || '';

    // Städte numerisch aufbereiten — Clustering + Marker rechnen in viewBox-
    // Einheiten und werden bei jeder Zoom-Stufe neu erzeugt (siehe _renderCities).
    var pts = [];
    (cities || []).forEach(function(c) {
        if (c.x == null || c.y == null) return;
        pts.push({ x: +c.x, y: +c.y, city: c.city, visitors: +c.visitors || 0 });
    });

    // Zoom-/Pan-Zustand haengt am Container — jede Ansicht (Welt/DE) merkt sich ihre eigene.
    el._mapState = { k: 1, x: 0, y: 0, W: vb[2], H: vb[3], uid: uid, cities: pts, citiesRAF: 0 };

    el.innerHTML =
        '<svg viewBox="' + geo.viewBox + '" xmlns="http://www.w3.org/2000/svg" ' +
        'preserveAspectRatio="xMidYMid meet" class="map-svg">' +
            defs +
            '<g class="map-zoom">' +
                ocean + grat +
                '<g class="map-shapes">' + shapes + '</g>' +
                '<g class="map-cities"></g>' +
            '</g>' +
        '</svg>';

    // Bedien-Overlay: Zoom-Buttons + dezenter Hinweis (nur die aktive Ansicht ist sichtbar).
    el.insertAdjacentHTML('beforeend',
        '<div class="map-controls">' +
            '<button type="button" class="map-ctrl" data-zoom="in" aria-label="Vergrößern" title="Vergrößern">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="6" x2="12" y2="18"/><line x1="6" y1="12" x2="18" y2="12"/></svg>' +
            '</button>' +
            '<button type="button" class="map-ctrl" data-zoom="out" aria-label="Verkleinern" title="Verkleinern">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="12" x2="18" y2="12"/></svg>' +
            '</button>' +
            '<button type="button" class="map-ctrl" data-zoom="reset" aria-label="Zurücksetzen" title="Zurücksetzen">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>' +
            '</button>' +
        '</div>' +
        '<div class="map-hint" aria-hidden="true">Zum Zoomen scrollen · Ziehen zum Verschieben</div>');

    _bindMapTooltip(el);
    _renderCities(el);
    _attachMapZoom(el);
}

// Greedy-Proximity-Clustering: staerkste Stadt zuerst, sie zieht alle Nachbarn
// innerhalb von "thresh" (viewBox-Einheiten) an sich. thresh schrumpft beim
// Zoom → dichte Ballungen brechen automatisch in Einzelstaedte auf.
function _clusterCities(cities, thresh) {
    var sorted = cities.slice().sort(function(a, b) { return b.visitors - a.visitors; });
    var used = new Array(sorted.length);
    var out = [];
    var t2 = thresh * thresh;
    for (var i = 0; i < sorted.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        var seed = sorted[i];
        var members = [seed];
        var total = seed.visitors;
        for (var j = i + 1; j < sorted.length; j++) {
            if (used[j]) continue;
            var dx = sorted[j].x - seed.x, dy = sorted[j].y - seed.y;
            if (dx * dx + dy * dy <= t2) {
                used[j] = true;
                members.push(sorted[j]);
                total += sorted[j].visitors;
            }
        }
        out.push({ x: seed.x, y: seed.y, total: total, count: members.length, members: members });
    }
    return out;
}

// Zeichnet die Städte-Ebene fuer die aktuelle Zoom-Stufe neu. Marker-Radien
// werden per /k gegengerechnet, damit die Punkte in JEDER Zoom-Stufe gleich
// gross (und antippbar) bleiben, statt zu Riesen-Klecksen aufzublasen.
function _renderCities(el) {
    var st = el && el._mapState;
    if (!st) return;
    var g = el.querySelector('.map-cities');
    if (!g) return;
    if (!st.cities.length) { g.innerHTML = ''; return; }

    var k = st.k;
    var clusters = _clusterCities(st.cities, 26 / k);

    var top = null;
    clusters.forEach(function(c) { if (!top || c.total > top.total) top = c; });

    var html = '';
    clusters.forEach(function(cl) {
        var isTop = (cl === top);
        var many = cl.count > 1;
        var scr = many
            ? 3.4 + Math.min(9, Math.sqrt(cl.total) * 1.5)
            : 3.0 + Math.min(6, Math.sqrt(cl.total) * 1.3);
        var r  = (scr / k).toFixed(2);
        var cx = cl.x.toFixed(2), cy = cl.y.toFixed(2);

        if (isTop) {
            html += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="map-city-pulse"></circle>';
        }
        if (many) {
            html += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((scr + 2.8) / k).toFixed(2) + '" class="map-cluster-ring"></circle>';
        }
        html += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"' +
                ' class="map-city' + (isTop ? ' is-top' : '') + (many ? ' is-cluster' : '') + '"' +
                (isTop ? ' filter="url(#glow' + st.uid + ')"' : '') +
                ' data-city="' + esc(cl.members[0].city || '') + '"' +
                ' data-more="' + (cl.count - 1) + '"' +
                ' data-value="' + cl.total + '"></circle>';
    });
    g.innerHTML = html;
}

// Zoom-/Pan-Controller. Rad = Zoom auf Cursor, Ziehen = Pan, zwei Finger =
// Pinch, Doppelklick = rein. Marker werden rAF-gedrosselt neu geclustert.
function _attachMapZoom(el) {
    var st = el && el._mapState;
    if (!st) return;
    var svg = el.querySelector('svg');
    var zg  = el.querySelector('.map-zoom');
    if (!svg || !zg) return;

    var MINK = 1, MAXK = 10;   // darueber liefert der 110m-Datensatz kein echtes Kontur-Detail mehr

    function clampPan() {
        if (st.k < MINK) st.k = MINK;
        if (st.k > MAXK) st.k = MAXK;
        var minX = st.W * (1 - st.k), minY = st.H * (1 - st.k);
        if (st.x > 0) st.x = 0; if (st.x < minX) st.x = minX;
        if (st.y > 0) st.y = 0; if (st.y < minY) st.y = minY;
    }
    function applyTransform() {
        clampPan();
        zg.setAttribute('transform', 'translate(' + st.x.toFixed(2) + ' ' + st.y.toFixed(2) + ') scale(' + st.k.toFixed(4) + ')');
        el.classList.toggle('is-zoomed', st.k > 1.001);
    }
    function scheduleCities() {
        if (st.citiesRAF) return;
        st.citiesRAF = requestAnimationFrame(function() { st.citiesRAF = 0; _renderCities(el); });
    }
    function toUser(cx, cy) {
        var m = svg.getScreenCTM();
        if (!m) return null;
        var p = svg.createSVGPoint();
        p.x = cx; p.y = cy;
        return p.matrixTransform(m.inverse());
    }
    function zoomAt(cx, cy, factor) {
        var u = toUser(cx, cy);
        if (!u) return;
        var px = (u.x - st.x) / st.k, py = (u.y - st.y) / st.k;
        st.k *= factor;
        if (st.k < MINK) st.k = MINK; if (st.k > MAXK) st.k = MAXK;
        st.x = u.x - st.k * px;
        st.y = u.y - st.k * py;
        applyTransform();
        scheduleCities();
    }
    function centerZoom(factor) {
        var r = svg.getBoundingClientRect();
        zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
    }

    svg.addEventListener('wheel', function(e) {
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });

    var pointers = {}, pcount = 0, lastDist = 0;
    svg.addEventListener('pointerdown', function(e) {
        try { svg.setPointerCapture(e.pointerId); } catch (_) {}
        if (!pointers[e.pointerId]) pcount++;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        lastDist = 0;
    });
    svg.addEventListener('pointermove', function(e) {
        var prev = pointers[e.pointerId];
        if (!prev) return;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (pcount >= 2) {
            var ids = Object.keys(pointers);
            var a = pointers[ids[0]], b = pointers[ids[1]];
            var dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (lastDist) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / lastDist);
            lastDist = dist;
        } else if (pcount === 1 && st.k > 1.001) {
            var m = svg.getScreenCTM();
            if (!m) return;
            st.x += (e.clientX - prev.x) / m.a;
            st.y += (e.clientY - prev.y) / m.d;
            applyTransform();
        }
    });
    function endPointer(e) {
        if (pointers[e.pointerId]) { delete pointers[e.pointerId]; pcount--; }
        if (pcount < 2) lastDist = 0;
        if (pcount < 0) pcount = 0;
    }
    svg.addEventListener('pointerup', endPointer);
    svg.addEventListener('pointercancel', endPointer);
    svg.addEventListener('dblclick', function(e) { e.preventDefault(); zoomAt(e.clientX, e.clientY, 1.6); });

    var ctr = el.querySelector('.map-controls');
    if (ctr) {
        ctr.addEventListener('click', function(e) {
            var btn = e.target.closest && e.target.closest('[data-zoom]');
            if (!btn) return;
            var z = btn.getAttribute('data-zoom');
            if (z === 'in') centerZoom(1.5);
            else if (z === 'out') centerZoom(1 / 1.5);
            else { st.k = 1; st.x = 0; st.y = 0; applyTransform(); scheduleCities(); }
        });
    }

    applyTransform();
}

// Delegation statt Einzel-Listener: die Städte-Ebene wird beim Zoomen staendig
// neu gezeichnet — ein einmal am Container gebundener Handler faengt Länder
// (statisch) UND Cluster (dynamisch) ab, ohne Listener zu leaken.
function _bindMapTooltip(el) {
    var tip = document.getElementById('mapTooltip');
    if (!tip || el._tipBound) return;
    el._tipBound = true;
    var svg = el.querySelector('svg');
    var hot = null;

    function show(node, e) {
        var head, city = node.getAttribute('data-city');
        if (city !== null) {                       // Städte-Cluster
            var more = +node.getAttribute('data-more') || 0;
            head = esc(city) + (more > 0 ? ' <span class="mt-more">+' + more + '</span>' : '');
        } else {                                   // Land / Bundesland
            head = esc(node.getAttribute('data-label') || '');
        }
        var val = +node.getAttribute('data-value') || 0;
        tip.innerHTML = '<strong>' + head + '</strong>' +
                        '<span><b>' + fmt(val) + '</b> <em>Besucher</em></span>';
        tip.classList.add('show');
        if (svg) svg.classList.add('is-focused');
        if (hot && hot !== node) hot.classList.remove('is-hot');
        node.classList.add('is-hot');
        hot = node;
        _moveTip(e, tip, el);
    }
    function hide() {
        tip.classList.remove('show');
        if (svg) svg.classList.remove('is-focused');
        if (hot) { hot.classList.remove('is-hot'); hot = null; }
    }

    el.addEventListener('mouseover', function(e) {
        var node = e.target.closest && e.target.closest('.map-shape, .map-city');
        if (node) show(node, e);
    });
    el.addEventListener('mousemove', function(e) {
        if (tip.classList.contains('show')) _moveTip(e, tip, el);
    });
    el.addEventListener('mouseout', function(e) {
        var node = e.target.closest && e.target.closest('.map-shape, .map-city');
        if (!node) return;
        var to = e.relatedTarget;
        if (to && to.closest && to.closest('.map-shape, .map-city')) return; // Wechsel zwischen Markern
        hide();
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
        // Die Marker MUESSEN mit derselben Box normiert werden, mit der die
        // Karte gebaut wurde (Extent der echten Landmasse). world.bounds kommt
        // aus build-maps.js; _worldExtent() (Globus-Ecken) ist nur Fallback fuer
        // alte geo-Dateien ohne bounds — es schiebt die Marker sonst nach rechts.
        var ext = world.bounds || _worldExtent();
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
        var we = world.bounds || _worldExtent();
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
    'entry_created':  'Eintrag erstellt',
    'entry_updated':  'Eintrag bearbeitet',
    'timer_action':   'Timer benutzt',
    'data_exported':  'Daten exportiert',
    'pwa_installiert': 'App installiert',
};

// 'feature_genutzt' wird backendseitig als 'feature_genutzt::<view>' geliefert.
// Hier bekommt jeder View-Name sein lesbares Label (deckt sich mit switchTab-Titeln).
var FEATURE_LABELS = {
    'dashboard':     'Übersicht',
    'history':       'Historie',
    'performance':   'Performance',
    'ihk':           'IHK / Karriere',
    'school':        'Berufsschule',
    'goals':         'Ziele',
    'yearview':      'Jahresübersicht',
    'monthcompare':  'Monats-Vergleich',
    'weekview':      'Wochenansicht',
    'aibot':         'AI-Bot',
    'support':       'Support',
    'analytics-pro': 'Analytics Pro',
    'aufgaben':      'Aufgaben',
    'aufgaben-tab':  'Aufgaben',
};

// Technischen Event-Key → lesbares Label. Splittet die 'feature_genutzt::<view>'-Rows.
function eventLabel(name) {
    if (name && name.indexOf('feature_genutzt::') === 0) {
        var view = name.slice('feature_genutzt::'.length);
        return 'Ansicht: ' + (FEATURE_LABELS[view] || view);
    }
    return EVENT_LABELS[name] || name;
}

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
        var label = eventLabel(e.name);
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
// Resilienz gegen PostHog-Rate-Limits (429): Der Proxy fächert ~22 HogQL-Queries
// auf; PostHog drosselt sie im Burst. Statt eine leere Seite zu zeigen, cachen
// wir die letzte gute Antwort (pro Range) und rendern sie bei Drosselung erneut,
// mit Hinweis + Countdown + Auto-Retry nach dem Retry-Fenster.
var _analyticsLoading = false;
var _analyticsRetryTimer = null;
var _analyticsCountdownTimer = null;

function analyticsCacheKey() { return 'mwl_an_cache_' + currentRange; }
function saveAnalyticsCache(d) {
    try { sessionStorage.setItem(analyticsCacheKey(), JSON.stringify({ ts: Date.now(), data: d })); } catch (e) { /* voll/aus */ }
}
function loadAnalyticsCache() {
    try { var raw = sessionStorage.getItem(analyticsCacheKey()); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function payloadHasData(d) {
    if (!d) return false;
    var s = d.summary || {};
    return !!(s.pageviews || s.visitors || s.sessions) || (Array.isArray(d.series) && d.series.length > 0);
}
function errorsAreThrottle(errs) {
    if (!errs) return false;
    return Object.keys(errs).some(function (k) { return /\b429\b|throttl/i.test(String(errs[k])); });
}
function parseRetrySeconds(errs) {
    var max = 0;
    Object.keys(errs || {}).forEach(function (k) {
        var m = String(errs[k]).match(/in\s+(\d+)\s+second/i);
        if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return Math.min(Math.max(max || 120, 15), 900); // 15 s … 15 min
}
function clearAnalyticsRetry() {
    if (_analyticsRetryTimer) { clearTimeout(_analyticsRetryTimer); _analyticsRetryTimer = null; }
    if (_analyticsCountdownTimer) { clearInterval(_analyticsCountdownTimer); _analyticsCountdownTimer = null; }
}
// Zeigt die „Backend ausgelastet"-Notice + Countdown und plant den Auto-Retry.
function enterBackendBusy(secs, staleTs) {
    var EN = document.documentElement.lang === 'en';
    clearAnalyticsRetry();
    var el = document.getElementById('adblockNotice');
    if (el) {
        el.style.display = 'block';
        var h = el.querySelector('h4');
        var p = el.querySelector('p');
        if (h) h.textContent = EN ? 'Backend is busy' : 'Backend ausgelastet';
        if (p) {
            p.innerHTML =
                (EN ? 'The analytics backend (PostHog) is rate-limiting requests right now.'
                    : 'Das Analytics-Backend (PostHog) drosselt gerade die Anfragen.') +
                (staleTs ? '<br><span style="opacity:0.6;">' +
                    (EN ? 'Showing cached data from ' : 'Zwischengespeicherte Daten von ') +
                    new Date(staleTs).toLocaleTimeString(mwlLocale()) + '</span>' : '');
        }
    }
    var det = document.getElementById('errorDetail');
    if (det) {
        det.style.display = 'block';
        var left = secs;
        var tick = function () {
            det.textContent = (EN ? 'Retrying in ' : 'Neuer Versuch in ') + Math.max(0, left) + ' s …';
            left--;
        };
        tick();
        _analyticsCountdownTimer = setInterval(tick, 1000);
    }
    _analyticsRetryTimer = setTimeout(function () { loadAll(); }, (secs + 2) * 1000);
}

async function loadAll() {
    if (_analyticsLoading) return;   // kein überlappender 22-Query-Burst (verschärft die Drosselung)
    _analyticsLoading = true;
    clearAnalyticsRetry();

    var btn = document.getElementById('refreshBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<svg class="an-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Laden…'; }

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

        // Rate-Limit-Resilienz: Kommt die Antwort inhaltsleer zurück, weil PostHog
        // mit 429 gedrosselt hat, KEIN leeres Dashboard zeigen — stattdessen die
        // letzte gute Antwort aus dem Cache durch den normalen Render-Pfad schicken
        // (+ Hinweis + Auto-Retry). Ohne Cache: nur Hinweis + Retry, nichts leeren.
        var _stale = false;
        if (!payloadHasData(d)) {
            if (errorsAreThrottle(d._errors)) {
                var _secs  = parseRetrySeconds(d._errors);
                var _cache = loadAnalyticsCache();
                if (_cache && payloadHasData(_cache.data)) {
                    enterBackendBusy(_secs, _cache.ts);
                    d = _cache.data;
                    _stale = true;
                } else {
                    enterBackendBusy(_secs, null);
                    setLiveStatus('error');
                    hideSkeletons();
                    return; // finally setzt Button + Loading-Flag zurück
                }
            }
            // nicht gedrosselt + leer = echt (noch) keine Daten → normal rendern
        } else {
            saveAnalyticsCache(d);
            clearAnalyticsRetry();
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
        // Nach echter Bildschirmgröße sortieren (kleinster → größter Screen),
        // nicht nach Besucher-Zahl.
        var resSorted = resolut.slice().sort(function(a, b) {
            return resolutionArea(a.res) - resolutionArea(b.res);
        });
        renderSimpleTableNoRank('screensTable',
            resSorted.map(function(s) { return { x: s.res, y: s.visitors }; }),
            function(x) { return x; }, 'purple');

        // ── Geo: Karten + Städte ───────────────────────────────────────────
        renderMaps(countries, regions, cities);
        renderCities(cities, countries);

        // ── Sprachen ───────────────────────────────────────────────────────
        renderSimpleTableNoRank('languagesTable',
            langs.map(function(l) { return { x: l.lang, y: l.visitors }; }),
            langName, 'cyan');

        // ── Session-Verhalten ──────────────────────────────────────────────
        // Nach echter Dauer sortieren (aufsteigend), nicht nach Session-Zahl —
        // damit die Verweildauer als Verteilung lesbar ist.
        var durSorted = durBkts.slice().sort(function(a, b) {
            return durationBucketSeconds(a.bucket) - durationBucketSeconds(b.bucket);
        });
        renderSimpleTableNoRank('durationTable',
            durSorted.map(function(b) { return { x: b.bucket, y: b.sessions }; }),
            function(x) { return x; }, 'yellow');
        var pvpSorted = pvpSess.slice().sort(function(a, b) {
            return firstNumber(a.bucket) - firstNumber(b.bucket);
        });
        renderSimpleTableNoRank('pagesPerSessionTable',
            pvpSorted.map(function(b) { return { x: b.bucket, y: b.sessions }; }),
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
                insights.unshift({ icon: INSIGHT_ICONS.zap, tone: 'good', text: '<strong>' + goodPct + '% gute LCP-Werte</strong> — Seite lädt schnell für die meisten Nutzer.' });
            }
        }
        if (nvr.length > 0) {
            var retU = nvr.find(function(r) { return r.type === 'Wiederkehrend'; });
            if (retU && retU.visitors > 0) {
                var retPct = Math.round(retU.visitors / visitors * 100);
                insights.push({ icon: INSIGHT_ICONS.refresh, tone: 'good', text: '<strong>' + retPct + '% wiederkehrende Nutzer</strong> — die App bindet ihre User.' });
            }
        }

        renderInsights(insights);

        // ── Timestamp ──────────────────────────────────────────────────────
        var lu = document.getElementById('lastUpdated');
        if (lu) lu.textContent = 'Zuletzt aktualisiert: ' + new Date().toLocaleString(mwlLocale());

        setLiveStatus(_stale ? 'stale' : 'live');
        hideSkeletons();

    } catch (err) {
        console.error('Analytics Error:', err);
        clearAnalyticsRetry();
        setLiveStatus('error');
        hideSkeletons();
        var _en = document.documentElement.lang === 'en';
        var adEl = document.getElementById('adblockNotice');
        if (adEl) {
            adEl.style.display = 'block';
            var _h = adEl.querySelector('h4');
            var _p = adEl.querySelector('p');
            if (_h) _h.textContent = _en ? 'Analytics backend not reachable' : 'Analytics-Backend nicht erreichbar';
            if (_p) _p.textContent = _en ? 'Could not connect to the analytics backend.' : 'Die Verbindung zum Analytics-Backend konnte nicht hergestellt werden.';
        }
        var detEl = document.getElementById('errorDetail');
        if (detEl) {
            detEl.textContent = err.message || String(err);
            detEl.style.display = 'block';
        }
    } finally {
        _analyticsLoading = false;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Aktualisieren';
        }
    }
}

// =========================================
//  INIT
// =========================================
// =========================================
//  LIVE-AKTIVITÄT — Echtzeit-Ticker
//  Eigener leichter Endpunkt (?feed), unabhaengig vom 30-Query-loadAll.
//  Zeigt die letzten anonymen Seitenaufrufe + Ladezeit; pollt alle 20s,
//  pausiert im Hintergrund-Tab (spart Worker-Quota).
// =========================================
var _liveFeedSeen = {};       // "ts|path" -> true, um frisch reingekommene Zeilen zu markieren
var _liveFeedTimer = null;
var _liveFeedFirstLoad = true;

function fmtRelTime(unixSec, EN) {
    var diff = Math.floor(Date.now() / 1000) - unixSec;
    if (diff < 0) diff = 0;
    if (diff < 10) return EN ? 'just now' : 'gerade eben';
    if (diff < 60) return EN ? diff + 's ago' : 'vor ' + diff + ' Sek';
    var m = Math.floor(diff / 60);
    if (m < 60)    return EN ? m + ' min ago' : 'vor ' + m + ' Min';
    var h = Math.floor(m / 60);
    if (h < 24)    return EN ? h + 'h ago' : 'vor ' + h + ' Std';
    var d = Math.floor(h / 24);
    return EN ? d + 'd ago' : 'vor ' + d + ' Tg';
}

function latencyClass(ms) {
    if (ms < 1000) return 'fast';
    if (ms < 2500) return 'mid';
    return 'slow';
}

function fmtLatency(ms) {
    return ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : Math.round(ms) + 'ms';
}

function renderLiveFeed(events) {
    var ul = document.getElementById('liveFeed');
    if (!ul) return;
    var EN = document.documentElement.lang === 'en';

    if (!events || !events.length) {
        if (_liveFeedFirstLoad) {
            ul.innerHTML = '<li class="live-feed-empty">' + (EN ? 'Waiting for activity…' : 'Warte auf Aktivität…') + '</li>';
        }
        return;
    }

    var shown = events.slice(0, 12);
    ul.innerHTML = shown.map(function(e) {
        var key   = e.ts + '|' + e.path;
        var isNew = !_liveFeedFirstLoad && !_liveFeedSeen[key];
        var flag  = e.cc ? flagEmoji(e.cc) : '🏳️';
        var lat   = (e.latencyMs != null && e.latencyMs > 0)
            ? '<span class="lf-latency ' + latencyClass(e.latencyMs) + '">' + esc(fmtLatency(e.latencyMs)) + '</span>'
            : '';
        var device = e.device ? '<span class="lf-device">' + esc(e.device) + '</span>' : '';
        return '<li class="live-feed-row' + (isNew ? ' lf-new' : '') + '">'
            + '<span class="lf-time">' + esc(fmtRelTime(e.ts, EN)) + '</span>'
            + '<span class="lf-flag">' + flag + '</span>'
            + '<span class="lf-path">' + esc(e.path) + '</span>'
            + '<span class="lf-meta">' + device + lat + '</span>'
            + '</li>';
    }).join('');

    _liveFeedSeen = {};
    shown.forEach(function(e) { _liveFeedSeen[e.ts + '|' + e.path] = true; });
    _liveFeedFirstLoad = false;
}

async function loadLiveFeed() {
    if (document.hidden) return;   // kein Polling im Hintergrund
    if (!document.getElementById('liveFeed')) return;
    try {
        var res = await fetch(CF_PROXY + '?feed=1', { cache: 'no-store' });
        if (!res.ok) return;
        var d = await res.json();
        if (d && Array.isArray(d.events)) {
            renderLiveFeed(d.events);
        } else if (d && d.summary) {
            // Der deployte Worker kennt den ?feed-Endpunkt noch nicht und liefert
            // stattdessen die volle Range-Analyse zurück. Dann NICHT alle 20s den
            // schweren 30-Query-Endpunkt hämmern — Ticker still abschalten.
            if (_liveFeedTimer) { clearInterval(_liveFeedTimer); _liveFeedTimer = null; }
            var card = document.getElementById('liveFeedCard');
            if (card) card.style.display = 'none';
        }
    } catch (e) {
        /* Netzfehler/Adblock: still — der Ticker ist Beiwerk, darf die Seite nie stören */
    }
}

function startLiveFeed() {
    if (!document.getElementById('liveFeed')) return;
    loadLiveFeed();
    if (_liveFeedTimer) clearInterval(_liveFeedTimer);
    _liveFeedTimer = setInterval(loadLiveFeed, 20000);
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) loadLiveFeed();   // beim Zurückkommen sofort auffrischen
    });
}

document.addEventListener('DOMContentLoaded', function() {
    loadAll();
    startLiveFeed();

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
