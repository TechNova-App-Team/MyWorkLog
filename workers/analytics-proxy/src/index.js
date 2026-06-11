/**
 * MyWorkLog Analytics Proxy v2
 * ============================
 * Pulls BOTH CF RUM (Web Analytics beacon) AND Zone HTTP analytics.
 * Returns: pageviews, paths, browsers, OS, devices, countries (RUM)
 *      PLUS: cache hit rate, bandwidth, bandwidth saved, uniques, status codes (Zone)
 *
 * Secret:   CF_API_TOKEN
 * Required Token Permissions:
 *   - Account → Account Analytics: Read   (RUM)
 *   - Zone    → Zone Analytics: Read      (cache/bandwidth/uniques)
 *
 * Endpoint: GET /?range=<1|7|30|90|365>
 *
 * Deploy: `wrangler deploy` from workers/analytics-proxy/
 * Secret: `wrangler secret put CF_API_TOKEN`
 */

const ACCOUNT_TAG = 'ab30e1403c63aa439e15acfd8ee8a080';
const ZONE_TAG    = 'aa796a251f82d510dd374c2d3e016fc2';
const SITE_TAG    = '3aa3f484545341a0a8a390cd4dc9983a';
const GQL_URL     = 'https://api.cloudflare.com/client/v4/graphql';

const ALLOWED_EXACT = [
  'https://myworklog.de',
  'https://www.myworklog.de',
];
const ALLOWED_REGEX = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i,
  /^https:\/\/[a-z0-9-]+\.myworklog\.pages\.dev$/i,
];

function isAllowedOrigin(o) {
  if (!o) return false;
  if (ALLOWED_EXACT.includes(o)) return true;
  return ALLOWED_REGEX.some(rx => rx.test(o));
}

function corsHeaders(o) {
  const allow = isAllowedOrigin(o) ? o : 'https://myworklog.de';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function pickBucket(rangeDays) {
  if (rangeDays <= 1)  return 'datetimeFifteenMinutes';
  if (rangeDays <= 7)  return 'datetimeHour';
  return 'datetimeDay';
}

function buildQuery(tsField) {
  return `
    query Stats(
      $accountTag: String!
      $zoneTag: String!
      $siteTag: String!
      $startTime: Time!
      $endTime: Time!
      $fiveMinAgo: Time!
    ) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          rumActive: rumPageloadEventsAdaptiveGroups(
            limit: 1
            filter: { siteTag: $siteTag, datetime_geq: $fiveMinAgo }
          ) { count sum { visits } }

          rumTotal: rumPageloadEventsAdaptiveGroups(
            limit: 1
            filter: { siteTag: $siteTag, datetime_geq: $startTime, datetime_leq: $endTime }
          ) { count sum { visits } }

          rumSeries: rumPageloadEventsAdaptiveGroups(
            limit: 5000
            filter: { siteTag: $siteTag, datetime_geq: $startTime, datetime_leq: $endTime }
            orderBy: [${tsField}_ASC]
          ) {
            count sum { visits }
            dimensions { ts: ${tsField} }
          }

          rumPaths: rumPageloadEventsAdaptiveGroups(
            limit: 20
            filter: { siteTag: $siteTag, datetime_geq: $startTime, datetime_leq: $endTime }
            orderBy: [count_DESC]
          ) {
            count sum { visits }
            dimensions { name: requestPath }
          }

          rumRefs: rumPageloadEventsAdaptiveGroups(
            limit: 15
            filter: { siteTag: $siteTag, datetime_geq: $startTime, datetime_leq: $endTime }
            orderBy: [count_DESC]
          ) {
            count
            dimensions { name: refererHost }
          }

          rumBrowsers: rumPageloadEventsAdaptiveGroups(
            limit: 10
            filter: { siteTag: $siteTag, datetime_geq: $startTime, datetime_leq: $endTime }
            orderBy: [count_DESC]
          ) {
            count
            dimensions { name: userAgentBrowser }
          }

          rumOS: rumPageloadEventsAdaptiveGroups(
            limit: 10
            filter: { siteTag: $siteTag, datetime_geq: $startTime, datetime_leq: $endTime }
            orderBy: [count_DESC]
          ) {
            count
            dimensions { name: userAgentOS }
          }

          rumDevices: rumPageloadEventsAdaptiveGroups(
            limit: 5
            filter: { siteTag: $siteTag, datetime_geq: $startTime, datetime_leq: $endTime }
            orderBy: [count_DESC]
          ) {
            count
            dimensions { name: deviceType }
          }

          rumCountries: rumPageloadEventsAdaptiveGroups(
            limit: 15
            filter: { siteTag: $siteTag, datetime_geq: $startTime, datetime_leq: $endTime }
            orderBy: [count_DESC]
          ) {
            count
            dimensions { name: countryName }
          }
        }

        zones(filter: { zoneTag: $zoneTag }) {
          zoneTotal: httpRequestsAdaptiveGroups(
            limit: 1
            filter: { datetime_geq: $startTime, datetime_leq: $endTime }
          ) {
            count
            sum { edgeResponseBytes cachedRequests cachedBytes visits }
            uniq { uniques }
          }

          zoneCache: httpRequestsAdaptiveGroups(
            limit: 10
            filter: { datetime_geq: $startTime, datetime_leq: $endTime }
            orderBy: [count_DESC]
          ) {
            count
            sum { edgeResponseBytes }
            dimensions { cacheStatus }
          }

          zoneStatus: httpRequestsAdaptiveGroups(
            limit: 15
            filter: { datetime_geq: $startTime, datetime_leq: $endTime }
            orderBy: [count_DESC]
          ) {
            count
            dimensions { edgeResponseStatus }
          }

          zoneCountries: httpRequestsAdaptiveGroups(
            limit: 15
            filter: { datetime_geq: $startTime, datetime_leq: $endTime }
            orderBy: [count_DESC]
          ) {
            count
            sum { edgeResponseBytes }
            dimensions { name: clientCountryName }
          }

          zoneSeries: httpRequestsAdaptiveGroups(
            limit: 5000
            filter: { datetime_geq: $startTime, datetime_leq: $endTime }
            orderBy: [${tsField}_ASC]
          ) {
            count
            sum { edgeResponseBytes cachedRequests cachedBytes }
            dimensions { ts: ${tsField} }
          }
        }
      }
    }`;
}

async function fetchAnalytics(token, rangeDays) {
  const now = new Date();
  const startTime  = new Date(now.getTime() - rangeDays * 86400000).toISOString();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const endTime    = now.toISOString();
  const tsField    = pickBucket(rangeDays);

  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: buildQuery(tsField),
      variables: { accountTag: ACCOUNT_TAG, zoneTag: ZONE_TAG, siteTag: SITE_TAG, startTime, endTime, fiveMinAgo },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Cloudflare GraphQL HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error('GraphQL: ' + JSON.stringify(json.errors).slice(0, 500));
  }

  const acc  = json.data?.viewer?.accounts?.[0] || {};
  const zone = json.data?.viewer?.zones?.[0]    || {};

  const get0 = (arr, path) => {
    const row = arr?.[0]; if (!row) return 0;
    return path.split('.').reduce((o, k) => o?.[k], row) ?? 0;
  };

  // Cache hit rate (HIT-Familie / Gesamt)
  const cacheRows = zone.zoneCache || [];
  const totalReq  = cacheRows.reduce((s, r) => s + (r.count || 0), 0);
  const hitReq    = cacheRows
    .filter(r => {
      const cs = (r.dimensions?.cacheStatus || '').toLowerCase();
      return cs === 'hit' || cs === 'revalidated' || cs === 'stream_hit' || cs === 'updating';
    })
    .reduce((s, r) => s + (r.count || 0), 0);
  const cacheHitRate = totalReq > 0 ? (hitReq / totalReq) * 100 : 0;

  return {
    range: rangeDays,
    rum: {
      active: {
        pageviews: get0(acc.rumActive, 'count'),
        visits:    get0(acc.rumActive, 'sum.visits'),
      },
      total: {
        pageviews: get0(acc.rumTotal, 'count'),
        visits:    get0(acc.rumTotal, 'sum.visits'),
      },
      series: (acc.rumSeries || []).map(s => ({
        ts: s.dimensions.ts,
        pageviews: s.count || 0,
        visits: s.sum?.visits || 0,
      })),
      paths: (acc.rumPaths || []).map(p => ({
        name: p.dimensions.name || '/',
        pageviews: p.count || 0,
        visits: p.sum?.visits || 0,
      })),
      referers:  (acc.rumRefs      || []).map(r => ({ x: r.dimensions.name || '(Direkt)', y: r.count || 0 })),
      browsers:  (acc.rumBrowsers  || []).map(r => ({ x: r.dimensions.name || '?', y: r.count || 0 })),
      os:        (acc.rumOS        || []).map(r => ({ x: r.dimensions.name || '?', y: r.count || 0 })),
      devices:   (acc.rumDevices   || []).map(r => ({ x: r.dimensions.name || 'desktop', y: r.count || 0 })),
      countries: (acc.rumCountries || []).map(r => ({ x: r.dimensions.name || '?', y: r.count || 0 })),
    },
    zone: {
      total: {
        requests:       get0(zone.zoneTotal, 'count'),
        uniqueVisitors: get0(zone.zoneTotal, 'uniq.uniques'),
        visits:         get0(zone.zoneTotal, 'sum.visits'),
        bytes:          get0(zone.zoneTotal, 'sum.edgeResponseBytes'),
        cachedRequests: get0(zone.zoneTotal, 'sum.cachedRequests'),
        cachedBytes:    get0(zone.zoneTotal, 'sum.cachedBytes'),
      },
      cacheHitRate,
      cacheBreakdown: cacheRows.map(r => ({
        x: r.dimensions.cacheStatus || '?',
        y: r.count || 0,
        bytes: r.sum?.edgeResponseBytes || 0,
      })),
      statusCodes: (zone.zoneStatus || []).map(r => ({
        x: String(r.dimensions.edgeResponseStatus ?? '?'),
        y: r.count || 0,
      })),
      countries: (zone.zoneCountries || []).map(r => ({
        x: r.dimensions.name || '?',
        y: r.count || 0,
        bytes: r.sum?.edgeResponseBytes || 0,
      })),
      series: (zone.zoneSeries || []).map(s => ({
        ts: s.dimensions.ts,
        requests: s.count || 0,
        bytes: s.sum?.edgeResponseBytes || 0,
        cachedRequests: s.sum?.cachedRequests || 0,
        cachedBytes: s.sum?.cachedBytes || 0,
      })),
    },
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (!isAllowedOrigin(origin)) {
      return new Response(JSON.stringify({ error: 'Forbidden origin' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (!env.CF_API_TOKEN) {
      return new Response(JSON.stringify({ error: 'CF_API_TOKEN secret not set' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    try {
      const url = new URL(request.url);
      const raw = parseInt(url.searchParams.get('range') || '7', 10);
      const range = Math.min(365, Math.max(1, isNaN(raw) ? 7 : raw));
      const data = await fetchAnalytics(env.CF_API_TOKEN, range);

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};
