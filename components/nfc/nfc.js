// ═══ NFC MODULE ═══

const NFC_SESSION_KEY  = 'nfc_session';
const NFC_CHIP_KEY     = 'nfc_chip_written';
const NFC_LOG_KEY      = 'nfc_scan_log';
const NFC_DEBOUNCE_MS  = 30 * 1000; // 30s Doppel-Bounce-Fenster
const NFC_MAX_LOG      = 30;

// ─── Modal-Steuerung ───────────────────────────────────────────────────────

function openNFCModal() {
    const modal = document.getElementById('nfcModal');
    if (!modal) return;
    modal.classList.add('active');
    nfcDetectPlatform();
    nfcUpdateStatusView();
}

function closeNFCModal() {
    const modal = document.getElementById('nfcModal');
    if (modal) modal.classList.remove('active');
    if (window._nfcWriter) {
        window._nfcWriter.abort();
        window._nfcWriter = null;
    }
}

function nfcShowView(viewId) {
    document.querySelectorAll('.nfc-view').forEach(v => v.classList.remove('active'));
    const v = document.getElementById(viewId);
    if (v) v.classList.add('active');
}

// ─── Platform-Erkennung ───────────────────────────────────────────────────

function nfcDetectPlatform() {
    const ua  = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const hasNDEF = 'NDEFReader' in window;

    if (ios) {
        nfcShowView('nfcViewIOS');
        return;
    }
    if (!hasNDEF) {
        nfcShowView('nfcViewNoSupport');
        return;
    }
    const chipWritten = localStorage.getItem(NFC_CHIP_KEY);
    nfcShowView(chipWritten ? 'nfcViewStatus' : 'nfcViewSetup');
}

// ─── Chip-Programmierung ──────────────────────────────────────────────────

async function nfcWriteChip() {
    const btn      = document.getElementById('nfcWriteBtn');
    const scanZone = document.getElementById('nfcScanZone');

    btn.disabled = true;
    nfcSetWriteStatus('scanning', 'Bereit... Halte Handy jetzt an den Chip');
    if (scanZone) scanZone.classList.add('scanning');

    try {
        const ndef = new NDEFReader();
        const ac   = new AbortController();
        window._nfcWriter = ac;

        const nfcUrl = window.location.origin + window.location.pathname + '?nfc=1';
        await ndef.write(
            { records: [{ recordType: 'url', data: nfcUrl }] },
            { signal: ac.signal, overwrite: true }
        );

        if (scanZone) {
            scanZone.classList.remove('scanning');
            scanZone.classList.add('success');
        }
        nfcSetWriteStatus('success-text', 'Chip erfolgreich programmiert!');
        localStorage.setItem(NFC_CHIP_KEY, Date.now().toString());
        nfcAddLog('WRITE', 'Chip programmiert — ' + nfcUrl);

        setTimeout(() => {
            if (scanZone) {
                scanZone.classList.remove('success');
            }
            nfcShowView('nfcViewStatus');
            nfcUpdateStatusView();
        }, 2000);

    } catch (err) {
        btn.disabled = false;
        if (scanZone) scanZone.classList.remove('scanning');

        if (err.name === 'AbortError') {
            nfcSetWriteStatus('', 'Abgebrochen.');
            return;
        }

        // Sprechende Fehlermeldungen statt rohem Browser-Text
        let msg = '';
        const raw = (err.message || '').toLowerCase();

        if (raw.includes('io error') || raw.includes('null')) {
            msg = 'Chip nicht erkannt — Handy langsam und mittig auf den Chip halten bis er vibriert';
        } else if (raw.includes('not allowed') || err.name === 'NotAllowedError') {
            msg = 'NFC-Berechtigung verweigert — bitte in den Browser-Einstellungen erlauben';
        } else if (raw.includes('not supported') || err.name === 'NotSupportedError') {
            msg = 'Chip-Format nicht unterstützt — nur NDEF-Chips (z.B. NTAG213/215) funktionieren';
        } else if (raw.includes('network') || err.name === 'NetworkError') {
            msg = 'Verbindung zum Chip verloren — nochmal versuchen und Handy ruhig halten';
        } else {
            msg = 'Fehler: ' + err.message;
        }

        nfcSetWriteStatus('error-text', msg);
        nfcAddLog('ERR', err.name + ': ' + err.message);
        // Button nach 2s wieder aktivieren damit der User es nochmal probieren kann
        setTimeout(() => { btn.disabled = false; }, 2000);
    }
}

function nfcSetWriteStatus(cls, text) {
    const el = document.getElementById('nfcWriteStatus');
    if (!el) return;
    el.className = 'nfc-write-status-text' + (cls ? ' ' + cls : '');
    el.textContent = text;
}

// ─── Status-View aktualisieren ────────────────────────────────────────────

function nfcUpdateStatusView() {
    const session    = _nfcSession();
    const chipWritten = localStorage.getItem(NFC_CHIP_KEY);

    const lastScanEl   = document.getElementById('nfcStatLastScan');
    const lastActionEl = document.getElementById('nfcStatLastAction');
    const nextBanner   = document.getElementById('nfcNextActionBanner');
    const chipMetaEl   = document.getElementById('nfcChipMeta');

    if (lastScanEl) {
        lastScanEl.textContent = session.lastScan
            ? nfcTimeAgo(session.lastScan) : 'Noch kein Scan';
    }

    if (lastActionEl) {
        if (session.lastAction) {
            const isIn = session.lastAction === 'checkin';
            lastActionEl.textContent = isIn ? '▶ Eingestempelt' : '■ Ausgestempelt';
            lastActionEl.style.color = isIn ? '#86efac' : '#fdba74';
        } else {
            lastActionEl.textContent = '—';
            lastActionEl.style.color = '';
        }
    }

    if (nextBanner) {
        const willCheckIn = !timer.running;
        nextBanner.className = 'nfc-next-action-banner ' + (willCheckIn ? 'checkin' : 'checkout');
        const iconEl = nextBanner.querySelector('.nfc-next-icon');
        const textEl = nextBanner.querySelector('.nfc-next-text');
        if (iconEl) iconEl.textContent = willCheckIn ? '▶' : '■';
        if (textEl) textEl.textContent = willCheckIn
            ? 'Nächster Scan: Einstempeln'
            : 'Nächster Scan: Ausstempeln';
    }

    if (chipMetaEl && chipWritten) {
        chipMetaEl.textContent = 'Chip seit: ' +
            new Date(parseInt(chipWritten)).toLocaleDateString('de-DE');
    }

    renderNFCLog();
}

// ─── Log-Rendering ────────────────────────────────────────────────────────

function renderNFCLog() {
    const logEl = document.getElementById('nfcFeedbackLog');
    if (!logEl) return;

    const logs = _nfcLogs();
    if (!logs.length) {
        logEl.innerHTML = '<div class="nfc-log-entry"><span class="nfc-log-msg" style="opacity:.3;width:100%;text-align:center;">Noch keine Scan-Ereignisse</span></div>';
        return;
    }

    logEl.innerHTML = logs.slice(-10).reverse().map(e => `
        <div class="nfc-log-entry">
            <span class="nfc-log-time">${new Date(e.ts).toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'})}</span>
            <span class="nfc-log-msg">${esc ? esc(e.msg) : e.msg}</span>
        </div>
    `).join('');
}

// ─── Intelligente Scan-Logik ──────────────────────────────────────────────
// Wird beim URL-Parameter ?nfc=1 aufgerufen (Chip-Scan → URL-Redirect)

function handleNFCScan() {
    const now     = Date.now();
    const today   = new Date().toISOString().split('T')[0];
    const session = _nfcSession();

    // ── 1. Doppel-Bounce-Prävention ──────────────────────────────────────
    // Jemand hält das Handy zu lange dran → zweites Event innerhalb 30s ignorieren
    if (session.lastScan && (now - session.lastScan) < NFC_DEBOUNCE_MS) {
        const waitSec = Math.ceil((NFC_DEBOUNCE_MS - (now - session.lastScan)) / 1000);
        nfcAddLog('DEBOUNCE', `Doppel-Scan ignoriert — noch ${waitSec}s warten`);
        nfcFlash('ignored', '⏱', 'Doppel-Scan', `Bitte ${waitSec}s warten`);
        _nfcToast('⏱ Doppel-Scan', `Kurz warten (${waitSec}s). Chip zu lange gehalten?`, 'warning');
        return;
    }

    // ── 2. Vergessener Check-Out ──────────────────────────────────────────
    // Freitag vergessen auszustempeln, Montag wieder einstempeln.
    // Erkennung: letzter Status war check-in, aber an einem anderen Tag.
    if (session.lastAction === 'checkin' && session.lastDate && session.lastDate !== today) {
        const missedDate = session.lastDate;
        const daysAgo    = Math.round((now - session.lastScan) / 86400000);

        nfcAddLog('MISSED_OUT', `Vergessener Check-Out vom ${missedDate} (vor ${daysAgo}d)`);

        session.missedCheckouts = session.missedCheckouts || [];
        session.missedCheckouts.push({ date: missedDate, detectedAt: now });
        _saveSession(session);

        // Frischen Check-In für heute durchführen
        _doCheckIn(now, today, session);

        // Verzögerte Warnung damit die Flash-Anzeige zuerst sichtbar ist
        setTimeout(() => {
            const fmt = new Date(missedDate + 'T12:00:00').toLocaleDateString('de-DE', {
                weekday: 'short', day: 'numeric', month: 'short'
            });
            _nfcToast(
                '⚠️ Vergessener Check-Out',
                `Am ${fmt} kein Ausstempeln gefunden — bitte manuell nachtragen!`,
                'warning'
            );
        }, 2200);
        return;
    }

    // ── 3. Normales Toggle ────────────────────────────────────────────────
    if (timer.running) {
        _doCheckOut(now, today, session);
    } else {
        _doCheckIn(now, today, session);
    }
}

// ─── Check-In / Check-Out ─────────────────────────────────────────────────

function _doCheckIn(now, today, session) {
    timerAction('start');

    session.lastScan   = now;
    session.lastAction = 'checkin';
    session.lastDate   = today;
    _saveSession(session);

    const timeStr   = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const dateInput = document.getElementById('inpDate');
    const startInp  = document.getElementById('inpStart');

    if (dateInput) dateInput.value = today;
    if (startInp)  startInp.value  = new Date().toTimeString().slice(0, 5);

    nfcAddLog('CHECK_IN', `Eingestempelt um ${timeStr}`);
    nfcFlash('checkin', '▶', 'Eingestempelt', timeStr);
    _nfcToast('▶ NFC Check-In', `Timer gestartet — ${timeStr}`, 'success');

    if ('vibrate' in navigator) navigator.vibrate([80, 40, 80]);
}

function _doCheckOut(now, today, session) {
    const timeStr  = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const endInput = document.getElementById('inpEnd');

    // Timer pausieren (nicht stoppen, damit kein Bestätigungs-Dialog aufgeht)
    timerAction('pause');
    if (endInput) endInput.value = new Date().toTimeString().slice(0, 5);

    session.lastScan   = now;
    session.lastAction = 'checkout';
    session.lastDate   = today;
    _saveSession(session);

    nfcAddLog('CHECK_OUT', `Ausgestempelt um ${timeStr}`);
    nfcFlash('checkout', '■', 'Ausgestempelt', timeStr);

    if ('vibrate' in navigator) navigator.vibrate([180]);

    setTimeout(() => {
        _nfcToast('■ NFC Check-Out', `${timeStr} — Bitte Eintrag speichern!`, 'info');
    }, 2200);
}

// ─── Randfälle simulieren ─────────────────────────────────────────────────

function nfcSimulateDoubleBounc() {
    const session = _nfcSession();
    // Letzter Scan war vor 8 Sekunden → Debounce greift
    session.lastScan   = Date.now() - 8000;
    session.lastAction = 'checkin';
    session.lastDate   = new Date().toISOString().split('T')[0];
    _saveSession(session);

    setTimeout(() => {
        handleNFCScan();
        setTimeout(nfcUpdateStatusView, 350);
    }, 80);

    _nfcToast('🧪 Simulation', 'Doppel-Bounce wird simuliert...', 'info');
}

function nfcSimulateMissedCheckout() {
    const session = _nfcSession();
    // Letzter Check-In war "Freitag 17:00" (also vorherige Woche)
    const fake = new Date();
    fake.setDate(fake.getDate() - 3); // vor 3 Tagen

    session.lastAction = 'checkin';
    session.lastDate   = fake.toISOString().split('T')[0];
    session.lastScan   = fake.getTime();
    _saveSession(session);

    setTimeout(() => {
        handleNFCScan();
        setTimeout(nfcUpdateStatusView, 350);
    }, 80);

    _nfcToast('🧪 Simulation', 'Vergessener Check-Out wird simuliert...', 'info');
}

// ─── Chip zurücksetzen ────────────────────────────────────────────────────

function nfcResetChip() {
    if (!confirm('NFC-Konfiguration zurücksetzen?\n\nDer Chip bleibt programmiert – die App "vergisst" ihn nur.')) return;
    localStorage.removeItem(NFC_CHIP_KEY);
    localStorage.removeItem(NFC_SESSION_KEY);
    localStorage.removeItem(NFC_LOG_KEY);
    nfcDetectPlatform();
}

// ─── Flash-Overlay ────────────────────────────────────────────────────────

function nfcFlash(type, icon, title, subtitle) {
    const overlay  = document.getElementById('nfcScanOverlay');
    if (!overlay) return;

    const iconEl  = overlay.querySelector('.nfc-scan-result-icon');
    const titleEl = overlay.querySelector('.nfc-scan-result-title');
    const timeEl  = overlay.querySelector('.nfc-scan-result-time');

    overlay.className = 'nfc-scan-overlay show flash-' + type;
    if (iconEl)  iconEl.textContent  = icon;
    if (titleEl) titleEl.textContent = title;
    if (timeEl)  timeEl.textContent  = subtitle || '';

    setTimeout(() => overlay.className = 'nfc-scan-overlay', 2000);
}

// ─── URL-Parameter beim Start prüfen ─────────────────────────────────────

function checkNFCUrlParam() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('nfc')) return;
    // URL sofort bereinigen ohne Reload
    window.history.replaceState({}, '', window.location.pathname);
    // Kurze Verzögerung damit initializeApp() fertig gelaufen ist
    setTimeout(handleNFCScan, 400);
}

// ─── Interne Helfer ───────────────────────────────────────────────────────

function _nfcSession() {
    try { return JSON.parse(localStorage.getItem(NFC_SESSION_KEY) || '{}'); }
    catch { return {}; }
}

function _saveSession(session) {
    localStorage.setItem(NFC_SESSION_KEY, JSON.stringify(session));
}

function _nfcLogs() {
    try { return JSON.parse(localStorage.getItem(NFC_LOG_KEY) || '[]'); }
    catch { return []; }
}

function nfcAddLog(type, msg) {
    const logs = _nfcLogs();
    logs.push({ ts: Date.now(), type, msg });
    while (logs.length > NFC_MAX_LOG) logs.shift();
    localStorage.setItem(NFC_LOG_KEY, JSON.stringify(logs));
}

function nfcTimeAgo(ts) {
    const diff  = Date.now() - ts;
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    if (mins  <  1) return 'gerade eben';
    if (mins  < 60) return `vor ${mins} Min.`;
    if (hours < 24) return `vor ${hours}h`;
    return `vor ${Math.floor(hours / 24)} Tagen`;
}

function _nfcToast(title, msg, type) {
    if      (typeof showToast         === 'function') showToast(title, msg, type);
    else if (typeof showCustomMessage === 'function') showCustomMessage(title, msg, type);
}
