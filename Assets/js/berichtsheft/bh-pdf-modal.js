// ═══ BH-PDF-MODAL ═══
// PDF-Dialog: Stilwahl, Kammer- und Vordruck-Auswahl, persoenliche Angaben,
// Live-Vorschau.
// Herausgeloest aus pages/berichtsheft/index.html.

// ═══════════════════════════════════════════════════════════
// PDF EXPORT MODAL — IHK STUDIO
// ═══════════════════════════════════════════════════════════

let _pdfCurrentId = null;
let _pdfCurrentStyle = 'form';
let _pdfActiveTheme = null;

const PDF_LABELS = {
    form: 'IHK-Vordruck',
    ihk: 'IHK Classic',
    modern: 'Modern Dark',
    clean: 'Schlicht'
};

const DAYS_MAP = {
    monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch',
    thursday: 'Donnerstag', friday: 'Freitag'
};
const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

function openPDFModal(id) {
    _pdfCurrentId = id || null;
    const overlay = document.getElementById('pdfModal');
    const subtitle = document.getElementById('pdfModalSubtitle');

    // Load saved personal info
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('pdf_personal_cfg') || '{}') || {}; } catch (e) { saved = {}; }
    document.getElementById('pdfAzubiName').value = saved.name || '';
    document.getElementById('pdfBetrieb').value = saved.betrieb || '';
    document.getElementById('pdfAusbilder').value = saved.ausbilder || '';
    document.getElementById('pdfBeruf').value = saved.beruf || '';
    document.getElementById('pdfHeftNr').value = saved.heftNr || '';
    document.getElementById('pdfAdresse').value = saved.adresse || '';
    document.getElementById('pdfFachrichtung').value = saved.fachrichtung || '';
    document.getElementById('pdfBeginn').value = saved.beginn || '';
    document.getElementById('pdfEnde').value = saved.ende || '';

    // Vorlage, Kammer und Vordruck wiederherstellen
    _pdfCurrentStyle = PDF_LABELS[saved.style] ? saved.style : 'form';
    document.querySelectorAll('.pdf-style-card').forEach(c =>
        c.classList.toggle('selected', c.dataset.style === _pdfCurrentStyle));
    document.getElementById('pdfPreviewBadge').textContent = PDF_LABELS[_pdfCurrentStyle] + ' Format';
    document.getElementById('pdfDocPreview').className = 'pdf-doc style-' + _pdfCurrentStyle;
    populateIhkSelects(saved.kammer, saved.formular);
    document.getElementById('pdfOptCover').classList.toggle('on', !!saved.cover);
    syncPDFPanels();

    if (id) {
        const r = reports.find(x => x.id === id);
        if (r) {
            subtitle.textContent = `KW ${r.week} · ${r.year}. Ausbildungsjahr · ${formatDate(r.dateFrom)} – ${formatDate(r.dateTo)}`;
            // Pre-fill department if beruf empty
            if (!saved.beruf && r.department) document.getElementById('pdfBeruf').value = r.department;
        }
        // Hide "Alle KWs" button, show single export
        document.getElementById('pdfExportAllBtn').style.display = 'none';
        document.getElementById('pdfExportBtn').textContent = '';
        document.getElementById('pdfExportBtn').innerHTML = '<svg class="icon"><use href="#i-file"/></svg> Als PDF herunterladen';
    } else {
        subtitle.textContent = 'Alle Berichte als Jahresbericht exportieren';
        document.getElementById('pdfExportAllBtn').style.display = '';
    }

    updatePDFPreview();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePDFModal() {
    _savePDFPersonalCfg();
    document.getElementById('pdfModal').classList.remove('active');
    document.body.style.overflow = '';
}

function selectPDFStyle(style, el) {
    _pdfCurrentStyle = style;
    document.querySelectorAll('.pdf-style-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('pdfPreviewBadge').textContent = PDF_LABELS[style] + ' Format';
    const doc = document.getElementById('pdfDocPreview');
    doc.className = 'pdf-doc style-' + style;
    syncPDFPanels();
    updatePDFPreview();
}

function togglePDFOpt(el) {
    el.classList.toggle('on');
    syncPDFPanels();
    updatePDFPreview();
}

// ── IHK-VORDRUCK: Kammer- und Formularauswahl ───────────────────────

function isFormStyle() { return _pdfCurrentStyle === 'form'; }

function populateIhkSelects(kammerId, formId) {
    const kSel = document.getElementById('pdfKammer');
    if (!kSel || typeof IHK_KAMMERN === 'undefined') return;
    kSel.innerHTML = IHK_KAMMERN.map(k =>
        `<option value="${k.id}">${escapeHtml(k.name)}</option>`).join('');
    kSel.value = IHK_KAMMERN.some(k => k.id === kammerId) ? kammerId : 'dihk';
    fillFormularSelect(formId);
}

function fillFormularSelect(formId) {
    const kammer = getIhkKammer(document.getElementById('pdfKammer').value);
    const fSel = document.getElementById('pdfFormular');
    fSel.innerHTML = kammer.forms.map(id =>
        `<option value="${id}">${escapeHtml(ihkFormLabel(id))}</option>`).join('');
    fSel.value = kammer.forms.includes(formId) ? formId : kammer.forms[0];
    updateFormNote();
}

function onPDFKammerChange() {
    fillFormularSelect(document.getElementById('pdfFormular').value);
    updatePDFPreview();
}

// Der Hinweis unter der Auswahl sagt, ob der Vordruck dieser Kammer
// wirklich geprueft wurde. Alles andere waere eine Genauigkeit
// vorgetaeuscht, die nicht dahintersteckt.
function updateFormNote() {
    const note = document.getElementById('pdfFormNote');
    if (!note) return;
    const kammer = getIhkKammer(document.getElementById('pdfKammer').value);
    const formId = document.getElementById('pdfFormular').value;
    if (!IHK_FORMS[formId]) { note.innerHTML = ''; return; }
    const en = ihkIsEnglish();
    note.classList.toggle('checked', !!kammer.verified);
    note.innerHTML = `<strong>${escapeHtml(ihkFormLabel(formId))}</strong> — ${escapeHtml(ihkFormHint(formId))}.<br>` +
        (kammer.verified
            ? (en ? 'Field labels taken verbatim from this chamber&#39;s official form.'
                : 'Feldbeschriftungen wörtlich aus dem Vordruck dieser Kammer übernommen.')
            : (en ? 'This chamber&#39;s own form was not checked individually — the DIHK standard applies, which most chambers hand out unchanged. If yours differs, pick another form above.'
                : 'Vordruck dieser Kammer nicht einzeln geprüft — es gilt das DIHK-Muster, das die meisten Kammern unverändert ausgeben. Weicht deins ab, wähle oben einen anderen Vordruck.'));
}

// Blendet ein, was zur gewaehlten Vorlage gehoert. Beim amtlichen
// Vordruck bestimmt das Formular selbst, ob es Stunden-Spalte,
// Unterschriften und Fusszeile gibt — die freien Schalter waeren dort
// wirkungslos und damit irrefuehrend.
function syncPDFPanels() {
    const form = isFormStyle();
    document.getElementById('pdfKammerSection').style.display = form ? '' : 'none';
    document.getElementById('pdfOptFormList').style.display = form ? '' : 'none';
    document.getElementById('pdfOptStyleList').style.display = form ? 'none' : '';
    const coverOn = document.getElementById('pdfOptCover').classList.contains('on');
    document.getElementById('pdfCoverSection').style.display = (form && coverOn) ? '' : 'none';
    if (form) updateFormNote();
}

function _savePDFPersonalCfg() {
    const v = id => document.getElementById(id)?.value || '';
    const cfg = {
        name: v('pdfAzubiName'),
        betrieb: v('pdfBetrieb'),
        ausbilder: v('pdfAusbilder'),
        beruf: v('pdfBeruf'),
        heftNr: v('pdfHeftNr'),
        adresse: v('pdfAdresse'),
        fachrichtung: v('pdfFachrichtung'),
        beginn: v('pdfBeginn'),
        ende: v('pdfEnde'),
        style: _pdfCurrentStyle,
        kammer: v('pdfKammer'),
        formular: v('pdfFormular'),
        cover: !!document.getElementById('pdfOptCover')?.classList.contains('on')
    };
    localStorage.setItem('pdf_personal_cfg', JSON.stringify(cfg));
}

// Fuellt das Formular-Modell aus einem Bericht. Einzige Stelle, an der
// Berichtsfelder auf Vordruck-Bloecke abgebildet werden — Vorschau und
// PDF greifen beide hierauf zu.
function buildIhkCtx(report) {
    const v = id => (document.getElementById(id)?.value || '').trim();
    const days = DAYS_ORDER.map(k => {
        const isSchool = report.dailySchool && report.dailySchool[k];
        let text = report.dailyActivities ? (report.dailyActivities[k] || '') : '';
        if (isSchool && text) text = '[Berufsschule] ' + text;
        else if (isSchool) text = 'Berufsschule';

        return {
            label: DAYS_MAP[k],
            text: text,
            hours: report.dailyHours ? (report.dailyHours[k] || '') : ''
        };
    });
    // Wochenmodus: der zusammengefasste Text steht im Taetigkeits-Block.
    // Im Tagesmodus fuellt derselbe Text die Tageszeilen.
    return {
        name: v('pdfAzubiName'),
        jahr: report.year ? String(report.year) : '',
        bereich: report.department || v('pdfBeruf'),
        von: formatDate(report.dateFrom),
        bis: formatDate(report.dateTo),
        nr: report.week ? String(report.week) : '',
        activities: report.mode === 'daily' && report.dailyActivities
            ? DAYS_ORDER.filter(k => report.dailyActivities[k] || (report.dailySchool && report.dailySchool[k]))
                .map(k => {
                    const isSchool = report.dailySchool && report.dailySchool[k];
                    let t = report.dailyActivities[k] || '';
                    if (isSchool && t) t = '[Berufsschule] ' + t;
                    else if (isSchool) t = 'Berufsschule';
                    return DAYS_MAP[k] + ':\n' + t;
                }).join('\n\n')
            : (report.activities || ''),
        instruction: report.instruction || '',
        school: report.school || '',
        days: days,
        gesamtStunden: report.hours ? String(report.hours) : '',
        adresse: v('pdfAdresse'),
        beruf: v('pdfBeruf'),
        fachrichtung: v('pdfFachrichtung'),
        betrieb: v('pdfBetrieb'),
        ausbilder: v('pdfAusbilder'),
        heftNr: v('pdfHeftNr'),
        beginn: v('pdfBeginn') ? formatDate(v('pdfBeginn')) : '',
        ende: v('pdfEnde') ? formatDate(v('pdfEnde')) : '',
        // Die Freigabe des Ausbilders. Bis v6.5.2 endete sie in der App und kam
        // im PDF nicht vor — eine freigegebene Woche druckte exakt wie eine, die
        // nie jemand gesehen hat. Genau die Information, fuer die der ganze
        // Freigabe-Weg existiert, fiel beim Ausdruck weg.
        // `stale` = die Woche wurde nach dem Abzeichnen geaendert; dann darf die
        // alte Unterschrift NICHT aufs Blatt (sie deckt einen anderen Inhalt ab).
        approval: (report.approval && !report.approval.stale) ? report.approval : null
    };
}

function currentIhkModel(report) {
    const formId = document.getElementById('pdfFormular')?.value || 'dihk-w';
    const model = buildIhkFormModel(formId, buildIhkCtx(report));
    if (!document.getElementById('pdfOptCover')?.classList.contains('on')) model.cover = null;
    return model;
}

function updatePDFPreview() {
    _savePDFPersonalCfg();
    const report = _pdfCurrentId ? reports.find(r => r.id === _pdfCurrentId) : reports[0];
    if (!report) {
        document.getElementById('pdfDocPreview').innerHTML = '<div style="padding:30px;text-align:center;font-size:9px;color:#888;font-family:Arial">Kein Bericht ausgewählt</div>';
        return;
    }

    if (isFormStyle()) {
        document.getElementById('pdfDocPreview').innerHTML = ihkFormToHtml(currentIhkModel(report));
        return;
    }

    const name = escapeHtml(document.getElementById('pdfAzubiName').value) || 'Max Mustermann';
    const betrieb = escapeHtml(document.getElementById('pdfBetrieb').value) || 'Ausbildungsbetrieb';
    const ausbilder = escapeHtml(document.getElementById('pdfAusbilder').value) || 'Ausbilder/in';
    const beruf = escapeHtml(document.getElementById('pdfBeruf').value) || escapeHtml(report.department || '') || 'Ausbildungsberuf';

    const showSig = document.getElementById('pdfOptSig')?.classList.contains('on');
    const showSchool = document.getElementById('pdfOptSchool')?.classList.contains('on');
    const showFooter = document.getElementById('pdfOptFooter')?.classList.contains('on');
    const showHours = document.getElementById('pdfOptHours')?.classList.contains('on');

    const statusLabel = { incomplete: 'Entwurf', complete: 'Vollständig', signed: 'Unterschrieben' }[report.status] || 'Entwurf';

    // Build activities rows
    let activityRows = '';
    if (report.mode === 'daily' && report.dailyActivities) {
        DAYS_ORDER.forEach(key => {
            const text = report.dailyActivities[key];
            if (!text) return;
            const hrs = report.dailyHours ? report.dailyHours[key] : null;
            const firstLine = text.split('\n')[0].replace(/^[•\-]\s*/, '').substring(0, 65);
            activityRows += `<tr>
                        <td class="doc-day-label">${DAYS_MAP[key]}</td>
                        <td>${escapeHtml(firstLine)}${text.split('\n').length > 1 ? '…' : ''}</td>
                        ${showHours ? `<td class="doc-hours-label">${hrs ? hrs + 'h' : ''}</td>` : ''}
                    </tr>`;
        });
    } else if (report.activities) {
        const lines = report.activities.split('\n').slice(0, 5);
        lines.forEach((line, i) => {
            const day = DAYS_ORDER[i];
            const dayName = DAYS_MAP[day] || `Tag ${i + 1}`;
            activityRows += `<tr>
                        <td class="doc-day-label">${dayName}</td>
                        <td>${escapeHtml(line.replace(/^[•\-]\s*/, '').substring(0, 65))}</td>
                        ${showHours ? '<td class="doc-hours-label"></td>' : ''}
                    </tr>`;
        });
    }

    const schoolHtml = showSchool && report.school ? `
                <div class="doc-school">
                    <div class="doc-school-head">Berufsschule</div>
                    <div class="doc-school-body">${escapeHtml(report.school.split('\n')[0].substring(0, 120))}${report.school.length > 120 ? '…' : ''}</div>
                </div>` : '';

    const sigHtml = showSig ? `
                <div class="doc-sig">
                    <div><div class="doc-sig-line"></div><div class="doc-sig-label">Auszubildende/r — Datum &amp; Unterschrift</div></div>
                    <div><div class="doc-sig-line"></div><div class="doc-sig-label">Ausbilder/in — Datum &amp; Unterschrift</div></div>
                </div>` : '';

    const footerHtml = showFooter ? `
                <div class="doc-footer">MyWorkLog · Erstellt am ${new Date().toLocaleDateString((window.mwlLocale ? window.mwlLocale() : document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE'))} · Ausbildungsnachweis gem. §14 BBiG</div>` : '';

    document.getElementById('pdfDocPreview').innerHTML = `
                <div class="doc-header">
                    <div class="doc-header-org">Industrie- und Handelskammer</div>
                    <div class="doc-header-title">AUSBILDUNGSNACHWEIS</div>
                    <div class="doc-header-sub">Wöchentlicher Bericht gem. §14 BBiG · ${statusLabel}</div>
                    <div class="doc-kw-badge">
                        <div class="doc-kw-num">KW${report.week}</div>
                        <div class="doc-kw-label">Kalenderwoche</div>
                    </div>
                </div>
                <div class="doc-gold-bar"></div>
                <div class="doc-info-grid">
                    <div class="doc-info-cell"><div class="doc-info-key">Auszubildende/r</div><div class="doc-info-val">${name}</div></div>
                    <div class="doc-info-cell"><div class="doc-info-key">Ausbildungsbetrieb</div><div class="doc-info-val">${betrieb}</div></div>
                    <div class="doc-info-cell"><div class="doc-info-key">Zeitraum</div><div class="doc-info-val">${formatDate(report.dateFrom)} – ${formatDate(report.dateTo)}</div></div>
                    <div class="doc-info-cell"><div class="doc-info-key">Beruf / Abteilung</div><div class="doc-info-val">${beruf}</div></div>
                </div>
                <div class="doc-section" style="margin-top:12px;">
                    <div class="doc-section-head">Ausgeführte Tätigkeiten / Betrieb</div>
                    <table class="doc-table">
                        <thead><tr>
                            <th>Tag</th><th>Tätigkeit</th>${showHours ? '<th>Std.</th>' : ''}
                        </tr></thead>
                        <tbody>${activityRows || '<tr><td colspan="3" style="color:#aaa;font-style:italic;padding:10px 8px;font-size:7px;">Keine Tätigkeiten eingetragen</td></tr>'}</tbody>
                    </table>
                </div>
                ${schoolHtml}
                ${sigHtml}
                ${footerHtml}
            `;
}

function executePDFExport() {
    _savePDFPersonalCfg();
    const targetId = _pdfCurrentId || (reports[0] ? reports[0].id : null);
    if (!targetId) {
        showToast('Keine Berichte vorhanden.', 'info');
        return;
    }
    exportReportPDFCore(targetId);
}

function executePDFExportAll() {
    if (reports.length === 0) {
        showToast('Keine Berichte vorhanden.', 'info');
        return;
    }
    let delay = 0;
    const sorted = [...reports].sort((a, b) => a.year !== b.year ? a.year - b.year : a.week - b.week);
    sorted.forEach((r, i) => {
        setTimeout(() => exportReportPDFCore(r.id), delay);
        delay += 450;
    });
    showToast(`${sorted.length} Berichte werden exportiert...`, 'info');
}

