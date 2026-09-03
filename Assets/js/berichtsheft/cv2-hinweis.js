// ═══ CV2-HINWEIS ═══
// Einmaliger Hinweis-Dialog zum Wechsel der Cloud-KI von Gemini auf OpenRouter.
// Erscheint erst ab dem ersten Bericht (wer die Seite zum ersten Mal oeffnet, hat
// kein Vorher — fuer den waere der Text eine Vollbild-Sperre vor dem ersten
// Eindruck), zeigt einen Countdown im Knopf und merkt sich das Wegklicken in
// localStorage. Erzwingen mit ?showAnnouncement=1.
// Herausgeloest aus pages/berichtsheft/index.html.
(function () {
    const KEY = 'ais_cloud_v2_announcement_dismissed';
    const COUNTDOWN_SEC = 5;
    // Force-show via ?showAnnouncement=1 (zum Testen ohne localStorage zu löschen)
    const force = location.search.indexOf('showAnnouncement=1') !== -1;
    let dismissed = false;
    try { dismissed = !!localStorage.getItem(KEY); } catch (e) { }
    if (dismissed && !force) return;

    // Der Text erklärt eine Änderung. Wer die Seite zum ersten Mal öffnet, hat
    // kein Vorher — für den ist das kein Hinweis, sondern eine Vollbild-Sperre
    // mit 5-Sekunden-Countdown vor dem ersten Eindruck. Also erst ab dem ersten
    // Bericht. Bewusst direkt aus dem Speicher gelesen und nicht über das
    // `reports`-Global: dieser Block ist ein eigenes <script> und darf sich
    // nicht darauf verlassen, dass die Liste schon geladen ist.
    let hatBerichte = false;
    try {
        const gespeichert = JSON.parse(localStorage.getItem('berichtsheft_reports') || '[]');
        hatBerichte = Array.isArray(gespeichert) && gespeichert.length > 0;
    } catch (e) { }
    if (!hatBerichte && !force) return;

    function init() {
        const modal = document.getElementById('cloudV2Modal');
        if (!modal) return;
        const cta = document.getElementById('cv2Cta');
        const secEl = document.getElementById('cv2Sec');
        const fill = modal.querySelector('.cv2-cta-fill');

        modal.hidden = false;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => modal.classList.add('show'));

        // Countdown: lineare Fill von 0%→100% über COUNTDOWN_SEC Sekunden
        const startTs = Date.now();
        let rafId;
        function tick() {
            const elapsed = (Date.now() - startTs) / 1000;
            const pct = Math.min(100, (elapsed / COUNTDOWN_SEC) * 100);
            if (fill) fill.style.width = pct + '%';
            const left = Math.max(0, Math.ceil(COUNTDOWN_SEC - elapsed));
            if (secEl) secEl.textContent = left;
            if (elapsed >= COUNTDOWN_SEC) {
                cta.disabled = false;
                cta.classList.add('cv2-ready');
                cta.focus();
                return;
            }
            rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);

        cta.addEventListener('click', () => {
            if (cta.disabled) return;
            try { localStorage.setItem(KEY, '1'); } catch (e) { }
            if (rafId) cancelAnimationFrame(rafId);
            modal.classList.remove('show');
            setTimeout(() => {
                modal.hidden = true;
                document.body.style.overflow = prevOverflow;
            }, 280);
        });

        // Email-Copy beim Klick auf Callout
        const callout = modal.querySelector('[data-cv2-copy-email]');
        if (callout) {
            const copy = async () => {
                try {
                    await navigator.clipboard.writeText('dev@myworklog.de');
                    callout.classList.add('cv2-copied');
                    setTimeout(() => callout.classList.remove('cv2-copied'), 1800);
                } catch (e) {
                    // Fallback: textarea-copy für ältere Browser
                    const ta = document.createElement('textarea');
                    ta.value = 'dev@myworklog.de';
                    ta.style.position = 'fixed'; ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    try { document.execCommand('copy'); callout.classList.add('cv2-copied'); setTimeout(() => callout.classList.remove('cv2-copied'), 1800); } catch (_) { }
                    document.body.removeChild(ta);
                }
            };
            callout.addEventListener('click', copy);
            callout.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(); } });
        }

        // Escape während Countdown blockieren — nach Ready darf dismissed werden
        document.addEventListener('keydown', e => {
            if (modal.hidden) return;
            if (e.key === 'Escape' && cta.classList.contains('cv2-ready')) cta.click();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
