// ═══ IHK PDF IMPORT MODULE ═══
// Ermöglicht das Importieren von offiziellen IHK-PDF-Exporten in die MyWorkLog-App.
// Lädt pdf.js dynamisch vom CDN, parst den Text und mappt die Struktur in das 
// interne Berichtsheft-Datenmodell.

const IHK_PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const IHK_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let ihkParsedWeeks = [];
let ihkPdfLoaded = false;

// --- UI Steuerung ---

function openIhkImport() {
    const ov = document.getElementById('ihkImport');
    if (!ov) return;
    
    // Reset state
    ihkParsedWeeks = [];
    document.getElementById('ihkFileInput').value = '';
    document.getElementById('ihkError').style.display = 'none';
    ihkSetStep('start');
    
    // Show overlay
    ov.classList.add('active');
    
    // Load PDF.js if not already loaded
    if (!ihkPdfLoaded) {
        const script = document.createElement('script');
        script.src = IHK_PDFJS_URL;
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = IHK_WORKER_URL;
            ihkPdfLoaded = true;
        };
        document.head.appendChild(script);
    }
}

function closeIhkImport() {
    const ov = document.getElementById('ihkImport');
    if (ov) ov.classList.remove('active');
}

function ihkSetStep(step) {
    document.getElementById('ihkStep_start').style.display = step === 'start' ? 'block' : 'none';
    document.getElementById('ihkStep_busy').style.display = step === 'busy' ? 'block' : 'none';
    document.getElementById('ihkStep_result').style.display = step === 'result' ? 'block' : 'none';
}

function ihkShowError(msg) {
    const err = document.getElementById('ihkError');
    err.textContent = msg;
    err.style.display = 'block';
    ihkSetStep('start');
}

// --- Drag & Drop ---

function ihkInitDropzone() {
    const drop = document.getElementById('ihkDropzone');
    if (!drop) return;
    
    drop.addEventListener('dragover', e => {
        e.preventDefault();
        drop.classList.add('dragover');
    });
    
    drop.addEventListener('dragleave', e => {
        e.preventDefault();
        drop.classList.remove('dragover');
    });
    
    drop.addEventListener('drop', e => {
        e.preventDefault();
        drop.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            ihkHandleFile(e.dataTransfer.files[0]);
        }
    });
}

// Ensure dropzone events are bound when DOM is ready
document.addEventListener('DOMContentLoaded', ihkInitDropzone);

function ihkFileSelected(input) {
    if (input.files && input.files.length > 0) {
        ihkHandleFile(input.files[0]);
    }
}

// --- Parsing Logik ---

async function ihkHandleFile(file) {
    if (file.type !== 'application/pdf') {
        ihkShowError('Bitte eine PDF-Datei auswählen.');
        return;
    }

    if (!ihkPdfLoaded || !window.pdfjsLib) {
        ihkShowError('PDF-Engine wird noch geladen. Bitte einen Moment warten und erneut versuchen.');
        return;
    }

    document.getElementById('ihkError').style.display = 'none';
    ihkSetStep('busy');
    document.getElementById('ihkBar').style.width = '10%';

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        document.getElementById('ihkBar').style.width = '40%';
        
        let allPagesText = [];
        
        // Extrahiere Text aus allen Seiten, behalte Struktur durch Newlines grob bei
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Text sortieren nach Y-Position (von oben nach unten), dann X-Position (links nach rechts)
            const items = textContent.items.map(item => ({
                str: item.str,
                x: Math.round(item.transform[4]),
                y: Math.round(item.transform[5])
            })).filter(i => i.str.trim());
            
            // Y-Achse runden, um Zeilen zu bilden (Toleranz 5px)
            items.forEach(item => {
                item.rowY = Math.round(item.y / 5) * 5;
            });
            
            items.sort((a, b) => {
                // Y-Achse geht in PDF von unten nach oben, also umkehren
                if (b.rowY !== a.rowY) return b.rowY - a.rowY; 
                return a.x - b.x;
            });
            
            let pageJoined = "";
            for (let j=0; j<items.length; j++) {
                if (j > 0) {
                    if (items[j].rowY !== items[j-1].rowY) {
                        pageJoined += " | ";
                    } else {
                        const prevEnd = items[j-1].x + (items[j-1].width || (items[j-1].str.length * 5));
                        const gap = items[j].x - prevEnd;
                        if (gap > 15) {
                            pageJoined += " | ";
                        } else if (gap > 3) {
                            pageJoined += " ";
                        }
                    }
                }
                pageJoined += items[j].str.trim();
            }
            allPagesText.push(pageJoined);
            
            if (i === 6) {
                console.log("DEBUG PAGE 6 START:", pageJoined.substring(0, 300));
            }
            
            if (i % 10 === 0) {
                document.getElementById('ihkBar').style.width = (40 + (i / pdf.numPages) * 40) + '%';
            }
        }
        
        document.getElementById('ihkBar').style.width = '90%';
        
        // Verarbeiten
        ihkProcessExtractedText(allPagesText);
        
    } catch (e) {
        console.error('PDF Parse Error:', e);
        ihkShowError('Fehler beim Lesen der PDF: ' + e.message);
    }
}

function ihkProcessExtractedText(pagesText) {
    // 1. Finde Metadaten auf Seite 1 (Deckblatt)
    let meta = { name: '-', beruf: '-', betrieb: '-', start: '-', end: '-' };
    const page1 = pagesText[0] || '';
    
    // Rohe Extraktion aus der IHK Struktur "Label | Value | Label | Value"
    const mName = page1.match(/Name,\s*Vorname[\s\|]*([^\|]+)/);
    if (mName) meta.name = mName[1].trim();
    
    const mBeruf = page1.match(/Ausbildungsberuf[\s\|]*([^\|]+)/);
    if (mBeruf) meta.beruf = mBeruf[1].trim();
    
    const mBetrieb = page1.match(/Ausbildungsbetrieb[\s\|]*([^\|]+)/);
    if (mBetrieb) meta.betrieb = mBetrieb[1].trim();
    
    // Bestimme das Basis-Jahr der Ausbildung aus dem Startdatum
    let baseYear = new Date().getFullYear();
    const mStart = page1.match(/Ausbildungsbeginn[\s\|]*([0-9]{2}\.[0-9]{2}\.[0-9]{4})/);
    if (mStart) {
        const parts = mStart[1].split('.');
        baseYear = parseInt(parts[2], 10);
    }
    
    // 2. Tagesberichte parsen (Seiten nach dem Inhaltsverzeichnis, idR ab S. 6)
    // Wir suchen nach dem Start-Muster: "Ausbildungswoche | DD.MM.YYYY bis DD.MM.YYYY"
    let currentWeek = null;
    let weeksMap = new Map(); // Key: "YYYY-WW" zur Zusammenführung bei Umbruch auf nächste Seite
    
    pagesText.forEach((pageText, pageIndex) => {
        // Tagesberichts-Seiten haben "Ausbildungsnachweis auf Tagesbasis" oben
        if (!/Ausbildungsnachweis[\s\|]*auf[\s\|]*Tagesbasis/i.test(pageText)) return;
        
        // Neuer Wochen-Start auf der Seite?
        const weekMatch = pageText.match(/Ausbildungswoche[\s\|]*([0-9]{2}\.[0-9]{2}\.[0-9]{4})[\s\|]*bis[\s\|]*([0-9]{2}\.[0-9]{2}\.[0-9]{4})/);
        
        if (weekMatch) {
            console.log(`DEBUG: Found week on page ${pageIndex + 1}:`, weekMatch[0]);
            const startStr = weekMatch[1];
            const endStr = weekMatch[2];
            
            const startParts = startStr.split('.');
            const dateFrom = `${startParts[2]}-${startParts[1]}-${startParts[0]}`;
            
            const endParts = endStr.split('.');
            const dateTo = `${endParts[2]}-${endParts[1]}-${endParts[0]}`;
            
            // Finde KW
            const d = new Date(startParts[2], parseInt(startParts[1])-1, startParts[0]);
            
            // Die IHK PDF hat KW, wir berechnen sie
            // (Verwende die Hilfsfunktion aus bh-bericht.js)
            const weekNum = typeof getWeekNumber === 'function' ? getWeekNumber(d) : 1;
            
            // Berechne Ausbildungsjahr basierend auf Start
            let yearNum = 1;
            if (baseYear) {
                const yearDiff = parseInt(startParts[2]) - baseYear;
                // Grobe Schätzung (1. Jahr bis August Folgejahr etc.)
                // Für echte App-Logik: wenn Monat >= 9 (September) im Startjahr -> 1. Jahr
                yearNum = yearDiff + (parseInt(startParts[1]) >= 8 ? 1 : 0);
                if (yearNum < 1) yearNum = 1;
                if (yearNum > 4) yearNum = 4;
            }
            
            // Status parsen
            let status = 'complete'; // Default
            const headerText = pageText.substring(0, weekMatch.index);
            if (headerText.includes('freigegeben') || headerText.includes('akzeptiert')) {
                status = 'signed';
            }
            
            const weekKey = `${startParts[2]}-${weekNum}`;
            if (!weeksMap.has(weekKey)) {
                weeksMap.set(weekKey, {
                    id: 'ihk_' + Date.now().toString() + '_' + weekNum,
                    year: yearNum,
                    week: weekNum,
                    dateFrom: dateFrom,
                    dateTo: dateTo,
                    department: '', // Wird gefüllt falls gefunden
                    activities: '',
                    mode: 'daily',
                    dailyActivities: { monday:'', tuesday:'', wednesday:'', thursday:'', friday:'', saturday:'', sunday:'' },
                    dailyHours: { monday:'', tuesday:'', wednesday:'', thursday:'', friday:'', saturday:'', sunday:'' },
                    dailySchool: { monday:false, tuesday:false, wednesday:false, thursday:false, friday:false, saturday:false, sunday:false },
                    instruction: '',
                    school: '',
                    hours: 0,
                    status: status,
                    // 🔴 Herkunft MUSS mitfahren. Eine so importierte Woche wurde bei
                    // der IHK bereits gefuehrt, oft schon abgezeichnet — ohne diese
                    // Marke laeuft sie im Ausbilder-Cockpit als "wartet auf Ihre
                    // Freigabe" und erzeugt Arbeit, die es nicht gibt. Das Vokabel
                    // steht in QUELLE_ERLAUBT (bh-b2b.js) und im DB-CHECK
                    // berichte_quelle_check — wer es hier aendert, zieht beide nach.
                    source: 'ihk-import',
                    // Der Stand, den das PDF behauptet. Getrennt von `status`, weil
                    // `status` der Azubi spaeter aendern kann; dies bleibt der Befund
                    // aus dem Dokument.
                    ihkSigned: status === 'signed',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    _rawText: '' // Für Debug/Weiterverarbeitung
                });
            }
            currentWeek = weeksMap.get(weekKey);
        }
        
        if (currentWeek) {
            currentWeek._rawText += ' ' + pageText;
        }
    });
    
    // 3. Extrahiere die Tagesdetails aus dem zusammengefassten RawText der Wochen
    const dayMap = { 'Mo': 'monday', 'Di': 'tuesday', 'Mi': 'wednesday', 'Do': 'thursday', 'Fr': 'friday', 'Sa': 'saturday', 'So': 'sunday' };
    
    weeksMap.forEach(week => {
        const text = week._rawText;
        
        // Wir suchen nach Blöcken: "Tag | DD.MM.YYYY | Ort | anwesend" ... bis zum nächsten Tag oder Dauer gesamt
        // Format: "Mo | 08.09.2025 | Betrieb | anwesend | 08:45 | • | ... | Qualifikationen: | - | ..."
        
        Object.keys(dayMap).forEach(dayPrefix => {
            const dayKey = dayMap[dayPrefix];
            // Regex für den Tagesstart: "Mo | 01.09.2025 | Betrieb | anwesend | 08:45"
            const dayRegex = new RegExp(`${dayPrefix}[\\s\\|]*([0-9]{2}\\.[0-9]{2}\\.[0-9]{4})[\\s\\|]+([^\\|]+?)[\\s\\|]+(anwesend|abwesend)[\\s\\|]+([0-9]{2}:[0-9]{2})`, 'i');
            const match = text.match(dayRegex);
            
            if (match) {
                const ort = match[2].trim();
                const anwesend = match[3].toLowerCase() === 'anwesend';
                const stunden = match[4].trim(); // z.B. "08:45"
                
                if (ort.toLowerCase().includes('schule')) {
                    week.dailySchool[dayKey] = true;
                }
                // Wir setzen week.department hier bewusst nicht auf 'Betrieb',
                // damit die Anzeige konsistent auf den Default ('Ausbildungsnachweis') fällt.
                
                // Konvertiere HH:MM zu Dezimalstunden für dailyHours
                if (stunden) {
                    const [hh, mm] = stunden.split(':').map(Number);
                    week.dailyHours[dayKey] = hh + (mm / 60);
                }
                
                // Extrahiere Tätigkeiten (alles zwischen Stunden und 'Qualifikationen:' oder nächstem Tag)
                // Da das Text-Parsing sehr roh ist (getrennt mit |), versuchen wir eine Heuristik
                const startPos = text.indexOf(match[0]) + match[0].length;
                let endPos = text.length;
                
                // Finde den Start des nächsten Tages oder "Dauer gesamt:"
                const nextTags = ['Mo[\\s\\|]+', 'Di[\\s\\|]+', 'Mi[\\s\\|]+', 'Do[\\s\\|]+', 'Fr[\\s\\|]+', 'Sa[\\s\\|]+', 'So[\\s\\|]+', 'Dauer[\\s\\|]*gesamt:'];
                let minNext = -1;
                nextTags.forEach(tag => {
                    const regex = new RegExp(tag);
                    const tagMatch = text.slice(startPos).match(regex);
                    if (tagMatch) {
                        const pos = startPos + tagMatch.index;
                        if (minNext === -1 || pos < minNext) minNext = pos;
                    }
                });
                
                if (minNext !== -1) endPos = minNext;
                
                let daySlice = text.substring(startPos, endPos);
                
                // Tätigkeiten haben Bullet Points '•' (im geparsten PDF manchmal als andere Zeichen)
                // Wir filtern nach Sätzen, die nach '•' oder nach '|' stehen
                let activities = [];
                let qualifikationen = [];
                let inQuali = false;
                
                const parts = daySlice.split('|').map(p => p.trim());
                parts.forEach(part => {
                    if (part === 'Qualifikationen:') {
                        inQuali = true;
                        return;
                    }
                    
                    let cleanPart = part;
                    if (cleanPart.startsWith('•')) cleanPart = cleanPart.substring(1).trim();
                    if (cleanPart.startsWith('-')) cleanPart = cleanPart.substring(1).trim();
                    
                    if (!cleanPart) return; // Skip bullets selbst
                    if (cleanPart.match(/^[0-9]{2}:[0-9]{2}$/)) return; // Skip wiederholte Zeiten
                    if (cleanPart.startsWith('<') && cleanPart.endsWith('>')) return; // Skip Hex-Blöcke
                    
                    const pLower = cleanPart.toLowerCase();
                    if (pLower.match(/^seite\s*\d+/)) return;
                    if (pLower.includes('ausbildungsnachweis auf tagesbasis')) return;
                    if (pLower.includes('auszubildende/r')) return;
                    if (pLower === 'ausbilder' || pLower === 'status') return;
                    if (pLower.includes('eingereicht am')) return;
                    if (pLower.includes('freigegeben')) return;
                    if (pLower.includes('ausbildungswoche')) return;
                    if (pLower.match(/^[0-9]{2}\.[0-9]{2}\.[0-9]{4}/)) return;
                    
                    if (inQuali) {
                        if (cleanPart.length > 3) qualifikationen.push(cleanPart);
                    } else {
                        if (cleanPart.length > 3) activities.push('• ' + cleanPart);
                    }
                });
                
                // Falls der Tag leer ist, aber "Urlaub", "Feiertag" oder "Krankheit" vermerkt war,
                // tragen wir das als Tätigkeit ein, damit es nicht so aussieht als fehle etwas.
                if (activities.length === 0 && !anwesend && ort) {
                    activities.push('• ' + ort);
                }
                
                week.dailyActivities[dayKey] = activities.join('\n');
                
                // Sammle Qualifikationen für das Wochen-Feld 'instruction'
                qualifikationen.forEach(q => {
                    if (!week.instruction.includes(q)) {
                        week.instruction += (week.instruction ? ', ' : '') + q;
                    }
                });
            }
        });
        
        // Dauer gesamt parsen
        const dauerMatch = text.match(/Dauer[\s\|]*gesamt:[\s\|]*([0-9]{2}:[0-9]{2})/);
        if (dauerMatch) {
            const [hh, mm] = dauerMatch[1].split(':').map(Number);
            week.hours = hh + (mm / 60);
        } else {
            // Summiere die ermittelten dailyHours
            week.hours = Object.values(week.dailyHours).reduce((sum, h) => sum + (parseFloat(h) || 0), 0);
        }
        
        // Lösche raw text
        delete week._rawText;
    });
    
    ihkParsedWeeks = Array.from(weeksMap.values());
    console.log(`DEBUG: Total parsed weeks in Map: ${ihkParsedWeeks.length}`);
    
    if (ihkParsedWeeks.length === 0) {
        ihkShowError('Es konnten keine auswertbaren Tagesberichte in der PDF gefunden werden. Möglicherweise ist das Format abweichend.');
        return;
    }
    
    // Sortiere nach Datum
    ihkParsedWeeks.sort((a, b) => new Date(b.dateFrom) - new Date(a.dateFrom));
    
    // 4. Baue UI
    document.getElementById('ihkBar').style.width = '100%';
    setTimeout(() => {
        ihkShowResult(meta);
    }, 400);
}

function ihkShowResult(meta) {
    ihkSetStep('result');
    
    // Meta ausgeben
    document.getElementById('ihkMetaName').textContent = meta.name;
    document.getElementById('ihkMetaBeruf').textContent = meta.beruf;
    document.getElementById('ihkMetaBetrieb').textContent = meta.betrieb;
    
    // Wochenliste bauen
    const list = document.getElementById('ihkWeeksList');
    list.innerHTML = '';
    
    let duplicateCount = 0;
    
    ihkParsedWeeks.forEach((week, idx) => {
        // Prüfe auf Duplikate in den bestehenden reports (bh-basis.js -> reports array)
        let isDuplicate = false;
        if (typeof reports !== 'undefined') {
            isDuplicate = reports.some(r => r.year === week.year && r.week === week.week);
        }
        
        if (isDuplicate) duplicateCount++;
        
        const card = document.createElement('label');
        card.className = `ihk-week-card ${isDuplicate ? 'duplicate' : 'selected'}`;
        
        // Format Datum
        const df = week.dateFrom.split('-').reverse().join('.');
        const dt = week.dateTo.split('-').reverse().join('.');
        
        card.innerHTML = `
            <input type="checkbox" class="ihk-week-check" value="${idx}" ${isDuplicate ? '' : 'checked'}>
            <div class="ihk-week-info">
                <span class="ihk-week-dates">KW ${week.week} (${df} - ${dt})</span>
                <div class="ihk-week-details">
                    <span>${week.hours.toFixed(1)} Std.</span>
                    ${week.status === 'signed' ? '<span style="color:var(--success);">Geprüft & Unterschrieben</span>' : '<span>Fertiggestellt</span>'}
                    ${isDuplicate ? '<span class="ihk-week-duplicate-badge">Bereits vorhanden</span>' : ''}
                </div>
            </div>
        `;
        
        // Toggle class on check
        const cb = card.querySelector('input');
        cb.addEventListener('change', () => {
            if (cb.checked) card.classList.add('selected');
            else card.classList.remove('selected');
        });
        
        list.appendChild(card);
    });
    
    document.getElementById('ihkWeeksTitle').textContent = `${ihkParsedWeeks.length} Wochen gefunden`;
    
    // Button state
    const btn = document.getElementById('ihkBtnImport');
    btn.textContent = `${ihkParsedWeeks.length - duplicateCount} Wochen importieren`;
    
    // Listen for changes to update button
    list.addEventListener('change', () => {
        const checked = list.querySelectorAll('input:checked').length;
        btn.textContent = `${checked} Woche${checked !== 1 ? 'n' : ''} importieren`;
        btn.disabled = checked === 0;
    });
}

function ihkToggleSelectAll(btn) {
    const list = document.getElementById('ihkWeeksList');
    const checkboxes = list.querySelectorAll('input[type="checkbox"]');
    const anyUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = anyUnchecked;
        const card = cb.closest('.ihk-week-card');
        if (anyUnchecked) card.classList.add('selected');
        else card.classList.remove('selected');
    });
    
    // Trigger change event to update button text
    list.dispatchEvent(new Event('change'));
}

function ihkExecuteImport() {
    const list = document.getElementById('ihkWeeksList');
    const checkedBoxes = list.querySelectorAll('input:checked');
    
    if (checkedBoxes.length === 0) return;
    
    if (typeof reports === 'undefined' || typeof saveToStorage !== 'function') {
        bhAlert('Import nicht möglich',
            'Der Berichtsheft-Speicher ist auf dieser Seite nicht verfügbar. Es wurde nichts importiert und nichts geändert — lade die Seite neu und versuche es erneut.');
        return;
    }
    
    let importCount = 0;
    const importierte = [];

    checkedBoxes.forEach(cb => {
        const idx = parseInt(cb.value, 10);
        const week = ihkParsedWeeks[idx];
        if (week) {
            importierte.push(week);
            // Extra prüfen ob Duplikat überschrieben werden soll
            const existingIdx = reports.findIndex(r => r.year === week.year && r.week === week.week);
            if (existingIdx !== -1) {
                // Behalte die ID des alten Berichts
                week.id = reports[existingIdx].id;
                reports[existingIdx] = week;
            } else {
                reports.push(week);
            }
            importCount++;
        }
    });
    
    // Speichern und UI aktualisieren
    saveToStorage();

    // 🔴 Erst nach saveToStorage(): der Betrieb muss die importierten Wochen
    // auch bekommen. saveReport() stoesst b2bOnReportSaved() an, der Import
    // laeuft aber daran vorbei — ohne diese Schleife lagen sie bis zum
    // naechsten Bearbeiten nur lokal auf dem Geraet.
    if (typeof b2bOnReportSaved === 'function') {
        importierte.forEach(function (w) { b2bOnReportSaved(w); });
    }

    if (typeof updateUI === 'function') updateUI();
    if (typeof showToast === 'function') showToast(`${importCount} Bericht${importCount !== 1 ? 'e' : ''} importiert`, 'success');
    
    closeIhkImport();
    
    // Konfetti bei erfolgreichem Import
    if (typeof launchConfetti === 'function') launchConfetti();
}
