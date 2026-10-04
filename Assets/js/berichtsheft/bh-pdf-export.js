// ═══ BH-PDF-EXPORT ═══
// Die eigentliche PDF-Erzeugung mit jsPDF — Einzelbericht, Sammelexport,
// Jahres-Zusammenfassung.
// jsPDF-Standardschriften koennen nur WinAnsi: keine Haken, Pfeile oder
// Emojis in den Text geben, die kommen als falsches Glyph heraus.
// Herausgeloest aus pages/berichtsheft/index.html.

// MAIN EXPORT FUNCTION — opens modal
function exportReportPDF(id) {
    openPDFModal(id);
}

// CORE PDF GENERATION (called after modal confirmation)
function exportReportPDFCore(id) {

    const report = reports.find(r => r.id === id);
    if (!report) return;

    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
        showToast(L('PDF nicht verfügbar. Nutze die Druckfunktion.', 'PDF not available. Use the print function.'), 'error');
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const isForm = isFormStyle();
    if (isForm && typeof ihkFormToPdf === 'function') {
        const model = currentIhkModel(report);
        ihkFormToPdf(doc, model);
    } else {
        renderSingleReportToDoc(doc, report);
    }

    doc.save(`Ausbildungsnachweis_KW${report.week}_${report.year}.pdf`);
    if (typeof mwlEvent === 'function') mwlEvent('berichtsheft', { aktion: 'pdf_einzeln', vordruck: !!isForm });
    showToast(L('PDF exportiert', 'PDF exported'), 'success');
}

// ── RENDER SINGLE REPORT ───────────────────────────────────────────────
// Drei freie Vorlagen: "klassisch" und "klar" sind Papier ohne Farbflaechen
// (seit v8.1.2, ersetzen "IHK Classic" und "Modern Dark" — der Nutzer fand die
// blau-goldene und die dunkle Fassung zu laut). "clean" (Schlicht) zeichnet
// weiter mit grauem Kopf und Kaesten.
function renderSingleReportToDoc(doc, report) {
    const PH = doc.internal.pageSize.getHeight(); // 297
    const PW = doc.internal.pageSize.getWidth();  // 210
    const ML = 14, MR = 14, CW = PW - ML - MR;

    const pdfStyle = ['klassisch', 'klar', 'clean'].includes(_pdfCurrentStyle) ? _pdfCurrentStyle : 'klar';
    const azubiName = document.getElementById('pdfAzubiName')?.value?.trim() || '—';
    const betrieb = document.getElementById('pdfBetrieb')?.value?.trim() || '—';
    const ausbilder = document.getElementById('pdfAusbilder')?.value?.trim() || '—';
    const beruf = document.getElementById('pdfBeruf')?.value?.trim() || report.department || '—';
    const optSig = document.getElementById('pdfOptSig')?.classList.contains('on');
    const optSchool = document.getElementById('pdfOptSchool')?.classList.contains('on');
    const optFooter = document.getElementById('pdfOptFooter')?.classList.contains('on');
    const optHours = document.getElementById('pdfOptHours')?.classList.contains('on');
    const statusLabel = { incomplete: 'Entwurf', complete: 'Vollständig', signed: 'Unterschrieben' }[report.status] || 'Entwurf';
    const zeitraum = `${formatDate(report.dateFrom)} – ${formatDate(report.dateTo)}`;

    const THEMES = {
        klassisch: {
            font: 'times', ink: [28, 35, 51], text: [45, 52, 68], muted: [105, 112, 128],
            accent: [28, 35, 51], hair: [214, 218, 226], footer: [150, 156, 168],
            body: 10, lh: 4.9, dayW: 28
        },
        klar: {
            font: 'helvetica', ink: [23, 32, 51], text: [51, 65, 85], muted: [100, 116, 139],
            accent: [47, 95, 138], hair: [226, 232, 240], footer: [160, 170, 185],
            body: 8.8, lh: 4.6, dayW: 28
        },
        clean: {
            font: 'helvetica', ink: [26, 26, 26], text: [60, 60, 60], muted: [100, 100, 100],
            accent: [26, 26, 26], hair: [220, 220, 220], footer: [170, 170, 170],
            body: 8, lh: 4.8, dayW: 26,
            hdrBg: [248, 249, 250], sectionBg: [240, 240, 240], rowB: [249, 249, 249], box: [200, 200, 200]
        }
    };
    const T = THEMES[pdfStyle];
    const F = T.font;
    const isClean = pdfStyle === 'clean';
    const font = (style, size, color) => {
        doc.setFont(F, style); doc.setFontSize(size); doc.setTextColor(...color);
    };
    // Einzeilig kuerzen statt ueberlaufen — am Wortlaut gemessen, nicht an Zeichen.
    const fit = (txt, w) => {
        const lines = doc.splitTextToSize(String(txt), w);
        return lines.length > 1 ? lines[0].replace(/\s*\S{0,3}$/, '') + '…' : lines[0];
    };

    const DAYS_FULL = { monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch', thursday: 'Donnerstag', friday: 'Freitag' };
    const DAYS_ORD = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    function newPage() { doc.addPage(); return 18; }

    function sectionHead(label, yy) {
        if (isClean) {
            doc.setFillColor(...T.sectionBg);
            doc.rect(ML, yy, CW, 7, 'F');
            font('bold', 6.5, T.ink);
            doc.text(label.toUpperCase(), ML + 3, yy + 4.8);
            return yy + 9;
        }
        if (pdfStyle === 'klassisch') {
            font('bold', 11, T.ink);
            doc.text(label, ML, yy + 5);
            doc.setDrawColor(...T.ink); doc.setLineWidth(0.3);
            doc.line(ML, yy + 7.2, ML + CW, yy + 7.2);
        } else {
            font('bold', 9, T.accent);
            doc.text(label, ML, yy + 5);
            doc.setDrawColor(...T.hair); doc.setLineWidth(0.25);
            doc.line(ML, yy + 7.5, ML + CW, yy + 7.5);
        }
        return yy + 12;
    }

    // ── KOPF ──────────────────────────────────────────────────────────────
    let y;
    if (isClean) {
        doc.setFillColor(...T.hdrBg);
        doc.rect(0, 2.5, PW, 42, 'F');
        doc.setDrawColor(26, 26, 26); doc.setLineWidth(0.9);
        doc.line(0, 44.5, PW, 44.5);
        font('bold', 19, T.ink);
        doc.text('AUSBILDUNGSNACHWEIS', ML, 27);
        font('normal', 8, [120, 120, 120]);
        doc.text(`${statusLabel}  ·  ${report.year}. Ausbildungsjahr  ·  gem. §14 BBiG`, ML, 37);
        font('bold', 26, [233, 234, 235]);
        doc.text(`KW${report.week}`, PW - MR, 33, { align: 'right' });
        y = 51;
    } else if (pdfStyle === 'klassisch') {
        font('bold', 21, T.ink);
        doc.text('Ausbildungsnachweis', PW / 2, 24, { align: 'center' });
        font('italic', 10, T.muted);
        doc.text(`Kalenderwoche ${report.week}  ·  ${zeitraum}`, PW / 2, 31.5, { align: 'center' });
        font('normal', 8.5, T.muted);
        doc.text(`${report.year}. Ausbildungsjahr  ·  ${statusLabel}  ·  gemäß § 14 BBiG`, PW / 2, 37, { align: 'center' });
        doc.setDrawColor(...T.ink);
        doc.setLineWidth(0.6); doc.line(ML, 42, PW - MR, 42);
        doc.setLineWidth(0.2); doc.line(ML, 43.3, PW - MR, 43.3);
        y = 51;
    } else {
        font('bold', 18, T.ink);
        doc.text('Ausbildungsnachweis', ML, 22);
        font('bold', 18, T.accent);
        doc.text(`KW ${report.week}`, PW - MR, 22, { align: 'right' });
        font('normal', 8.5, T.muted);
        doc.text(`${zeitraum}  ·  ${report.year}. Ausbildungsjahr  ·  ${statusLabel}`, ML, 29);
        doc.text('§ 14 BBiG', PW - MR, 29, { align: 'right' });
        doc.setDrawColor(...T.hair); doc.setLineWidth(0.25);
        doc.line(ML, 34, PW - MR, 34);
        doc.setDrawColor(...T.accent); doc.setLineWidth(0.9);
        doc.line(ML, 34, ML + 18, 34);
        y = 42;
    }

    // ── ANGABEN ───────────────────────────────────────────────────────────
    const infoFields = [
        { label: 'Auszubildende/r', value: azubiName },
        { label: 'Ausbildungsbetrieb', value: betrieb },
        { label: 'Zeitraum', value: zeitraum },
        { label: 'Beruf / Abteilung', value: beruf },
    ];
    if (isClean) {
        const cellW4 = CW / 4, gridH = 17;
        doc.setDrawColor(...T.box); doc.setLineWidth(0.2);
        doc.rect(ML, y, CW, gridH, 'S');
        infoFields.forEach((f, i) => {
            const cx = ML + i * cellW4;
            if (i > 0) doc.line(cx, y, cx, y + gridH);
            font('bold', 5.5, T.muted);
            doc.text(f.label.toUpperCase(), cx + 2.5, y + 5.5);
            font('bold', 7.5, T.ink);
            doc.text(fit(f.value, cellW4 - 5), cx + 2.5, y + 13);
        });
        y += gridH + 6;
    } else if (pdfStyle === 'klassisch') {
        // Ohne Zeitraum: der steht schon unter dem Titel.
        const felder = [infoFields[0], infoFields[1], infoFields[3], { label: 'Ausbilder/in', value: ausbilder }];
        const colW = CW / 2;
        felder.forEach((f, i) => {
            const cx = ML + (i % 2) * colW, cy = y + Math.floor(i / 2) * 12;
            font('italic', 8.5, T.muted);
            doc.text(f.label, cx, cy);
            font('bold', 10.5, T.ink);
            doc.text(fit(f.value, colW - 6), cx, cy + 5.2);
        });
        y += 24 + 2;
    } else {
        const felder = [infoFields[0], infoFields[1], infoFields[3], { label: 'Ausbilder/in', value: ausbilder }];
        const colW = CW / 4;
        felder.forEach((f, i) => {
            const cx = ML + i * colW;
            font('normal', 7, T.muted);
            doc.text(f.label, cx, y);
            font('bold', 8.5, T.ink);
            doc.text(fit(f.value, colW - 4), cx, y + 5);
        });
        y += 14;
    }

    // ── TAETIGKEITEN ──────────────────────────────────────────────────────
    y = sectionHead(isClean ? 'Ausgeführte Tätigkeiten — Betrieb' : 'Ausgeführte Tätigkeiten im Betrieb', y);

    if (isClean) {
        doc.setFillColor(...T.rowB);
        doc.rect(ML, y, CW, 6, 'F');
        doc.setDrawColor(...T.hair); doc.setLineWidth(0.15);
        doc.rect(ML, y, CW, 6, 'S');
        font('bold', 5.5, T.muted);
        doc.text('TAG', ML + 2, y + 4);
        doc.text('TÄTIGKEIT', ML + 27, y + 4);
        if (optHours) doc.text('STD.', ML + CW - 2, y + 4, { align: 'right' });
        y += 7;
    }

    let rowFlip = false;
    const textX = ML + T.dayW;
    const textW = CW - T.dayW - (optHours ? 12 : 2);

    function drawRow(dayName, text, hrs) {
        font('normal', T.body, T.text);
        const lines = doc.splitTextToSize(text.trim(), textW);
        const rH = Math.max(isClean ? 9 : 8, lines.length * T.lh + (isClean ? 4 : 3.5));
        if (y + rH > PH - 48) y = newPage();

        if (isClean) {
            doc.setFillColor(...(rowFlip ? T.rowB : [255, 255, 255]));
            doc.rect(ML, y, CW, rH, 'F');
            doc.setDrawColor(...T.hair); doc.setLineWidth(0.12);
            doc.rect(ML, y, CW, rH, 'S');
            doc.line(ML + 24, y, ML + 24, y + rH);
        } else {
            doc.setDrawColor(...T.hair); doc.setLineWidth(0.2);
            doc.line(ML, y + rH, ML + CW, y + rH);
        }

        // Tag und erste Textzeile auf einer Grundlinie — bei mehrzeiligen
        // Eintraegen steht der Tag oben, nicht in der Mitte.
        const base = y + (isClean ? 5.5 : 5);
        font('bold', isClean ? 7.5 : T.body, isClean ? T.ink : T.ink);
        doc.text(dayName, ML + (isClean ? 1.5 : 0), base);

        font('normal', T.body, T.text);
        lines.forEach((ln, li) => doc.text(ln, textX, base + li * T.lh));

        if (optHours && hrs) {
            font('normal', isClean ? 7 : T.body - 1, T.muted);
            doc.text(hrs + ' h', ML + CW - (isClean ? 2 : 0), base, { align: 'right' });
        }
        y += rH;
        rowFlip = !rowFlip;
    }

    if (report.mode === 'daily' && report.dailyActivities) {
        DAYS_ORD.forEach(dk => {
            let txt = report.dailyActivities[dk];
            if (!txt) return;
            // Schultag kenntlich machen — dailySchool kam in den freien Stilen
            // bis v7.2.4 gar nicht vor, der Ausbilder sah Schulstoff als
            // Betriebsarbeit. Die Tagesspalte ist schmal, also in den Text.
            if (report.dailySchool?.[dk] && !/^\s*(\[?Berufsschule\]?)/i.test(txt)) txt = 'Berufsschule: ' + txt;
            drawRow(DAYS_FULL[dk], txt, report.dailyHours?.[dk] || null);
        });
    } else if (report.activities) {
        report.activities.split('\n').filter(l => l.trim()).slice(0, 5).forEach((ln, i) => {
            drawRow(Object.values(DAYS_FULL)[i] || `Tag ${i + 1}`, ln, null);
        });
    }

    // ── BERUFSSCHULE ──────────────────────────────────────────────────────
    if (optSchool && report.school) {
        y += isClean ? 5 : 7;
        if (y > PH - 60) y = newPage();
        y = sectionHead('Berufsschule', y);
        const sz = isClean ? 8.5 : T.body;
        const lh = isClean ? 5 : T.lh;
        font('normal', sz, T.text);
        const sLines = doc.splitTextToSize(report.school.trim(), isClean ? CW - 6 : CW);
        const sH = Math.max(isClean ? 14 : 6, sLines.length * lh + (isClean ? 6 : 2));
        if (isClean) {
            doc.setDrawColor(...T.hair); doc.setLineWidth(0.12);
            doc.rect(ML, y, CW, sH, 'S');
        }
        const sx = isClean ? ML + 3 : ML;
        const sy = y + (isClean ? 5.5 : 3.5);
        sLines.forEach((ln, li) => {
            if (sy + li * lh < PH - 10) doc.text(ln, sx, sy + li * lh);
        });
        y += sH;
    }

    // ── UNTERSCHRIFTEN ────────────────────────────────────────────────────
    if (optSig) {
        const sigY = Math.max(y + 16, PH - 40);
        const half = (CW - 12) / 2;
        const ziel = [
            { x: ML, name: azubiName, rolle: 'Auszubildende/r' },
            { x: ML + half + 12, name: ausbilder, rolle: 'Ausbilder/in' },
        ];
        doc.setDrawColor(...(isClean ? T.ink : T.muted));
        doc.setLineWidth(isClean ? 0.4 : 0.25);
        ziel.forEach(s => {
            doc.line(s.x, sigY, s.x + half, sigY);
            font('bold', isClean ? 7 : T.body - 1, T.ink);
            doc.text(s.name, s.x, sigY + 5);
            font(pdfStyle === 'klassisch' ? 'italic' : 'normal', isClean ? 6.5 : T.body - 2, T.muted);
            doc.text(`Datum, Unterschrift ${s.rolle}`, s.x, sigY + 9.5);
        });
    }

    // ── FUSSZEILE ─────────────────────────────────────────────────────────
    if (optFooter) {
        font('normal', 6.5, T.footer);
        doc.text(
            `MyWorkLog  ·  Ausbildungsnachweis KW ${report.week}/${report.year}  ·  Erstellt am ${new Date().toLocaleDateString((window.mwlLocale ? window.mwlLocale() : document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE'))}  ·  § 14 BBiG`,
            PW / 2, PH - 6, { align: 'center' }
        );
    }
}

// ── BULK EXPORT ─────────────────────────────────────────────────────────
async function exportBulkPDFCore() {
    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
        showToast(L('PDF nicht verfügbar.', 'PDF not available.'), 'error');
        return;
    }
    
    // UI-Overlay fuer Loading State (muss sofort im DOM sein, bevor das schwere Fetching/Rendering anläuft)
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.color = 'white';
    overlay.style.fontFamily = 'inherit';
    
    const spinner = document.createElement('div');
    spinner.style.border = '4px solid rgba(255,255,255,0.1)';
    spinner.style.borderTop = '4px solid #fff';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '40px';
    spinner.style.height = '40px';
    spinner.style.animation = 'spin 1s linear infinite';
    spinner.style.marginBottom = '20px';
    
    if (!document.getElementById('bulk-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'bulk-spinner-style';
        style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }

    const progressText = document.createElement('div');
    progressText.id = 'pdfBulkProgress';
    progressText.textContent = L('Lade Daten aus der Cloud...', 'Loading data from the cloud …');
    
    overlay.appendChild(spinner);
    overlay.appendChild(progressText);
    document.body.appendChild(overlay);
    
    let bulkReports = [];
    try {
        // 1. Fetching von Supabase (Priorität, wenn angemeldet)
        if (window.BHB2B && BHB2B.angemeldet()) {
            const st = await BHB2B.status();
            if (st && st.rolle === 'azubi') {
                // Den vorhandenen Client nehmen, nie einen zweiten bauen
                // (Begruendung steht bei BHB2B.client).
                let sb = (window.cloudSync && window.cloudSync.client) || null;
                if (!sb && window.BHB2B && typeof BHB2B.client === 'function') {
                    sb = await BHB2B.client();
                }
                if (!sb) throw new Error('Supabase Client nicht bereit');
                const { data: { user } } = await sb.auth.getUser();
                if (user) {
                    const { data: berichte, error } = await sb.from('berichte')
                        .select('*')
                        .eq('azubi_id', user.id)
                        .in('status', ['complete', 'signed'])
                        .is('geloescht_at', null)
                        .order('datum_von', { ascending: true });
                    
                    if (!error && berichte) {
                        const approvals = await BHB2B.freigabenRunter();
                        bulkReports = berichte.map(row => {
                            const rep = Object.assign({
                                id: row.client_id,
                                year: row.jahr,
                                week: row.kw,
                                dateFrom: row.datum_von,
                                dateTo: row.datum_bis,
                                status: row.status,
                                source: row.quelle,
                                aiGenerated: row.ki_erzeugt
                            }, row.inhalt);
                            if (approvals[rep.id]) {
                                rep.approval = approvals[rep.id];
                            }
                            return rep;
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Bulk Fetch Error:', e);
    }

    // 2. Fallback auf lokale Reports
    if (bulkReports.length === 0) {
        bulkReports = [...(window.reports || [])]
            .filter(r => r.status === 'complete' || r.status === 'signed')
            .sort((a, b) => {
                const da = new Date(a.dateFrom || 0);
                const db = new Date(b.dateFrom || 0);
                return da - db;
            });
    }

    if (bulkReports.length === 0) {
        document.body.removeChild(overlay);
        showToast(L('Keine vollständigen oder unterschriebenen Berichte gefunden.',
            'No complete or signed reports found.'), 'error');
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let isFirstPage = true;
    const isForm = isFormStyle();
    
    // Kleiner Sleep für UI Updates
    const yieldUI = () => new Promise(r => setTimeout(r, 10));

    // 3. Rendering-Loop
    for (let i = 0; i < bulkReports.length; i++) {
        const report = bulkReports[i];
        progressText.textContent = L(`Generiere PDF: Woche ${i + 1} von ${bulkReports.length}...`,
            `Generating PDF: week ${i + 1} of ${bulkReports.length} …`);
        await yieldUI();

        if (!isFirstPage) {
            doc.addPage();
        }
        isFirstPage = false;

        if (isForm && typeof ihkFormToPdf === 'function') {
            const model = currentIhkModel(report);
            ihkFormToPdf(doc, model);
        } else {
            // Wir überschreiben die doc.save Funktion temporär, da renderSingleReportToDoc doc.save aufruft.
            const originalSave = doc.save;
            doc.save = function() {}; // No-op during bulk
            
            // UI Toasts während des Bulks unterdrücken
            const originalShowToast = window.showToast;
            window.showToast = function() {};

            renderSingleReportToDoc(doc, report);
            
            // Restore functions
            doc.save = originalSave;
            window.showToast = originalShowToast;
        }
    }

    progressText.textContent = L('Speichere PDF...', 'Saving PDF …');
    await yieldUI();

    doc.save(`Ausbildungsnachweis_Komplett.pdf`);
    if (typeof mwlEvent === 'function') mwlEvent('berichtsheft', { aktion: 'pdf_sammel', berichte: bulkReports.length });
    document.body.removeChild(overlay);
    showToast(bulkReports.length === 1
        ? L('1 Woche als Bulk-PDF exportiert', '1 week exported as a bulk PDF')
        : L(`${bulkReports.length} Wochen als Bulk-PDF exportiert`, `${bulkReports.length} weeks exported as a bulk PDF`), 'success');
}

