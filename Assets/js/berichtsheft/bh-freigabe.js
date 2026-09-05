// ═══ BH-FREIGABE ═══
// Freigabe durch den Ausbilder: Nutzlast im Link-Fragment (#w=),
// Signaturpruefung, Rueckweg ueber #fb=.
// Herausgeloest aus pages/berichtsheft/index.html.

// ═══════════════════════════════════════
// AUSBILDER-FREIGABE
// ═══════════════════════════════════════
// Hinweg:   Woche -> Fragment (#w=) -> /ausbilder/
// Rueckweg: Entscheidung -> Fragment (#fb=) -> hierher
//
// Bewusst ohne Verbindung zwischen den Geraeten: die Nutzlast steht im
// Fragment und wird nie an einen Server geschickt. WebRTC braeuchte
// beide Seiten gleichzeitig online, und Firmennetze blockieren genau
// das. Details in Assets/js/mwl-codec.js.

const AUSBILDER_PUB_KEY = 'berichtsheft_ausbilder_pub';

function bhL(de, en) { return document.documentElement.lang === 'en' ? en : de; }

function bhIsLocked(report) {
    // Eine „veraltete" Freigabe (Server-Pruefsumme passt nicht mehr zum
    // Inhalt — die Woche wurde nach dem Abzeichnen geaendert) sperrt NICHT:
    // der Inhalt ist ohnehin schon ein anderer, die Woche muss neu freigegeben
    // werden. Siehe freigabenEinspielen() in bh-b2b-ui.js.
    return !!(report && report.approval && report.approval.state === 'approved' && !report.approval.stale);
}

function bhApprovalBadge(report) {
    const a = report && report.approval;
    if (!a) return '';
    if (a.state === 'approved' && a.stale) {
        return '<span class="badge badge-warning" title="' +
            escapeHtml(bhL('Diese Woche wurde nach der Freigabe geändert und muss erneut freigegeben werden.',
                'This week was changed after approval and needs to be approved again.')) + '">' +
            escapeHtml(bhL('Freigabe veraltet', 'Approval outdated')) + '</span>';
    }
    if (a.state === 'approved') {
        return '<span class="badge badge-signed" title="' +
            escapeHtml(bhL('Freigegeben von ', 'Approved by ') + (a.by || '')) + '">' +
            '&#10003; ' + escapeHtml(bhL('Freigegeben', 'Approved')) + '</span>';
    }
    if (a.state === 'rejected') {
        return '<span class="badge badge-warning">' +
            escapeHtml(bhL('Zurückgegeben', 'Returned')) + '</span>';
    }
    return '';
}

// Die Begruendung einer Rueckgabe gehoert sichtbar an die Karte — sie ist
// die einzige Information, die dem Azubi sagt, WAS er aendern soll.
function bhApprovalNote(report) {
    const a = report && report.approval;
    if (!a || a.state !== 'rejected') return '';
    const who = a.by ? escapeHtml(a.by) : bhL('Der Ausbilder', 'The trainer');
    const txt = a.note
        ? escapeHtml(a.note)
        : bhL('Ohne Anmerkung zurückgegeben.', 'Returned without a comment.');
    return '<div style="margin-top:8px;padding:9px 12px;border-radius:8px;' +
        'background:rgba(var(--warning-rgb),0.08);border-left:2px solid var(--warning);">' +
        '<div style="font-size:0.72rem;font-weight:600;color:var(--warning);margin-bottom:3px;">' +
        who + ' &middot; ' + escapeHtml(bhL('muss überarbeitet werden', 'needs revision')) + '</div>' +
        '<div style="font-size:0.8rem;color:var(--text-muted);">' + txt + '</div></div>';
}

// ── Hinweg ───────────────────────────────────────────────────
function bhBuildWeekPayload(report) {
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem('pdf_personal_cfg') || '{}'); } catch (e) { /* egal */ }

    const p = {
        v: 1,
        az: cfg.name || '',
        bt: cfg.betrieb || '',
        ws: (Array.isArray(report) ? report : [report]).map(bhWeekEntry)
    };
    return p;
}

// Eine einzelne Woche in der Nutzlast. Kurze Schluessel, weil jedes
// Zeichen im Link zaehlt — bei 52 Wochen sind das ~14.000.
function bhWeekEntry(report) {
    const e = {
        r: report.id,
        y: report.year,          // Ausbildungsjahr 1–4, NICHT das Kalenderjahr
        w: report.week,
        df: report.dateFrom,
        dt: report.dateTo,
        dep: report.department || '',
        sch: report.school || '',
        h: report.hours || 0
    };
    // Die Tagesschluessel sind monday/tuesday/… (siehe DAYS oben),
    // nicht die deutschen Namen — die Ausbilder-Seite iteriert ueber
    // die tatsaechlichen Schluessel, damit nichts stillschweigend fehlt.
    if (report.mode === 'daily' && report.dailyActivities) {
        e.da = report.dailyActivities;
        e.dh = report.dailyHours || {};
    } else {
        e.a = report.activities || '';
    }
    return e;
}

// Was steht zur Freigabe an? Standard sind alle Wochen, die noch keine
// Bestaetigung tragen — das ist fast immer genau das, was gemeint ist.
function bhFreigabeKandidaten() {
    return reports.slice().sort((a, b) => (a.year - b.year) || (a.week - b.week));
}

// Ausgewaehlte Bericht-IDs fuer die Freigabe
let _freigabeSel = new Set();
let _freigabeBuildToken = 0;

// Ab hier wird der Link in Messengern und Mail-Clients unangenehm bzw.
// riskant (Zeilenumbrueche, Kuerzung). KEIN hartes Limit — der Nutzer
// entscheidet, ob er trotzdem alles auf einmal schickt.
const FREIGABE_LINK_WARN = 8000;

function openFreigabeModal(id) {
    const report = reports.find(r => r.id === id);
    _freigabeSel = new Set(report ? [report.id] : []);

    document.getElementById('freigabeModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    renderFreigabeAuswahl();
    rebuildFreigabeLink();
}

function renderFreigabeAuswahl() {
    const box = document.getElementById('freigabeWeeks');
    const alle = bhFreigabeKandidaten();

    box.innerHTML = alle.map(r => {
        const an = _freigabeSel.has(r.id);
        const st = r.approval && r.approval.state === 'approved'
            ? '<span style="color:var(--success);font-size:0.7rem;">&#10003;</span>'
            : r.approval && r.approval.state === 'rejected'
                ? '<span style="color:var(--warning);font-size:0.7rem;">&#8635;</span>'
                : '';
        return '<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;' +
            (an ? 'background:rgba(var(--primary-rgb),0.10);' : '') + '">' +
            '<input type="checkbox" ' + (an ? 'checked' : '') +
            ' onchange="toggleFreigabeWeek(\'' + r.id + '\')"' +
            ' style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;flex:0 0 auto;">' +
            '<span style="font-size:0.82rem;font-weight:600;min-width:52px;">KW ' + r.week + '</span>' +
            '<span style="font-size:0.76rem;color:var(--text-muted);flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
            escapeHtml(r.department || '') + '</span>' + st + '</label>';
    }).join('') || '<p style="font-size:0.82rem;color:var(--text-muted);">' +
    bhL('Noch keine Berichte vorhanden.', 'No reports yet.') + '</p>';
}

function toggleFreigabeWeek(id) {
    if (_freigabeSel.has(id)) _freigabeSel.delete(id); else _freigabeSel.add(id);
    renderFreigabeAuswahl();
    rebuildFreigabeLink();
}

function freigabeSelect(was) {
    const alle = bhFreigabeKandidaten();
    if (was === 'alle') _freigabeSel = new Set(alle.map(r => r.id));
    else if (was === 'keine') _freigabeSel = new Set();
    else if (was === 'offen') _freigabeSel = new Set(
        alle.filter(r => !r.approval || r.approval.state !== 'approved').map(r => r.id));
    renderFreigabeAuswahl();
    rebuildFreigabeLink();
}

async function rebuildFreigabeLink() {
    const token = ++_freigabeBuildToken;
    const qrBox = document.getElementById('freigabeQr');
    const linkBox = document.getElementById('freigabeLink');
    const hint = document.getElementById('freigabeQrHint');
    const budget = document.getElementById('freigabeBudget');
    const shareBtn = document.getElementById('freigabeShareBtn');

    const gewaehlt = bhFreigabeKandidaten().filter(r => _freigabeSel.has(r.id));

    qrBox.innerHTML = '';
    qrBox.style.display = 'none';
    linkBox.value = '';

    if (!gewaehlt.length) {
        hint.textContent = '';
        budget.textContent = bhL('Keine Woche ausgewählt.', 'No week selected.');
        budget.style.color = 'var(--text-muted)';
        shareBtn.disabled = true;
        return;
    }
    shareBtn.disabled = false;
    hint.textContent = bhL('Code wird erzeugt …', 'Generating code …');

    let link;
    try {
        const code = await MWLCodec.encode(bhBuildWeekPayload(gewaehlt));
        link = location.origin + bhL('/ausbilder/', '/en/ausbilder/') + '#w=' + code;
    } catch (e) {
        hint.textContent = bhL('Der Code konnte nicht erzeugt werden.', 'The code could not be generated.');
        return;
    }
    // Auswahl kann sich waehrend des Komprimierens geaendert haben
    if (token !== _freigabeBuildToken) return;

    linkBox.value = link;

    // Budget offen anzeigen statt eine Obergrenze zu erfinden: der
    // Nutzer sieht, woran er ist, und entscheidet selbst, ob er
    // aufteilt. Zahlen gemessen — eine Woche ~850 Zeichen, ein ganzes
    // Jahr ~14.000.
    const n = gewaehlt.length;
    const wStr = n === 1 ? bhL('1 Woche', '1 week') : n + bhL(' Wochen', ' weeks');
    const lStr = link.length.toLocaleString(mwlLocaleSafe()) + bhL(' Zeichen', ' characters');
    if (link.length > FREIGABE_LINK_WARN) {
        budget.textContent = wStr + ' · ' + lStr + bhL(
            ' — sehr lang, manche Messenger kürzen das. Im Zweifel in zwei Portionen schicken.',
            ' — very long, some messengers truncate it. Consider sending it in two batches.');
        budget.style.color = 'var(--warning)';
    } else {
        budget.textContent = wStr + ' · ' + lStr;
        budget.style.color = 'var(--text-muted)';
    }

    if (!MWLCodec.qrFits(link)) {
        hint.textContent = bhL(
            'Für einen QR-Code ist das zu viel — schick deinem Ausbilder den Link. Ein QR geht nur bei einer einzelnen Woche.',
            'That is too much for a QR code — send your trainer the link. A QR code only works for a single week.');
        return;
    }

    try {
        await MWLCodec.renderQr(qrBox, link, 320);
        if (token !== _freigabeBuildToken) { qrBox.innerHTML = ''; return; }
        qrBox.style.display = '';
        hint.textContent = bhL('Dein Ausbilder scannt den Code mit seiner Handykamera.',
            'Your trainer scans this with their phone camera.');
    } catch (e) {
        hint.textContent = bhL('QR-Code nicht verfügbar — nutze den Link darunter.',
            'QR code unavailable — use the link below.');
    }
}

// mwlLocale() lebt in utils.js, das diese Seite nicht laedt
function mwlLocaleSafe() {
    if (window.mwlLocale) return window.mwlLocale();
    return document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE';
}

function closeFreigabeModal() {
    document.getElementById('freigabeModal').classList.remove('active');
    document.body.style.overflow = '';
    _freigabeBuildToken++;
}

async function shareFreigabeLink() {
    const link = document.getElementById('freigabeLink').value;
    if (!link) return;
    const n = _freigabeSel.size;
    const title = n === 1
        ? bhL('Ausbildungsnachweis', 'Training record')
        : bhL('Ausbildungsnachweis, ' + n + ' Wochen', 'Training record, ' + n + ' weeks');
    if (navigator.share) {
        try { await navigator.share({ title: title, url: link }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try {
        await navigator.clipboard.writeText(link);
        showToast(bhL('Link kopiert', 'Link copied'), 'success');
    } catch (e) {
        document.getElementById('freigabeLink').select();
        showToast(bhL('Bitte von Hand kopieren', 'Please copy manually'), 'info');
    }
}

// ── Rueckweg ─────────────────────────────────────────────────
async function bhApplyResponse(code, opts) {
    let d;
    try {
        d = await MWLCodec.decode(code);
    } catch (e) {
        showToast(bhL('Der Antwort-Code lässt sich nicht lesen.',
            'The response code could not be read.'), 'error');
        return false;
    }
    if (!d || d.v !== 1) {
        showToast(bhL('Das ist kein Freigabe-Code.', 'That is not an approval code.'), 'error');
        return false;
    }

    // Zwei Formen: {ds:[…]} (Sammel-Antwort) und die alte Einzel-
    // entscheidung direkt im Wurzelobjekt.
    let liste = Array.isArray(d.ds) ? d.ds : null;
    if (!liste) {
        if (d.s !== 'approved' && d.s !== 'rejected') {
            showToast(bhL('Das ist kein Freigabe-Code.', 'That is not an approval code.'), 'error');
            return false;
        }
        liste = [{ r: d.r, y: d.y, w: d.w, s: d.s, n: d.n || '' }];
    }
    if (!liste.length) {
        showToast(bhL('Diese Antwort enthält keine Entscheidung.',
            'This response contains no decision.'), 'error');
        return false;
    }

    // Signatur EINMAL ueber die ganze Antwort pruefen — sie deckt die
    // komplette Entscheidungsliste ab (siehe canonical() in mwl-sign.js).
    // Ohne Server gibt es keine Identitaetspruefung; mehr als "dasselbe
    // Geraet wie beim ersten Mal" ist hier nicht zu haben.
    let trust = 'unsigned';
    if (d.k && d.g && window.MWLSign) {
        const ok = await MWLSign.verify(d);
        if (!ok) {
            showToast(bhL('Die Signatur dieser Freigabe stimmt nicht. Sie wurde nachträglich verändert.',
                'The signature of this approval is invalid. It was altered.'), 'error');
            return false;
        }
        let known = null;
        try { known = localStorage.getItem(AUSBILDER_PUB_KEY); } catch (e) { /* Privatmodus */ }
        if (!known) {
            try { localStorage.setItem(AUSBILDER_PUB_KEY, d.k); } catch (e) { /* Privatmodus */ }
            trust = 'first';
        } else {
            trust = known === d.k ? 'known' : 'other-device';
        }
    }

    let ok = 0, no = 0;
    const fehlend = [];

    liste.forEach(x => {
        if (x.s !== 'approved' && x.s !== 'rejected') return;
        let report = x.r ? reports.find(r => r.id === x.r) : null;
        // Faellt der Bericht ueber die ID nicht auf (geloescht und neu
        // angelegt), ueber KW + Ausbildungsjahr suchen — das ist die
        // fachliche Identitaet.
        if (!report) report = reports.find(r => r.week === x.w && r.year === x.y);
        if (!report) { fehlend.push(x.w); return; }

        report.approval = {
            state: x.s,
            by: d.by || '',
            at: d.at || new Date().toISOString(),
            // Begruendung der Woche, sonst die Sammel-Anmerkung
            note: x.n || d.n || '',
            pub: d.k || '',
            sig: d.g || '',
            trust: trust
        };
        if (x.s === 'approved') {
            report.status = 'signed';
            ok++;
        } else {
            // Wurde die Woche vorher schon einmal freigegeben und jetzt
            // zurueckgegeben, darf "Unterschrieben" nicht stehenbleiben —
            // sonst zeigt die Karte zwei widersprüchliche Zustände.
            if (report.status === 'signed') report.status = 'complete';
            no++;
        }
        report.updatedAt = new Date().toISOString();
    });

    if (!ok && !no) {
        showToast(bhL('Zu dieser Antwort gibt es hier keine passende Woche.',
            'No matching week found for this response.'), 'error');
        return false;
    }

    saveToStorage();
    updateUI();

    const von = d.by ? bhL(' von ', ' by ') + d.by : '';
    if (ok && !no) {
        showToast(ok === 1
            ? bhL('KW ' + liste.find(x => x.s === 'approved').w + ' wurde freigegeben' + von + '.',
                'Week ' + liste.find(x => x.s === 'approved').w + ' approved' + von + '.')
            : bhL(ok + ' Wochen wurden freigegeben' + von + '.',
                ok + ' weeks approved' + von + '.'), 'success');
        if (typeof launchConfetti === 'function') launchConfetti();
    } else if (no && !ok) {
        showToast(no === 1
            ? bhL('KW ' + liste.find(x => x.s === 'rejected').w + ' wurde zurückgegeben — bitte überarbeiten.',
                'Week ' + liste.find(x => x.s === 'rejected').w + ' was returned — please revise.')
            : bhL(no + ' Wochen wurden zurückgegeben — bitte überarbeiten.',
                no + ' weeks were returned — please revise.'), 'info');
    } else {
        showToast(bhL(ok + ' freigegeben, ' + no + ' zurückgegeben' + von + '.',
            ok + ' approved, ' + no + ' returned' + von + '.'), 'success');
    }

    // Nicht verschlucken: eine Woche, die es hier nicht mehr gibt, ist
    // fuer den Nutzer sonst spurlos verschwunden.
    if (fehlend.length) {
        setTimeout(function () {
            showToast(bhL('Ohne Zuordnung geblieben: KW ' + fehlend.join(', KW ') + '.',
                'Could not be matched: week ' + fehlend.join(', week ') + '.'), 'info');
        }, 2600);
    }

    if (trust === 'other-device') {
        setTimeout(function () {
            showToast(bhL('Hinweis: Diese Freigabe kam von einem anderen Gerät als beim ersten Mal.',
                'Note: this approval came from a different device than the first one.'), 'info');
        }, 3400);
    }

    if (opts && opts.closeModal) closeFreigabeModal();
    return true;
}

async function bhPasteResponse() {
    const field = document.getElementById('freigabeResponse');
    const raw = (field.value || '').trim();
    if (!raw) return;
    // Der Nutzer fuegt meist die ganze URL ein, nicht nur den Code.
    const m = /[#&]fb=([A-Za-z0-9\-_]+)/.exec(raw);
    const ok = await bhApplyResponse(m ? m[1] : raw, { closeModal: true });
    if (ok) field.value = '';
}

// Deep-Link #fb=<code>. Laeuft beim Laden UND bei hashchange: Android
// fokussiert beim Scannen oft den bestehenden Tab, dann laedt nichts neu.
let _bhLastHash = '';
async function bhHandleHash() {
    const hash = location.hash || '';
    if (hash === _bhLastHash) return;
    _bhLastHash = hash;
    const m = /[#&]fb=([A-Za-z0-9\-_]+)/.exec(hash);
    if (!m) return;
    // Hash sofort entfernen: ein Reload soll die Freigabe nicht erneut
    // anwenden und der Code hat im Verlauf nichts zu suchen.
    history.replaceState(null, '', location.pathname + location.search);
    _bhLastHash = '';
    await bhApplyResponse(m[1], { closeModal: false });
}

window.addEventListener('hashchange', bhHandleHash);

