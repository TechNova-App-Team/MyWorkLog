// ═══ GEBURTSTAG MODULE ═══
// Kerze und Wunsch am 12.09. Das Markup steht in dashboard.html (#gbCard), die
// Klassen html.mwl-geburtstag / .mwl-geburtstag-karte setzt das Pre-Apply-Skript
// im <head> — hier passiert nur, was erst mit JS geht: die Tageshoehe der Kerze,
// die Flamme (Feder auf Zeigerbewegung, Flattern am Mikrofon), das Auspusten,
// der Wunsch an den Worker und das goldene Favicon.
//
// Zum Testen an einem anderen Tag: localStorage.mwl_geburtstag_test = '1'
// (liest der Torwaechter im <head>), danach neu laden.
(function () {
    'use strict';

    const root = document.documentElement;
    if (!root.classList.contains('mwl-geburtstag')) return;

    const JAHR      = new Date().getFullYear();
    const LS_STAND  = 'mwl_geburtstag_' + JAHR;     // 'aus' | 'gesendet' | 'weg'
    const LS_ID     = 'mwl_wunsch_id';
    // Eigener Pfad am bestehenden Worker, wie /umfrage. Kein "feedback",
    // "submit" o. ae. — Adblocker matchen den Pfad (siehe CLAUDE.md).
    const ENDPOINT  = 'https://ai-proxy.myworklog.de/wunsch';
    const REDUZIERT = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Deutsche Strings; /en/ uebersetzt Assets/js/i18n-runtime.js (MAP/RULES).
    const T = {
        kerzeAus:      'Die Kerze ist aus.',
        micAn:         'Mikrofon an. Jetzt pusten.',
        micStopp:      'Stopp',
        micAus:        'Mikrofon wieder aus. Ein Tippen auf die Flamme geht auch.',
        micKein:       'Kein Mikrofon gefunden. Tipp stattdessen auf die Flamme.',
        micVerweigert: 'Kein Zugriff aufs Mikrofon. Tipp stattdessen auf die Flamme.',
        micFehler:     'Das Mikrofon geht gerade nicht. Tipp stattdessen auf die Flamme.',
        leer:          'Ein paar Worte brauche ich schon.',
        sendet:        'Schickt …',
        senden:        'Wunsch schicken',
        zuViele:       'Zu viele Anfragen. Bitte in ein paar Minuten nochmal.',
        netz:          'Keine Verbindung zum Server. Versuch es gleich nochmal.',
        brennt:        function (h, m) { return 'Die Kerze brennt den Tag herunter, noch ' + h + ' h ' + m + ' min.'; }
    };

    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function ereignis(name, props) { if (typeof mwlEvent === 'function') mwlEvent(name, props || {}); }

    // ── Favicon: dieselbe Marke wie in der Sidebar, in Gold, auf dunklem Grund
    // (damit sie auch auf einer hellen Tab-Leiste steht). Die beiden festen
    // Icon-Links fliegen fuer den Tag raus, sonst nimmt Chrome weiter das .ico.
    function goldFavicon() {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">'
            + '<rect width="40" height="40" rx="9" fill="#15161b"/>'
            + '<g fill="none" stroke="#d9b054" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M16 4h8M20 4v3.5" stroke-width="2.4"/>'
            + '<circle cx="20" cy="24" r="13" stroke-width="2" opacity=".28"/>'
            + '<path d="M20 11A13 13 0 1 1 9.45 30.65" stroke-width="2.6"/>'
            + '<path d="M20 24l8-8M23.5 16H28v4.5" stroke-width="2.6"/>'
            + '</g><circle cx="20" cy="24" r="2" fill="#d9b054"/></svg>';
        document.querySelectorAll('link[rel="icon"]').forEach(function (l) { l.remove(); });
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.sizes = 'any';
        link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
        document.head.appendChild(link);
    }

    // ── Karte ───────────────────────────────────────────────────────────
    function init() {
        goldFavicon();

        const card = document.getElementById('gbCard');
        if (!card || !root.classList.contains('mwl-geburtstag-karte')) return;

        const candle  = document.getElementById('gbCandle');
        const wax     = document.getElementById('gbWax');
        const top     = document.getElementById('gbTop');
        const leanEl  = document.getElementById('gbLean');
        const glowEl  = card.querySelector('.gb-glow');
        const micBtn  = document.getElementById('gbMicBtn');
        const micStat = document.getElementById('gbMicStatus');
        const form    = document.getElementById('gbForm');
        const input   = document.getElementById('gbWish');
        const sendBtn = document.getElementById('gbSend');
        const errEl   = document.getElementById('gbError');
        const closeBt = document.getElementById('gbClose');

        let stand = lsGet(LS_STAND) || 'lit';
        if (stand === 'weg') return;

        // ── Die Kerze ist eine Uhr: um 0:00 voll, bis 23:59 auf ein Drittel
        // heruntergebrannt. Bewusst ohne Animation — es ist die Uhrzeit, kein Effekt.
        const HOLDER_Y = 190, H_MAX = 112, H_MIN = 40;
        let topY = 78;
        function setzeHoehe() {
            const jetzt = new Date();
            const rest = 1 - (jetzt.getHours() * 60 + jetzt.getMinutes()) / 1440;
            const h = H_MIN + (H_MAX - H_MIN) * rest;
            topY = HOLDER_Y - h;
            wax.setAttribute('y', topY.toFixed(1));
            wax.setAttribute('height', h.toFixed(1));
            top.setAttribute('transform', 'translate(60 ' + topY.toFixed(1) + ')');
            const restMin = Math.round(rest * 1440);
            candle.title = T.brennt(Math.floor(restMin / 60), restMin % 60);
        }
        setzeHoehe();
        candle.addEventListener('pointerenter', setzeHoehe);

        // ── Textzustand (lit → out → sent), Ueberblendung mit leichter Unschaerfe
        function zeigeStand(name, animiert) {
            const alle = card.querySelectorAll('.gb-state');
            let raus = null;
            alle.forEach(function (s) { if (!s.hidden) raus = s; });
            const rein = card.querySelector('.gb-state[data-gb-state="' + name + '"]');
            if (!rein || rein === raus) return;
            const wechsel = function () {
                if (raus) { raus.hidden = true; raus.classList.remove('is-leaving'); }
                rein.hidden = false;
                if (animiert && !REDUZIERT) {
                    rein.classList.add('is-entering');
                    rein.addEventListener('animationend', function () { rein.classList.remove('is-entering'); }, { once: true });
                }
                if (name === 'out' && input && animiert) input.focus({ preventScroll: true });
            };
            if (raus && animiert && !REDUZIERT) {
                raus.classList.add('is-leaving');
                setTimeout(wechsel, 170);
            } else {
                wechsel();
            }
        }

        // ── Flamme: eine Feder auf dem Neigungswinkel. Eingaben: der Luftzug
        // einer schnellen Zeigerbewegung in der Naehe und das Pusten am Mikrofon.
        let lean = 0, vel = 0, air = 0, blow = 0;
        let raf = 0, lastT = 0;
        let lastX = 0, lastY = 0, lastMove = 0;
        let rect = null, rectT = 0;

        function flammeXY() {
            const now = performance.now();
            if (!rect || now - rectT > 250) { rect = candle.getBoundingClientRect(); rectT = now; }
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height * ((topY - 32) / 210) };
        }

        function tick(now) {
            const dtMs = Math.min(48, now - (lastT || now));
            const dt = dtMs / 16.67;
            lastT = now;

            // Mikrofon: Lautstaerke (RMS) → Flattern, und ab einer Schwelle,
            // die kurz gehalten wird, geht sie aus. Sprache liegt bei ~0.03–0.12,
            // Pusten direkt ins Mikrofon deutlich darueber.
            if (mic.active) {
                const rms = mic.pegel();
                blow = Math.max(0, Math.min(1, (rms - 0.035) / 0.22));
                if (rms > 0.12) mic.blowMs += dtMs; else mic.blowMs = Math.max(0, mic.blowMs - dtMs * 0.6);
                if (mic.blowMs > 220) { auspusten('mikrofon'); return; }
                if (now - mic.seit > 30000) micStop(T.micAus);
            } else {
                blow = 0;
            }

            air *= Math.pow(0.86, dt);
            let ziel = air;
            if (blow > 0) ziel += (Math.random() - 0.5) * 44 * blow;

            vel = (vel + (ziel - lean) * 0.14 * dt) * Math.pow(0.74, dt);
            lean += vel * dt;

            const mag = Math.min(1, Math.abs(lean) / 32);
            const sy = 1 - mag * 0.18 - blow * 0.45;
            const sx = 1 + mag * 0.06 + blow * 0.18;
            leanEl.style.transform = 'rotate(' + lean.toFixed(2) + 'deg) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
            if (mic.active) glowEl.style.opacity = (0.9 - blow * 0.6).toFixed(2);

            const ruhig = Math.abs(lean) < 0.05 && Math.abs(vel) < 0.05 && Math.abs(air) < 0.05 && !mic.active;
            if (ruhig) { raf = 0; lastT = 0; leanEl.style.transform = ''; }
            else raf = requestAnimationFrame(tick);
        }
        function starteLoop() { if (!raf) { lastT = 0; raf = requestAnimationFrame(tick); } }

        function onMove(e) {
            const now = performance.now();
            const dtMs = now - lastMove;
            if (lastMove && dtMs > 8 && dtMs < 200) {
                const f = flammeXY();
                const dist = Math.hypot(e.clientX - f.x, e.clientY - f.y);
                if (dist < 320) {
                    const staerke = 1 - dist / 320;
                    const vx = (e.clientX - lastX) / dtMs;          // px/ms
                    air = Math.max(-32, Math.min(32, air + vx * 26 * staerke));
                    starteLoop();
                }
            }
            lastX = e.clientX; lastY = e.clientY; lastMove = now;
        }
        function invalidiere() { rect = null; }

        function zeigerAn() {
            if (REDUZIERT) return;
            document.addEventListener('pointermove', onMove, { passive: true });
            window.addEventListener('scroll', invalidiere, { passive: true });
            window.addEventListener('resize', invalidiere);
        }
        function zeigerAus() {
            document.removeEventListener('pointermove', onMove);
            window.removeEventListener('scroll', invalidiere);
            window.removeEventListener('resize', invalidiere);
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
        }

        // ── Mikrofon (opt-in ueber den Knopf, nie von allein)
        const mic = { active: false, stream: null, ctx: null, analyser: null, buf: null, seit: 0, blowMs: 0 };
        mic.pegel = function () {
            const a = mic.analyser, b = mic.buf;
            a.getByteTimeDomainData(b);
            let sum = 0;
            for (let i = 0; i < b.length; i++) { const v = (b[i] - 128) / 128; sum += v * v; }
            return Math.sqrt(sum / b.length);
        };

        function micStatus(text, fehler, mitStopp) {
            micStat.textContent = text;
            micStat.classList.toggle('is-fail', !!fehler);
            if (mitStopp) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'gb-mic-stop';
                b.textContent = T.micStopp;
                b.addEventListener('click', function () { micStop(T.micAus); });
                micStat.appendChild(b);
            }
            micStat.hidden = false;
        }

        async function micStart() {
            if (mic.active || stand !== 'lit') return;
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !AC) { micStatus(T.micKein, true); return; }
            micBtn.disabled = true;
            try {
                // Rauschunterdrueckung und Auto-Gain wuerden genau das wegfiltern,
                // was hier gemessen werden soll: breitbandiges Pusten.
                mic.stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
                });
            } catch (e) {
                micBtn.disabled = false;
                micStatus(e && e.name === 'NotAllowedError' ? T.micVerweigert : T.micFehler, true);
                return;
            }
            mic.ctx = new AC();
            if (mic.ctx.state === 'suspended') { try { await mic.ctx.resume(); } catch (e) {} }
            mic.analyser = mic.ctx.createAnalyser();
            mic.analyser.fftSize = 1024;
            mic.analyser.smoothingTimeConstant = 0.2;
            mic.ctx.createMediaStreamSource(mic.stream).connect(mic.analyser);
            mic.buf = new Uint8Array(mic.analyser.fftSize);
            mic.active = true; mic.seit = performance.now(); mic.blowMs = 0;
            card.classList.add('is-mic');
            micBtn.hidden = true;
            micStatus(T.micAn, false, true);
            starteLoop();
        }

        function micStop(meldung) {
            if (mic.stream) mic.stream.getTracks().forEach(function (t) { t.stop(); });
            if (mic.ctx) { try { mic.ctx.close(); } catch (e) {} }
            mic.stream = null; mic.ctx = null; mic.analyser = null; mic.active = false; blow = 0;
            card.classList.remove('is-mic');
            glowEl.style.opacity = '';
            if (meldung) { micStatus(meldung, false); micBtn.hidden = false; micBtn.disabled = false; }
            else micStat.hidden = true;
        }

        // ── Auspusten
        function auspusten(weg) {
            if (stand !== 'lit') return;
            stand = 'aus';
            lsSet(LS_STAND, 'aus');
            micStop();
            zeigerAus();
            leanEl.style.transform = '';
            card.classList.add('is-out');
            candle.disabled = true;
            candle.setAttribute('aria-label', T.kerzeAus);
            setTimeout(function () { zeigeStand('out', true); }, REDUZIERT ? 0 : 650);
            ereignis('geburtstag_kerze', { weg: weg });
        }

        // ── Wunsch
        function wunschId() {
            let id = lsGet(LS_ID);
            if (!id) {
                id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
                   : String(Date.now()) + Math.random().toString(36).slice(2);
                lsSet(LS_ID, id);
            }
            return id;
        }
        function fehler(text) { errEl.textContent = text; errEl.hidden = !text; }

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const text = input.value.replace(/\s+/g, ' ').trim();
            if (text.length < 2) { fehler(T.leer); input.focus(); return; }
            fehler('');
            sendBtn.disabled = true;
            sendBtn.textContent = T.sendet;
            try {
                const res = await fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ v: 1, id: wunschId(), text: text, lang: root.lang === 'en' ? 'en' : 'de', jahr: JAHR })
                });
                if (!res.ok) {
                    // Ein 429 vom Edge traegt keine CORS-Header und landet im catch;
                    // hier nur, was der Worker selbst schickt.
                    let detail = '';
                    try { detail = (await res.json()).error || ''; } catch (e2) {}
                    throw new Error(res.status === 429 ? T.zuViele : (detail || ('Server antwortete mit ' + res.status)));
                }
                stand = 'gesendet';
                lsSet(LS_STAND, 'gesendet');
                zeigeStand('sent', true);
                ereignis('geburtstag_wunsch', { sprache: root.lang === 'en' ? 'en' : 'de' });
            } catch (err) {
                fehler(err instanceof TypeError ? T.netz : err.message);
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = T.senden;
            }
        });

        // ── Ausblenden: nur die Karte, die goldenen Marken bleiben.
        closeBt.addEventListener('click', function () {
            lsSet(LS_STAND, 'weg');
            micStop();
            zeigerAus();
            root.classList.remove('mwl-geburtstag-karte');
        });

        // ── Start je nach gespeichertem Stand
        if (stand === 'lit') {
            candle.addEventListener('click', function () { auspusten('tippen'); });
            micBtn.addEventListener('click', micStart);
            zeigerAn();
            window.addEventListener('pagehide', function () { micStop(); });
        } else {
            // Kerze war heute schon aus: kein Rauch, keine Glut, direkt der Text.
            card.classList.add('is-out', 'is-still');
            candle.disabled = true;
            candle.setAttribute('aria-label', T.kerzeAus);
            zeigeStand(stand === 'gesendet' ? 'sent' : 'out', false);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
