// ═══ GHOST MODE MODULE ═══
// Boss-Key. Zwei Skins, die sich bedienen lassen — Zellen anklicken und
// tippen, Dateien oeffnen, Terminal aufmachen. Ein Fenster, in dem nichts
// reagiert, faellt in drei Sekunden auf; genau das soll hier nicht passieren.
window._clsBC = 'ghost.js-start';
(function initGhostMode() {

    var ghostActive = false;
    var activeSkin = null;

    // ── Skin-Wahl ──────────────────────────────────────────────
    // 'auto' leitet aus dem Ausbildungsberuf ab, sonst gilt die Wahl aus
    // den Einstellungen. Nie hart verdrahten — data.settings ist die Quelle.
    var IT_JOBS = ['fachinformatiker-anwendung', 'fachinformatiker-system',
        'fachinformatiker-daten', 'fachinformatiker-digital', 'it-systemelektroniker',
        'it-kaufmann', 'it-digitalisierung', 'mediengestalter',
        'gestaltungstechnischer-assistent'];

    // `data` ist ein let-Global aus state-config.js und steht NICHT auf window.
    // Deshalb typeof-Guard statt window.data — sonst liest man immer {}.
    function settings() {
        try {
            return (typeof data !== 'undefined' && data && data.settings) ? data.settings : {};
        } catch (e) { return {}; }
    }

    function getGhostSkin() {
        var s = settings();
        var chosen = s.ghostSkin || 'auto';
        if (chosen === 'excel' || chosen === 'vscode') return chosen;
        return IT_JOBS.indexOf(s.job || '') !== -1 ? 'vscode' : 'excel';
    }
    window.getGhostSkin = getGhostSkin;

    // ── Tarnung von Titel und Favicon ──────────────────────────
    // Der Reiter selbst ist der groesste Verraeter: Ein fremder Titel ohne
    // passendes Icon wirkt sofort falsch.
    var FAVICONS = {
        excel: 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
            '<rect width="32" height="32" rx="4" fill="#217346"/>' +
            '<path d="M9 8l6.5 8L9 24h4.2l4.3-5.6 4.3 5.6H26l-6.5-8L26 8h-4.2l-4.3 5.6L13.2 8z" fill="#fff"/></svg>'),
        vscode: 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
            '<rect width="32" height="32" rx="4" fill="#0065a9"/>' +
            '<path d="M23 5.5v21l-9.5-7.4-4.2 3.2L6 20.6l4.6-4.6L6 11.4l3.3-1.7 4.2 3.2z" fill="#fff"/></svg>')
    };
    var savedIcons = null;
    var savedTitle = '';

    function disguiseTab(skin, title) {
        if (savedIcons === null) {
            savedIcons = [];
            document.querySelectorAll('link[rel~="icon"]').forEach(function (el) {
                savedIcons.push({ rel: el.rel, type: el.type, href: el.href, sizes: (el.sizes && el.sizes.value) || '' });
            });
            savedTitle = document.title;
        }
        document.querySelectorAll('link[rel~="icon"]').forEach(function (el) { el.remove(); });
        var link = document.createElement('link');
        link.rel = 'icon';
        link.href = FAVICONS[skin];
        document.head.appendChild(link);
        document.title = title;
    }

    function restoreTab() {
        if (savedIcons === null) return;
        document.querySelectorAll('link[rel~="icon"]').forEach(function (el) { el.remove(); });
        savedIcons.forEach(function (ico) {
            var link = document.createElement('link');
            link.rel = ico.rel;
            if (ico.type) link.type = ico.type;
            link.href = ico.href;
            if (ico.sizes) link.sizes = ico.sizes;
            document.head.appendChild(link);
        });
        document.title = savedTitle || 'MyWorkLog – Zeiterfassung';
        savedIcons = null;
    }

    function reducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // ── Sprache der Tarnung ────────────────────────────────────
    // Nicht ueber i18n-runtime: Wer die englische Seite nutzt, haette auch
    // ein englisches Excel — inklusive Dezimalpunkt und SUM statt SUMME.
    var COLS_DE = ['Datum', 'Wochentag', 'Abteilung', 'Stunden', 'Beginn', 'Ende', 'Pause', 'Bemerkung'];
    var DAY_NAMES_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    var MONTH_NAMES_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    var DEPTS_DE = ['IT-Abteilung', 'Entwicklung', 'Netzwerk', 'Support', 'Schulung', 'Berufsschule', 'Lager', 'Einkauf'];
    var REMARKS_DE = ['Server-Migration', 'Ticket-Bearbeitung', 'Netzwerk-Doku', 'Firewall-Konfiguration',
        'Active Directory', 'Windows-Setup', 'Backup-Prüfung', 'User-Support', 'Inventarisierung',
        'Patch-Management', 'Schulungsunterlagen', 'VLAN-Konfiguration', 'Projektmeeting',
        'Code-Review', 'Datenbank-Wartung', 'Monitoring einrichten', 'Exchange-Admin',
        'Unterricht LF 5', 'Abteilungsbesprechung', 'Rechnungsprüfung'];

    var EN = document.documentElement.lang === 'en';
    var T = EN ? {
        months: ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'],
        days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        cols: ['Date', 'Weekday', 'Department', 'Hours', 'Start', 'End', 'Break', 'Note'],
        depts: ['IT Department', 'Development', 'Network', 'Support', 'Training', 'Vocational school', 'Warehouse', 'Purchasing'],
        remarks: ['Server migration', 'Ticket handling', 'Network documentation', 'Firewall configuration',
            'Active Directory', 'Windows setup', 'Backup check', 'User support', 'Stocktaking',
            'Patch management', 'Training material', 'VLAN configuration', 'Project meeting',
            'Code review', 'Database maintenance', 'Monitoring setup', 'Exchange admin',
            'Class LU 5', 'Department meeting', 'Invoice check'],
        school: 'Vocational school', lesson: 'Class LU ',
        total: 'Total', ready: 'Ready', edit: 'Edit',
        average: 'Average', count: 'Count', sum: 'Sum',
        fnSum: 'SUM', fnText: 'TEXT', dayFormat: 'dddd',
        rowsCols: function (r, c) { return r + 'R x ' + c + 'C'; },
        docTitle: function (y) { return 'TimeSheet_' + y + '.xlsx - Excel'; },
        date: function (d, m, y) { return p2(m) + '/' + p2(d) + '/' + y; },
        dateRe: /^\d{2}\/\d{2}\/\d{4}$/,
        bold: 'B', italic: 'I',
        dec: '.', argSep: ','
    } : {
        months: MONTH_NAMES_DE, days: DAY_NAMES_DE, cols: COLS_DE,
        depts: DEPTS_DE, remarks: REMARKS_DE,
        school: 'Berufsschule', lesson: 'Unterricht LF ',
        total: 'Gesamt', ready: 'Bereit', edit: 'Bearbeiten',
        average: 'Mittelwert', count: 'Anzahl', sum: 'Summe',
        fnSum: 'SUMME', fnText: 'TEXT', dayFormat: 'TTTT',
        rowsCols: function (r, c) { return r + 'Z x ' + c + 'S'; },
        docTitle: function (y) { return 'Arbeitszeiterfassung_' + y + '.xlsx - Excel'; },
        date: function (d, m, y) { return p2(d) + '.' + p2(m) + '.' + y; },
        dateRe: /^\d{2}\.\d{2}\.\d{4}$/,
        bold: 'F', italic: 'K',
        dec: ',', argSep: ';'
    };

    /* ══════════════════════════════════════════════════════════
       SKIN 1 — Tabellenkalkulation
       ══════════════════════════════════════════════════════════ */

    // Fester Zufall: Derselbe Monat ergibt immer dieselbe Tabelle. Wer
    // zweimal hinschaut, sieht dieselbe Datei — waere sie jedes Mal anders,
    // waere die Tarnung sofort durch.
    function seeded(seed) {
        var s = seed >>> 0;
        return function () {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    // Spaltenbreiten und Ausrichtung sind sprachunabhaengig, die Beschriftung
    // kommt aus dem Sprachtisch.
    var COL_WIDTHS = [84, 96, 128, 72, 68, 68, 62, 210, 90, 90];
    var COL_NUMERIC = [true, false, false, true, true, true, true, false, false, false];
    var COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    var SHEET_COLS = COL_WIDTHS.map(function (w, i) {
        return { letter: COL_LETTERS[i], label: T.cols[i] || '', w: w, num: COL_NUMERIC[i] };
    });

    var sheets = null;
    var activeSheet = 0;

    function buildSheet(year, month) {
        var rnd = seeded(year * 100 + month);
        var rows = [];
        var d = new Date(year, month, 1);
        var totalHours = 0;
        while (d.getMonth() === month) {
            var dow = d.getDay();
            if (dow !== 0 && dow !== 6) {
                var startH = 7 + Math.floor(rnd() * 2);
                var startM = Math.floor(rnd() * 4) * 15;
                var hrs = 7.5 + Math.round(rnd() * 4) * 0.25;
                var pause = dow === 3 ? 45 : 30;
                var end = new Date(year, month, 1, startH, startM + hrs * 60 + pause);
                var isSchool = rnd() < 0.18;
                totalHours += hrs;
                rows.push([
                    T.date(d.getDate(), month + 1, year),
                    T.days[dow],
                    isSchool ? T.school : T.depts[Math.floor(rnd() * T.depts.length)],
                    fmtNum(hrs),
                    p2(startH) + ':' + p2(startM),
                    p2(end.getHours()) + ':' + p2(end.getMinutes()),
                    String(pause),
                    isSchool ? T.lesson + (3 + Math.floor(rnd() * 6)) : T.remarks[Math.floor(rnd() * T.remarks.length)],
                    '', ''
                ]);
            }
            d.setDate(d.getDate() + 1);
        }
        rows.push(['', '', T.total, fmtNum(totalHours), '', '', '', '', '', '']);
        return { name: T.months[month], year: year, month: month, rows: rows, totalRow: rows.length - 1 };
    }

    function p2(n) { return String(n).padStart(2, '0'); }

    function buildSheets() {
        var now = new Date();
        var out = [];
        for (var back = 2; back >= 0; back--) {
            var d = new Date(now.getFullYear(), now.getMonth() - back, 1);
            out.push(buildSheet(d.getFullYear(), d.getMonth()));
        }
        return out;
    }

    // Auswahl: Anker (r,c) + aktive Ecke (r2,c2). Zeile 0 = Spaltenbeschriftung.
    var sel = { r: 1, c: 0, r2: 1, c2: 0 };
    var editing = null;

    function sheetEl(id) { return document.getElementById(id); }

    function renderSheet() {
        var table = sheetEl('ghostSheetTable');
        if (!table) return;
        if (!sheets) sheets = buildSheets();
        var sheet = sheets[activeSheet];
        var rows = sheet.rows;
        var visibleRows = Math.max(rows.length + 8, 42);

        var html = '<colgroup><col style="width:38px">';
        SHEET_COLS.forEach(function (c) { html += '<col style="width:' + c.w + 'px">'; });
        html += '</colgroup><thead><tr><th class="ghost-corner"></th>';
        SHEET_COLS.forEach(function (c, i) {
            html += '<th data-col="' + i + '">' + c.letter + '</th>';
        });
        html += '</tr></thead><tbody>';

        // Zeile 1 traegt die Spaltenbeschriftungen — wie in einer echten Datei
        html += '<tr><td class="ghost-row-num" data-row="0">1</td>';
        SHEET_COLS.forEach(function (c, i) {
            html += '<td class="ghost-bold" data-row="0" data-col="' + i + '">' + c.label + '</td>';
        });
        html += '</tr>';

        rows.forEach(function (row, ri) {
            var isTotal = ri === sheet.totalRow;
            html += '<tr><td class="ghost-row-num" data-row="' + (ri + 1) + '">' + (ri + 2) + '</td>';
            row.forEach(function (cell, ci) {
                var cls = [];
                if (SHEET_COLS[ci].num) cls.push('ghost-num');
                if (isTotal) cls.push('ghost-bold');
                html += '<td' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') +
                    ' data-row="' + (ri + 1) + '" data-col="' + ci + '">' + escGhost(cell) + '</td>';
            });
            html += '</tr>';
        });

        for (var e = rows.length + 1; e < visibleRows; e++) {
            html += '<tr><td class="ghost-row-num" data-row="' + e + '">' + (e + 1) + '</td>';
            for (var c2 = 0; c2 < SHEET_COLS.length; c2++) {
                html += '<td data-row="' + e + '" data-col="' + c2 + '"></td>';
            }
            html += '</tr>';
        }
        html += '</tbody>';
        table.innerHTML = html;

        renderSheetTabs();
        applySelection();
    }

    // Bis zum unteren Rand auffuellen. Muss nach dem Einblenden laufen:
    // Beim Vorwaermen ist das Overlay display:none und clientHeight = 0.
    function padSheetRows() {
        var wrap = sheetEl('ghostSheetWrap');
        var table = sheetEl('ghostSheetTable');
        var tbody = table && table.querySelector('tbody');
        if (!wrap || !tbody) return;
        var need = Math.ceil(wrap.clientHeight / 21) + 2;
        var have = tbody.rows.length;
        if (have >= need) return;
        var html = '';
        for (var i = have; i < need; i++) {
            html += '<tr><td class="ghost-row-num" data-row="' + i + '">' + (i + 1) + '</td>';
            for (var c = 0; c < SHEET_COLS.length; c++) {
                html += '<td data-row="' + i + '" data-col="' + c + '"></td>';
            }
            html += '</tr>';
        }
        tbody.insertAdjacentHTML('beforeend', html);
    }

    // Der Inhalt stammt komplett aus diesem Modul, nie vom Nutzer — trotzdem
    // escapen, damit das auch nach der naechsten Aenderung noch stimmt.
    function escGhost(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderSheetTabs() {
        var wrap = sheetEl('ghostSheetTabs');
        if (!wrap || !sheets) return;
        var html = '';
        sheets.forEach(function (s, i) {
            html += '<span class="ghost-st' + (i === activeSheet ? ' ghost-st-active' : '') +
                '" data-sheet="' + i + '">' + escGhost(s.name) + '</span>';
        });
        html += '<span class="ghost-st ghost-st-add">+</span>';
        wrap.innerHTML = html;
    }

    function cellAt(r, c) {
        var t = sheetEl('ghostSheetTable');
        return t ? t.querySelector('td[data-row="' + r + '"][data-col="' + c + '"]') : null;
    }

    function colName(i) { return SHEET_COLS[i] ? SHEET_COLS[i].letter : 'A'; }

    function applySelection() {
        var table = sheetEl('ghostSheetTable');
        if (!table) return;
        table.querySelectorAll('.ghost-selected, .ghost-in-range').forEach(function (el) {
            el.classList.remove('ghost-selected', 'ghost-in-range');
        });
        table.querySelectorAll('.ghost-col-active').forEach(function (el) { el.classList.remove('ghost-col-active'); });
        table.querySelectorAll('.ghost-row-active').forEach(function (el) { el.classList.remove('ghost-row-active'); });

        var r1 = Math.min(sel.r, sel.r2), r2 = Math.max(sel.r, sel.r2);
        var c1 = Math.min(sel.c, sel.c2), c2 = Math.max(sel.c, sel.c2);
        for (var r = r1; r <= r2; r++) {
            for (var c = c1; c <= c2; c++) {
                var td = cellAt(r, c);
                if (td) td.classList.add('ghost-in-range');
            }
            var head = table.querySelector('td.ghost-row-num[data-row="' + r + '"]');
            if (head) head.classList.add('ghost-row-active');
        }
        for (var cc = c1; cc <= c2; cc++) {
            var th = table.querySelector('th[data-col="' + cc + '"]');
            if (th) th.classList.add('ghost-col-active');
        }
        var anchor = cellAt(sel.r, sel.c);
        if (anchor) anchor.classList.add('ghost-selected');

        updateFormulaBar();
        updateSheetStats();
    }

    function updateFormulaBar() {
        var ref = sheetEl('ghostCellRef');
        var fx = sheetEl('ghostFormula');
        if (!ref || !fx) return;
        var single = sel.r === sel.r2 && sel.c === sel.c2;
        if (single) {
            ref.textContent = colName(sel.c) + (sel.r + 1);
        } else {
            var rows = Math.abs(sel.r2 - sel.r) + 1, cols = Math.abs(sel.c2 - sel.c) + 1;
            ref.textContent = T.rowsCols(rows, cols);
        }
        var td = cellAt(sel.r, sel.c);
        fx.textContent = td ? formulaFor(sel.r, sel.c, td.textContent) : '';
    }

    // Excel zeigt in der Bearbeitungsleiste die Formel, nicht das Ergebnis.
    // Berechnete Spalten bekommen deshalb eine, die zum Wert passt.
    function formulaFor(r, c, value) {
        if (!value) return '';
        var sheet = sheets[activeSheet];
        var excelRow = r + 1;
        if (sheets && r === sheet.totalRow + 1 && c === 3) {
            return '=' + T.fnSum + '(D2:D' + (sheet.totalRow + 1) + ')';
        }
        if (c === 3 && r >= 1 && r <= sheet.totalRow) return '=(F' + excelRow + '-E' + excelRow + ')*24-G' + excelRow + '/60';
        if (c === 1 && r >= 1 && r <= sheet.totalRow) return '=' + T.fnText + '(A' + excelRow + T.argSep + '"' + T.dayFormat + '")';
        return value;
    }

    function parseNum(txt) {
        if (!txt) return null;
        var t = String(txt).trim();
        if (/^\d{1,2}:\d{2}$/.test(t)) return null;         // Uhrzeit ist keine Zahl
        if (T.dateRe.test(t)) return null;                  // Datum auch nicht
        // Dezimaltrennzeichen haengt an der Sprache: 8,25 vs. 8.25
        t = (T.dec === ',') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
        var n = parseFloat(t);
        return isNaN(n) ? null : n;
    }

    function updateSheetStats() {
        var out = sheetEl('ghostSheetStats');
        if (!out) return;
        var r1 = Math.min(sel.r, sel.r2), r2 = Math.max(sel.r, sel.r2);
        var c1 = Math.min(sel.c, sel.c2), c2 = Math.max(sel.c, sel.c2);
        var count = 0, numCount = 0, sum = 0;
        for (var r = r1; r <= r2; r++) {
            for (var c = c1; c <= c2; c++) {
                var td = cellAt(r, c);
                if (!td) continue;
                var txt = td.textContent.trim();
                if (!txt) continue;
                count++;
                var n = parseNum(txt);
                if (n !== null) { numCount++; sum += n; }
            }
        }
        // Excel blendet die Leiste nur bei leerer Auswahl aus; schon bei einer
        // einzelnen Zahl stehen Mittelwert, Anzahl und Summe da.
        if (count < 1) { out.textContent = ''; return; }
        var parts = [];
        if (numCount > 0) parts.push(T.average + ': ' + fmtNum(sum / numCount));
        parts.push(T.count + ': ' + count);
        if (numCount > 0) parts.push(T.sum + ': ' + fmtNum(sum));
        out.textContent = parts.join('   ');
    }

    function fmtNum(n) {
        var s = (Math.round(n * 100) / 100).toFixed(2);
        return T.dec === ',' ? s.replace('.', ',') : s;
    }

    function moveSelection(dr, dc, extend) {
        var maxR = sheetEl('ghostSheetTable').querySelectorAll('tbody tr').length - 1;
        var maxC = SHEET_COLS.length - 1;
        var nr = Math.max(0, Math.min(maxR, (extend ? sel.r2 : sel.r) + dr));
        var nc = Math.max(0, Math.min(maxC, (extend ? sel.c2 : sel.c) + dc));
        if (extend) { sel.r2 = nr; sel.c2 = nc; }
        else { sel.r = sel.r2 = nr; sel.c = sel.c2 = nc; }
        applySelection();
        var td = cellAt(extend ? sel.r2 : sel.r, extend ? sel.c2 : sel.c);
        if (td && td.scrollIntoView) td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    function startEdit(td) {
        if (!td || editing) return;
        editing = { td: td, before: td.textContent };
        td.classList.add('ghost-editing');
        td.setAttribute('contenteditable', 'plaintext-only');
        td.focus();
        var range = document.createRange();
        range.selectNodeContents(td);
        range.collapse(false);
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(range);
        setSheetMode(T.edit);
    }

    function stopEdit(commit) {
        if (!editing) return;
        var td = editing.td;
        if (!commit) td.textContent = editing.before;
        td.removeAttribute('contenteditable');
        td.classList.remove('ghost-editing');
        editing = null;
        setSheetMode(T.ready);
        updateFormulaBar();
        updateSheetStats();
    }

    function setSheetMode(text) {
        var el = sheetEl('ghostSheetMode');
        if (el) el.textContent = text;
    }

    var dragging = false;

    function wireSheet() {
        var wrap = sheetEl('ghostSheetWrap');
        var tabs = sheetEl('ghostSheetTabs');
        if (!wrap || wrap.dataset.wired) return;
        wrap.dataset.wired = '1';

        wrap.addEventListener('mousedown', function (e) {
            var td = e.target.closest('td[data-col]');
            if (!td) return;
            if (editing && editing.td === td) return;
            stopEdit(true);
            var r = +td.dataset.row, c = +td.dataset.col;
            if (e.shiftKey) { sel.r2 = r; sel.c2 = c; }
            else { sel.r = sel.r2 = r; sel.c = sel.c2 = c; dragging = true; }
            applySelection();
            e.preventDefault();
        });
        wrap.addEventListener('mouseover', function (e) {
            if (!dragging) return;
            var td = e.target.closest('td[data-col]');
            if (!td) return;
            sel.r2 = +td.dataset.row;
            sel.c2 = +td.dataset.col;
            applySelection();
        });
        document.addEventListener('mouseup', function () { dragging = false; });

        wrap.addEventListener('dblclick', function (e) {
            var td = e.target.closest('td[data-col]');
            if (td) startEdit(td);
        });

        tabs.addEventListener('click', function (e) {
            var t = e.target.closest('.ghost-st[data-sheet]');
            if (!t) return;
            stopEdit(true);
            activeSheet = +t.dataset.sheet;
            sel = { r: 1, c: 0, r2: 1, c2: 0 };
            renderSheet();
            padSheetRows();
        });

        window.addEventListener('resize', function () {
            if (ghostActive && activeSkin === 'excel') padSheetRows();
        });
    }

    function handleSheetKey(e) {
        if (editing) {
            if (e.key === 'Enter') { e.preventDefault(); stopEdit(true); moveSelection(1, 0, false); }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stopEdit(false); }
            else if (e.key === 'Tab') { e.preventDefault(); stopEdit(true); moveSelection(0, 1, false); }
            return;
        }
        var k = e.key;
        if (k === 'ArrowUp') { e.preventDefault(); moveSelection(-1, 0, e.shiftKey); }
        else if (k === 'ArrowDown' || k === 'Enter') { e.preventDefault(); moveSelection(1, 0, e.shiftKey); }
        else if (k === 'ArrowLeft') { e.preventDefault(); moveSelection(0, -1, e.shiftKey); }
        else if (k === 'ArrowRight') { e.preventDefault(); moveSelection(0, 1, e.shiftKey); }
        else if (k === 'Tab') { e.preventDefault(); moveSelection(0, e.shiftKey ? -1 : 1, false); }
        else if (k === 'Home') {
            e.preventDefault();
            if (e.ctrlKey) { sel.r = sel.r2 = 0; }
            sel.c = sel.c2 = 0;
            applySelection();
        } else if (k === 'PageDown') { e.preventDefault(); moveSelection(15, 0, e.shiftKey); }
        else if (k === 'PageUp') { e.preventDefault(); moveSelection(-15, 0, e.shiftKey); }
        else if (k === 'F2') { e.preventDefault(); startEdit(cellAt(sel.r, sel.c)); }
        else if (k === 'Delete') {
            e.preventDefault();
            var td = cellAt(sel.r, sel.c);
            if (td) { td.textContent = ''; updateFormulaBar(); updateSheetStats(); }
        } else if (e.ctrlKey && (k === 'a' || k === 'A')) {
            e.preventDefault();
            sel = { r: 0, c: 0, r2: sheetEl('ghostSheetTable').querySelectorAll('tbody tr').length - 1, c2: SHEET_COLS.length - 1 };
            applySelection();
        } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Tippen ueberschreibt die Zelle — genau wie im Original
            var cell = cellAt(sel.r, sel.c);
            if (cell) { cell.textContent = ''; startEdit(cell); }
        }
    }

    /* ══════════════════════════════════════════════════════════
       SKIN 2 — Code-Editor
       ══════════════════════════════════════════════════════════ */

    // Ein Tokenizer statt handgeschriebener Span-Wueste: Neue Dateien sind
    // damit reiner Klartext, die Faerbung passiert hier.
    var HL_KW = 'import|from|export|default|class|interface|extends|implements|const|let|var|function|async|await|return|if|else|for|of|in|while|do|try|catch|finally|throw|new|this|super|private|public|protected|readonly|static|abstract|void|null|undefined|true|false|break|continue|switch|case|enum|as|is|keyof|typeof|instanceof|type|declare|module|require|yield|delete';
    var HL_RE = new RegExp(
        '(\\/\\/[^\\n]*)' +                                   // 1 Kommentar
        '|(\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*"|`(?:[^`\\\\]|\\\\.)*`)' + // 2 String
        '|(@[A-Za-z_$][\\w$]*)' +                             // 3 Decorator
        '|\\b(0x[0-9a-fA-F]+|\\d+(?:\\.\\d+)?)\\b' +          // 4 Zahl
        '|\\b(' + HL_KW + ')\\b' +                            // 5 Keyword
        '|\\b([A-Z][A-Za-z0-9_$]*)\\b' +                      // 6 Typ
        '|\\b([a-z_$][\\w$]*)(?=\\s*\\()', 'g');              // 7 Funktionsaufruf

    function highlight(line) {
        var trimmed = line.trimStart();
        if (trimmed.indexOf('*') === 0 || trimmed.indexOf('/*') === 0) {
            return '<span class="vsc-cmt">' + escGhost(line) + '</span>';
        }
        return escGhost(line).replace(HL_RE, function (m, cmt, str, dec, num, kw, type, fn) {
            if (cmt) return '<span class="vsc-cmt">' + cmt + '</span>';
            if (str) return '<span class="vsc-str">' + str + '</span>';
            if (dec) return '<span class="vsc-dec">' + dec + '</span>';
            if (num) return '<span class="vsc-num">' + num + '</span>';
            if (kw) return '<span class="vsc-kw">' + kw + '</span>';
            if (type) return '<span class="vsc-type">' + type + '</span>';
            if (fn) return '<span class="vsc-fn">' + fn + '</span>';
            return m;
        });
    }

    function mmClass(line) {
        var t = line.trimStart();
        if (!t) return '';
        if (t.indexOf('//') === 0 || t.indexOf('*') === 0 || t.indexOf('/*') === 0) return 'vsc-cmt';
        if (/^(import|export)\b/.test(t)) return 'vsc-kw';
        if (/^(private|public|protected|const|let|async|return|if|for|while|await|throw)\b/.test(t)) return 'vsc-kw';
        if (/^[A-Z@]/.test(t)) return 'vsc-type';
        return 'vsc-var';
    }

    var VSC_FILES = {
        'server-migration.ts': {
            lang: 'TypeScript', icon: 'ts', folder: 'src',
            symbol: 'ServerMigrationController › handleMigration',
            code: [
                '/**',
                ' * ServerMigrationController — Enterprise Data Pipeline v3.2.1',
                ' * Handles real-time WebSocket streams with automatic failover.',
                ' */',
                '',
                "import { Injectable, Logger, OnModuleInit } from '@nestjs/common';",
                "import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets';",
                "import { KafkaProducer } from '@confluentinc/kafka-js';",
                "import { RedisCluster } from 'ioredis';",
                "import { createHash, randomUUID } from 'node:crypto';",
                "import type { MigrationPayload, ClusterNode } from './types/infrastructure';",
                '',
                'interface ReplicationConfig {',
                '  primaryEndpoint: string;',
                '  replicaNodes: ClusterNode[];',
                "  consistencyLevel: 'strong' | 'eventual' | 'quorum';",
                '  maxRetries: number;',
                '  heartbeatMs: number;',
                '}',
                '',
                '@Injectable()',
                "@WebSocketGateway(8443, { namespace: '/migration', cors: true })",
                'export class ServerMigrationController implements OnModuleInit {',
                '  private readonly kafka: KafkaProducer;',
                '  private readonly redis: RedisCluster;',
                '  private activeNodes = new Map<string, ClusterNode>();',
                '  private migrationLock = false;',
                '',
                '  constructor(',
                '    private readonly config: ReplicationConfig,',
                '    private readonly logger: Logger,',
                '  ) {',
                '    this.kafka = new KafkaProducer({',
                "      brokers: ['kafka-01.internal:9092', 'kafka-02.internal:9092'],",
                "      clientId: 'migration-service',",
                '      ssl: true,',
                '    });',
                "    this.redis = new RedisCluster([{ host: 'redis-sentinel.internal', port: 26379 }]);",
                '  }',
                '',
                '  async onModuleInit(): Promise<void> {',
                '    await this.initializeCluster();',
                '    this.startHealthMonitor();',
                "    this.logger.log('Migration controller ready');",
                '  }',
                '',
                '  private async initializeCluster(): Promise<void> {',
                '    const probes = this.config.replicaNodes.map(async (node) => {',
                '      const health = await this.checkNodeHealth(node);',
                "      if (health.status === 'healthy') this.activeNodes.set(node.id, node);",
                '    });',
                '    await Promise.allSettled(probes);',
                '  }',
                '',
                "  @SubscribeMessage('migrate:start')",
                '  async handleMigration(client: Socket, payload: MigrationPayload): Promise<void> {',
                '    if (this.migrationLock) {',
                "      client.emit('migrate:error', { code: 'LOCK_ACTIVE', retryAfter: 30000 });",
                '      return;',
                '    }',
                '',
                '    this.migrationLock = true;',
                '    const traceId = randomUUID();',
                "    const checksum = createHash('sha256').update(JSON.stringify(payload)).digest('hex');",
                '',
                '    try {',
                '      // Phase 1: Validate cluster quorum',
                '      const quorum = await this.validateQuorum();',
                "      if (!quorum.isReady) throw new Error('Quorum not met');",
                '',
                '      // Phase 2: Distribute shards across replicas',
                '      for (const [nodeId] of this.activeNodes) {',
                "        const shardKey = createHash('md5').update(nodeId + traceId).digest('hex');",
                '        await this.kafka.send({',
                "          topic: 'migration.shard.distribute',",
                '          messages: [{ key: shardKey, value: JSON.stringify({ traceId, payload, checksum }) }],',
                '        });',
                '      }',
                '',
                "      client.emit('migrate:complete', { traceId, nodesAffected: this.activeNodes.size });",
                '    } catch (err) {',
                "      this.logger.error('Migration failed: ' + err.message);",
                '    } finally {',
                '      this.migrationLock = false;',
                '    }',
                '  }',
                '}'
            ]
        },
        'auth-middleware.ts': {
            lang: 'TypeScript', icon: 'ts', folder: 'src',
            symbol: 'AuthMiddleware › use',
            code: [
                "import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';",
                "import { JwtService } from '@nestjs/jwt';",
                "import type { Request, Response, NextFunction } from 'express';",
                '',
                'const PUBLIC_ROUTES = [',
                "  '/health',",
                "  '/metrics',",
                "  '/auth/login',",
                '];',
                '',
                '@Injectable()',
                'export class AuthMiddleware implements NestMiddleware {',
                '  constructor(private readonly jwt: JwtService) {}',
                '',
                '  async use(req: Request, res: Response, next: NextFunction) {',
                '    if (PUBLIC_ROUTES.includes(req.path)) return next();',
                '',
                "    const header = req.headers.authorization ?? '';",
                "    const [scheme, token] = header.split(' ');",
                '',
                "    if (scheme !== 'Bearer' || !token) {",
                "      throw new UnauthorizedException('Missing bearer token');",
                '    }',
                '',
                '    try {',
                '      const claims = await this.jwt.verifyAsync(token, {',
                '        secret: process.env.JWT_SECRET,',
                "        issuer: 'auth.internal',",
                '      });',
                '      req.user = { id: claims.sub, roles: claims.roles ?? [] };',
                '      next();',
                '    } catch {',
                "      throw new UnauthorizedException('Token expired or invalid');",
                '    }',
                '  }',
                '}'
            ]
        },
        'webpack.config.js': {
            lang: 'JavaScript', icon: 'js', folder: 'config',
            symbol: 'module.exports',
            code: [
                "const path = require('path');",
                "const TerserPlugin = require('terser-webpack-plugin');",
                '',
                'module.exports = {',
                "  mode: process.env.NODE_ENV || 'production',",
                "  entry: { main: './src/index.ts', worker: './src/worker.ts' },",
                '  output: {',
                "    path: path.resolve(__dirname, '..', 'dist'),",
                "    filename: '[name].[contenthash:8].js',",
                '    clean: true,',
                '  },',
                '  resolve: {',
                "    extensions: ['.ts', '.tsx', '.js'],",
                "    alias: { '@': path.resolve(__dirname, '..', 'src') },",
                '  },',
                '  module: {',
                '    rules: [',
                "      { test: /\\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },",
                "      { test: /\\.css$/, use: ['style-loader', 'css-loader'] },",
                '    ],',
                '  },',
                '  optimization: {',
                '    minimize: true,',
                '    minimizer: [new TerserPlugin({ parallel: true })],',
                "    splitChunks: { chunks: 'all', maxInitialRequests: 4 },",
                '  },',
                "  devtool: 'source-map',",
                '};'
            ]
        },
        'tsconfig.json': {
            lang: 'JSON', icon: 'json', folder: 'config',
            symbol: 'compilerOptions',
            code: [
                '{',
                '  "compilerOptions": {',
                '    "target": "ES2022",',
                '    "module": "commonjs",',
                '    "lib": ["ES2022", "DOM"],',
                '    "outDir": "./dist",',
                '    "rootDir": "./src",',
                '    "strict": true,',
                '    "esModuleInterop": true,',
                '    "skipLibCheck": true,',
                '    "experimentalDecorators": true,',
                '    "emitDecoratorMetadata": true,',
                '    "resolveJsonModule": true,',
                '    "forceConsistentCasingInFileNames": true',
                '  },',
                '  "include": ["src/**/*"],',
                '  "exclude": ["node_modules", "dist"]',
                '}'
            ]
        }
    };

    var VSC_TREE = [
        { type: 'folder', name: 'src', open: true, children: [
            { type: 'file', name: 'server-migration.ts' },
            { type: 'file', name: 'auth-middleware.ts' },
            { type: 'file', name: 'database-service.ts' },
            { type: 'file', name: 'index.ts' }
        ]},
        { type: 'folder', name: 'components', children: [
            { type: 'file', name: 'Dashboard.tsx' },
            { type: 'file', name: 'NodeList.tsx' }
        ]},
        { type: 'folder', name: 'config', open: true, children: [
            { type: 'file', name: 'webpack.config.js' },
            { type: 'file', name: 'tsconfig.json' }
        ]},
        { type: 'folder', name: 'tests', children: [
            { type: 'file', name: 'migration.spec.ts' }
        ]},
        { type: 'folder', name: 'node_modules' },
        { type: 'file', name: 'package.json' },
        { type: 'file', name: 'README.md' }
    ];

    var openTabs = ['server-migration.ts', 'webpack.config.js'];
    var activeFile = 'server-migration.ts';
    var cursor = { line: 1, col: 1 };
    var charWidth = 0;

    var ICON_CHEV = '<svg class="vsc-tree-chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>';
    var ICON_FOLDER = '<svg class="vsc-tree-ico" viewBox="0 0 16 16" fill="none" stroke="#c09553" stroke-width="1.2" stroke-linejoin="round"><path d="M1.5 3.5h4l1.2 1.6h7.8v7.4H1.5z"/></svg>';
    var ICON_CLOSE = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M1 1l8 8M9 1L1 9"/></svg>';

    function fileIconSvg(name) {
        var ext = name.split('.').pop();
        var color = ext === 'ts' ? '#3178c6' : ext === 'tsx' ? '#3178c6'
            : ext === 'js' ? '#cbb723' : ext === 'json' ? '#cbb723' : '#8b8b8b';
        return '<svg class="vsc-tree-ico" viewBox="0 0 16 16" fill="none" stroke="' + color +
            '" stroke-width="1.2" stroke-linejoin="round"><path d="M9 1.5H4.5v13h7V4z"/><path d="M9 1.5V4h2.5"/></svg>';
    }

    function renderTree() {
        var host = document.getElementById('vscTree');
        if (!host) return;
        function walk(nodes, depth) {
            var out = '';
            nodes.forEach(function (n) {
                var pad = 8 + depth * 12;
                if (n.type === 'folder') {
                    var open = !!n.open;
                    out += '<div class="vsc-tree-row' + (open ? ' vsc-open' : '') + '" data-folder="' + escGhost(n.name) +
                        '" style="padding-left:' + pad + 'px">' + ICON_CHEV + ICON_FOLDER +
                        '<span>' + escGhost(n.name) + '</span></div>';
                    out += '<div class="vsc-tree-children' + (open ? ' vsc-open' : '') + '" data-children="' + escGhost(n.name) + '">' +
                        walk(n.children || [], depth + 1) + '</div>';
                } else {
                    out += '<div class="vsc-tree-row' + (n.name === activeFile ? ' vsc-tree-active' : '') +
                        '" data-file="' + escGhost(n.name) + '" style="padding-left:' + (pad + 18) + 'px">' +
                        fileIconSvg(n.name) + '<span>' + escGhost(n.name) + '</span></div>';
                }
            });
            return out;
        }
        host.innerHTML = walk(VSC_TREE, 0);
    }

    function renderTabs() {
        var host = document.getElementById('vscTabs');
        if (!host) return;
        var html = '';
        openTabs.forEach(function (name) {
            var f = VSC_FILES[name];
            var ico = f ? f.icon : 'json';
            var label = ico === 'ts' ? 'TS' : ico === 'js' ? 'JS' : '{}';
            html += '<div class="vsc-tab' + (name === activeFile ? ' vsc-tab-active' : '') + '" data-tab="' + escGhost(name) + '">' +
                '<span class="vsc-tab-icon vsc-ti-' + ico + '">' + label + '</span>' + escGhost(name) +
                '<span class="vsc-tab-close" data-close="' + escGhost(name) + '">' + ICON_CLOSE + '</span></div>';
        });
        host.innerHTML = html;
    }

    function renderBreadcrumbs() {
        var host = document.getElementById('vscBreadcrumbs');
        var f = VSC_FILES[activeFile];
        if (!host || !f) return;
        host.innerHTML = escGhost(f.folder) + ' <span class="vsc-bc-sep">›</span> ' +
            escGhost(activeFile) + ' <span class="vsc-bc-sep">›</span> ' + escGhost(f.symbol);
    }

    function measureCharWidth() {
        if (charWidth) return charWidth;
        var probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;' +
            "font-family:'Cascadia Code','Fira Code','JetBrains Mono',Consolas,'Courier New',monospace;font-size:13px";
        probe.textContent = '0123456789';
        document.body.appendChild(probe);
        charWidth = probe.getBoundingClientRect().width / 10 || 7.8;
        probe.remove();
        return charWidth;
    }

    var typingTimer = null;

    function renderEditor(animate) {
        var editor = document.getElementById('vscEditorContent');
        var file = VSC_FILES[activeFile];
        if (!editor || !file) return;
        if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }

        var lines = file.code;
        var showAtOnce = (animate && !reducedMotion()) ? Math.min(38, lines.length) : lines.length;

        var html = '';
        for (var i = 0; i < showAtOnce; i++) html += lineHtml(i, lines[i]);
        editor.innerHTML = html;
        editor.scrollTop = 0;
        cursor = { line: 1, col: 1 };
        updateCursorLabel();
        renderMinimap();

        if (showAtOnce < lines.length) {
            var next = showAtOnce;
            typingTimer = setInterval(function () {
                if (next >= lines.length) { clearInterval(typingTimer); typingTimer = null; renderMinimap(); return; }
                editor.insertAdjacentHTML('beforeend', lineHtml(next, lines[next]));
                setActiveLine(next + 1, 1, true);
                next++;
            }, 620 + Math.random() * 900);
        }
    }

    function lineHtml(idx, text) {
        return '<div class="vsc-line" data-line="' + (idx + 1) + '"><span class="vsc-line-num">' + (idx + 1) +
            '</span><span class="vsc-line-code">' + highlight(text) + '</span></div>';
    }

    function renderMinimap() {
        var host = document.getElementById('vscMinimap');
        var file = VSC_FILES[activeFile];
        if (!host || !file) return;
        var html = '';
        file.code.forEach(function (l) {
            var t = l.trimStart();
            if (!t) { html += '<div class="vsc-mm-line"></div>'; return; }
            var indent = (l.length - t.length) * 0.8;
            var w = Math.min(64, t.length * 0.85);
            html += '<div class="vsc-mm-line ' + mmClass(l) + '" style="margin-left:' + indent.toFixed(1) +
                'px;width:' + w.toFixed(1) + 'px;background:currentColor"></div>';
        });
        host.innerHTML = html;
    }

    function setActiveLine(lineNo, col, skipScroll) {
        var editor = document.getElementById('vscEditorContent');
        if (!editor) return;
        var prev = editor.querySelector('.vsc-active-line');
        if (prev) {
            prev.classList.remove('vsc-active-line');
            var oldCaret = prev.querySelector('.vsc-caret');
            if (oldCaret) oldCaret.remove();
        }
        var line = editor.querySelector('.vsc-line[data-line="' + lineNo + '"]');
        if (!line) return;
        line.classList.add('vsc-active-line');
        var code = line.querySelector('.vsc-line-code');
        var text = code ? code.textContent : '';
        var maxCol = text.length + 1;
        col = Math.max(1, Math.min(maxCol, col || 1));
        if (code) {
            var caret = document.createElement('span');
            caret.className = 'vsc-caret';
            caret.style.cssText = 'position:absolute;left:' + ((col - 1) * measureCharWidth()).toFixed(1) + 'px;top:2px';
            code.style.position = 'relative';
            code.appendChild(caret);
        }
        cursor = { line: lineNo, col: col };
        updateCursorLabel();
        if (!skipScroll && line.scrollIntoView) line.scrollIntoView({ block: 'nearest' });
        else if (skipScroll) editor.scrollTop = editor.scrollHeight;
    }

    function updateCursorLabel() {
        var el = document.getElementById('vscCursorPos');
        if (el) el.textContent = 'Ln ' + cursor.line + ', Col ' + cursor.col;
        var lang = document.getElementById('vscLanguage');
        var f = VSC_FILES[activeFile];
        if (lang && f) lang.textContent = f.lang;
    }

    function openFile(name, animate) {
        if (!VSC_FILES[name]) return;
        activeFile = name;
        if (openTabs.indexOf(name) === -1) openTabs.push(name);
        renderTabs();
        renderTree();
        renderBreadcrumbs();
        renderEditor(!!animate);
        var title = document.getElementById('vscWindowTitle');
        if (title) title.textContent = name + ' — MyProject — Visual Studio Code';
        if (ghostActive && activeSkin === 'vscode') {
            document.title = name + ' — MyProject — Visual Studio Code';
        }
    }

    function closeTab(name) {
        var i = openTabs.indexOf(name);
        if (i === -1 || openTabs.length === 1) return;
        openTabs.splice(i, 1);
        if (activeFile === name) openFile(openTabs[Math.max(0, i - 1)], false);
        else renderTabs();
    }

    // ── Terminal ──
    var TERM_LINES = [
        { t: '<span class="vsc-t-path">~/projects/myproject</span> <span class="vsc-t-br">(main)</span> $ npm run build', d: 0 },
        { t: '', d: 120 },
        { t: '<span class="vsc-t-dim">&gt; myproject@3.2.1 build</span>', d: 90 },
        { t: '<span class="vsc-t-dim">&gt; webpack --config config/webpack.config.js</span>', d: 90 },
        { t: '', d: 200 },
        { t: '<span class="vsc-t-info">[webpack]</span> compiling with 2 entrypoints…', d: 500 },
        { t: '<span class="vsc-t-dim">  asset main.4f2b91ae.js    284 KiB  [emitted] [minimized]</span>', d: 380 },
        { t: '<span class="vsc-t-dim">  asset worker.9c1d0f33.js   61 KiB  [emitted] [minimized]</span>', d: 220 },
        { t: '<span class="vsc-t-dim">  asset main.4f2b91ae.js.map 1.1 MiB [emitted] [dev]</span>', d: 200 },
        { t: '', d: 150 },
        { t: '<span class="vsc-t-warn">WARNING</span> asset size limit: main.4f2b91ae.js (284 KiB)', d: 400 },
        { t: '', d: 150 },
        { t: '<span class="vsc-t-ok">webpack 5.94.0 compiled with 1 warning in 8213 ms</span>', d: 700 },
        { t: '', d: 200 },
        { t: '<span class="vsc-t-path">~/projects/myproject</span> <span class="vsc-t-br">(main)</span> $ <span class="vsc-cursor"></span>', d: 300 }
    ];
    var termTimer = null;

    function runTerminal() {
        var term = document.getElementById('vscTerminal');
        if (!term) return;
        if (termTimer) { clearTimeout(termTimer); termTimer = null; }
        term.innerHTML = '';
        if (reducedMotion()) {
            term.innerHTML = TERM_LINES.map(function (l) { return '<div>' + l.t + '</div>'; }).join('');
            return;
        }
        var i = 0;
        (function step() {
            if (i >= TERM_LINES.length) { termTimer = null; return; }
            var l = TERM_LINES[i++];
            termTimer = setTimeout(function () {
                term.insertAdjacentHTML('beforeend', '<div>' + l.t + '</div>');
                term.scrollTop = term.scrollHeight;
                step();
            }, l.d);
        })();
    }

    function togglePanel(force) {
        var panel = document.getElementById('vscPanel');
        if (!panel) return;
        var open = (typeof force === 'boolean') ? force : !panel.classList.contains('vsc-panel-open');
        panel.classList.toggle('vsc-panel-open', open);
        if (open) runTerminal();
        else if (termTimer) { clearTimeout(termTimer); termTimer = null; }
    }

    function wireVSCode() {
        var root = document.getElementById('ghostModeVSCode');
        if (!root || root.dataset.wired) return;
        root.dataset.wired = '1';

        document.getElementById('vscTree').addEventListener('click', function (e) {
            var row = e.target.closest('.vsc-tree-row');
            if (!row) return;
            if (row.dataset.folder) {
                var kids = row.nextElementSibling;
                var open = !row.classList.contains('vsc-open');
                row.classList.toggle('vsc-open', open);
                if (kids && kids.classList.contains('vsc-tree-children')) kids.classList.toggle('vsc-open', open);
                var node = findFolder(VSC_TREE, row.dataset.folder);
                if (node) node.open = open;
            } else if (row.dataset.file) {
                if (VSC_FILES[row.dataset.file]) openFile(row.dataset.file, false);
            }
        });

        document.getElementById('vscTabs').addEventListener('click', function (e) {
            var close = e.target.closest('[data-close]');
            if (close) { e.stopPropagation(); closeTab(close.dataset.close); return; }
            var tab = e.target.closest('[data-tab]');
            if (tab) openFile(tab.dataset.tab, false);
        });

        document.getElementById('vscEditorContent').addEventListener('mousedown', function (e) {
            var line = e.target.closest('.vsc-line');
            if (!line) return;
            var code = line.querySelector('.vsc-line-code');
            var col = 1;
            if (code) {
                var x = e.clientX - code.getBoundingClientRect().left;
                col = Math.max(1, Math.round(x / measureCharWidth()) + 1);
            }
            setActiveLine(+line.dataset.line, col);
        });

        document.getElementById('vscPanelClose').addEventListener('click', function () { togglePanel(false); });
    }

    function findFolder(nodes, name) {
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].type === 'folder') {
                if (nodes[i].name === name) return nodes[i];
                var hit = findFolder(nodes[i].children || [], name);
                if (hit) return hit;
            }
        }
        return null;
    }

    function handleVSCodeKey(e) {
        var file = VSC_FILES[activeFile];
        var max = file ? file.code.length : 1;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveLine(Math.min(max, cursor.line + 1), cursor.col); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveLine(Math.max(1, cursor.line - 1), cursor.col); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); setActiveLine(cursor.line, cursor.col - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); setActiveLine(cursor.line, cursor.col + 1); }
        else if (e.key === 'PageDown') { e.preventDefault(); setActiveLine(Math.min(max, cursor.line + 20), cursor.col); }
        else if (e.key === 'PageUp') { e.preventDefault(); setActiveLine(Math.max(1, cursor.line - 20), cursor.col); }
        else if (e.key === 'Home') { e.preventDefault(); setActiveLine(cursor.line, 1); }
        else if (e.key === 'End') { e.preventDefault(); setActiveLine(cursor.line, 999); }
        else if (e.key === '`' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); togglePanel(); }
        else if ((e.key === 'b' || e.key === 'B') && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            var sb = document.querySelector('#ghostModeVSCode .vsc-sidebar');
            if (sb) sb.style.display = (sb.style.display === 'none') ? '' : 'none';
        }
    }

    /* ══════════════════════════════════════════════════════════
       Gemeinsame Steuerung
       ══════════════════════════════════════════════════════════ */

    // Fett/Kursiv heissen im Menueband je nach Sprache F/K oder B/I. Einzelne
    // Buchstaben nimmt die i18n-Pipeline nicht auf (zu kurz), also hier setzen.
    function localizeRibbon() {
        var b = document.getElementById('ghostBoldBtn');
        var i = document.getElementById('ghostItalicBtn');
        if (b) b.textContent = T.bold;
        if (i) i.textContent = T.italic;
    }

    // Muss inline gesetzt werden: _showGhostButton() schreibt style.display
    // direkt, damit gewinnt es gegen jede CSS-Regel.
    var panicWasVisible = false;
    function togglePanicButton(show) {
        var btn = document.getElementById('ghostPanicBtn');
        if (!btn) return;
        if (!show) {
            panicWasVisible = btn.style.display !== 'none';
            btn.style.display = 'none';
        } else if (panicWasVisible) {
            btn.style.display = 'flex';
        }
    }

    var prewarmed = { excel: false, vscode: false };

    function prewarm(skin) {
        if (prewarmed[skin]) return;
        prewarmed[skin] = true;
        if (skin === 'excel') { localizeRibbon(); renderSheet(); wireSheet(); }
        else { renderTree(); renderTabs(); renderBreadcrumbs(); renderEditor(false); wireVSCode(); }
    }

    window.toggleGhostMode = function () {
        var excelOverlay = document.getElementById('ghostModeOverlay');
        var vscOverlay = document.getElementById('ghostModeVSCode');
        if (!excelOverlay || !vscOverlay) return;

        ghostActive = !ghostActive;

        if (ghostActive) {
            activeSkin = getGhostSkin();
            prewarm(activeSkin);
            if (activeSkin === 'vscode') {
                vscOverlay.classList.add('active');
                vscOverlay.setAttribute('aria-hidden', 'false');
                disguiseTab('vscode', activeFile + ' — MyProject — Visual Studio Code');
            } else {
                excelOverlay.classList.add('active');
                excelOverlay.setAttribute('aria-hidden', 'false');
                padSheetRows();
                disguiseTab('excel', T.docTitle(new Date().getFullYear()));
            }
            togglePanicButton(false);
            if (typeof uEvent === 'function') { try { uEvent('ghost_mode_on', { skin: activeSkin }); } catch (err) {} }
        } else {
            stopEdit(false);
            excelOverlay.classList.remove('active');
            vscOverlay.classList.remove('active');
            excelOverlay.setAttribute('aria-hidden', 'true');
            vscOverlay.setAttribute('aria-hidden', 'true');
            if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }
            if (termTimer) { clearTimeout(termTimer); termTimer = null; }
            togglePanel(false);
            togglePanicButton(true);
            restoreTab();
            activeSkin = null;
        }
    };

    document.addEventListener('keydown', function (e) {
        // Escape kommt zuerst — sonst sitzt man im Ghost Mode fest
        if (e.key === 'Escape' && ghostActive && !editing) {
            e.preventDefault();
            e.stopPropagation();
            toggleGhostMode();
            return;
        }
        var scOn = (typeof shortcutsEnabled === 'function') && shortcutsEnabled();
        if (scOn && e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
            e.preventDefault();
            e.stopPropagation();
            toggleGhostMode();
            return;
        }
        if (!ghostActive) return;
        if (activeSkin === 'excel') handleSheetKey(e);
        else if (activeSkin === 'vscode') handleVSCodeKey(e);
    }, true);

    // ── Panic-Button ──
    window._showGhostButton = function () {
        var btn = document.getElementById('ghostPanicBtn');
        if (btn) { btn.style.display = 'flex'; btn.classList.add('visible'); }
    };

    document.addEventListener('DOMContentLoaded', function () {
        // _introSkipped: landing.js hat das Intro wegen eines #p2p=-Deep-Links
        // uebersprungen, ohne 'pro_intro_seen' zu setzen — der Button gehoert
        // trotzdem sichtbar, sonst fehlt er genau in dieser einen Sitzung.
        if (localStorage.getItem('pro_intro_seen') === 'true' || window._introSkipped) {
            window._showGhostButton();
        }
        // Skin im Leerlauf vorbereiten: Der Panic-Button muss sofort schalten,
        // nicht erst ein Raster mit 40 Zeilen aufbauen.
        var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1200); };
        idle(function () { try { prewarm(getGhostSkin()); } catch (err) {} });
    });

})();
