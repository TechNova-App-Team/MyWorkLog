// ═══ UNTIS PROXY WORKER ═══
// Cloudflare Worker: untis-proxy.myworklog.workers.dev
// Fetches WebUntis iCal URLs server-side (bypasses CORS)
// Deploy: wrangler deploy --name untis-proxy

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}

export default {
    async fetch(request) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        if (request.method !== 'GET') {
            return json({ error: 'Method not allowed' }, 405);
        }

        const { searchParams } = new URL(request.url);
        const rawUrl = searchParams.get('url');

        if (!rawUrl) {
            return json({ error: 'Missing ?url= parameter' }, 400);
        }

        // Normalize webcal:// → https://
        let icalUrl;
        try {
            icalUrl = new URL(rawUrl.replace(/^webcal:\/\//i, 'https://'));
        } catch {
            return json({ error: 'Invalid URL' }, 400);
        }

        // Only allow webuntis.com domains
        if (!icalUrl.hostname.endsWith('webuntis.com')) {
            return json({ error: 'Only webuntis.com URLs allowed' }, 403);
        }

        // Only allow iCal endpoints
        if (!icalUrl.pathname.toLowerCase().includes('ical')) {
            return json({ error: 'Only iCal endpoints allowed' }, 403);
        }

        try {
            const upstream = await fetch(icalUrl.toString(), {
                headers: {
                    'User-Agent': 'MyWorkLog-UntisProxy/1.0',
                    'Accept': 'text/calendar, */*',
                },
            });

            if (!upstream.ok) {
                return json({ error: `WebUntis returned HTTP ${upstream.status}` }, 502);
            }

            const text = await upstream.text();

            return new Response(text, {
                status: 200,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'text/calendar; charset=utf-8',
                    'Cache-Control': 'public, max-age=1800',
                },
            });
        } catch (err) {
            return json({ error: 'Fetch failed: ' + (err.message || err) }, 502);
        }
    },
};
