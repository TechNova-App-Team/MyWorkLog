// ═══ BH-UEBERSICHT ═══
// Laden und Speichern der Berichte, Kennzahlen, Streak, Fortschritt,
// Kalender-Heatmap und die Berichtsliste.
// Herausgeloest aus pages/berichtsheft/index.html.


// ═══════════════════════════════════════
// CORE DATA OPERATIONS
// ═══════════════════════════════════════

function ihkAutoRepairReportYears(repList) {
    if (!Array.isArray(repList) || !repList.length) return false;

    let startDate = null;
    try {
        const pcfg = JSON.parse(localStorage.getItem('pdf_personal_cfg') || '{}');
        if (pcfg && pcfg.beginn) {
            const bStr = String(pcfg.beginn).trim();
            if (bStr.includes('.')) {
                const [d, m, y] = bStr.split('.').map(Number);
                if (y && m && d) startDate = new Date(y, m - 1, d);
            } else if (bStr.includes('-')) {
                const [y, m, d] = bStr.split('-').map(Number);
                if (y && m && d) startDate = new Date(y, m - 1, d);
            }
        }
    } catch (e) {}

    // Wenn kein Startdatum in pdf_personal_cfg: Bestimme Ausbildungsbeginn
    // aus dem frühesten IHK-Import-Bericht. Liegt dieser im September oder später,
    // begann die Ausbildung frühestens im September (und nicht am 1. August).
    if (!startDate) {
        const ihkReports = repList.filter(r => r.source === 'ihk-import' && r.dateFrom);
        if (ihkReports.length > 0) {
            const sortedDates = ihkReports.map(r => r.dateFrom).sort();
            const [ey, em, ed] = sortedDates[0].split('-').map(Number);
            if (ey && em >= 9) {
                startDate = new Date(ey, em - 1, 1);
            }
        }
    }

    if (!startDate || isNaN(startDate.getTime())) return false;
    if (typeof ihkCalculateAusbildungsjahr !== 'function') return false;

    let changed = false;
    repList.forEach(r => {
        if (r.source === 'ihk-import' && r.dateFrom) {
            const [ry, rm, rd] = r.dateFrom.split('-').map(Number);
            if (ry && rm && rd) {
                const monday = new Date(ry, rm - 1, rd);
                const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3);
                const correctYear = ihkCalculateAusbildungsjahr(thursday, startDate);
                if (r.year !== correctYear) {
                    r.year = correctYear;
                    changed = true;
                }
            }
        }
    });

    return changed;
}

function loadReports() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        reports = stored ? JSON.parse(stored) : [];
        if (ihkAutoRepairReportYears(reports)) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
            } catch (e) {}
        }
        // Papierkorb: abgelaufene Einträge (>30 Tage) automatisch bereinigen
        if (typeof cleanupExpiredTrash === 'function') {
            const { expired } = cleanupExpiredTrash(TRASH_MAX_DAYS);
            if (expired && expired.length > 0 && typeof b2bOnTrashEmptied === 'function') {
                b2bOnTrashEmptied(expired.map(x => x.report && (x.report.client_id || x.report.id)).filter(Boolean));
            }
        }
    } catch (e) {
        console.error('Fehler beim Laden:', e);
        reports = [];
    }
    updateUI();
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
        showAutoSave();
        // Der Umfrage-Banner erscheint erst ab dem ersten Bericht und wird
        // sonst nur beim Laden ausgewertet — hier nachziehen, damit er nicht
        // bis zum naechsten Aufruf wartet. Name gegengeprueft:
        // components/umfrage/umfrage.js setzt window.umfApplyBanner.
        if (typeof umfApplyBanner === 'function') umfApplyBanner();
    } catch (e) {
        console.error('Fehler beim Speichern:', e);
        showToast(L('Speichern fehlgeschlagen', 'Saving failed'), 'error');
    }
}

function updateUI() {
    const wurzel = document.querySelector('.container');
    if (wurzel) wurzel.classList.toggle('is-neu', reports.length === 0);
    renderNow();
    updateStats();
    renderReports();
    populateYearFilter();
    updateStreak();
    updateProgress();
    updateLuecken();
    renderCalendarHeatmap();
    updateDepartmentSuggestions();
    // Auswahl erst ab zwei Berichten — mit einem gibt es nichts mehrfach zu waehlen.
    const bulkToggle = document.getElementById('bulkToggle');
    if (bulkToggle) bulkToggle.style.display = reports.length > 1 ? 'inline-flex' : 'none';
    if (typeof updateTrashBadge === 'function') updateTrashBadge();
}

// ═══════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════

function animateCounter(el, target, suffix = '') {
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();

    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * eased);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ═══════════════════════════════════════
// WOCHEN-HELFER (Startseite seit v8.1.12)
// ═══════════════════════════════════════

// Lokales Datum, nie toISOString(): das rechnet in UTC und verschiebt jedes
// Datum oestlich von Greenwich um einen Tag (CLAUDE.md).
function hfYMD(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function hfMontag(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
    x.setDate(x.getDate() - ((x.getDay() || 7) - 1));
    return x;
}
function hfAusDatum(ymd) { return new Date(String(ymd).slice(0, 10) + 'T12:00:00'); }

// Der Bericht einer Woche: primaer ueber den Montag, alte Eintraege ohne Datum
// ueber die KW (wie updateStreak). Bei zwei Berichten zaehlt der weiteste Stand.
function hfBerichtFuer(montag) {
    const ymd = hfYMD(montag);
    const kw = getWeekNumber(montag);
    return reports
        .filter(r => (r.dateFrom && hfYMD(hfMontag(hfAusDatum(r.dateFrom))) === ymd) || (!r.dateFrom && r.week === kw))
        .sort((a, b) => statusPriority(b.status) - statusPriority(a.status))[0] || null;
}

// Wochen ohne Bericht zwischen der ERSTEN berichteten Woche und der Vorwoche
// (die laufende Woche ist noch offen, keine Luecke). Ab der ersten Woche, nicht
// ab Ausbildungsbeginn: wer erst im zweiten Jahr anfaengt, digital zu fuehren,
// bekaeme sonst 50 "fehlende" Wochen, die auf Papier laengst existieren.
function hfLuecken() {
    const montage = new Set(reports.filter(r => r.dateFrom).map(r => hfYMD(hfMontag(hfAusDatum(r.dateFrom)))));
    if (!montage.size) return [];
    const erste = hfAusDatum([...montage].sort()[0]);
    let bis = hfMontag(new Date());
    bis.setDate(bis.getDate() - 7);
    const { ende } = bhAusbildungsZeitraum();
    if (ende && ende < bis) bis = hfMontag(ende);
    const out = [];
    const d = new Date(erste);
    for (let i = 0; d <= bis && i < 520; i++) {
        if (!montage.has(hfYMD(d))) out.push(new Date(d));
        d.setDate(d.getDate() + 7);
    }
    return out;
}

function hfZeitraumText(montag) {
    const fr = new Date(montag);
    fr.setDate(fr.getDate() + 4);
    const loc = window.mwlLocale ? window.mwlLocale() : (document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE');
    const tm = { day: 'numeric', month: 'long' };
    const a = montag.toLocaleDateString(loc, montag.getMonth() === fr.getMonth() ? { day: 'numeric' } : tm);
    const b = fr.toLocaleDateString(loc, tm);
    // de: "5." bzw. "29. September" — der Punkt kommt aus toLocaleDateString.
    return L(`${a} bis ${b}`, `${a} to ${b}`);
}

// Tage mit Text in einer Woche im Tagesmodus (fuer "3 von 5 Tagen").
function hfTageMitText(r) {
    if (!r || !r.dailyActivities) return null;
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(k => !!String(r.dailyActivities[k] || '').trim());
}

function hfMenueZu() {
    const m = document.getElementById('hfImport');
    if (m) m.open = false;
}
document.addEventListener('click', (e) => {
    const m = document.getElementById('hfImport');
    if (m && m.open && !m.contains(e.target)) m.open = false;
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hfMenueZu();
});

// ═══════════════════════════════════════
// DIESE WOCHE
// ═══════════════════════════════════════
// Beantwortet "was ist jetzt dran?" mit EINER Hauptaktion. Reihenfolge nach
// Dringlichkeit: Rueckgabe des Ausbilders > laufende Woche leer/angefangen >
// fehlende Woche > alles fertig.

function renderNow() {
    const box = document.getElementById('hfNow');
    if (!box) return;
    const heute = new Date();
    const mo = hfMontag(heute);
    const kw = getWeekNumber(mo);
    const jahr = isoWeekYear(mo);
    const r = hfBerichtFuer(mo);
    const luecken = hfLuecken();
    const zurueck = reports
        .filter(x => x.approval && x.approval.state === 'rejected')
        .sort((a, b) => String(b.dateFrom || '').localeCompare(String(a.dateFrom || '')))[0];

    const ico = (n) => `<svg class="icon" aria-hidden="true"><use href="#i-${n}"/></svg>`;
    const cta = (text, onclick, icon) =>
        `<button type="button" class="hf-cta" onclick="${onclick}"><span>${escapeHtml(text)}</span><span class="hf-cta-kreis">${ico(icon)}</span></button>`;
    const chip = (text, onclick, icon) =>
        `<button type="button" class="hf-chip hf-chip--gross" onclick="${onclick}">${icon ? ico(icon).replace('class="icon"', 'class="icon icon-sm"') : ''}<span>${escapeHtml(text)}</span></button>`;
    const assistent = "AISChat.oeffnen()";
    // Titel mit EINEM hervorgehobenen Wort (em). Nur feste Texte — nichts vom Nutzer.
    const t = (vor, wort, nach) => escapeHtml(vor) + '<em>' + escapeHtml(wort) + '</em>' + escapeHtml(nach || '.');

    // fokus = die Woche, um die es im Satz geht; sie liegt oben auf dem Stapel.
    let fokusMo = mo, fokusR = r;
    let titel, text, aktionen, extra = '';

    if (zurueck) {
        fokusMo = zurueck.dateFrom ? hfMontag(hfAusDatum(zurueck.dateFrom)) : mo;
        fokusR = zurueck;
        const wer = zurueck.approval.by || L('Dein Ausbilder', 'Your trainer');
        titel = L(t(`KW ${zurueck.week} wurde `, 'zurückgegeben'), t(`Week ${zurueck.week} was `, 'returned'));
        text = zurueck.approval.note
            ? L(`${wer} möchte, dass du nachbesserst. Die Anmerkung steht auf dem Blatt.`, `${wer} would like you to revise it. The note is on the sheet.`)
            : L(`${wer} möchte, dass du die Woche überarbeitest.`, `${wer} would like you to revise this week.`);
        aktionen = cta(L('Überarbeiten', 'Revise'), `editReport('${zurueck.id}')`, 'pen') +
            chip(L('Mit dem Assistenten', 'With the assistant'), assistent, 'sparkles');
    } else if (!reports.length) {
        titel = L(t('Dein erstes ', 'Berichtsheft'), t('Your first ', 'report book'));
        text = L('Erzähl dem Assistenten in ein paar Sätzen, was diese Woche los war. Er schreibt daraus den Bericht, du prüfst ihn nur noch.',
            'Tell the assistant in a few sentences what happened this week. It writes the report, you just check it.');
        aktionen = cta(L('Mit dem Assistenten schreiben', 'Write with the assistant'), assistent, 'sparkles') +
            chip(L('Selbst schreiben', 'Write it myself'), `openWeek(${kw}, ${jahr})`, 'pen');
    } else if (!r) {
        titel = L(t('Diese Woche ist noch ', 'leer'), t('This week is still ', 'empty'));
        text = L('Ein paar Stichworte reichen. Der Assistent macht daraus den Bericht in deinem Stil, du prüfst ihn nur noch.',
            'A few keywords are enough. The assistant turns them into a report in your style, you just check it.');
        aktionen = cta(L('Mit dem Assistenten schreiben', 'Write with the assistant'), assistent, 'sparkles') +
            chip(L('Selbst schreiben', 'Write it myself'), `openWeek(${kw}, ${jahr})`, 'pen');
    } else if (r.status === 'incomplete') {
        const tage = hfTageMitText(r);
        const n = tage ? tage.filter(Boolean).length : null;
        titel = L(t('Diese Woche ist ', 'angefangen'), t('This week is ', 'started'));
        text = n === null
            ? L('Der Bericht ist noch ein Entwurf. Wenn alles drinsteht, setz ihn auf vollständig.',
                'The report is still a draft. Once everything is in, mark it as complete.')
            : L('Der Bericht ist noch ein Entwurf. Ergänz die fehlenden Tage selbst oder mit dem Assistenten.',
                'The report is still a draft. Fill in the missing days yourself or with the assistant.');
        if (tage) {
            extra = `<div class="hf-tage" role="img" aria-label="${escapeHtml(L(`${n} von 5 Tagen mit Text`, `${n} of 5 days with text`))}">` +
                tage.map(v => `<span class="hf-tag-strich${v ? ' is-voll' : ''}"></span>`).join('') +
                `<span class="hf-tage-text" aria-hidden="true">${escapeHtml(L(`${n} von 5 Tagen`, `${n} of 5 days`))}</span></div>`;
        }
        aktionen = cta(L('Weiterschreiben', 'Continue'), `editReport('${r.id}')`, 'pen') +
            chip(L('Mit dem Assistenten ergänzen', 'Fill in with the assistant'), assistent, 'sparkles');
    } else if (luecken.length) {
        const g = luecken[0];
        const gkw = getWeekNumber(g);
        fokusMo = g;
        fokusR = null;
        titel = L(t(`KW ${gkw} `, 'fehlt', ' noch.'), t(`Week ${gkw} is still `, 'missing'));
        text = luecken.length === 1
            ? L(`Diese Woche ist fertig. Nur KW ${gkw} (${hfZeitraumText(g)}) ist noch leer.`, `This week is done. Only week ${gkw} (${hfZeitraumText(g)}) is still empty.`)
            : L(`Diese Woche ist fertig. Insgesamt fehlen noch ${luecken.length} Wochen, das ist die älteste.`,
                `This week is done. ${luecken.length} weeks are still missing in total, this is the oldest.`);
        aktionen = cta(L(`KW ${gkw} nachtragen`, `Add week ${gkw}`), 'hfLueckeOeffnen()', 'plus') +
            chip(L('Diese Woche ansehen', 'View this week'), `viewReport('${r.id}')`, 'eye');
    } else {
        const frei = r.approval && r.approval.state === 'approved' && !r.approval.stale;
        titel = frei ? L(t('Diese Woche ist ', 'freigegeben'), t('This week is ', 'approved'))
            : r.status === 'signed' ? L(t('Diese Woche ist ', 'unterschrieben'), t('This week is ', 'signed'))
            : L(t('Diese Woche ist ', 'fertig'), t('This week is ', 'done'));
        text = frei
            ? L(`${r.approval.by || 'Dein Ausbilder'} hat die Woche abgezeichnet. Keine Lücken, nichts offen.`,
                `${r.approval.by || 'Your trainer'} has signed off this week. No gaps, nothing open.`)
            : L('Keine Lücken, nichts offen. Bis nächste Woche.', 'No gaps, nothing open. See you next week.');
        aktionen = cta(L('Ansehen', 'View'), `viewReport('${r.id}')`, 'eye') +
            chip(L('Als PDF', 'As PDF'), `exportReportPDF('${r.id}')`, 'file');
    }

    const fokusKw = getWeekNumber(fokusMo);
    box.innerHTML =
        `<div class="hf-now-kopf"><span class="hf-now-kw">${escapeHtml(L(`KW ${fokusKw}`, `CW ${fokusKw}`))}</span>` +
        `<span>${escapeHtml(hfZeitraumText(fokusMo))}</span></div>` +
        `<h2 class="hf-now-titel">${titel}</h2>` +
        `<p class="hf-now-text">${escapeHtml(text)}</p>` + extra +
        `<div class="hf-now-aktionen">${aktionen}</div>`;
    const riesen = document.getElementById('hfRiesen');
    if (riesen) riesen.textContent = L(`KW ${fokusKw}`, `CW ${fokusKw}`);
    renderStapel(fokusMo, fokusR);
}

// ═══════════════════════════════════════
// BLATTSTAPEL
// ═══════════════════════════════════════
// b1 = die Woche aus dem Satz, b2 = die Woche davor, b3 = der Rest. Gezeigt wird
// nur, was wirklich im Bericht steht: Stempel nur bei echter Freigabe bzw.
// Unterschrift, Rotstift nur mit echter Anmerkung des Ausbilders, Handschrift
// nur bei unterschriebenen Wochen. Nichts wird fuer die Optik erfunden.

const HF_TAGE = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
function hfTagZeile(r, i) {
    if (!r) return '';
    const roh = r.dailyActivities ? String(r.dailyActivities[HF_TAGE[i]] || '') : '';
    for (const z of roh.split('\n')) {
        const s = z.replace(/^\s*[•\-*–·]\s*/, '').trim();
        if (s) return s;
    }
    return '';
}

function hfPdfCfg() {
    try { return JSON.parse(localStorage.getItem('pdf_personal_cfg') || '{}') || {}; } catch (e) { return {}; }
}

function hfStempel(r) {
    if (!r) return '';
    const a = r.approval;
    // Zurueckgegeben schlaegt einen alten Status "signed": kein Stempel auf
    // einem Blatt, das der Ausbilder gerade abgelehnt hat.
    if (a && a.state === 'rejected') return '';
    if (a && a.state === 'approved' && !a.stale) {
        const d = a.at ? new Date(a.at) : null;
        const datum = d && !isNaN(d) ? d.toLocaleDateString(window.mwlLocale ? window.mwlLocale() : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
        return `<div class="hf-stempel">${escapeHtml(L('FREIGEGEBEN', 'APPROVED'))}${datum ? `<small>${escapeHtml(datum)}</small>` : ''}</div>`;
    }
    if (r.status === 'signed') return `<div class="hf-stempel">${escapeHtml(L('UNTERSCHRIEBEN', 'SIGNED'))}</div>`;
    return '';
}

function hfRotstift(r) {
    const n = r && r.approval && r.approval.state === 'rejected' && String(r.approval.note || '').trim();
    if (!n) return '';
    return `<div class="hf-rotstift">${escapeHtml(n.length > 70 ? n.slice(0, 68) + '…' : n)}</div>`;
}

function renderStapel(fokusMo, r) {
    const box = document.getElementById('hfStapel');
    if (!box) return;
    const kw = getWeekNumber(fokusMo);
    const jahr = isoWeekYear(fokusMo);
    const fr = new Date(fokusMo); fr.setDate(fr.getDate() + 4);
    const kurz = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
    const tageNamen = L('Mo Di Mi Do Fr', 'Mo Tu We Th Fr').split(' ');

    const zeilen = tageNamen.map((name, i) => {
        const schule = !!(r && r.dailySchool && r.dailySchool[HF_TAGE[i]]);
        let txt = hfTagZeile(r, i);
        // Wochenmodus: die Zeilen des Wochentextes der Reihe nach auf die Linien.
        if (r && !r.dailyActivities && r.activities) {
            const alle = String(r.activities).split('\n').map(z => z.replace(/^\s*[•\-*–·]\s*/, '').trim())
                .filter(z => z && !HF_TAGKOPF.test(z));
            txt = alle[i] || '';
        }
        const status = /keine Tätigkeiten|no activities/i.test(txt);
        const leerText = !r && i === 0 ? L('Was war los?', 'What happened?') : '';
        const p = txt
            ? `<p class="${status ? 'is-status' : ''}">${escapeHtml(txt)}</p>`
            : `<p class="is-leer">${escapeHtml(leerText)}</p>`;
        return `<div class="hf-blatt-tag${schule ? ' is-schule' : ''}"><span>${name}</span>${p}</div>`;
    }).join('');

    const cfg = hfPdfCfg();
    const azubiUnterschrieben = r && (r.status === 'complete' || r.status === 'signed');
    const ausbilderUnterschrieben = r && (r.status === 'signed' || (r.approval && r.approval.state === 'approved' && !r.approval.stale));
    const nameAzubi = azubiUnterschrieben && cfg.name ? `<span class="hf-hand">${escapeHtml(String(cfg.name).trim())}</span>` : '';
    const nameAusb = ausbilderUnterschrieben && ((r.approval && r.approval.by) || cfg.ausbilder)
        ? `<span class="hf-hand">${escapeHtml(String((r.approval && r.approval.by) || cfg.ausbilder).trim())}</span>` : '';

    const klick = r ? (r.status === 'incomplete' || (r.approval && r.approval.state === 'rejected') ? `editReport('${r.id}')` : `viewReport('${r.id}')`)
        : `openWeek(${kw}, ${jahr})`;
    const label = r ? L(`KW ${kw} öffnen`, `Open week ${kw}`) : L(`KW ${kw} schreiben`, `Write week ${kw}`);

    const vorMo = new Date(fokusMo); vorMo.setDate(vorMo.getDate() - 7);
    const vor = hfBerichtFuer(vorMo);

    box.innerHTML =
        `<div class="hf-blatt b3" aria-hidden="true"></div>` +
        `<div class="hf-blatt b2" aria-hidden="true">${hfStempel(vor)}${hfRotstift(vor)}</div>` +
        `<div class="hf-blatt b1" role="button" tabindex="0" onclick="${klick}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" aria-label="${escapeHtml(label)}">` +
        `<div class="hf-vk"><span>${escapeHtml(L('Ausbildungsnachweis', 'Training record'))}</span><b>${escapeHtml(L(`KW ${kw}`, `CW ${kw}`))}</b>` +
        `<span>${kurz(fokusMo)} ${escapeHtml(L('bis', 'to'))} ${kurz(fr)}${fr.getFullYear()}</span></div>` +
        `<div>${zeilen}</div>` + hfRotstift(r) +
        `<div class="hf-unterschrift"><div class="hf-us">${nameAzubi}${escapeHtml(L('Unterschrift Azubi', 'Trainee signature'))}</div>` +
        `<div class="hf-us">${nameAusb}${escapeHtml(L('Unterschrift Ausbilder', 'Trainer signature'))}</div></div>` +
        hfStempel(r) +
        `</div>`;
}

// ═══════════════════════════════════════
// STAND: vier verschiedene Aussagen
// ═══════════════════════════════════════

// "Wartet auf Unterschrift" statt einer vierten Variante derselben Wochenzahl.
// Sind alle unterschrieben, steht dort die Zahl der unterschriebenen.
function updateStats() {
    const offen = reports.filter(r => r.status === 'complete' && !(r.approval && r.approval.state === 'approved')).length;
    const signiert = reports.filter(r => r.status === 'signed' || (r.approval && r.approval.state === 'approved')).length;
    const num = document.getElementById('hfSignNum'), txt = document.getElementById('hfSignTxt');
    if (!num || !txt) return;
    if (offen > 0) {
        animateCounter(num, offen);
        txt.textContent = offen === 1 ? L('wartet auf Unterschrift', 'awaiting signature') : L('warten auf Unterschrift', 'awaiting signature');
    } else {
        animateCounter(num, signiert);
        txt.textContent = L('unterschrieben', 'signed');
    }
}

// ═══════════════════════════════════════
// STREAK CALCULATION
// ═══════════════════════════════════════

function updateStreak() {
    const el = document.getElementById('streakNum');
    const txt = document.getElementById('streakTxt');
    const setzen = (n) => {
        animateCounter(el, n);
        if (txt) txt.textContent = n === 1 ? L('Woche am Stück', 'week in a row') : L('Wochen am Stück', 'weeks in a row');
    };
    if (reports.length === 0) { setzen(0); return; }

    let checkDate = hfMontag(new Date());
    let streak = 0;

    // Grace-Period: ist diese Woche noch leer, zaehlt die Serie ab letzter Woche.
    if (!hfBerichtFuer(checkDate)) {
        checkDate.setDate(checkDate.getDate() - 7);
        if (!hfBerichtFuer(checkDate)) { setzen(0); return; }
    }
    for (let i = 0; i < 200; i++) {
        if (!hfBerichtFuer(checkDate)) break;
        streak++;
        checkDate.setDate(checkDate.getDate() - 7);
    }
    setzen(streak);
}

// ═══════════════════════════════════════
// PROGRESS TRACKING
// ═══════════════════════════════════════

function updateProgress() {
    // Laenge der Ausbildung aus Beginn/Ende (Deckblatt oder Haupt-App). Ohne
    // beides bleibt es bei der 3-jaehrigen Annahme (156 Wochen) — fuer eine
    // 2-jaehrige oder 3,5-jaehrige Ausbildung war die Zahl vorher einfach falsch.
    const { beginn, ende } = bhAusbildungsZeitraum();
    const maxWeeks = (beginn && ende && ende > beginn)
        ? Math.max(1, Math.round((ende - beginn) / (7 * 86400000)))
        : 156;
    const documentedWeeks = new Set(reports.map(r => `${r.year}-${r.week}`)).size;
    const percent = Math.min(Math.round((documentedWeeks / maxWeeks) * 100), 100);

    animateCounter(document.getElementById('progressNum'), documentedWeeks);
    const fill = document.getElementById('progressBarFill');
    if (fill) fill.style.width = percent + '%';
    const sub = document.getElementById('progressSub');
    if (sub) sub.textContent = L(`von ${maxWeeks} Wochen der Ausbildung`, `of ${maxWeeks} training weeks`);
    const bar = fill && fill.parentElement;
    if (bar) bar.title = percent + ' %';
}

// ═══════════════════════════════════════
// LUECKEN
// ═══════════════════════════════════════

function updateLuecken() {
    const n = hfLuecken().length;
    const knopf = document.getElementById('hfLuecke');
    const txt = document.getElementById('hfLueckeTxt');
    animateCounter(document.getElementById('hfLueckeNum'), n);
    if (txt) txt.textContent = n === 0 ? L('Lücken', 'gaps') : n === 1 ? L('Woche fehlt', 'week missing') : L('Wochen fehlen', 'weeks missing');
    if (knopf) {
        knopf.disabled = n === 0;
        knopf.classList.toggle('is-offen', n > 0);
        knopf.title = n ? L('Zur ältesten fehlenden Woche', 'Go to the oldest missing week') : '';
    }
}

function hfLueckeOeffnen() {
    const g = hfLuecken()[0];
    if (g) openWeek(getWeekNumber(g), isoWeekYear(g));
}

// ═══════════════════════════════════════
// DEIN JAHR (Wochenstreifen)
// ═══════════════════════════════════════

// Ein Jahr hat 52 ODER 53 ISO-Wochen: 53, wenn der 1. Januar ein Donnerstag ist
// oder in einem Schaltjahr ein Mittwoch. 2026 hat 53 — mit der festen 52 fiel
// die letzte Woche des Jahres aus dem Streifen.
function isoWeeksInYear(year) {
    const jan1 = new Date(year, 0, 1).getDay();
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return (jan1 === 4 || (leap && jan1 === 3)) ? 53 : 52;
}

// report.year ist das AUSBILDUNGSjahr (1/2/3), nicht das Kalenderjahr — der
// Streifen muss das Kalenderjahr aus dateFrom lesen, sonst leuchtet KW 35 aus 2025
// im Jahr 2026 mit.
function reportCalendarYear(r) {
    const y = parseInt(String(r.dateFrom || '').slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
}

function renderCalendarHeatmap() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    const nowYear = new Date().getFullYear();

    // Standard ist das laufende Jahr. Liegt darin nichts, aber in einem früheren,
    // wird das jüngste Jahr mit Berichten gezeigt — die Überschrift nennt es.
    const years = [...new Set(reports.map(reportCalendarYear).filter(Boolean))];
    const year = (years.includes(nowYear) || !years.length) ? nowYear : Math.max(...years);
    document.getElementById('calendarYear').textContent = year;

    // Je Woche der weiteste Stand; eine Freigabe zaehlt wie "unterschrieben".
    const weekMap = {};
    reports.forEach(r => {
        const ry = reportCalendarYear(r);
        if (ry !== null && ry !== year) return;
        const frei = r.approval && r.approval.state === 'approved' && !r.approval.stale;
        const st = frei ? 'signed' : r.status;
        const existing = weekMap[r.week];
        if (!existing || statusPriority(st) > statusPriority(existing)) weekMap[r.week] = st;
    });
    // Fehlende Wochen aus derselben Rechnung wie das Kaestchen "fehlen noch".
    const fehlt = new Set(hfLuecken().filter(d => isoWeekYear(d) === year).map(d => getWeekNumber(d)));

    const STATUS_TEXT = {
        signed: L('unterschrieben', 'signed'),
        complete: L('fertig', 'done'),
        incomplete: L('Entwurf', 'draft')
    };
    // 🔴 Der Zustand steht in der FORM (Stempelring, Haken, Strichelrahmen,
    // Rotstift-Kringel), nicht in Abstufungen der Theme-Farbe. Die erste Fassung
    // (v8.1.12) stufte nur --primary ab — bei einem gedeckten Theme waren die
    // Stufen ununterscheidbar (Screenshot des Nutzers, graubraun).
    const STATUS_CLASS = { signed: 'is-stempel', complete: 'is-haken', incomplete: 'is-entwurf' };
    const MONTHS = L('Januar Februar März April Mai Juni Juli August September Oktober November Dezember',
        'January February March April May June July August September October November December').split(' ');
    const totalWeeks = isoWeeksInYear(year);
    const currentWeek = year === nowYear ? getWeekNumber(new Date()) : (year < nowYear ? totalWeeks + 1 : 0);

    // Jede Woche gehört zu dem Monat, in dem ihr Donnerstag liegt (ISO-Regel).
    // isoWeekMonday() (bh-bericht.js) liefert UTC-Mitternacht, also wird hier auch
    // in UTC gerechnet.
    const buckets = MONTHS.map(() => []);
    for (let w = 1; w <= totalWeeks; w++) {
        const thursday = isoWeekMonday(year, w);
        thursday.setUTCDate(thursday.getUTCDate() + 3);
        buckets[thursday.getUTCMonth()].push(w);
    }

    const haken = '<svg class="hf-k-haken" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13.5l5 4.5L20 6"/></svg>';
    grid.innerHTML = buckets.map((weeks, m) => {
        const felder = weeks.map(w => {
            const status = weekMap[w] || null;
            const istFehlt = !status && fehlt.has(w);
            const mon = isoWeekMonday(year, w);
            const dm = `${mon.getUTCDate()}.${mon.getUTCMonth() + 1}.`;
            const statusLabel = status ? STATUS_TEXT[status]
                : istFehlt ? L('fehlt', 'missing')
                : (w > currentWeek ? L('noch nicht dran', 'not yet') : L('kein Bericht', 'no report'));
            const label = L(`KW ${w}, ab ${dm}: ${statusLabel}`, `Week ${w}, from ${dm}: ${statusLabel}`);
            const cls = 'hf-kfeld' + (status ? ' ' + STATUS_CLASS[status] : '') + (istFehlt ? ' is-fehlt' : '')
                + (w === currentWeek ? ' is-now' : '') + (!status && w > currentWeek ? ' is-zukunft' : '');
            return `<button type="button" class="${cls}" data-week="${w}" tabindex="-1" aria-label="${label}" onclick="openWeek(${w}, ${year})">` +
                `<span class="hf-kfeld-nr">${w}</span>${status === 'complete' ? haken : ''}<span class="hf-tip" aria-hidden="true">${label}</span></button>`;
        }).join('');
        return `<div class="hf-kmonat"><span class="hf-kmonat-name">${MONTHS[m]}</span><div class="hf-kfelder">${felder}</div></div>`;
    }).join('');

    // Rollender Fokus: nur EINE Woche liegt in der Tab-Reihenfolge, innerhalb wird
    // mit den Pfeiltasten gewandert. 53 Tabstopps vor dem ersten Knopf wären
    // sonst für Tastaturnutzer eine Zumutung.
    const cells = [...grid.querySelectorAll('.hf-kfeld')];
    const start = cells.find(c => c.classList.contains('is-now')) || cells[0];
    if (start) start.tabIndex = 0;
    grid.onkeydown = (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[e.key];
        if (step === undefined) return;
        const i = cells.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        const next = cells[Math.max(0, Math.min(cells.length - 1, i + step))];
        cells.forEach(c => { c.tabIndex = -1; });
        next.tabIndex = 0;
        next.focus();
    };
}

function statusPriority(status) {
    return { 'incomplete': 1, 'complete': 2, 'signed': 3 }[status] || 0;
}

// Hieß filterByWeek und filterte nichts: die Funktion öffnete einen Bericht
// und leerte dabei Suchfeld, Jahr- und Status-Filter des Nutzers als Nebenwirkung.
// Die Heatmap zeigt EIN Jahr — der Klick muss es mitbringen. Vorher fand
// „KW 12" den Bericht aus dem Vorjahr, und ein neuer Bericht bekam die Daten
// des laufenden Jahres, egal welches Jahr ueber der Uebersicht stand.
function openWeek(week, year) {
    const jahr = year || new Date().getFullYear();
    const filtered = reports.filter(r => r.week === week
        && (reportCalendarYear(r) === null || reportCalendarYear(r) === jahr));
    if (filtered.length > 0) {
        viewReport(filtered[0].id);
    } else {
        // Open new report for this week
        openNewReportModal();
        document.getElementById('reportWeek').value = week;
        const { monday, friday } = getWeekDates(week, jahr);
        document.getElementById('reportDateFrom').value = monday;
        document.getElementById('reportDateTo').value = friday;
        bhAusbildungsjahrVorbelegen(monday, true);
        // Die Tagesfelder wurden im Modal schon fuer die laufende Woche gebaut.
        if (currentMode === 'daily') renderDailyFields();
    }
}

// ═══════════════════════════════════════
// RENDER REPORTS
// ═══════════════════════════════════════

// Erste inhaltliche Zeile einer Woche — ohne Aufzaehlungszeichen, ohne die
// Tagesueberschriften aus combineDailyToWeeklyText() ("Montag:") und ohne das
// Status-Etikett der Engine ("Krank — keine Tätigkeiten").
const HF_TAGKOPF = /^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Monday|Tuesday|Wednesday|Thursday|Friday):?$/i;
function hfVorschau(r) {
    const quelle = r.dailyActivities
        ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(k => r.dailyActivities[k] || '').join('\n')
        : (r.activities || '');
    for (const roh of String(quelle).split('\n')) {
        const z = roh.replace(/^\s*[•\-*–·]\s*/, '').trim();
        if (z && !HF_TAGKOPF.test(z) && !/keine Tätigkeiten|no activities/i.test(z)) return z;
    }
    return '';
}

function renderReports() {
    const list = document.getElementById('reportList');
    const emptyState = document.getElementById('emptyState');
    const reportCount = document.getElementById('reportCount');

    // Filters
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const yearFilter = document.getElementById('yearFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const sortOrder = document.getElementById('sortOrder')?.value || 'newest';

    let filtered = reports.filter(r => {
        // Search in activities AND dailyActivities
        let searchableText = (r.activities || '').toLowerCase();
        if (r.dailyActivities) {
            Object.values(r.dailyActivities).forEach(t => searchableText += ' ' + (t || '').toLowerCase());
        }
        const matchesSearch = searchableText.includes(searchTerm) ||
            (r.department && r.department.toLowerCase().includes(searchTerm)) ||
            `kw ${r.week}`.includes(searchTerm);
        const matchesYear = !yearFilter || r.year.toString() === yearFilter;
        const matchesStatus = !statusFilter || r.status === statusFilter;
        return matchesSearch && matchesYear && matchesStatus;
    });

    const getSortKey = (r) => {
        if (r.dateFrom) return r.dateFrom;
        return `${r.year}-${r.week.toString().padStart(2, '0')}`;
    };

    // Sort
    switch (sortOrder) {
        case 'newest':
            filtered.sort((a, b) => getSortKey(b).localeCompare(getSortKey(a)));
            break;
        case 'oldest':
            filtered.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
            break;
        case 'week-asc':
            filtered.sort((a, b) => a.week - b.week || getSortKey(a).localeCompare(getSortKey(b)));
            break;
        case 'week-desc':
            filtered.sort((a, b) => b.week - a.week || getSortKey(b).localeCompare(getSortKey(a)));
            break;
    }

    // Die Zahl neben "Deine Wochen": gefiltert als "12 von 57", sonst nur die Zahl.
    reportCount.textContent = filtered.length === reports.length
        ? String(reports.length)
        : L(`${filtered.length} von ${reports.length}`, `${filtered.length} of ${reports.length}`);

    if (filtered.length === 0) {
        list.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    let isB2BMitglied = false;
    try {
        const cached = localStorage.getItem('bh_b2b_status');
        if (cached) {
            const st = JSON.parse(cached);
            if (st.rolle === 'ausbilder') {
                isB2BMitglied = true;
            } else if (st.rolle === 'azubi') {
                isB2BMitglied = (localStorage.getItem('bh_b2b_ok') === st.betriebId);
            }
        }
    } catch(e) {}

    list.innerHTML = filtered.map((report) => {
        // Zustand wie auf echtem Papier: Rotstift (zurueckgegeben) > Stempel
        // (freigegeben/unterschrieben) > Vermerk (fertig/Entwurf). Eine veraltete
        // oder ungueltige Freigabe zeigt weiter die Warnung aus bh-freigabe.js —
        // die ist eine Sicherheitsaussage und gehoert nicht in Handschrift.
        const a = report.approval;
        const warnung = a && a.state === 'approved' && (a.stale || a.sigStatus === 'ungueltig');
        let zustand;
        if (a && a.state === 'rejected') {
            const ohne = a.widerrufen ? L('Freigabe widerrufen', 'Approval revoked') : L('zurückgegeben', 'returned');
            const voll = (a.by ? a.by + ': ' : '') + (a.note || ohne);
            zustand = `<span class="hf-rot" title="${escapeHtml(voll)}">${escapeHtml(a.note ? (a.note.length > 48 ? a.note.slice(0, 46) + '…' : a.note) : ohne)}</span>`;
        } else if (warnung) {
            zustand = bhApprovalBadge(report);
        } else if (a && a.state === 'approved') {
            zustand = `<span class="hf-mini-stempel">${L('FREIGEGEBEN', 'APPROVED')}</span>`;
        } else if (report.status === 'signed') {
            zustand = `<span class="hf-mini-stempel">${L('UNTERSCHRIEBEN', 'SIGNED')}</span>`;
        } else if (report.status === 'complete') {
            zustand = `<span class="hf-vermerk">${L('fertig, wartet auf Unterschrift', 'done, awaiting signature')}</span>`;
        } else {
            zustand = `<span class="hf-vermerk is-entwurf">${L('Entwurf', 'Draft')}</span>`;
        }

        const textForWords = report.mode === 'daily'
            ? Object.values(report.dailyActivities || {}).join(' ')
            : (report.activities || '');
        const wordCount = (textForWords + ' ' + (report.school || '')).split(/\s+/).filter(w => w.length > 0).length;
        const isSelected = selectedIds.has(report.id);
        const vorschau = hfVorschau(report);
        const meta = `${bhStunden(report.hours)} ${L('Std.', 'hrs')}, ${wordCount} ${wordCount === 1 ? L('Wort', 'word') : L('Wörter', 'words')}`;
        const klick = bulkMode ? `toggleSelect('${report.id}')` : `viewReport('${report.id}')`;

        return `
                    <div class="report-item${bhApprovalKlasse(report)}${bulkMode ? ' hat-auswahl' : ''}${isSelected ? ' is-gewaehlt' : ''}" data-id="${report.id}"
                         tabindex="0" onclick="${klick}" onkeydown="if(event.key==='Enter'&&event.target===this)this.click()">
                        ${bulkMode ? `<input type="checkbox" ${isSelected ? 'checked' : ''} aria-label="${L('Auswählen', 'Select')}" onclick="event.stopPropagation();toggleSelect('${report.id}')">` : ''}
                        <div class="hf-zeile-kw">
                            <b>${report.week}</b>
                            <small>${L(`${report.year}. Jahr`, `Year ${report.year}`)}</small>
                        </div>
                        <div class="hf-zeile-mitte">
                            <div class="hf-zeile-kopf">
                                <span class="hf-zeile-datum">${formatDate(report.dateFrom)} - ${formatDate(report.dateTo)}</span>
                                ${report.department ? `<span class="hf-zeile-abt">${escapeHtml(report.department)}</span>` : ''}
                            </div>
                            <p class="hf-zeile-vorschau${vorschau ? '' : ' is-leer'}">${vorschau ? escapeHtml(vorschau) : L('Noch kein Text', 'No text yet')}</p>
                            <span class="hf-zeile-meta">${meta}</span>
                        </div>
                        <div class="hf-zeile-status">${zustand}</div>
                        ${!bulkMode ? `
                        <div class="report-actions" onclick="event.stopPropagation()">
                            ${!isB2BMitglied ? `<button class="btn-icon" onclick="openFreigabeModal('${report.id}')" title="${L('Freigabe durch Ausbilder', 'Trainer sign-off')}" aria-label="${L('Freigabe durch Ausbilder', 'Trainer sign-off')}"><svg class="icon"><use href="#i-tie"/></svg></button>` : ''}
                            <button class="btn-icon" onclick="editReport('${report.id}')" title="${L('Bearbeiten', 'Edit')}" aria-label="${L('Bearbeiten', 'Edit')}"><svg class="icon"><use href="#i-edit"/></svg></button>
                            <button class="btn-icon success" onclick="duplicateReport('${report.id}')" title="${L('Duplizieren', 'Duplicate')}" aria-label="${L('Duplizieren', 'Duplicate')}"><svg class="icon"><use href="#i-copy"/></svg></button>
                            <button class="btn-icon" onclick="exportReportPDF('${report.id}')" title="${L('Als PDF exportieren', 'Export as PDF')}" aria-label="${L('Als PDF exportieren', 'Export as PDF')}"><svg class="icon"><use href="#i-file"/></svg></button>
                            <button class="btn-icon danger" onclick="deleteReport('${report.id}')" title="${L('Löschen', 'Delete')}" aria-label="${L('Löschen', 'Delete')}"><svg class="icon"><use href="#i-trash"/></svg></button>
                        </div>
                        <div class="ais-del-confirm-strip" onclick="event.stopPropagation()">
                            <span class="ais-del-confirm-label">${L('Löschen?', 'Delete?')}</span>
                            <button class="ais-del-btn-nein" onclick="cancelDeleteReport('${report.id}')">${L('Nein', 'No')}</button>
                            <button class="ais-del-btn-ja" onclick="confirmDeleteReport('${report.id}')">${L('Ja', 'Yes')}</button>
                        </div>` : ''}
                    </div>
                `;
    }).join('');

}
