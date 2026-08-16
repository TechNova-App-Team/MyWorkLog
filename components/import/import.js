// ═══ IMPORT MODULE ═══
//
// Wechsel-Bruecke: bestehende Zeiten aus Excel, CSV oder einer anderen App
// uebernehmen, statt bei Null anzufangen.
//
// Warum: Wer schon acht Monate in einer Tabelle gefuehrt hat, wechselt nicht,
// solange er die Daten dabei verliert. Der Import ist damit keine Komfort-
// funktion, sondern die Bedingung dafuer, dass jemand ueberhaupt anfaengt.
//
// Alles laeuft lokal. Die Datei wird im Browser gelesen, nichts hochgeladen.
//
// .xlsx ohne Fremd-Bibliothek: eine Excel-Datei ist ein ZIP. Das
// Zentralverzeichnis laesst sich von Hand lesen, und `DecompressionStream`
// ('deflate-raw') steckt seit Jahren in jeder Engine — damit braucht es weder
// SheetJS noch einen CDN-Aufruf. Aeltere Browser ohne DecompressionStream
// bekommen einen klaren Hinweis statt eines stillen Fehlschlags.

// ─────────────────────────────────────────────────────────────────────────
// 1. DATEI LESEN
// ─────────────────────────────────────────────────────────────────────────

// Trennzeichen raten: das haeufigste Zeichen, das in JEDER Zeile gleich oft
// vorkommt, ist der Spaltentrenner. Reines Zaehlen faellt auf Notizen mit
// Semikolon herein, die Konstanz ueber die Zeilen nicht.
function mwlSniffDelimiter(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 12);
    if (!lines.length) return ';';
    let best = ';', bestScore = -1;
    [';', '\t', ',', '|'].forEach(d => {
        const counts = lines.map(l => (l.split(d).length - 1));
        if (!counts[0]) return;
        const konstant = counts.every(c => c === counts[0]);
        const score = counts[0] * (konstant ? 10 : 1);
        if (score > bestScore) { bestScore = score; best = d; }
    });
    return best;
}

// CSV nach RFC 4180: Anfuehrungszeichen schuetzen Trenner und Zeilenumbrueche,
// "" innerhalb eines Feldes ist ein echtes Anfuehrungszeichen.
function mwlParseDelimited(text, delim) {
    const d = delim || mwlSniffDelimiter(text);
    const rows = [];
    let row = [], field = '', inQuotes = false;
    const src = text.replace(/^﻿/, '');           // BOM aus Excel-Exporten
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (inQuotes) {
            if (c === '"') {
                if (src[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += c;
            continue;
        }
        if (c === '"') { inQuotes = true; continue; }
        if (c === d) { row.push(field); field = ''; continue; }
        if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
        if (c === '\r') continue;
        field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

function mwlInflateRawSupported() {
    return typeof DecompressionStream === 'function';
}

async function mwlInflateRaw(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ZIP ueber das Zentralverzeichnis lesen. Nicht ueber die lokalen Header:
// die duerfen ihre Groessen in einen Data Descriptor hinter den Daten
// auslagern, dann steht dort 0 und man liest ins Leere.
async function mwlZipEntries(buffer) {
    const dv = new DataView(buffer);
    const u8 = new Uint8Array(buffer);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Die Datei sieht nicht wie eine .xlsx-Datei aus.');

    const count = dv.getUint16(eocd + 10, true);
    let off = dv.getUint32(eocd + 16, true);
    const dec = new TextDecoder();
    const out = new Map();

    for (let i = 0; i < count; i++) {
        if (off + 46 > u8.length || dv.getUint32(off, true) !== 0x02014b50) break;
        const method   = dv.getUint16(off + 10, true);
        const compSize = dv.getUint32(off + 20, true);
        const nameLen  = dv.getUint16(off + 28, true);
        const extraLen = dv.getUint16(off + 30, true);
        const cmtLen   = dv.getUint16(off + 32, true);
        const lho      = dv.getUint32(off + 42, true);
        const name     = dec.decode(u8.subarray(off + 46, off + 46 + nameLen));

        const lNameLen  = dv.getUint16(lho + 26, true);
        const lExtraLen = dv.getUint16(lho + 28, true);
        const start     = lho + 30 + lNameLen + lExtraLen;
        const raw       = u8.subarray(start, start + compSize);

        // Nur lesen, was gebraucht wird — eine Arbeitsmappe schleppt Themes,
        // Bilder und Drucklayouts mit, die hier nichts zu suchen haben.
        if (/^xl\/(worksheets\/|sharedStrings\.xml|workbook\.xml)/.test(name)) {
            out.set(name, method === 0 ? raw.slice() : await mwlInflateRaw(raw));
        }
        off += 46 + nameLen + extraLen + cmtLen;
    }
    return out;
}

function mwlXmlUnescape(s) {
    return String(s)
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(+d))
        .replace(/&amp;/g, '&');
}

function mwlSharedStrings(xml) {
    const out = [];
    const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let m;
    while ((m = siRe.exec(xml))) {
        // Formatierter Text steht in mehreren <t>-Knoten — zusammensetzen,
        // sonst fehlt bei "Mo**ntag" alles ab dem zweiten Stueck.
        let text = '';
        const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        let t;
        while ((t = tRe.exec(m[1]))) text += mwlXmlUnescape(t[1]);
        out.push(text);
    }
    return out;
}

function mwlColIndex(ref) {
    const letters = String(ref).replace(/[^A-Z]/gi, '').toUpperCase();
    let n = 0;
    for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n - 1;
}

function mwlSheetRows(xml, shared) {
    const rows = [];
    const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g;
    let rm;
    while ((rm = rowRe.exec(xml))) {
        const inner = rm[1] || '';
        const cells = [];
        const cRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
        let cm;
        while ((cm = cRe.exec(inner))) {
            const attrs = cm[1] || '';
            const body  = cm[2] || '';
            const refM  = /r="([A-Z]+\d+)"/i.exec(attrs);
            const idx   = refM ? mwlColIndex(refM[1]) : cells.length;
            const type  = (/t="([^"]+)"/.exec(attrs) || [, ''])[1];

            let val = '';
            if (type === 's') {
                const v = /<v>([\s\S]*?)<\/v>/.exec(body);
                val = v ? (shared[+v[1]] ?? '') : '';
            } else if (type === 'inlineStr') {
                let t; const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
                while ((t = tRe.exec(body))) val += mwlXmlUnescape(t[1]);
            } else {
                const v = /<v>([\s\S]*?)<\/v>/.exec(body);
                val = v ? mwlXmlUnescape(v[1]) : '';
            }
            while (cells.length < idx) cells.push('');
            cells[idx] = val;
        }
        if (cells.some(c => String(c).trim() !== '')) rows.push(cells);
    }
    return rows;
}

async function mwlXlsxToRows(buffer) {
    if (!mwlInflateRawSupported()) {
        throw new Error('Dieser Browser kann .xlsx nicht auspacken. Bitte in Excel über „Speichern unter" als CSV sichern und die CSV hier hochladen.');
    }
    const files = await mwlZipEntries(buffer);
    const dec = new TextDecoder();
    const sharedRaw = files.get('xl/sharedStrings.xml');
    const shared = sharedRaw ? mwlSharedStrings(dec.decode(sharedRaw)) : [];

    const sheetNames = [...files.keys()].filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
        .sort((a, b) => (parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10)));
    if (!sheetNames.length) throw new Error('Die Arbeitsmappe enthält kein lesbares Tabellenblatt.');

    // Das erste Blatt mit mehr als einer Zeile gewinnt — Deckblätter mit
    // einer Überschrift sind haeufiger als man denkt.
    for (const n of sheetNames) {
        const rows = mwlSheetRows(dec.decode(files.get(n)), shared);
        if (rows.length > 1) return rows;
    }
    return mwlSheetRows(dec.decode(files.get(sheetNames[0])), shared);
}

// ─────────────────────────────────────────────────────────────────────────
// 2. WERTE DEUTEN
// ─────────────────────────────────────────────────────────────────────────

const MWL_EXCEL_EPOCH = Date.UTC(1899, 11, 30);   // Excels Tag 0 (inkl. 1900-Schaltjahr-Bug)

function mwlPad2(n) { return String(n).padStart(2, '0'); }

function mwlSerialToDate(serial) {
    const ms = MWL_EXCEL_EPOCH + Math.floor(serial) * 86400000;
    const d = new Date(ms);
    return d.getUTCFullYear() + '-' + mwlPad2(d.getUTCMonth() + 1) + '-' + mwlPad2(d.getUTCDate());
}

// Gibt 'YYYY-MM-DD' zurueck oder null. Zweistellige Jahre: 70–99 → 19xx,
// sonst 20xx — ein Berichtsheft von 1968 gibt es nicht.
function mwlParseDateCell(v) {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const [y, m, d] = s.slice(0, 10).split('-').map(Number);
        return mwlValidDate(y, m, d);
    }
    const dm = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/.exec(s);
    if (dm) {
        let y = +dm[3];
        if (y < 100) y += (y >= 70 ? 1900 : 2000);
        return mwlValidDate(y, +dm[2], +dm[1]);
    }
    // Reine Zahl = Excel-Seriennummer. Untergrenze 20000 ≈ 1954; darunter ist
    // es eher eine Stundenzahl, die versehentlich in der Datumsspalte steht.
    if (/^\d+([.,]\d+)?$/.test(s)) {
        const n = parseFloat(s.replace(',', '.'));
        if (n >= 20000 && n <= 80000) return mwlSerialToDate(n);
    }
    return null;
}

function mwlValidDate(y, m, d) {
    if (!(y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
    return y + '-' + mwlPad2(m) + '-' + mwlPad2(d);
}

// Gibt 'HH:MM' zurueck oder null. Excel speichert Uhrzeiten als Tagesbruchteil.
function mwlParseTimeCell(v) {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s) return null;

    const hm = /^(\d{1,2})[:.](\d{2})(?::\d{2})?$/.exec(s);
    if (hm) {
        const h = +hm[1], m = +hm[2];
        if (h <= 23 && m <= 59) return mwlPad2(h) + ':' + mwlPad2(m);
        return null;
    }
    if (/^\d+([.,]\d+)?$/.test(s)) {
        const n = parseFloat(s.replace(',', '.'));
        if (n >= 0 && n < 1) {
            const mins = Math.round(n * 24 * 60);
            return mwlPad2(Math.floor(mins / 60) % 24) + ':' + mwlPad2(mins % 60);
        }
        if (Number.isInteger(n) && n >= 0 && n <= 23) return mwlPad2(n) + ':00';
    }
    return null;
}

// Stundenangabe als Dezimalzahl. Akzeptiert "8,5", "8.5", "8:30", "8h 30m",
// "480 min". Gibt null zurueck, wenn nichts Zaehlbares drinsteht.
function mwlParseHours(v) {
    if (v == null) return null;
    let s = String(v).trim().toLowerCase();
    if (!s) return null;

    const hm = /^(-?\d{1,3}):([0-5]?\d)$/.exec(s);
    if (hm) {
        const sign = hm[1].startsWith('-') ? -1 : 1;
        return sign * (Math.abs(+hm[1]) + (+hm[2]) / 60);
    }
    const hmText = /^(-?\d+(?:[.,]\d+)?)\s*h(?:\s*(\d+)\s*m(?:in)?)?$/.exec(s);
    if (hmText) {
        const h = parseFloat(hmText[1].replace(',', '.'));
        return h + (hmText[2] ? (h < 0 ? -1 : 1) * (+hmText[2]) / 60 : 0);
    }
    const minOnly = /^(-?\d+(?:[.,]\d+)?)\s*m(?:in)?$/.exec(s);
    if (minOnly) return parseFloat(minOnly[1].replace(',', '.')) / 60;

    s = s.replace(/\s*(std\.?|stunden|hours?)$/, '').trim();
    if (/^-?\d+([.,]\d+)?$/.test(s)) return parseFloat(s.replace(',', '.'));
    return null;
}

// Typ-Spalte auf die Eintragstypen der App abbilden. Reihenfolge zaehlt:
// "Feiertag" enthaelt "tag", "Urlaubstag" enthaelt "urlaub".
const MWL_TYPE_WORDS = [
    ['holiday',   ['feiertag', 'public holiday', 'bank holiday']],
    ['vacation',  ['urlaub', 'ferien', 'vacation', 'annual leave', 'pto', 'u']],
    ['sick',      ['krank', 'sick', 'au', 'arbeitsunfähig', 'arbeitsunfaehig']],
    ['school',    ['schule', 'berufsschule', 'unterricht', 'school', 'bs']],
    ['gleittag',  ['gleittag', 'gleitzeit', 'zeitausgleich', 'überstundenabbau', 'ueberstundenabbau', 'flex', 'awt']],
    ['korrektur', ['korrektur', 'korrigiert', 'adjustment', 'correction']],
    ['work',      ['arbeit', 'work', 'büro', 'buero', 'betrieb', 'anwesend', 'normal', 'homeoffice', 'ho', 'dienst']],
];

// 🔴 Kuerzel duerfen NUR exakt treffen. Als Teilstring gesucht verschluckt
// das "u" fuer Urlaub jedes Wort mit einem u darin — "Berufsschule" und
// "Zeitausgleich" wurden so beide zu Urlaubstagen, und im Saldo faellt das
// erst Monate spaeter auf.
function mwlMapType(v, fallback) {
    const s = String(v == null ? '' : v).trim().toLowerCase();
    if (!s) return fallback || 'work';
    // Erst alle exakten Treffer, dann erst Teiltreffer — sonst gewinnt die
    // Reihenfolge der Liste ueber die Genauigkeit.
    for (const [id, words] of MWL_TYPE_WORDS) {
        if (words.includes(s)) return id;
    }
    for (const [id, words] of MWL_TYPE_WORDS) {
        for (const w of words) {
            if (w.length > 3 && s.includes(w)) return id;
        }
    }
    return fallback || 'work';
}

// ─────────────────────────────────────────────────────────────────────────
// 3. SPALTEN ERKENNEN
// ─────────────────────────────────────────────────────────────────────────

const MWL_FIELDS = [
    { key: 'date',    label: 'Datum',        words: ['datum', 'date', 'tag', 'day'] },
    { key: 'start',   label: 'Von',          words: ['von', 'start', 'beginn', 'kommen', 'from', 'begin', 'einstempeln'] },
    { key: 'end',     label: 'Bis',          words: ['bis', 'ende', 'gehen', 'end', 'to', 'ausstempeln'] },
    { key: 'hours',   label: 'Stunden',      words: ['stunden', 'arbeitszeit', 'dauer', 'ist', 'hours', 'worked', 'gearbeitet', 'netto'] },
    { key: 'break',   label: 'Pause (Min.)', words: ['pause', 'break', 'pausenzeit', 'ruhepause'] },
    { key: 'type',    label: 'Typ',          words: ['typ', 'art', 'kategorie', 'type', 'category', 'status'] },
    { key: 'project', label: 'Projekt',      words: ['projekt', 'kunde', 'project', 'customer', 'auftrag', 'client'] },
    { key: 'info',    label: 'Notiz',        words: ['notiz', 'bemerkung', 'kommentar', 'tätigkeit', 'taetigkeit', 'beschreibung', 'note', 'comment', 'description', 'info'] },
];

function mwlNorm(s) {
    return String(s == null ? '' : s).toLowerCase()
        .replace(/[._\-\/()\[\]:]+/g, ' ')
        .replace(/\s+/g, ' ').trim();
}

// Sieht die Zeile nach Ueberschriften aus? Kriterium: sie enthaelt kein
// verwertbares Datum, aber Text. Eine Datei ohne Kopfzeile faengt sonst mit
// einem verlorenen Eintrag an.
function mwlLooksLikeHeader(row) {
    const hasDate = row.some(c => mwlParseDateCell(c));
    const hasText = row.some(c => /[a-zäöüß]{3,}/i.test(String(c)));
    return !hasDate && hasText;
}

function mwlDetectMapping(header) {
    const mapping = {};
    const used = new Set();
    const cols = header.map(mwlNorm);

    MWL_FIELDS.forEach(f => {
        // Exakter Treffer schlaegt Teiltreffer: sonst schnappt sich "Ist"
        // die Spalte "Istzeit Projekt".
        let hit = cols.findIndex((c, i) => !used.has(i) && f.words.includes(c));
        if (hit < 0) hit = cols.findIndex((c, i) => !used.has(i) && c && f.words.some(w => c.split(' ').includes(w)));
        if (hit < 0) hit = cols.findIndex((c, i) => !used.has(i) && c && f.words.some(w => w.length > 3 && c.includes(w)));
        if (hit >= 0) { mapping[f.key] = hit; used.add(hit); }
    });
    return mapping;
}

// Ohne Kopfzeile: Spalten am Inhalt erkennen. Die erste Spalte, in der
// mehrheitlich Datumsangaben stehen, ist das Datum — und so weiter.
function mwlGuessByContent(rows) {
    const mapping = {};
    const cols = Math.max(...rows.map(r => r.length));
    const probe = rows.slice(0, 25);
    const ratio = (i, fn) => {
        const vals = probe.map(r => r[i]).filter(v => String(v == null ? '' : v).trim() !== '');
        if (!vals.length) return 0;
        return vals.filter(fn).length / vals.length;
    };
    for (let i = 0; i < cols; i++) {
        if (mapping.date === undefined && ratio(i, v => mwlParseDateCell(v)) > 0.7) { mapping.date = i; continue; }
        if (mapping.start === undefined && ratio(i, v => mwlParseTimeCell(v)) > 0.7) { mapping.start = i; continue; }
        if (mapping.end === undefined && mapping.start !== undefined && ratio(i, v => mwlParseTimeCell(v)) > 0.7) { mapping.end = i; continue; }
        if (mapping.hours === undefined && ratio(i, v => mwlParseHours(v) !== null) > 0.7) { mapping.hours = i; continue; }
    }
    return mapping;
}

function mwlAnalyzeRows(rows) {
    if (!rows.length) return { header: [], body: [], mapping: {}, hadHeader: false };
    const hadHeader = mwlLooksLikeHeader(rows[0]);
    const header = hadHeader ? rows[0] : [];
    const body = hadHeader ? rows.slice(1) : rows;
    const mapping = hadHeader ? mwlDetectMapping(header) : mwlGuessByContent(body);
    return { header, body, mapping, hadHeader };
}

// ─────────────────────────────────────────────────────────────────────────
// 4. AUS ZEILEN EINTRÄGE MACHEN
// ─────────────────────────────────────────────────────────────────────────
//
// 🔴 Die Regeln fuer worked/expected/diff sind aus addEntry() in
// components/dashboard/dashboard.js gespiegelt. Aendert sich dort die
// Rechnung, muss sie hier nachgezogen werden — sonst rechnet ein importierter
// Tag anders als derselbe Tag von Hand eingetragen, und der Saldo stimmt
// nicht mehr. tools/import-wechsel.test.mjs nagelt die Tabelle fest.

function mwlSpanHours(start, end) {
    const a = new Date('2000-01-01T' + start + ':00');
    const b = new Date('2000-01-01T' + end + ':00');
    let h = (b - a) / 3.6e6;
    if (h < 0) h += 24;                 // ueber Mitternacht
    return h;
}

// ctx: { expectedFor(dateStr, jobId), jobId, defaultType, sollBelegt:Set }
function mwlBuildEntry(cells, mapping, ctx) {
    const at = k => (mapping[k] === undefined ? '' : (cells[mapping[k]] ?? ''));
    const warn = [];

    const date = mwlParseDateCell(at('date'));
    if (!date) return { ok: false, reason: 'kein gültiges Datum' };

    const type = mwlMapType(at('type'), ctx.defaultType);
    const jobId = ctx.jobId || 'primary';
    const expectedFull = ctx.expectedFor(date, jobId);

    const start = mwlParseTimeCell(at('start'));
    const end   = mwlParseTimeCell(at('end'));
    let breakMins = 0;
    if (mapping.break !== undefined) {
        const b = mwlParseHours(at('break'));
        // Eine Pausenspalte enthaelt Minuten, solange nicht "0:30" dasteht.
        const raw = String(at('break')).trim();
        breakMins = b === null ? 0 : (/[:h]/i.test(raw) ? Math.round(b * 60) : Math.round(b));
    }

    let worked = null;
    if (start && end) {
        worked = mwlSpanHours(start, end) - breakMins / 60;
        if (worked < 0) { worked = 0; warn.push('Pause länger als die Zeitspanne'); }
    } else {
        const h = mwlParseHours(at('hours'));
        if (h !== null) worked = h - (mapping.hours !== undefined && breakMins ? breakMins / 60 : 0);
    }

    // Nicht-Arbeitstypen tragen ihre Zeit aus dem Soll, nicht aus der Datei.
    let expected = expectedFull, diff = 0;
    const key = date + '|' + jobId;

    if (type === 'work' || !['school', 'vacation', 'sick', 'holiday', 'gleittag', 'korrektur'].includes(type)) {
        if (worked === null) return { ok: false, reason: 'weder Zeitspanne noch Stundenzahl' };
        // Split-Shift: das Tagessoll zaehlt pro Tag und Job nur einmal.
        if (ctx.sollBelegt.has(key)) {
            expected = 0;
            warn.push('Zusatzzeit — Tagessoll zählt bereits ein anderer Eintrag');
        } else if (expected > 0) {
            ctx.sollBelegt.add(key);
        }
        diff = worked - expected;
    } else if (type === 'school' || type === 'vacation' || type === 'sick' || type === 'holiday') {
        worked = expected;
        diff = 0;
        if (expected > 0) ctx.sollBelegt.add(key);
    } else if (type === 'gleittag') {
        worked = 0;
        diff = -expected;
        if (expected > 0) ctx.sollBelegt.add(key);
    } else if (type === 'korrektur') {
        if (worked === null) return { ok: false, reason: 'Korrektur ohne Stundenwert' };
        expected = 0;
        diff = worked;
        worked = 0;
    }

    const info = String(at('info') || '').trim();
    const project = String(at('project') || '').trim();

    return {
        ok: true,
        warn,
        entry: {
            id: undefined,                     // wird beim Übernehmen vergeben
            date, type,
            worked: Math.round(worked * 100) / 100,
            expected: Math.round(expected * 100) / 100,
            diff: Math.round(diff * 100) / 100,
            info, project,
            isPeriod: false,
            jobId,
            breakMins,
            shiftStart: start || '', shiftEnd: end || '',
            start: start || '', end: end || '',
            endIsRaw: true,
            shiftWarning: false,
            customFieldValues: {},
            breakLog: [],
            mood: '',
            importedAt: undefined              // beim Übernehmen gesetzt
        }
    };
}

// Baut aus allen Zeilen die Vorschau. `bestehend` = Set aus "date|jobId" der
// schon vorhandenen Eintraege, damit Dubletten auffallen BEVOR importiert wird.
function mwlBuildPreview(body, mapping, opts) {
    const o = opts || {};
    const ctx = {
        jobId: o.jobId || 'primary',
        defaultType: o.defaultType || 'work',
        expectedFor: o.expectedFor || (() => 0),
        sollBelegt: new Set(o.sollBelegtVorher || []),
    };
    const gesehen = new Set();
    const rows = [];

    body.forEach((cells, i) => {
        const r = mwlBuildEntry(cells, mapping, ctx);
        if (!r.ok) {
            rows.push({ nr: i + 1, ok: false, reason: r.reason, raw: cells });
            return;
        }
        const key = r.entry.date + '|' + r.entry.jobId;
        const dublette = (o.bestehend && o.bestehend.has(key)) || gesehen.has(key);
        gesehen.add(key);
        rows.push({
            nr: i + 1, ok: true, entry: r.entry, warn: r.warn,
            dublette,
            // Dubletten standardmaessig abwaehlen: doppelte Tage verfaelschen
            // den Saldo stiller als eine fehlende Zeile.
            take: !dublette,
        });
    });
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────
// 5. OBERFLÄCHE
// ─────────────────────────────────────────────────────────────────────────

var _mwlImport = { rows: [], header: [], mapping: {}, preview: [], fileName: '', undo: null, step: 1 };

function mwlImpL(de, en) {
    return (document.documentElement.lang === 'en') ? en : de;
}

function mwlImpEsc(s) {
    return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openImportWizard() {
    const ov = document.getElementById('importWizard');
    if (!ov) return;
    _mwlImport = { rows: [], header: [], mapping: {}, preview: [], fileName: '', undo: _mwlImport.undo, step: 1 };
    mwlImportGoto(1);
    mwlImportFillJobs();
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (typeof mwlEvent === 'function') mwlEvent('import_wizard_opened', {});
}

function closeImportWizard() {
    const ov = document.getElementById('importWizard');
    if (!ov) return;
    ov.classList.remove('open');
    document.body.style.overflow = '';
}

function mwlImportGoto(step) {
    _mwlImport.step = step;
    [1, 2, 3].forEach(s => {
        const pane = document.getElementById('impStep' + s);
        if (pane) pane.style.display = (s === step) ? '' : 'none';
        const dot = document.getElementById('impDot' + s);
        if (dot) dot.classList.toggle('active', s <= step);
    });
}

function mwlImportFillJobs() {
    const sel = document.getElementById('impJob');
    if (!sel) return;
    const jobs = (typeof getJobs === 'function') ? getJobs() : [];
    if (jobs.length < 2) {
        const row = document.getElementById('impJobRow');
        if (row) row.style.display = 'none';
        return;
    }
    sel.innerHTML = jobs.map(j => `<option value="${mwlImpEsc(j.id)}">${mwlImpEsc(j.name)}</option>`).join('');
}

async function mwlImportFile(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    try {
        let rows;
        if (/\.xlsx$/i.test(file.name)) {
            rows = await mwlXlsxToRows(await file.arrayBuffer());
        } else if (/\.xls$/i.test(file.name)) {
            throw new Error(mwlImpL(
                'Das alte .xls-Format lässt sich im Browser nicht lesen. Bitte in Excel als .xlsx oder CSV speichern.',
                'The old .xls format cannot be read in the browser. Please save as .xlsx or CSV.'));
        } else {
            rows = mwlParseDelimited(await file.text());
        }
        _mwlImport.fileName = file.name;
        mwlImportTakeRows(rows);
    } catch (e) {
        mwlImportError(e.message || String(e));
    } finally {
        input.value = '';   // dieselbe Datei nochmal waehlen zu koennen ist wichtiger als der Anzeigename
    }
}

function mwlImportPaste() {
    const ta = document.getElementById('impPasteArea');
    if (!ta || !ta.value.trim()) {
        mwlImportError(mwlImpL('Da ist nichts eingefügt.', 'Nothing pasted yet.'));
        return;
    }
    _mwlImport.fileName = mwlImpL('Zwischenablage', 'Clipboard');
    mwlImportTakeRows(mwlParseDelimited(ta.value));
}

function mwlImportTakeRows(rows) {
    if (!rows || rows.length < 1) {
        mwlImportError(mwlImpL('Keine verwertbaren Zeilen gefunden.', 'No usable rows found.'));
        return;
    }
    const a = mwlAnalyzeRows(rows);
    _mwlImport.header = a.header;
    _mwlImport.body = a.body;
    _mwlImport.mapping = a.mapping;
    _mwlImport.hadHeader = a.hadHeader;

    mwlImportError('');
    mwlImportRenderMapping();
    mwlImportGoto(2);
}

function mwlImportError(msg) {
    const box = document.getElementById('impError');
    if (!box) return;
    box.textContent = msg || '';
    box.style.display = msg ? '' : 'none';
}

function mwlImportRenderMapping() {
    const wrap = document.getElementById('impMapRows');
    if (!wrap) return;
    const cols = Math.max(_mwlImport.header.length, ...(_mwlImport.body.slice(0, 5).map(r => r.length)), 0);

    const optionsFor = key => {
        let html = `<option value="">${mwlImpL('— nicht zuordnen —', '— not mapped —')}</option>`;
        for (let i = 0; i < cols; i++) {
            const name = _mwlImport.header[i] ? mwlImpEsc(_mwlImport.header[i]) : mwlImpL('Spalte ', 'Column ') + (i + 1);
            const beispiel = (_mwlImport.body.find(r => String(r[i] ?? '').trim()) || [])[i];
            const sel = _mwlImport.mapping[key] === i ? ' selected' : '';
            html += `<option value="${i}"${sel}>${name}${beispiel ? ' · ' + mwlImpEsc(String(beispiel).slice(0, 18)) : ''}</option>`;
        }
        return html;
    };

    wrap.innerHTML = MWL_FIELDS.map(f => `
        <div class="imp-map-row">
            <label class="imp-map-label" for="impMap_${f.key}">${mwlImpEsc(f.label)}${f.key === 'date' ? ' *' : ''}</label>
            <select class="imp-select" id="impMap_${f.key}" data-key="${f.key}" onchange="mwlImportMapChanged()">${optionsFor(f.key)}</select>
        </div>`).join('');

    const info = document.getElementById('impFileInfo');
    if (info) {
        info.textContent = mwlImpL(
            `${_mwlImport.fileName} · ${_mwlImport.body.length} Zeilen · ${_mwlImport.hadHeader ? 'Kopfzeile erkannt' : 'keine Kopfzeile erkannt'}`,
            `${_mwlImport.fileName} · ${_mwlImport.body.length} rows · ${_mwlImport.hadHeader ? 'header detected' : 'no header detected'}`);
    }
}

function mwlImportMapChanged() {
    const m = {};
    MWL_FIELDS.forEach(f => {
        const sel = document.getElementById('impMap_' + f.key);
        if (sel && sel.value !== '') m[f.key] = parseInt(sel.value, 10);
    });
    _mwlImport.mapping = m;
}

// Soll-Stunden immer aus den Einstellungen — nie eine feste Zahl.
function mwlExpectedFor(dateStr, jobId) {
    const day = new Date(dateStr + 'T12:00:00').getDay();
    if (typeof getJobHours === 'function') return getJobHours(jobId, day) || 0;
    return (typeof data !== 'undefined' && data && data.settings && data.settings.hours)
        ? (data.settings.hours[day] || 0) : 0;
}

function mwlImportBuildPreview() {
    mwlImportMapChanged();
    if (_mwlImport.mapping.date === undefined) {
        mwlImportError(mwlImpL('Ohne Datums-Spalte geht es nicht — bitte oben zuordnen.',
                               'A date column is required — please map it above.'));
        return;
    }
    const jobSel = document.getElementById('impJob');
    const jobId = (jobSel && jobSel.value) || 'primary';
    const defaultType = (document.getElementById('impDefaultType') || {}).value || 'work';

    const bestehend = new Set();
    const sollBelegtVorher = [];
    if (typeof data !== 'undefined' && data && Array.isArray(data.entries)) {
        data.entries.forEach(e => {
            const jid = (typeof getEntryJobId === 'function') ? getEntryJobId(e) : (e.jobId || 'primary');
            bestehend.add(e.date + '|' + jid);
            if ((parseFloat(e.expected) || 0) > 0) sollBelegtVorher.push(e.date + '|' + jid);
        });
    }

    _mwlImport.preview = mwlBuildPreview(_mwlImport.body, _mwlImport.mapping, {
        jobId, defaultType, expectedFor: mwlExpectedFor, bestehend, sollBelegtVorher,
    });
    mwlImportError('');
    mwlImportRenderPreview();
    mwlImportGoto(3);
}

function mwlImportRenderPreview() {
    const tb = document.getElementById('impPreviewBody');
    if (!tb) return;
    const p = _mwlImport.preview;

    tb.innerHTML = p.map((r, i) => {
        if (!r.ok) {
            return `<tr class="imp-row-bad"><td></td><td colspan="6">${mwlImpL('Zeile', 'Row')} ${r.nr}: ${mwlImpEsc(r.reason)}</td></tr>`;
        }
        const e = r.entry;
        const badge = r.dublette
            ? `<span class="imp-badge warn">${mwlImpL('Tag existiert schon', 'day already exists')}</span>` : '';
        const warn = (r.warn || []).map(w => `<span class="imp-badge">${mwlImpEsc(w)}</span>`).join('');
        return `<tr class="${r.take ? '' : 'imp-row-off'}">
            <td><input type="checkbox" ${r.take ? 'checked' : ''} onchange="mwlImportToggleRow(${i}, this.checked)"></td>
            <td>${mwlImpEsc(e.date)}</td>
            <td>${mwlImpEsc(mwlImportTypeLabel(e.type))}</td>
            <td class="imp-num">${e.worked.toFixed(2)}</td>
            <td class="imp-num">${e.expected.toFixed(2)}</td>
            <td class="imp-num ${e.diff < 0 ? 'neg' : 'pos'}">${e.diff > 0 ? '+' : ''}${e.diff.toFixed(2)}</td>
            <td class="imp-note">${mwlImpEsc((e.project ? e.project + ' · ' : '') + e.info)}${badge}${warn}</td>
        </tr>`;
    }).join('');

    mwlImportUpdateSummary();
}

function mwlImportTypeLabel(id) {
    if (typeof getEntryTypeInfo === 'function') {
        const t = getEntryTypeInfo(id);
        if (t && t.label) return String(t.label).replace(/^[^\p{L}]+/u, '').trim() || id;
    }
    return id;
}

function mwlImportToggleRow(i, on) {
    if (_mwlImport.preview[i]) _mwlImport.preview[i].take = !!on;
    const tr = document.getElementById('impPreviewBody').children[i];
    if (tr) tr.classList.toggle('imp-row-off', !on);
    mwlImportUpdateSummary();
}

function mwlImportSelectAll(on) {
    _mwlImport.preview.forEach(r => { if (r.ok) r.take = !!on; });
    mwlImportRenderPreview();
}

function mwlImportUpdateSummary() {
    const p = _mwlImport.preview;
    const gut = p.filter(r => r.ok && r.take);
    const saldo = gut.reduce((s, r) => s + r.entry.diff, 0);
    const el = document.getElementById('impSummary');
    if (el) {
        el.innerHTML = mwlImpL(
            `<strong>${gut.length}</strong> von ${p.length} Zeilen werden übernommen · Saldo-Änderung <strong>${saldo > 0 ? '+' : ''}${saldo.toFixed(2)} h</strong>`,
            `<strong>${gut.length}</strong> of ${p.length} rows will be imported · balance change <strong>${saldo > 0 ? '+' : ''}${saldo.toFixed(2)} h</strong>`);
    }
    const btn = document.getElementById('impApplyBtn');
    if (btn) btn.disabled = gut.length === 0;
}

function mwlImportApply() {
    const nehmen = _mwlImport.preview.filter(r => r.ok && r.take);
    if (!nehmen.length) return;

    // Stand vor dem Import merken. Ein Import ist die eine Aktion, bei der
    // man Hunderte Zeilen auf einmal danebenlegen kann — ohne Rueckweg waere
    // das eine Falle.
    _mwlImport.undo = {
        ids: [],
        ts: Date.now(),
        anzahl: nehmen.length,
    };

    const base = Date.now();
    nehmen.forEach((r, i) => {
        const e = Object.assign({}, r.entry);
        e.id = base + i;
        e.timestamp = base + i;
        e.importedAt = new Date().toISOString();
        _mwlImport.undo.ids.push(e.id);
        data.entries.push(e);
    });

    data.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (typeof recalculateVacationUsed === 'function') recalculateVacationUsed();
    if (typeof dedupeDayExpected === 'function') { try { dedupeDayExpected(); } catch (e) {} }
    save();
    if (typeof renderAll === 'function') renderAll();

    if (typeof mwlEvent === 'function') mwlEvent('data_imported', { source: 'tabelle', rows: nehmen.length });

    closeImportWizard();
    if (typeof showCustomMessage === 'function') {
        showCustomMessage(
            mwlImpL('Import fertig', 'Import complete'),
            mwlImpL(`${nehmen.length} Einträge übernommen. Falls etwas nicht passt: „Import rückgängig" steht im Import-Menü, solange die Seite offen bleibt.`,
                    `${nehmen.length} entries imported. If something looks wrong, "Undo import" is in the import menu while this page stays open.`),
            'success');
    }
}

function mwlImportUndo() {
    const u = _mwlImport.undo;
    if (!u || !u.ids.length) return;
    const weg = new Set(u.ids);
    data.entries = data.entries.filter(e => !weg.has(e.id));
    if (typeof recalculateVacationUsed === 'function') recalculateVacationUsed();
    save();
    if (typeof renderAll === 'function') renderAll();
    _mwlImport.undo = null;
    if (typeof showCustomMessage === 'function') {
        showCustomMessage(mwlImpL('Rückgängig', 'Undone'),
            mwlImpL(`${u.anzahl} importierte Einträge wurden wieder entfernt.`,
                    `${u.anzahl} imported entries were removed again.`), 'info');
    }
}

function mwlImportHasUndo() {
    return !!(_mwlImport.undo && _mwlImport.undo.ids.length);
}

// ── Datei hierher ziehen ────────────────────────────────────────────────
// Ohne preventDefault auf dragover feuert `drop` nie — der Browser oeffnet
// die Datei stattdessen als neue Seite und die App ist weg.
document.addEventListener('DOMContentLoaded', function () {
    const drop = document.querySelector('.imp-drop');
    if (!drop) return;

    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
        e.preventDefault(); e.stopPropagation();
        drop.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
        e.preventDefault(); e.stopPropagation();
        drop.classList.remove('dragover');
    }));
    drop.addEventListener('drop', e => {
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length) mwlImportFile({ files: files, value: '' });
    });

    document.addEventListener('keydown', e => {
        const ov = document.getElementById('importWizard');
        if (e.key === 'Escape' && ov && ov.classList.contains('open')) closeImportWizard();
    });
});
