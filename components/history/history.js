// ═══ HISTORY MODULE ═══
// Verlauf = Archiv-Ansicht ueber ALLE Eintraege. Drei Teile:
//   1. Zeitband   — Wochen-/Monatssaeulen; Ziehen setzt den Datumsfilter.
//   2. Werkzeuge  — Typ-Chips mit Anzahl, Suche mit Operatoren, Sortierung, Dichte.
//   3. Liste      — stueckweise gerendert (60er-Bloecke), Monatsbaender kleben oben.
//
// Bewusst NICHT drin: eine zweite Kopie der Typ-Farben (kommt aus getTypeRgb),
// eine eigene Wochen-Rechnung (getWeek aus utils.js) und ein Nenner ohne Namen —
// die Saeulenhoehe misst gegen die hoechste Woche des Bestands, und die Zahl
// steht am Plot.

    window.pendingHighlightId = null;

    const HL_PAGE = 60;                  // Zeilen je Nachschub-Block
    const HL_MAX_BUCKETS = 180;          // darueber wird das Zeitband monatsweise

    let hlBuckets = [];                  // [{key,start,end,worked,expected,count,diff}]
    let hlDataBounds = null;             // [erstes, letztes Eintragsdatum] — nicht die Bucket-Raender
    let hlBucketMode = 'week';
    let hlRendered = 0;                  // wie viele Zeilen stehen schon im DOM
    let hlLastSorted = [];               // Ergebnis des letzten Filterlaufs
    let hlSearchTimer = null;
    let hlDragState = null;
    let hlBandSig = '';                  // Signatur des gezeichneten Zeitbands

    // ── Sprache ───────────────────────────────────────────────────────────
    // Die Standard-Typen tragen im Datenmodell deutsche Labels (das ist Bestand,
    // kein UI-Text). Ein eigener Typ traegt den Namen, den der Nutzer getippt hat —
    // der bleibt in beiden Sprachen stehen, weil er DATEN ist.
    const HL_TYPE_EN = {
        work: 'Work', school: 'Vocational school', vacation: 'Vacation',
        gleittag: 'Flex day', sick: 'Sick', holiday: 'Holiday', korrektur: 'Correction'
    };
    function hlIsEN() { return document.documentElement.lang === 'en'; }
    function hlT(de, en) { return hlIsEN() ? en : de; }

    function hlTypeLabel(id) {
        const renamed = ((typeof data !== 'undefined' && data && data.entryTypeOverrides) || {})[id];
        if (hlIsEN() && !(renamed && renamed.label) && HL_TYPE_EN[id]) return HL_TYPE_EN[id];
        if (typeof getTypeLabel === 'function') return getTypeLabel(id);
        return id;
    }

    // Stunden im Zahlformat der Seite (8,75 auf /de/, 8.75 auf /en/) und mit der
    // Rundung aus den Einstellungen — nie ein festes toFixed().
    function hlNum(h, digits) {
        const d = typeof digits === 'number' ? digits : 2;
        const v = (typeof roundHours === 'function') ? roundHours(h || 0, d) : (h || 0);
        return v.toLocaleString(mwlLocale(), { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    function hlSigned(h, digits) { return (h >= 0 ? '+' : '−') + hlNum(Math.abs(h), digits); }

    // Ein volles Tagessoll — der Massstab des Abweichungsbalkens. Kommt aus
    // data.settings (Legacy-Feld fuer den Hauptjob, plus eigene Stunden der
    // Sekundaer-Jobs), nie aus einer festen 8.
    function hlDayTarget() {
        const s = (typeof data !== 'undefined' && data && data.settings) || {};
        let max = 0;
        const scan = (arr) => { if (Array.isArray(arr)) arr.forEach(h => { const v = parseFloat(h) || 0; if (v > max) max = v; }); };
        scan(s.hours);
        if (Array.isArray(s.jobs)) s.jobs.forEach(j => scan(j && j.hours));
        return max > 0 ? max : 8;
    }

    function hlCountsAsWork(typeId) {
        if (typeof getEntryTypeInfo === 'function') {
            const i = getEntryTypeInfo(typeId);
            if (i && String(typeId).startsWith('custom-')) return i.countsAsWork === true;
        }
        return !String(typeId).startsWith('custom-');
    }

    // Notiz = alles NACH dem ersten Segment des Pipe-Strings. Der erste Teil ist
    // vom System erzeugt ("07:30-16:30 (8.00h)") und steht rechts schon als Zahl.
    function hlUserNote(e) {
        if (typeof activityUserNote === 'function') return activityUserNote(e);
        if (e.isPeriod) return String(e.info || '').trim();
        const parts = String(e.info || '').split('|').map(s => s.trim()).filter(Boolean);
        while (parts.length && parts[parts.length - 1].startsWith('↪')) parts.pop();
        return parts.length > 1 ? parts.slice(1).join(' · ') : '';
    }

    function hlISO(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function hlParseISO(s) { return new Date(s + 'T00:00:00'); }

    // ══════════════════════════════════════════════════════════════════════
    //  SUCHE MIT OPERATOREN
    //  ">8" / "<6" / ">=7,5" filtern auf Stunden, "#Text" auf das Projekt,
    //  alles Uebrige ist Volltext ueber Notiz, Projekt und Typ-Bezeichnung.
    //  Der erkannte Teil steht sichtbar unter der Leiste — ohne das waere ein
    //  Operator nicht von einem Suchwort ohne Treffer zu unterscheiden.
    // ══════════════════════════════════════════════════════════════════════
    function hlParseQuery(raw) {
        const q = { text: '', project: '', min: null, max: null, tokens: [] };
        const rest = [];
        String(raw || '').trim().split(/\s+/).filter(Boolean).forEach(part => {
            let m = part.match(/^(>=|<=|>|<)(\d+(?:[.,]\d+)?)$/);
            if (m) {
                const v = parseFloat(m[2].replace(',', '.'));
                if (m[1] === '>' || m[1] === '>=') { q.min = v; q.minIncl = m[1] === '>='; }
                else { q.max = v; q.maxIncl = m[1] === '<='; }
                q.tokens.push({ kind: 'hours', text: m[1] + hlNum(v, v % 1 ? 2 : 0) + ' h' });
                return;
            }
            if (part.length > 1 && part[0] === '#') {
                q.project = part.slice(1).toLowerCase();
                q.tokens.push({ kind: 'project', text: hlT('Projekt', 'Project') + ': ' + part.slice(1) });
                return;
            }
            rest.push(part);
        });
        q.text = rest.join(' ').toLowerCase();
        if (q.text) q.tokens.push({ kind: 'text', text: hlT('Text', 'Text') + ': ' + q.text });
        return q;
    }
    window.hlParseQuery = hlParseQuery;

    function hlRenderParsed(q, rawLen) {
        const box = document.getElementById('hlParsed');
        if (!box) return;
        if (!rawLen || !q.tokens.length) { box.hidden = true; box.innerHTML = ''; return; }
        const onlyText = q.tokens.length === 1 && q.tokens[0].kind === 'text';
        if (onlyText) { box.hidden = true; box.innerHTML = ''; return; }
        box.hidden = false;
        box.innerHTML = '<span class="hl-parsed__lbl">' + hlT('Verstanden als', 'Read as') + '</span>'
            + q.tokens.map(t => '<span class="hl-parsed__tok" data-kind="' + t.kind + '">' + esc(t.text) + '</span>').join('');
    }

    function hlClearSearch() {
        const inp = document.getElementById('historyFilterSearch');
        if (!inp) return;
        inp.value = '';
        renderHistoryView();
        inp.focus();
    }
    window.hlClearSearch = hlClearSearch;

    // ══════════════════════════════════════════════════════════════════════
    //  TYP-CHIPS
    //  Gezaehlt wird auf den Daten OHNE den Typ-Filter, sonst stuenden nach dem
    //  ersten Klick ueberall Nullen. Nur Typen, die im Zeitraum vorkommen —
    //  ein Filter fuer null Treffer ist ein Knopf ohne Wirkung.
    // ══════════════════════════════════════════════════════════════════════
    function renderHistoryTypeChips(baseSet, activeType) {
        const wrap = document.getElementById('hlTypeChips');
        if (!wrap) return;
        const counts = {};
        baseSet.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });

        const order = (typeof getAllEntryTypes === 'function') ? getAllEntryTypes().map(t => t.id) : [];
        const present = Object.keys(counts).sort((a, b) => {
            const ia = order.indexOf(a), ib = order.indexOf(b);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        });

        let html = '<button class="hl-chip' + (activeType === 'all' ? ' active' : '') + '" data-type="all" onclick="hlSetType(\'all\')">'
                 + '<span class="hl-chip__lbl">' + hlT('Alle', 'All') + '</span>'
                 + '<span class="hl-chip__n">' + baseSet.length + '</span></button>';

        present.forEach(id => {
            const rgb = (typeof getTypeRgb === 'function') ? getTypeRgb(id) : '148,163,184';
            const icon = (typeof getTypeIconHTML === 'function') ? getTypeIconHTML(id, 13) : '';
            html += '<button class="hl-chip' + (activeType === id ? ' active' : '') + '" data-type="' + esc(id) + '"'
                 + ' style="--type-rgb:' + rgb + '" onclick="hlSetType(\'' + esc(id) + '\')">'
                 + '<span class="hl-chip__ico" aria-hidden="true">' + icon + '</span>'
                 + '<span class="hl-chip__lbl">' + esc(hlTypeLabel(id)) + '</span>'
                 + '<span class="hl-chip__n">' + counts[id] + '</span></button>';
        });
        wrap.innerHTML = html;
    }

    function hlSetType(type) {
        const sel = document.getElementById('historyFilterType');
        if (!sel) return;
        // Der Zustand liegt im <select>; die Chips sind nur seine Oberflaeche.
        if (!Array.prototype.some.call(sel.options, o => o.value === type)) {
            const opt = document.createElement('option');
            opt.value = type; opt.textContent = type;
            sel.appendChild(opt);
        }
        sel.value = type;
        renderHistoryView();
    }
    window.hlSetType = hlSetType;

    // Job-Filter erscheint nur, wenn es ueberhaupt mehrere Jobs gibt.
    function hlRenderJobFilter() {
        const sel = document.getElementById('hlJobFilter');
        if (!sel) return;
        const multi = (typeof hasMultipleJobs === 'function') && hasMultipleJobs();
        sel.hidden = !multi;
        if (!multi) { sel.value = 'all'; return; }
        const jobs = (data.settings && Array.isArray(data.settings.jobs)) ? data.settings.jobs : [];
        const sig = 'all|' + jobs.map(j => j.id + ':' + j.name).join('|');
        if (sel.dataset.sig === sig) return;
        sel.dataset.sig = sig;
        const prev = sel.value || 'all';
        sel.innerHTML = '<option value="all">' + esc(hlT('Alle Jobs', 'All jobs')) + '</option>'
            + jobs.map(j => '<option value="' + esc(j.id) + '">' + esc(j.name) + '</option>').join('');
        sel.value = Array.prototype.some.call(sel.options, o => o.value === prev) ? prev : 'all';
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ZEITBAND
    // ══════════════════════════════════════════════════════════════════════
    function hlBuildBuckets() {
        const all = Array.isArray(data.entries) ? data.entries : [];
        hlBuckets = [];
        if (!all.length) { hlDataBounds = null; return; }

        let min = all[0].date, max = all[0].date;
        all.forEach(e => { if (e.date < min) min = e.date; if (e.date > max) max = e.date; });
        hlDataBounds = [min, max];

        const dMin = hlParseISO(min), dMax = hlParseISO(max);
        const weeks = Math.ceil((dMax - dMin) / 604800000) + 1;
        hlBucketMode = weeks > HL_MAX_BUCKETS ? 'month' : 'week';

        // 🔴 Schluessel und Kastenanfang muessen DASSELBE Format haben. Eine frühere
        // Fassung bildete den Monatsschluessel als "2024-08", legte die Kaesten aber
        // unter "2024-08-01" an — im Monatsmodus (ab etwa 3,5 Jahren Bestand) traf
        // dann kein einziger Eintrag seinen Kasten, und das Band stand leer da,
        // ohne Fehlermeldung. Deshalb hier EINE Funktion, die beides liefert.
        const bucketStart = (iso) => {
            const d = hlParseISO(iso);
            if (hlBucketMode === 'month') { d.setDate(1); return d; }
            d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // Montag der ISO-Woche
            return d;
        };
        const keyOf = (iso) => hlISO(bucketStart(iso));

        // Leere Kaesten muessen mit: eine Luecke im Band IST die Aussage
        // ("hier war zwei Wochen nichts"). Ohne sie ruecken die Saeulen zusammen,
        // und das Band zeigt eine gleichmaessige Auslastung, die es nie gab.
        const byKey = {};
        const cursor = bucketStart(min);
        const stop = bucketStart(max);
        while (cursor <= stop) {
            const key = hlISO(cursor);
            const end = new Date(cursor);
            if (hlBucketMode === 'month') { end.setMonth(end.getMonth() + 1); end.setDate(0); }
            else { end.setDate(end.getDate() + 6); }
            byKey[key] = { key, start: key, end: hlISO(end), worked: 0, expected: 0, count: 0, diff: 0 };
            hlBuckets.push(byKey[key]);
            if (hlBucketMode === 'month') { cursor.setDate(1); cursor.setMonth(cursor.getMonth() + 1); }
            else cursor.setDate(cursor.getDate() + 7);
        }

        all.forEach(e => {
            const b = byKey[keyOf(e.date)];
            if (!b) return;
            b.count++;
            b.worked += parseFloat(e.worked) || 0;
            if (hlCountsAsWork(e.type)) {
                b.expected += parseFloat(e.expected) || 0;
                b.diff += parseFloat(e.diff) || 0;
            }
        });
    }

    function hlRenderBand() {
        const bars = document.getElementById('hlBandBars');
        const axis = document.getElementById('hlBandAxis');
        const scale = document.getElementById('hlBandScale');
        const band = document.querySelector('.hl-band');
        if (!bars || !band) return;

        if (!hlBuckets.length) {
            band.hidden = true;
            return;
        }
        band.hidden = false;

        // Nenner mit Namen: die hoechste Woche (bzw. der hoechste Monat) im Bestand.
        // Die Soll-Spur wird mitgemessen, sonst ragt sie bei einer Urlaubswoche raus.
        const max = hlBuckets.reduce((m, b) => Math.max(m, b.worked, b.expected), 0) || 1;
        if (scale) scale.textContent = Math.round(max) + ' h';
        bars.setAttribute('aria-label', hlT(
            'Zeitband: ' + hlBuckets.length + (hlBucketMode === 'month' ? ' Monate' : ' Wochen') + ', höchster Wert ' + hlNum(max, 0) + ' Stunden',
            'Time band: ' + hlBuckets.length + (hlBucketMode === 'month' ? ' months' : ' weeks') + ', peak ' + hlNum(max, 0) + ' hours'));

        // Soll-Spur steht im Markup VOR der Fuellung — eine Bezugslinie gehoert
        // hinter die Marke, die sie schneidet (sonst verschwindet sie an langen Wochen).
        bars.innerHTML = hlBuckets.map((b, i) =>
            '<span class="hl-bar" data-i="' + i + '">'
          + '<span class="hl-bar__soll" style="height:' + (b.expected / max * 100).toFixed(2) + '%"></span>'
          + '<span class="hl-bar__fill" style="height:' + (b.worked / max * 100).toFixed(2) + '%"></span>'
          + '</span>').join('');

        // Jahreswechsel als Achsenmarken — nicht jede Woche beschriften.
        if (axis) {
            const marks = [];
            let lastYear = null;
            hlBuckets.forEach((b, i) => {
                const y = b.start.slice(0, 4);
                if (y !== lastYear) { marks.push({ y, pos: i / hlBuckets.length * 100 }); lastYear = y; }
            });
            axis.innerHTML = marks.map(m =>
                '<span class="hl-band__year" style="left:' + m.pos.toFixed(2) + '%">' + m.y + '</span>').join('');
        }
        hlPaintSelection();
    }

    // Auswahl aus den Datumsfeldern aufs Band malen (nicht umgekehrt — das
    // <input type="date"> bleibt der eine Zustand, das Band seine Oberflaeche).
    function hlPaintSelection() {
        const sel = document.getElementById('hlBandSel');
        const mL = document.getElementById('hlMaskL');
        const mR = document.getElementById('hlMaskR');
        if (!sel || !hlBuckets.length) return;
        const s = (document.getElementById('historyFilterStart') || {}).value || '';
        const e = (document.getElementById('historyFilterEnd') || {}).value || '';
        if (!s && !e) {
            sel.hidden = true; if (mL) mL.style.width = '0%'; if (mR) mR.style.width = '0%';
            return;
        }
        const n = hlBuckets.length;
        let from = 0, to = n - 1;
        if (s) { const i = hlBuckets.findIndex(b => b.end >= s); from = i < 0 ? n - 1 : i; }
        if (e) { let i = -1; hlBuckets.forEach((b, k) => { if (b.start <= e) i = k; }); to = i < 0 ? 0 : i; }
        if (to < from) to = from;
        sel.hidden = false;
        sel.style.left = (from / n * 100).toFixed(3) + '%';
        sel.style.width = ((to - from + 1) / n * 100).toFixed(3) + '%';
        if (mL) mL.style.width = (from / n * 100).toFixed(3) + '%';
        if (mR) mR.style.width = ((n - to - 1) / n * 100).toFixed(3) + '%';
    }

    function hlBucketFromX(clientX) {
        const plot = document.getElementById('hlBandPlot');
        const r = plot.getBoundingClientRect();
        if (!r.width) return 0;
        const p = (clientX - r.left) / r.width;
        return Math.max(0, Math.min(hlBuckets.length - 1, Math.floor(p * hlBuckets.length)));
    }

    function hlApplyBucketRange(a, b) {
        const from = Math.min(a, b), to = Math.max(a, b);
        const si = document.getElementById('historyFilterStart');
        const ei = document.getElementById('historyFilterEnd');
        // Ganzer Bestand gewaehlt = kein Filter. Sonst stuende im Feld ein Datum,
        // das nur zufaellig der Rand der Daten ist, und "Alles" waere nicht mehr
        // von einer Auswahl zu unterscheiden.
        if (from === 0 && to === hlBuckets.length - 1) { si.value = ''; ei.value = ''; }
        else { si.value = hlBuckets[from].start; ei.value = hlBuckets[to].end; }
        hlMarkQuickRange(null);
        renderHistoryView();
    }

    function hlInitBandDrag() {
        const plot = document.getElementById('hlBandPlot');
        if (!plot || plot.dataset.wired) return;
        plot.dataset.wired = '1';

        const tip = document.getElementById('hlBandTip');

        plot.addEventListener('pointerdown', (ev) => {
            if (!hlBuckets.length) return;
            const grip = ev.target.closest('.hl-band__grip');
            const anchor = grip
                ? (grip.classList.contains('hl-band__grip--l') ? hlSelEdge('to') : hlSelEdge('from'))
                : hlBucketFromX(ev.clientX);
            hlDragState = { anchor, moved: false };
            plot.classList.add('is-dragging');
            plot.setPointerCapture(ev.pointerId);
            ev.preventDefault();
        });

        plot.addEventListener('pointermove', (ev) => {
            if (!hlBuckets.length) return;
            const i = hlBucketFromX(ev.clientX);
            if (hlDragState) {
                hlDragState.moved = true;
                hlPreviewRange(hlDragState.anchor, i);
            }
            hlShowTip(tip, i, ev.clientX);
        });

        const finish = (ev) => {
            if (!hlDragState) return;
            const i = hlBucketFromX(ev.clientX);
            const st = hlDragState;
            hlDragState = null;
            plot.classList.remove('is-dragging');
            hlApplyBucketRange(st.anchor, i);
        };
        plot.addEventListener('pointerup', finish);
        plot.addEventListener('pointercancel', () => { hlDragState = null; plot.classList.remove('is-dragging'); hlPaintSelection(); });
        plot.addEventListener('pointerleave', () => { if (tip) tip.hidden = true; });

        // Doppelklick hebt die Auswahl auf — schneller als der Chip.
        plot.addEventListener('dblclick', () => hlQuickRange('all', document.querySelector('.hl-range[data-range="all"]')));
    }

    function hlSelEdge(which) {
        const s = (document.getElementById('historyFilterStart') || {}).value || '';
        const e = (document.getElementById('historyFilterEnd') || {}).value || '';
        const n = hlBuckets.length;
        if (which === 'from') { const i = s ? hlBuckets.findIndex(b => b.end >= s) : 0; return i < 0 ? 0 : i; }
        let i = -1; hlBuckets.forEach((b, k) => { if (!e || b.start <= e) i = k; });
        return i < 0 ? n - 1 : i;
    }

    // Waehrend des Ziehens nur das Rechteck bewegen — nicht 618 Zeilen neu bauen.
    function hlPreviewRange(a, b) {
        const from = Math.min(a, b), to = Math.max(a, b);
        const n = hlBuckets.length;
        const sel = document.getElementById('hlBandSel');
        const mL = document.getElementById('hlMaskL');
        const mR = document.getElementById('hlMaskR');
        if (!sel) return;
        sel.hidden = false;
        sel.style.left = (from / n * 100).toFixed(3) + '%';
        sel.style.width = ((to - from + 1) / n * 100).toFixed(3) + '%';
        if (mL) mL.style.width = (from / n * 100).toFixed(3) + '%';
        if (mR) mR.style.width = ((n - to - 1) / n * 100).toFixed(3) + '%';
    }

    function hlShowTip(tip, i, clientX) {
        if (!tip) return;
        const b = hlBuckets[i];
        if (!b) { tip.hidden = true; return; }
        const plot = document.getElementById('hlBandPlot');
        const r = plot.getBoundingClientRect();
        const fmt = (iso) => hlParseISO(iso).toLocaleDateString(mwlLocale(), { day: '2-digit', month: '2-digit', year: '2-digit' });
        const head = hlBucketMode === 'month'
            ? hlParseISO(b.start).toLocaleDateString(mwlLocale(), { month: 'long', year: 'numeric' })
            : hlT('KW ', 'Week ') + getWeek(hlParseISO(b.start));
        const body = b.count
            ? hlNum(b.worked, 1) + ' h · ' + hlT('Soll ', 'Target ') + hlNum(b.expected, 1) + ' h'
            : hlT('keine Einträge', 'no entries');
        tip.innerHTML = '<b>' + esc(String(head)) + '</b><span>' + fmt(b.start) + ' – ' + fmt(b.end) + '</span><span>' + esc(body) + '</span>';
        tip.hidden = false;
        const x = Math.max(4, Math.min(r.width - tip.offsetWidth - 4, clientX - r.left - tip.offsetWidth / 2));
        tip.style.left = x + 'px';
    }

    function hlMarkQuickRange(range) {
        document.querySelectorAll('.hl-range').forEach(b => b.classList.toggle('active', b.dataset.range === range));
    }

    function hlQuickRange(range, btn) {
        const si = document.getElementById('historyFilterStart');
        const ei = document.getElementById('historyFilterEnd');
        const now = new Date();
        const box = document.getElementById('hlDateRange');
        if (range === 'all') {
            si.value = ''; ei.value = '';
            if (box) delete box.dataset.forced;   // sonst blieben die leeren Felder stehen
        }
        // Jahr und Monat sind GANZE Perioden, nicht "bis heute": ein Urlaubstag,
        // der schon fuer naechste Woche eingetragen ist, faellt sonst aus dem
        // gewaehlten Monat heraus, ohne dass die Ansicht das sagt.
        else if (range === 'year') { si.value = now.getFullYear() + '-01-01'; ei.value = now.getFullYear() + '-12-31'; }
        else if (range === 'month') {
            si.value = hlISO(new Date(now.getFullYear(), now.getMonth(), 1));
            ei.value = hlISO(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        }
        else if (range === '90') { const d = new Date(now); d.setDate(d.getDate() - 89); si.value = hlISO(d); ei.value = hlISO(now); }
        hlMarkQuickRange(range);
        renderHistoryView();
    }
    window.hlQuickRange = hlQuickRange;

    function hlDateInputChanged() { hlMarkQuickRange(null); renderHistoryView(); }
    window.hlDateInputChanged = hlDateInputChanged;

    // ══════════════════════════════════════════════════════════════════════
    //  DICHTE
    //  Nur eine Klasse an der Liste — dasselbe Markup, andere Zeilenhoehe.
    //  Kein Neu-Rendern beim Umschalten.
    // ══════════════════════════════════════════════════════════════════════
    function hlApplyDensity() {
        const list = document.getElementById('entryListFull');
        const btn = document.getElementById('hlDensityBtn');
        if (!list) return;
        const cozy = ((data.settings || {}).historyDensity === 'cozy');
        list.classList.toggle('is-compact', !cozy);
        list.classList.toggle('is-cozy', cozy);
        if (btn) {
            btn.setAttribute('aria-pressed', cozy ? 'true' : 'false');
            btn.title = cozy ? hlT('Kompakte Zeilen', 'Compact rows') : hlT('Höhere Zeilen', 'Taller rows');
        }
    }
    function hlToggleDensity() {
        if (!data.settings) data.settings = {};
        data.settings.historyDensity = (data.settings.historyDensity === 'cozy') ? 'compact' : 'cozy';
        hlApplyDensity();
        if (typeof save === 'function') save();
    }
    window.hlToggleDensity = hlToggleDensity;

    // ══════════════════════════════════════════════════════════════════════
    //  ZEILEN
    // ══════════════════════════════════════════════════════════════════════
    function hlRowHTML(e, ctx) {
        const isWorkRel = hlCountsAsWork(e.type);
        const diff = parseFloat(e.diff) || 0;
        const sign = !isWorkRel ? 'none' : (diff > 0.004 ? 'pos' : (diff < -0.004 ? 'neg' : 'zero'));
        const note = hlUserNote(e);
        const label = hlTypeLabel(e.type);
        const d = hlParseISO(e.date);
        const weekday = d.toLocaleDateString(mwlLocale(), { weekday: 'short' }).replace('.', '');
        // In einem Aufruf: de-DE haengt bei {day, month} von sich aus einen Punkt an
        // ("26.08."), und ein separat angeklebtes Jahr ergab daraus "26.08..26".
        const dateShort = d.toLocaleDateString(mwlLocale(), { day: '2-digit', month: '2-digit', year: '2-digit' });
        const rgb = (typeof getTypeRgb === 'function') ? getTypeRgb(e.type) : '148,163,184';

        // Abweichungsbalken: waechst aus einer sichtbaren Nulllinie nach rechts
        // (Plus) oder links (Minus). Massstab ist EIN volles Tagessoll aus
        // data.settings — voller Balken heisst „eine ganze Sollschicht daneben".
        // Bewusst nicht die groesste Abweichung im Zeitraum: dann haette ein
        // einzelner Gleittag (−8 h) alle normalen Tage auf Punktgroesse gedrueckt,
        // und der Massstab haette sich bei jedem Filterwechsel verschoben.
        const scale = ctx.devScale;
        const raw = Math.abs(diff) / scale * 50;
        const pct = Math.min(50, raw);
        const bar = sign === 'none'
            ? '<span class="er-dev" data-sign="none" aria-hidden="true"><span class="er-dev__zero"></span></span>'
            : '<span class="er-dev" data-sign="' + sign + '" title="' + esc(ctx.devScaleLabel) + '" aria-hidden="true">'
              + '<span class="er-dev__zero"></span>'
              + '<span class="er-dev__fill' + (raw > 50 ? ' is-clamped' : '') + '" style="'
              + (diff >= 0 ? 'left:50%;' : 'right:50%;') + 'width:' + pct.toFixed(2) + '%"></span></span>';

        // Ohne Notiz zeigt die Zeile die Schichtzeiten — die stehen sonst nirgends.
        // Den Typ-Namen als Ersatz zu nehmen waere doppelt: der steht rechts daneben
        // schon als Etikett.
        const span = (e.shiftStart && e.shiftEnd) ? (e.shiftStart + ' – ' + e.shiftEnd) : '';
        // Leer statt "—": bei Urlaub oder Feiertag gibt es nichts zu notieren, und
        // eine Spalte voller Gedankenstriche ist lauter als eine leere Zelle.
        const title = note || (e.isPeriod ? String(e.label || '') : '') || span || '';

        return '<div class="entry-row" data-entry-id="' + e.id + '" style="--type-rgb:' + rgb + '"'
            + ' tabindex="0" role="button" aria-label="' + esc(label + ', ' + dateShort + ', ' + hlNum(e.worked, 1) + ' h') + '"'
            + ' onclick="openEntryDetail(' + e.id + ')" onkeydown="hlRowKey(event,' + e.id + ')">'
            + '<span class="er-stripe" aria-hidden="true"></span>'
            + '<span class="er-ico" aria-hidden="true">' + ((typeof getTypeIconHTML === 'function') ? getTypeIconHTML(e.type, 15) : '') + '</span>'
            + '<span class="er-date"><b>' + esc(weekday) + '</b><span>' + dateShort + '</span></span>'
            + '<span class="er-body">'
            +   '<span class="er-title">' + esc(title) + '</span>'
            +   '<span class="er-tags">'
            +     '<span class="er-tag er-tag--type">' + esc(label) + '</span>'
            // Job: in der kompakten Zeile nur ein Punkt in der Job-Farbe. Bei einem
            // Nutzer mit zwei Jobs stuende der Name des Hauptjobs sonst 600 mal
            // untereinander — die Frage ist ja gerade, welche Zeile ANDERS ist.
            +     (ctx.showJob ? '<span class="er-tag er-tag--job" style="--job-rgb:' + ctx.jobRgb(e) + '" title="' + esc(ctx.jobName(e)) + '">'
                  + '<i class="er-jobdot" aria-hidden="true"></i><span class="er-jobname">' + esc(ctx.jobName(e)) + '</span></span>' : '')
            +     (e.project ? '<span class="er-tag er-tag--project">' + esc(e.project) + '</span>' : '')
            +     (ctx.additional.has(e.id) ? '<span class="er-tag er-tag--extra" title="' + esc(hlT('Tagessoll zählt schon beim Haupteintrag dieses Tages', 'Daily target already counted on this day’s main entry')) + '">↪ ' + hlT('Zusatzzeit', 'Extra time') + '</span>' : '')
            +     (e.shiftWarning ? '<span class="er-tag er-tag--warn">' + hlT('über 10 h', 'over 10 h') + '</span>' : '')
            +   '</span>'
            + '</span>'
            + bar
            + '<span class="er-hours">' + hlNum(e.worked, 1) + '<i>h</i></span>'
            + '<span class="er-diff" data-sign="' + sign + '">' + (sign === 'none' ? '—' : hlSigned(diff, 2)) + '</span>'
            // Knoepfe UND Chevron liegen in EINEM Kind. Als zwei Geschwister waren es
            // neun Kinder auf acht Rasterspuren — Grid legt dann still eine neunte,
            // inhaltsbreite Spalte an, und der Spaltenkopf stand 56 px neben seiner
            // Spalte. Sichtbar ist immer nur eines von beiden (Hover vs. Touch).
            + '<span class="er-end">'
            +   '<span class="er-actions">'
            +     '<button class="btn-icon" onclick="event.stopPropagation();editEntry(' + e.id + ')" aria-label="' + esc(hlT('Bearbeiten', 'Edit')) + '">'
            +       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>'
            +     '<button class="btn-icon danger" onclick="event.stopPropagation();delEntry(' + e.id + ')" aria-label="' + esc(hlT('Löschen', 'Delete')) + '">'
            +       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>'
            +   '</span>'
            +   '<span class="er-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>'
            + '</span>'
            + '</div>';
    }

    function hlRowKey(ev, id) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openEntryDetail(id); return; }
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            const rows = [...document.querySelectorAll('.entry-row')];
            const i = rows.indexOf(ev.currentTarget);
            const next = rows[i + (ev.key === 'ArrowDown' ? 1 : -1)];
            if (next) next.focus();
        }
    }
    window.hlRowKey = hlRowKey;

    // Das Monatsband ist zugleich der Sprung zurueck in den Filter: ein Klick
    // schneidet das Zeitband auf genau diesen Monat. Ohne das muesste man vom
    // Ende der Liste wieder ganz nach oben scrollen, um den Zeitraum zu aendern.
    function hlZoomMonth(ym) {
        const si = document.getElementById('historyFilterStart');
        const ei = document.getElementById('historyFilterEnd');
        const y = +ym.slice(0, 4), m = +ym.slice(5, 7);
        si.value = ym + '-01';
        ei.value = hlISO(new Date(y, m, 0));
        hlMarkQuickRange(null);
        renderHistoryView();
        const main = document.querySelector('.main');
        if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.hlZoomMonth = hlZoomMonth;

    function hlMonthBandHTML(iso, agg) {
        const d = hlParseISO(iso.length === 7 ? iso + '-01' : iso);
        const name = d.toLocaleDateString(mwlLocale(), { month: 'long', year: 'numeric' });
        const sign = agg.diff > 0.004 ? 'pos' : (agg.diff < -0.004 ? 'neg' : 'zero');
        return '<button type="button" class="hl-mband" onclick="hlZoomMonth(&quot;' + iso + '&quot;)"'
            + ' title="' + esc(hlT('Nur diesen Monat zeigen', 'Show this month only')) + '">'
            + '<span class="hl-mband__name">' + esc(name) + '</span>'
            + '<span class="hl-mband__stats">'
            +   '<span>' + agg.count + '<i>' + hlT(' Einträge', ' entries') + '</i></span>'
            +   '<span>' + hlNum(agg.worked, 1) + '<i> h</i></span>'
            +   '<span class="hl-mband__diff" data-sign="' + sign + '">' + hlSigned(agg.diff, 1) + '<i> h</i></span>'
            + '</span></button>';
    }

    function hlDayBandHTML(iso, sumDiff) {
        const d = hlParseISO(iso);
        const s = d.toLocaleDateString(mwlLocale(), { weekday: 'long', day: '2-digit', month: '2-digit' });
        const sign = sumDiff >= 0 ? 'pos' : 'neg';
        return '<div class="hl-dband"><span>' + esc(s) + '</span>'
            + '<span class="hl-dband__sum" data-sign="' + sign + '">' + hlT('Tages-Saldo ', 'Day balance ') + hlSigned(sumDiff, 2) + ' h</span></div>';
    }

    // ══════════════════════════════════════════════════════════════════════
    //  HAUPT-RENDER
    // ══════════════════════════════════════════════════════════════════════
    function renderHistoryView() {
        const listEl = document.getElementById('entryListFull');
        if (!listEl) return;

        // Die Buckets immer neu rechnen (618 Eintraege = ein Durchlauf, unmessbar),
        // aber das Band nur neu ZEICHNEN, wenn sich wirklich etwas geaendert hat.
        // Vorher haing das an der Anzahl der Eintraege — die aendert sich beim
        // BEARBEITEN eines Eintrags nicht, das Band waere stehengeblieben.
        hlBuildBuckets();
        const sig = hlBuckets.length + '|' + hlBuckets.reduce((a, b) => a + b.worked + b.expected, 0).toFixed(2);
        if (sig !== hlBandSig) {
            hlBandSig = sig;
            hlRenderBand();
            hlInitBandDrag();
        }
        hlRenderJobFilter();
        hlApplyDensity();

        const raw = (document.getElementById('historyFilterSearch') || {}).value || '';
        const q = hlParseQuery(raw);
        hlRenderParsed(q, raw.trim().length);
        const clearBtn = document.getElementById('hlSearchClear');
        if (clearBtn) clearBtn.hidden = !raw.length;

        const activeType = (document.getElementById('historyFilterType') || {}).value || 'all';
        // Chips zaehlen auf dem Satz OHNE Typ-Filter (sonst ueberall Nullen).
        const baseSet = filterHistoryData({ ignoreType: true, query: q });
        renderHistoryTypeChips(baseSet, activeType);

        const filtered = activeType === 'all' ? baseSet : baseSet.filter(e => e.type === activeType);

        // Sortierung
        const sortMode = (document.getElementById('hlSort') || {}).value || 'date-desc';
        const sorted = filtered.slice();
        const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id - a.id));
        if (sortMode === 'date-asc') sorted.sort((a, b) => -byDateDesc(a, b));
        else if (sortMode === 'hours-desc') sorted.sort((a, b) => (b.worked || 0) - (a.worked || 0) || byDateDesc(a, b));
        else if (sortMode === 'diff-desc') sorted.sort((a, b) => (b.diff || 0) - (a.diff || 0) || byDateDesc(a, b));
        else if (sortMode === 'diff-asc') sorted.sort((a, b) => (a.diff || 0) - (b.diff || 0) || byDateDesc(a, b));
        else sorted.sort(byDateDesc);

        hlUpdateReadout(sorted);
        hlPaintSelection();

        // Ein Spaltenkopf ueber null Zeilen beschriftet nichts.
        const thead = document.querySelector('#view-history .hl-thead');
        if (thead) thead.hidden = !sorted.length;

        if (!sorted.length) {
            listEl.innerHTML = hlEmptyHTML(activeType, raw);
            const foot = document.getElementById('hlListFoot');
            if (foot) foot.hidden = true;
            return;
        }

        // Zusatzzeit aus den VOLLEN Daten ableiten, nicht aus den gefilterten —
        // sonst verschwindet der Hinweis, sobald man nach Typ filtert.
        const additional = new Set();
        const allByDate = {};
        (Array.isArray(data.entries) ? data.entries : []).forEach(e => {
            if (e && e.date) (allByDate[e.date] = allByDate[e.date] || []).push(e);
        });
        Object.keys(allByDate).forEach(dk => {
            const list = allByDate[dk];
            if (!list.some(e => hlCountsAsWork(e.type) && (parseFloat(e.expected) || 0) > 0)) return;
            list.forEach(e => {
                if (hlCountsAsWork(e.type) && (parseFloat(e.expected) || 0) === 0 && (parseFloat(e.worked) || 0) > 0) additional.add(e.id);
            });
        });

        const dayAgg = {};
        sorted.forEach(e => {
            const g = dayAgg[e.date] || (dayAgg[e.date] = { count: 0, diff: 0 });
            g.count++;
            if (hlCountsAsWork(e.type)) g.diff += parseFloat(e.diff) || 0;
        });
        const monthAgg = {};
        sorted.forEach(e => {
            const k = e.date.slice(0, 7);
            const g = monthAgg[k] || (monthAgg[k] = { count: 0, worked: 0, diff: 0 });
            g.count++; g.worked += parseFloat(e.worked) || 0;
            if (hlCountsAsWork(e.type)) g.diff += parseFloat(e.diff) || 0;
        });

        hlLastSorted = sorted;
        const devScale = hlDayTarget();
        hlCtx = {
            devScale,
            devScaleLabel: hlT('Voller Balken = ' + hlNum(devScale, 1) + ' h Abweichung (ein Tagessoll)',
                               'Full bar = ' + hlNum(devScale, 1) + ' h deviation (one daily target)'),
            additional, dayAgg, monthAgg,
            // Bänder nur bei chronologischer Sortierung: über einer nach Stunden
            // sortierten Liste wäre ein Monatsband schlicht falsch.
            grouped: sortMode === 'date-desc' || sortMode === 'date-asc',
            showJob: (typeof hasMultipleJobs === 'function') && hasMultipleJobs(),
            jobName: (e) => (typeof getJobName === 'function') ? getJobName((typeof getEntryJobId === 'function') ? getEntryJobId(e) : 'primary') : '',
            jobRgb: (e) => {
                const hex = (typeof getJobColor === 'function') ? getJobColor((typeof getEntryJobId === 'function') ? getEntryJobId(e) : 'primary') : '#5578a8';
                const h = String(hex).replace('#', '');
                const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6);
                return parseInt(f.slice(0, 2), 16) + ',' + parseInt(f.slice(2, 4), 16) + ',' + parseInt(f.slice(4, 6), 16);
            }
        };

        listEl.innerHTML = '';
        hlRendered = 0;
        hlOpenMonth = null; hlOpenSection = null; hlLastDay = null;
        hlAppendChunk();
        hlInitSentinel();
        hlHighlightPending();
    }

    let hlCtx = null;

    // Stueckweise nachladen: 618 Zeilen bei jedem Tastendruck neu zu bauen war
    // der eigentliche Grund fuer das zaehe Gefuehl beim Tippen in die Suche.
    //
    // Jeder Monat bekommt einen eigenen <section>-Kasten. Nicht aus Ordnungsliebe:
    // `position: sticky` haelt ein Element in seinem ELTERNKASTEN fest. Lagen alle
    // Monatsbaender als Geschwister in derselben Liste, blieb das Band vom August
    // oben kleben, waehrend man schon durch den Juli scrollte — zwei, drei Baender
    // uebereinander. Mit einem Kasten je Monat schiebt der naechste Monat den
    // vorigen sauber hinaus.
    let hlOpenMonth = null;
    let hlOpenSection = null;
    let hlLastDay = null;

    function hlAppendChunk() {
        const listEl = document.getElementById('entryListFull');
        if (!listEl || !hlCtx) return;
        const end = Math.min(hlRendered + HL_PAGE, hlLastSorted.length);

        if (!hlCtx.grouped) {
            let html = '';
            for (let i = hlRendered; i < end; i++) html += hlRowHTML(hlLastSorted[i], hlCtx);
            listEl.insertAdjacentHTML('beforeend', html);
        } else {
            let buf = '';
            const flush = () => {
                if (!buf) return;
                (hlOpenSection || listEl).insertAdjacentHTML('beforeend', buf);
                buf = '';
            };
            for (let i = hlRendered; i < end; i++) {
                const e = hlLastSorted[i];
                const mk = e.date.slice(0, 7);
                if (mk !== hlOpenMonth) {
                    flush();
                    const sec = document.createElement('section');
                    sec.className = 'hl-month';
                    sec.innerHTML = hlMonthBandHTML(mk, hlCtx.monthAgg[mk]);
                    listEl.appendChild(sec);
                    hlOpenSection = sec;
                    hlOpenMonth = mk;
                    hlLastDay = null;
                }
                if (e.date !== hlLastDay) {
                    hlLastDay = e.date;
                    const agg = hlCtx.dayAgg[e.date];
                    if (agg && agg.count >= 2) buf += hlDayBandHTML(e.date, agg.diff);
                }
                buf += hlRowHTML(e, hlCtx);
            }
            flush();
        }
        hlRendered = end;

        const foot = document.getElementById('hlListFoot');
        if (foot) {
            const done = hlRendered >= hlLastSorted.length;
            foot.hidden = false;
            foot.innerHTML = done
                ? '<span>' + hlLastSorted.length + '</span> <span>' + hlT('Einträge · Ende des Zeitraums', 'entries · end of range') + '</span>'
                : '<span>' + hlRendered + ' / ' + hlLastSorted.length + '</span> <span>' + hlT('geladen — weiter scrollen', 'loaded — keep scrolling') + '</span>';
        }
    }

    let hlObserver = null;
    function hlInitSentinel() {
        const sentinel = document.getElementById('hlSentinel');
        if (!sentinel) return;
        if (hlObserver) hlObserver.disconnect();
        if (!('IntersectionObserver' in window)) return;
        hlObserver = new IntersectionObserver((entries) => {
            if (entries.some(x => x.isIntersecting) && hlRendered < hlLastSorted.length) hlAppendChunk();
        }, { root: document.querySelector('.main') || null, rootMargin: '600px 0px' });
        hlObserver.observe(sentinel);
    }

    function hlUpdateReadout(set) {
        const totalH = set.reduce((s, e) => s + (parseFloat(e.worked) || 0), 0);
        const totalDiff = set.reduce((s, e) => hlCountsAsWork(e.type) ? s + (parseFloat(e.diff) || 0) : s, 0);
        const avg = set.length ? totalH / set.length : 0;
        const set$ = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
        set$('historyCount', String(set.length));
        set$('hlStatHours', hlNum(totalH, 1) + ' h');
        set$('hlStatAvg', hlNum(avg, 1) + ' h');
        const s = document.getElementById('hlStatSaldo');
        if (s) {
            s.textContent = hlSigned(totalDiff, 1) + ' h';
            s.dataset.sign = totalDiff > 0.04 ? 'pos' : (totalDiff < -0.04 ? 'neg' : 'zero');
        }
        const si = (document.getElementById('historyFilterStart') || {}).value;
        const ei = (document.getElementById('historyFilterEnd') || {}).value;
        const fmt = (iso) => hlParseISO(iso).toLocaleDateString(mwlLocale(), { day: '2-digit', month: 'short', year: 'numeric' });

        const sub = document.getElementById('hlSubtitle');
        if (sub) {
            sub.textContent = (si || ei)
                ? (si ? fmt(si) : '…') + ' – ' + (ei ? fmt(ei) : '…')
                : hlT('Das gesamte Archiv deiner erfassten Zeit', 'The full archive of your recorded time');
        }

        // Zeitraum-Anzeige im Band-Fuss: solange nichts eingegrenzt ist, steht dort
        // der Bestand als Satz. Zwei leere Datumsfelder waeren genau die Frage,
        // die das Zeitband darueber schon beantwortet.
        const txt = document.getElementById('hlRangeText');
        const box = document.getElementById('hlDateRange');
        if (txt && box) {
            const open = !!(si || ei) || box.dataset.forced === '1';
            txt.hidden = open;
            box.hidden = !open;
            if (!open) {
                const b = hlDataBounds ? (fmt(hlDataBounds[0]) + ' – ' + fmt(hlDataBounds[1])) : '—';
                txt.innerHTML = '<span>' + hlT('Gesamter Zeitraum', 'Full range') + '</span><b>' + esc(b) + '</b>';
            }
        }
    }

    // „Eigenes Datum" — blendet die zwei Felder ein, wenn jemand einen Tag exakt
    // treffen will statt zu ziehen.
    function hlShowDateInputs() {
        const box = document.getElementById('hlDateRange');
        const txt = document.getElementById('hlRangeText');
        if (!box) return;
        box.dataset.forced = '1';
        box.hidden = false;
        if (txt) txt.hidden = true;
        const first = document.getElementById('historyFilterStart');
        if (first && first.showPicker) { try { first.showPicker(); } catch (e) { first.focus(); } }
        else if (first) first.focus();
    }
    window.hlShowDateInputs = hlShowDateInputs;

    function hlEmptyHTML(activeType, raw) {
        const reasons = [];
        // Anfuehrungszeichen sind sprachabhaengig — deutsche Gaensefuesschen in einem
        // englischen Satz sehen aus wie ein Zeichensatzfehler.
        const qo = hlT('„', '“'), qc = hlT('“', '”');
        if (raw.trim()) reasons.push(hlT('Suche', 'search') + ' ' + qo + esc(raw.trim()) + qc);
        if (activeType !== 'all') reasons.push(hlT('Typ', 'type') + ' ' + qo + esc(hlTypeLabel(activeType)) + qc);
        const si = (document.getElementById('historyFilterStart') || {}).value;
        const ei = (document.getElementById('historyFilterEnd') || {}).value;
        if (si || ei) reasons.push(hlT('gewählter Zeitraum', 'selected range'));
        const job = document.getElementById('hlJobFilter');
        if (job && !job.hidden && job.value && job.value !== 'all') reasons.push(hlT('Job-Filter', 'job filter'));

        const noData = !(data.entries || []).length;
        return '<div class="hl-empty">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 3-3 3 3 5-6"/></svg>'
            + '<p class="hl-empty__head">' + (noData ? hlT('Noch nichts erfasst', 'Nothing recorded yet') : hlT('Keine Einträge in dieser Auswahl', 'No entries in this selection')) + '</p>'
            + '<p class="hl-empty__sub">' + (noData
                ? hlT('Erfasse deinen ersten Tag im Dashboard — er erscheint dann hier.', 'Record your first day on the dashboard — it will show up here.')
                : hlT('Aktiv: ', 'Active: ') + reasons.join(' · ')) + '</p>'
            + (noData ? '' : '<button class="hl-btn hl-btn-ghost" onclick="hlResetFilters()">' + hlT('Filter zurücksetzen', 'Reset filters') + '</button>')
            + '</div>';
    }

    function hlResetFilters() {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('historyFilterStart', ''); set('historyFilterEnd', '');
        set('historyFilterSearch', ''); set('historyFilterType', 'all');
        const job = document.getElementById('hlJobFilter'); if (job) job.value = 'all';
        const box = document.getElementById('hlDateRange'); if (box) delete box.dataset.forced;
        hlMarkQuickRange('all');
        renderHistoryView();
    }
    window.hlResetFilters = hlResetFilters;

    function hlHighlightPending() {
        if (!window.pendingHighlightId) return;
        setTimeout(() => {
            let el = document.querySelector('[data-entry-id="' + window.pendingHighlightId + '"]');
            // Der Eintrag kann jenseits des ersten Blocks liegen — nachladen, bis er da ist.
            let guard = 0;
            while (!el && hlRendered < hlLastSorted.length && guard++ < 40) {
                hlAppendChunk();
                el = document.querySelector('[data-entry-id="' + window.pendingHighlightId + '"]');
            }
            if (el) {
                el.classList.add('entry-highlight');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => { el.classList.remove('entry-highlight'); window.pendingHighlightId = null; }, 3000);
            } else window.pendingHighlightId = null;
        }, 50);
    }

    // ── Tastatur & Suche ──────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        const inp = document.getElementById('historyFilterSearch');
        if (inp) {
            // Entprellt: ohne das laeuft der ganze Filter- und Sortierlauf
            // je Tastendruck.
            inp.addEventListener('input', () => {
                clearTimeout(hlSearchTimer);
                hlSearchTimer = setTimeout(renderHistoryView, 140);
            });
            inp.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); hlClearSearch(); } });
        }
        document.addEventListener('keydown', (ev) => {
            if (ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
            const view = document.getElementById('view-history');
            if (!view || !view.classList.contains('active')) return;
            const t = ev.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            ev.preventDefault();
            const s = document.getElementById('historyFilterSearch');
            if (s) { s.focus(); s.select(); }
        });
        // Monatsband klebt unter dem Kopfblock — dessen Hoehe wechselt beim Umbruch.
        // 🔴 Die Variable gehoert an #view-history, NICHT an <html>: history.css
        // definiert dort einen Startwert, und eine lokale Definition schlaegt die
        // geerbte. Am <html> gesetzt hatte der Beobachter deshalb null Wirkung —
        // das Band klebte weiter auf dem alten Startwert und lag damit unsichtbar
        // hinter der Werkzeugleiste.
        const tb = document.getElementById('hlToolbar');
        const view = document.getElementById('view-history');
        if (tb && view && 'ResizeObserver' in window) {
            new ResizeObserver(() => {
                view.style.setProperty('--hl-stick', tb.offsetHeight + 'px');
            }).observe(tb);
        }
    });

    function editEntry(id) { openEditModal(id); }

    // ══════════════════════════════════════════════════════════════════════
    //  DETAIL-SHEET
    // ══════════════════════════════════════════════════════════════════════
    function openEntryDetail(id) {
        const e = data.entries.find(x => x.id === id);
        if (!e) return;

        const isWorkRel = hlCountsAsWork(e.type);
        const label = hlTypeLabel(e.type);
        const d = hlParseISO(e.date);
        const weekday = d.toLocaleDateString(mwlLocale(), { weekday: 'long' });
        const dateStr = d.toLocaleDateString(mwlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
        const diff = parseFloat(e.diff) || 0;

        const icon = document.getElementById('edTypeIcon');
        icon.innerHTML = (typeof getTypeIconHTML === 'function') ? getTypeIconHTML(e.type, 26) : '';
        icon.style.setProperty('--type-rgb', (typeof getTypeRgb === 'function') ? getTypeRgb(e.type) : '148,163,184');
        document.getElementById('edTypeLabel').textContent = label;
        document.getElementById('edDateLine').textContent = weekday + ' · ' + dateStr;
        document.getElementById('edHours').textContent = hlNum(e.worked, 2) + ' h';
        const diffEl = document.getElementById('edDiff');
        diffEl.textContent = isWorkRel ? hlSigned(diff, 2) + ' h' : '—';
        diffEl.style.color = isWorkRel ? (diff >= 0 ? 'var(--role-pos)' : 'var(--role-neg)') : 'var(--text-muted)';

        const rows = [];
        if (e.shiftStart && e.shiftEnd) rows.push([hlT('Zeitraum', 'Time span'), esc(e.shiftStart + ' – ' + e.shiftEnd)]);
        if (e.breakMins) rows.push([hlT('Pause', 'Break'), esc(String(e.breakMins)) + ' min']);
        if (isWorkRel) rows.push([hlT('Sollzeit', 'Target'), hlNum(e.expected || 0, 2) + ' h']);
        const note = hlUserNote(e);
        if (note) rows.push([hlT('Notiz', 'Note'), esc(note)]);
        if (e.project) rows.push([hlT('Projekt', 'Project'), esc(e.project)]);
        if (typeof hasMultipleJobs === 'function' && hasMultipleJobs() && typeof getJobName === 'function') {
            rows.push([hlT('Job', 'Job'), esc(getJobName((typeof getEntryJobId === 'function') ? getEntryJobId(e) : 'primary'))]);
        }
        if (e.mood) rows.push([hlT('Stimmung', 'Mood'), e.mood]);
        if (e.customFieldValues && typeof e.customFieldValues === 'object') {
            const defs = Array.isArray(data.customFields) ? data.customFields : [];
            Object.keys(e.customFieldValues).forEach(fid => {
                const def = defs.find(f => f.id === fid);
                let val = e.customFieldValues[fid];
                if (val === true) val = '✓';
                else if (val === false || val === '' || val == null) return;
                rows.push([esc(String(def ? def.label : fid)), esc(String(val))]);
            });
        }
        if (e.shiftWarning) rows.push([hlT('Warnung', 'Warning'), hlT('über 10 Stunden', 'over 10 hours')]);

        document.getElementById('edRows').innerHTML = rows.length
            ? rows.map(([k, v]) => '<div class="ed-row"><span class="ed-row-key">' + k + '</span><span class="ed-row-val">' + v + '</span></div>').join('')
            : '<div class="ed-row"><span class="ed-row-key">' + hlT('Keine weiteren Angaben', 'No further details') + '</span></div>';

        document.getElementById('edEditBtn').onclick = () => { closeEntryDetail(); editEntry(id); };
        document.getElementById('edDeleteBtn').onclick = () => { closeEntryDetail(); delEntry(id); };

        document.getElementById('entryDetailBackdrop').classList.add('active');
        document.getElementById('entryDetailSheet').classList.add('active');
    }

    function closeEntryDetail() {
        document.getElementById('entryDetailBackdrop').classList.remove('active');
        document.getElementById('entryDetailSheet').classList.remove('active');
    }
    window.openEntryDetail = openEntryDetail;
    window.closeEntryDetail = closeEntryDetail;
    window.renderHistoryTypeChips = renderHistoryTypeChips;

    function closeTrashModal() {
        const modal = document.getElementById('trashModal');
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 200);
        if (modal._escHandler) { document.removeEventListener('keydown', modal._escHandler); modal._escHandler = null; }
        if (modal._overlayClick) { modal.removeEventListener('click', modal._overlayClick); modal._overlayClick = null; }
    }
