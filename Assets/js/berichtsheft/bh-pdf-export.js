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
    showToast(L('PDF exportiert', 'PDF exported'), 'success');
}

// ── RENDER SINGLE REPORT ───────────────────────────────────────────────
function renderSingleReportToDoc(doc, report) {
    const PH = doc.internal.pageSize.getHeight(); // 297
    const PW = doc.internal.pageSize.getWidth();  // 210
    const ML = 14, MR = 14, CW = PW - ML - MR;  // margins + content width

    // ── Read modal config ──────────────────────────────────────────────────
    const pdfStyle = _pdfCurrentStyle || 'ihk';
    const azubiName = document.getElementById('pdfAzubiName')?.value?.trim() || '—';
    const betrieb = document.getElementById('pdfBetrieb')?.value?.trim() || '—';
    const ausbilder = document.getElementById('pdfAusbilder')?.value?.trim() || '—';
    const beruf = document.getElementById('pdfBeruf')?.value?.trim() || report.department || '—';
    const optSig = document.getElementById('pdfOptSig')?.classList.contains('on');
    const optSchool = document.getElementById('pdfOptSchool')?.classList.contains('on');
    const optFooter = document.getElementById('pdfOptFooter')?.classList.contains('on');
    const optHours = document.getElementById('pdfOptHours')?.classList.contains('on');
    const statusLabel = { incomplete: 'Entwurf', complete: 'Vollständig', signed: 'Unterschrieben' }[report.status] || 'Entwurf';

    // ── THEME TOKENS ──────────────────────────────────────────────────────
    const THEMES = {
        ihk: {
            pageBg: null,              // white (default)
            hdrBg: [0, 52, 120],      // #003478
            hdrTitle: [255, 255, 255],
            hdrSub: [180, 205, 245],
            accentBarFn: () => {            // Gold bar
                doc.setFillColor(255, 215, 0);
                doc.rect(0, 0, PW, 2.5, 'F');
            },
            kwColor: [255, 255, 255],
            kwAlpha: 0.1,               // ghost
            infoBg: [238, 242, 248],     // #eef2f8
            infoKeyC: [0, 52, 120],
            infoValC: [26, 26, 46],
            infoBorderC: [208, 216, 232],
            sectionBg: [0, 52, 120],
            sectionText: [255, 255, 255],
            rowA: [255, 255, 255],
            rowB: [245, 248, 254],
            rowBorderC: [220, 228, 244],
            dayLabelC: [0, 52, 120],
            bodyTextC: [30, 30, 55],
            hoursC: [100, 120, 160],
            schoolBodyBg: [240, 246, 255],
            schoolTextC: [30, 30, 55],
            sigLineC: [0, 52, 120],
            sigTextC: [80, 100, 140],
            footerC: [160, 170, 195],
        },
        modern: {
            pageBg: [13, 11, 26],        // #0d0b1a — fill whole page!
            hdrBg: [13, 11, 26],
            hdrTitle: [255, 255, 255],
            hdrSub: [150, 110, 220],
            accentBarFn: () => {            // Purple→Cyan gradient (25 segments)
                const segs = 25;
                const segW = PW / segs;
                for (let i = 0; i < segs; i++) {
                    const t = i / (segs - 1);
                    const r = Math.round(168 + (6 - 168) * t);
                    const g = Math.round(85 + (182 - 85) * t);
                    const b = Math.round(247 + (212 - 247) * t);
                    doc.setFillColor(r, g, b);
                    doc.rect(i * segW, 0, segW + 0.5, 2.5, 'F');
                }
            },
            kwColor: [168, 85, 247],
            kwAlpha: 0.12,
            infoBg: [26, 21, 53],        // #1a1535
            infoKeyC: [168, 85, 247],
            infoValC: [220, 215, 235],
            infoBorderC: [55, 44, 100],
            sectionBg: null,              // no filled bar — underline only
            sectionText: [168, 85, 247],
            rowA: [18, 15, 38],
            rowB: [24, 20, 50],
            rowBorderC: [42, 35, 85],
            dayLabelC: [168, 85, 247],
            bodyTextC: [185, 180, 210],
            hoursC: [103, 232, 249],
            schoolBodyBg: [16, 13, 34],
            schoolTextC: [150, 220, 245],
            sigLineC: [80, 60, 140],
            sigTextC: [130, 110, 190],
            footerC: [70, 60, 110],
        },
        clean: {
            pageBg: null,              // white
            hdrBg: [248, 249, 250],     // #f8f9fa
            hdrTitle: [26, 26, 26],
            hdrSub: [120, 120, 120],
            accentBarFn: () => { },          // none — border only
            kwColor: [0, 0, 0],
            kwAlpha: 0.06,
            infoBg: [255, 255, 255],
            infoKeyC: [100, 100, 100],
            infoValC: [26, 26, 26],
            infoBorderC: [200, 200, 200],
            sectionBg: [240, 240, 240],
            sectionText: [26, 26, 26],
            rowA: [255, 255, 255],
            rowB: [249, 249, 249],
            rowBorderC: [220, 220, 220],
            dayLabelC: [26, 26, 26],
            bodyTextC: [60, 60, 60],
            hoursC: [130, 130, 130],
            schoolBodyBg: [255, 255, 255],
            schoolTextC: [60, 60, 60],
            sigLineC: [26, 26, 26],
            sigTextC: [100, 100, 100],
            footerC: [170, 170, 170],
        },
    };
    const T = THEMES[pdfStyle] || THEMES.ihk;

    // ── HELPERS ────────────────────────────────────────────────────────────
    const DAYS_FULL = { monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch', thursday: 'Donnerstag', friday: 'Freitag' };
    const DAYS_ORD = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    function newPage() {
        doc.addPage();
        if (T.pageBg) { doc.setFillColor(...T.pageBg); doc.rect(0, 0, PW, PH, 'F'); }
        return 15;
    }

    function sectionHead(label, yy) {
        if (T.sectionBg) {
            doc.setFillColor(...T.sectionBg);
            doc.rect(ML, yy, CW, 7, 'F');
            doc.setFontSize(6.5); doc.setFont(undefined, 'bold');
            doc.setTextColor(...T.sectionText);
            doc.text(label, ML + 3, yy + 4.8);
            return yy + 9;
        } else {
            // Modern: colored text + underline, no bg
            doc.setFontSize(6.5); doc.setFont(undefined, 'bold');
            doc.setTextColor(...T.sectionText);
            doc.text(label, ML, yy + 4);
            doc.setDrawColor(...T.sectionText);
            doc.setLineWidth(0.25);
            doc.line(ML, yy + 5.5, ML + CW, yy + 5.5);
            return yy + 9;
        }
    }

    // ── 1. FILL PAGE BACKGROUND (Modern Dark only) ────────────────────────
    if (T.pageBg) {
        doc.setFillColor(...T.pageBg);
        doc.rect(0, 0, PW, PH, 'F');
    }

    // ── 2. ACCENT BAR (top 2.5mm, style-specific) ────────────────────────
    T.accentBarFn();

    // ── 3. HEADER BACKGROUND ─────────────────────────────────────────────
    doc.setFillColor(...T.hdrBg);
    doc.rect(0, 2.5, PW, 42, 'F');

    // Clean: thick black border under header
    if (pdfStyle === 'clean') {
        doc.setDrawColor(26, 26, 26);
        doc.setLineWidth(0.9);
        doc.line(0, 44.5, PW, 44.5);
    }

    // ── 4. HEADER TEXT ────────────────────────────────────────────────────
    doc.setFontSize(7); doc.setFont(undefined, 'normal');
    doc.setTextColor(...T.hdrSub);
    const orgLabel = pdfStyle === 'ihk' ? 'INDUSTRIE- UND HANDELSKAMMER' : pdfStyle === 'modern' ? 'MYWORKLOG AUSBILDUNGSPORTAL' : 'AUSBILDUNGSNACHWEIS';
    doc.text(orgLabel, ML, 16);

    doc.setFontSize(19); doc.setFont(undefined, 'bold');
    doc.setTextColor(...T.hdrTitle);
    doc.text('AUSBILDUNGSNACHWEIS', ML, 27);

    doc.setFontSize(8); doc.setFont(undefined, 'normal');
    doc.setTextColor(...T.hdrSub);
    doc.text(`${statusLabel}  ·  ${report.year}. Ausbildungsjahr  ·  gem. §14 BBiG`, ML, 37);

    // ── 5. KW GHOST NUMBER ────────────────────────────────────────────────
    // Simulate transparency by blending with background color
    const bgBlend = T.pageBg || [255, 255, 255];
    const a = T.kwAlpha;
    const kwR = Math.round(T.kwColor[0] * a + bgBlend[0] * (1 - a));
    const kwG = Math.round(T.kwColor[1] * a + bgBlend[1] * (1 - a));
    const kwB = Math.round(T.kwColor[2] * a + bgBlend[2] * (1 - a));
    // Blend with header bg instead
    const hA = T.kwAlpha;
    const kwR2 = Math.round(T.kwColor[0] * hA + T.hdrBg[0] * (1 - hA));
    const kwG2 = Math.round(T.kwColor[1] * hA + T.hdrBg[1] * (1 - hA));
    const kwB2 = Math.round(T.kwColor[2] * hA + T.hdrBg[2] * (1 - hA));
    doc.setFontSize(26); doc.setFont(undefined, 'bold');
    doc.setTextColor(kwR2, kwG2, kwB2);
    doc.text(`KW${report.week}`, PW - MR, 33, { align: 'right' });

    // ── 6. INFO GRID ──────────────────────────────────────────────────────
    let y = 51;
    const cellW4 = CW / 4;
    const gridH = 17;
    const infoFields = [
        { label: 'Auszubildende/r', value: azubiName },
        { label: 'Ausbildungsbetrieb', value: betrieb },
        { label: 'Zeitraum', value: `${formatDate(report.dateFrom)} – ${formatDate(report.dateTo)}` },
        { label: 'Beruf / Abteilung', value: beruf },
    ];

    if (pdfStyle === 'modern') {
        // Individual cards with gap
        infoFields.forEach((f, i) => {
            const cx = ML + i * cellW4;
            doc.setFillColor(...T.infoBg);
            doc.rect(cx, y, cellW4 - 1.5, gridH, 'F');
            doc.setDrawColor(...T.infoBorderC);
            doc.setLineWidth(0.2);
            doc.rect(cx, y, cellW4 - 1.5, gridH, 'S');
            doc.setFontSize(5.5); doc.setFont(undefined, 'bold');
            doc.setTextColor(...T.infoKeyC);
            doc.text(f.label.toUpperCase(), cx + 2.5, y + 5.5);
            doc.setFontSize(7.5); doc.setFont(undefined, 'bold');
            doc.setTextColor(...T.infoValC);
            const v = f.value.length > 24 ? f.value.substring(0, 22) + '…' : f.value;
            doc.text(v, cx + 2.5, y + 13);
        });
    } else {
        // Unified bordered grid with dividers
        doc.setFillColor(...T.infoBg);
        doc.rect(ML, y, CW, gridH, 'F');
        doc.setDrawColor(...T.infoBorderC);
        doc.setLineWidth(0.2);
        doc.rect(ML, y, CW, gridH, 'S');
        infoFields.forEach((f, i) => {
            const cx = ML + i * cellW4;
            if (i > 0) { doc.setDrawColor(...T.infoBorderC); doc.line(cx, y, cx, y + gridH); }
            doc.setFontSize(5.5); doc.setFont(undefined, 'bold');
            doc.setTextColor(...T.infoKeyC);
            doc.text(f.label.toUpperCase(), cx + 2.5, y + 5.5);
            doc.setFontSize(7.5); doc.setFont(undefined, 'bold');
            doc.setTextColor(...T.infoValC);
            const v = f.value.length > 24 ? f.value.substring(0, 22) + '…' : f.value;
            doc.text(v, cx + 2.5, y + 13);
        });
    }
    y += gridH + 6;

    // ── 7. ACTIVITIES TABLE ───────────────────────────────────────────────
    y = sectionHead('AUSGEFÜHRTE TÄTIGKEITEN — BETRIEB', y);

    // Table col-header
    doc.setFillColor(...T.rowB);
    doc.rect(ML, y, CW, 6, 'F');
    doc.setDrawColor(...T.rowBorderC); doc.setLineWidth(0.15);
    doc.rect(ML, y, CW, 6, 'S');
    doc.setFontSize(5.5); doc.setFont(undefined, 'bold');
    doc.setTextColor(...T.infoKeyC);
    doc.text('TAG', ML + 2, y + 4);
    doc.text('TÄTIGKEIT', ML + 27, y + 4);
    if (optHours) doc.text('STD.', ML + CW - 2, y + 4, { align: 'right' });
    y += 7;

    let rowFlip = false;

    function drawRow(dayName, text, hrs) {
        const lines = doc.splitTextToSize(text.trim(), CW - 30);
        const rH = Math.max(9, lines.length * 4.8 + 4);
        if (y + rH > PH - 48) y = newPage();

        doc.setFillColor(...(rowFlip ? T.rowB : T.rowA));
        doc.rect(ML, y, CW, rH, 'F');
        doc.setDrawColor(...T.rowBorderC); doc.setLineWidth(0.12);
        doc.rect(ML, y, CW, rH, 'S');
        // Divider between day and text cols
        doc.line(ML + 24, y, ML + 24, y + rH);

        // Day name
        doc.setFontSize(7.5); doc.setFont(undefined, 'bold');
        doc.setTextColor(...T.dayLabelC);
        doc.text(dayName, ML + 1.5, y + rH / 2 + 1.5, { baseline: 'middle' });

        // Text
        doc.setFont(undefined, 'normal'); doc.setFontSize(8);
        doc.setTextColor(...T.bodyTextC);
        lines.forEach((ln, li) => doc.text(ln, ML + 26, y + 5.5 + li * 4.8));

        // Hours
        if (optHours && hrs) {
            doc.setFontSize(7); doc.setTextColor(...T.hoursC);
            doc.text(hrs + 'h', ML + CW - 2, y + rH / 2 + 1.5, { align: 'right', baseline: 'middle' });
        }
        y += rH;
        rowFlip = !rowFlip;
    }

    if (report.mode === 'daily' && report.dailyActivities) {
        DAYS_ORD.forEach(dk => {
            const txt = report.dailyActivities[dk];
            if (!txt) return;
            drawRow(DAYS_FULL[dk], txt, report.dailyHours?.[dk] || null);
        });
    } else if (report.activities) {
        report.activities.split('\n').filter(l => l.trim()).slice(0, 5).forEach((ln, i) => {
            drawRow(Object.values(DAYS_FULL)[i] || `Tag ${i + 1}`, ln, null);
        });
    }

    // ── 8. SCHOOL SECTION ─────────────────────────────────────────────────
    if (optSchool && report.school) {
        y += 5;
        if (y > PH - 60) y = newPage();
        y = sectionHead('BERUFSSCHULE', y);
        const sLines = doc.splitTextToSize(report.school.trim(), CW - 6);
        const sH = Math.max(14, sLines.length * 5 + 6);
        doc.setFillColor(...T.schoolBodyBg);
        doc.rect(ML, y, CW, sH, 'F');
        doc.setDrawColor(...T.rowBorderC); doc.setLineWidth(0.12);
        doc.rect(ML, y, CW, sH, 'S');
        doc.setFontSize(8.5); doc.setFont(undefined, 'normal');
        doc.setTextColor(...T.schoolTextC);
        sLines.forEach((ln, li) => {
            if (y + 5 + li * 5 < PH - 10) doc.text(ln, ML + 3, y + 5.5 + li * 5);
        });
        y += sH;
    }

    // ── 9. SIGNATURE ──────────────────────────────────────────────────────
    if (optSig) {
        const sigY = Math.max(y + 12, PH - 42);
        doc.setDrawColor(...T.sigLineC);
        doc.setLineWidth(0.7);
        doc.line(ML, sigY, PW - MR, sigY);
        doc.setFontSize(7); doc.setFont(undefined, 'bold');
        doc.setTextColor(...T.sigTextC);
        doc.text(azubiName, ML, sigY + 7);
        doc.setFont(undefined, 'normal'); doc.setFontSize(6.5);
        doc.text('Datum: ___________    Unterschrift: _______________________', ML, sigY + 13);
        doc.setFont(undefined, 'bold'); doc.setFontSize(7);
        doc.text(ausbilder, PW / 2 + 4, sigY + 7);
        doc.setFont(undefined, 'normal'); doc.setFontSize(6.5);
        doc.text('Datum: ___________    Unterschrift: _______________________', PW / 2 + 4, sigY + 13);
    }

    // ── 10. FOOTER ────────────────────────────────────────────────────────
    if (optFooter) {
        doc.setFontSize(6); doc.setFont(undefined, 'normal');
        doc.setTextColor(...T.footerC);
        doc.text(
            `MyWorkLog · Ausbildungsnachweis KW${report.week}/${report.year} · Erstellt: ${new Date().toLocaleDateString((window.mwlLocale ? window.mwlLocale() : document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE'))} · §14 BBiG`,
            PW / 2, PH - 5, { align: 'center' }
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
    document.body.removeChild(overlay);
    showToast(bulkReports.length === 1
        ? L('1 Woche als Bulk-PDF exportiert', '1 week exported as a bulk PDF')
        : L(`${bulkReports.length} Wochen als Bulk-PDF exportiert`, `${bulkReports.length} weeks exported as a bulk PDF`), 'success');
}

