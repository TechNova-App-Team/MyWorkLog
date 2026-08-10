// ═══ SCHATTEN-BERICHTSHEFT: DATEI-VORSCHAU ═══
//
// Erweitert die Vorschau ueber Bild/PDF/Medien hinaus auf Text, Tabellen,
// E-Mails und Office-Dokumente — ohne eine einzige externe Bibliothek.
//
// Leitgedanke fuer ein Beweismittel-Archiv: Die Vorschau muss IMMER sagen,
// was man gerade sieht. Ein aus einer .docx gezogener Fliesstext ist kein
// Abbild des Dokuments (Kopfzeilen, Unterschriften, Layout fehlen), und wer
// das verwechselt, zieht aus einer Vorschau Schluesse, die die Datei nicht
// hergibt. Deshalb traegt jede abgeleitete Ansicht eine Herkunftszeile.
//
// Die Datei selbst wird NIE veraendert — hier wird ausschliesslich gelesen.

(function (global) {
    'use strict';

    function L(de, en) { return document.documentElement.lang === 'en' ? en : de; }

    // Grenzen: Eine 400-MB-Logdatei darf den Tab nicht umbringen. Gelesen
    // wird nur der Anfang; der Rest bleibt unangetastet im Tresor und laesst
    // sich herunterladen.
    const TEXT_BYTE_LIMIT = 2 * 1024 * 1024;   // 2 MB Rohbytes
    const TEXT_CHAR_LIMIT = 400000;            // danach abschneiden
    const TABLE_ROW_LIMIT = 500;
    const ZIP_MEMBER_LIMIT = 24 * 1024 * 1024; // entpackte Groesse je ZIP-Eintrag

    // ── Endungs-Tabellen ──────────────────────────────────────────────
    // Verankert (^…$), sonst matcht "js" auch "json" — dieselbe Falle wie
    // in tools/archflow.js.
    const EXT_TEXT = /^(txt|text|log|me|nfo|asc|md|markdown|mdown|rst|adoc|ini|cfg|conf|config|toml|env|properties|list|srt|sub|vtt|sbv|vcf|ldif|diff|patch|sql|sh|bash|zsh|bat|cmd|ps1|py|rb|pl|lua|r|go|rs|swift|kt|kts|java|scala|groovy|c|h|cc|cpp|hpp|cxx|m|mm|cs|vb|fs|dart|js|mjs|cjs|jsx|ts|tsx|css|scss|sass|less|styl|tex|bib|gitignore|gitattributes|editorconfig|dockerfile|makefile|gradle|gemfile|readme|license|changelog)$/;
    const EXT_JSON = /^(json|jsonl|ndjson|geojson|map|webmanifest)$/;
    const EXT_XML = /^(xml|xsl|xslt|xsd|rss|atom|svg|plist|kml|gpx|opml)$/;
    const EXT_HTML = /^(html|htm|xhtml|shtml)$/;
    const EXT_SHEET = /^(csv|tsv|tab)$/;
    const EXT_MAIL = /^(eml|mbox|mht|mhtml)$/;
    const EXT_ICAL = /^(ics|ical|ifb)$/;
    const EXT_RTF = /^rtf$/;
    const EXT_IMAGE = /^(jpg|jpeg|png|gif|webp|bmp|ico|avif|apng|svg)$/;
    const EXT_AUDIO = /^(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba|amr|wma)$/;
    const EXT_VIDEO = /^(mp4|m4v|webm|ogv|mov|avi|mkv|3gp|wmv|mpg|mpeg)$/;
    // Formate, die Browser bekanntermassen NICHT dekodieren. Wir sagen das
    // beim Namen, statt ein anonymes "keine Vorschau" zu zeigen.
    const EXT_UNDECODABLE = /^(heic|heif|tiff|tif|psd|ai|eps|indd|cr2|nef|arw|dng|raf|orf)$/;

    const OFFICE_KINDS = {
        docx: 'word', dotx: 'word', docm: 'word',
        xlsx: 'sheet', xltx: 'sheet', xlsm: 'sheet',
        pptx: 'slides', potx: 'slides', pptm: 'slides',
        odt: 'odf-text', ott: 'odf-text',
        ods: 'odf-sheet', ots: 'odf-sheet',
        odp: 'odf-slides', otp: 'odf-slides',
    };
    // Alte Binaerformate (Word 97-2003 & Co.) sind kein ZIP und ohne
    // Bibliothek nicht sinnvoll lesbar — ehrlich benennen statt raten.
    const EXT_LEGACY_OFFICE = /^(doc|xls|ppt|pub|vsd|mdb|wpd|pages|numbers|key)$/;

    function extOf(name) {
        const parts = String(name || '').split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    // Der MIME-Typ eines Anhangs kommt vom Betriebssystem und ist oft leer
    // oder falsch (Android liefert fuer .md gern application/octet-stream).
    // Deshalb entscheidet im Zweifel die Endung.
    function detectKind(mime, name) {
        const m = String(mime || '').toLowerCase().split(';')[0].trim();
        const ext = extOf(name);

        if (ext === 'svg' || m === 'image/svg+xml') return 'image';
        if (EXT_UNDECODABLE.test(ext)) return 'undecodable';
        if (Object.prototype.hasOwnProperty.call(OFFICE_KINDS, ext)) return 'office';
        if (EXT_LEGACY_OFFICE.test(ext)) return 'legacy-office';

        if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
        if (EXT_IMAGE.test(ext) || m.indexOf('image/') === 0) return 'image';
        if (EXT_AUDIO.test(ext) || m.indexOf('audio/') === 0) return 'audio';
        if (EXT_VIDEO.test(ext) || m.indexOf('video/') === 0) return 'video';

        if (EXT_MAIL.test(ext) || m === 'message/rfc822') return 'mail';
        if (EXT_ICAL.test(ext) || m === 'text/calendar') return 'ical';
        if (EXT_SHEET.test(ext) || m === 'text/csv' || m === 'text/tab-separated-values') return 'table';
        if (EXT_JSON.test(ext) || m === 'application/json') return 'json';
        if (EXT_XML.test(ext) || m === 'application/xml' || m === 'text/xml') return 'xml';
        if (EXT_HTML.test(ext) || m === 'text/html') return 'html';
        if (EXT_RTF.test(ext) || m === 'application/rtf' || m === 'text/rtf') return 'rtf';
        if (EXT_TEXT.test(ext) || m.indexOf('text/') === 0) return 'text';

        return 'generic';
    }

    // Grobe Einordnung fuer Kachel-Symbole — bleibt kompatibel zu den
    // bestehenden ATT_ICONS-Schluesseln.
    function iconKey(kind) {
        if (kind === 'image' || kind === 'pdf' || kind === 'audio' || kind === 'video') return kind;
        if (kind === 'generic' || kind === 'undecodable') return 'generic';
        return 'doc';
    }

    // ── Text-Dekodierung ──────────────────────────────────────────────
    // UTF-8 zuerst, aber mit fatal:true — sonst wuerde ein Windows-Textfile
    // aus dem Betrieb still zu "Kndigung" statt "Kündigung" und der Nutzer
    // haelt die Datei fuer beschaedigt. Erst wenn UTF-8 wirklich scheitert,
    // wird windows-1252 versucht.
    function decodeText(buffer) {
        const bytes = new Uint8Array(buffer);
        const slice = bytes.length > TEXT_BYTE_LIMIT ? bytes.subarray(0, TEXT_BYTE_LIMIT) : bytes;
        let text = null;
        let encoding = 'UTF-8';
        try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(slice);
        } catch (e) {
            try {
                text = new TextDecoder('windows-1252').decode(slice);
                encoding = 'Windows-1252';
            } catch (e2) {
                text = new TextDecoder('utf-8').decode(slice);   // Ersatzzeichen statt Absturz
                encoding = 'UTF-8 (mit Ersatzzeichen)';
            }
        }
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);   // BOM
        return {
            text: text.length > TEXT_CHAR_LIMIT ? text.slice(0, TEXT_CHAR_LIMIT) : text,
            encoding: encoding,
            truncated: bytes.length > TEXT_BYTE_LIMIT || text.length > TEXT_CHAR_LIMIT,
            totalBytes: bytes.length
        };
    }

    // ── ZIP ohne Bibliothek ───────────────────────────────────────────
    // Office-Dateien (docx/xlsx/pptx/odt/…) sind ZIP-Container. Der Browser
    // kann seit DecompressionStream('deflate-raw') die enthaltenen Streams
    // selbst auspacken — damit braucht es fuer eine Text-Vorschau kein
    // einziges fremdes Byte Code.
    function readZipDirectory(buffer) {
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        // End of Central Directory rueckwaerts suchen (max. 64 KB Kommentar)
        const minPos = Math.max(0, bytes.length - 65557);
        let eocd = -1;
        for (let i = bytes.length - 22; i >= minPos; i--) {
            if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) return null;
        const count = view.getUint16(eocd + 10, true);
        let ptr = view.getUint32(eocd + 16, true);
        if (ptr >= bytes.length) return null;   // Zip64 o.ae. — nicht unterstuetzt

        const entries = Object.create(null);
        for (let i = 0; i < count; i++) {
            if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) break;
            const method = view.getUint16(ptr + 10, true);
            const compSize = view.getUint32(ptr + 20, true);
            const rawSize = view.getUint32(ptr + 24, true);
            const nameLen = view.getUint16(ptr + 28, true);
            const extraLen = view.getUint16(ptr + 30, true);
            const commentLen = view.getUint16(ptr + 32, true);
            const localOff = view.getUint32(ptr + 42, true);
            const name = new TextDecoder('utf-8').decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
            entries[name] = { method: method, compSize: compSize, rawSize: rawSize, localOff: localOff };
            ptr += 46 + nameLen + extraLen + commentLen;
        }
        return entries;
    }

    async function inflateRaw(bytes) {
        if (typeof DecompressionStream !== 'function') return null;
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function zipReadText(buffer, entries, name) {
        const e = entries[name];
        if (!e) return null;
        if (e.rawSize > ZIP_MEMBER_LIMIT) return null;
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        if (view.getUint32(e.localOff, true) !== 0x04034b50) return null;
        const nameLen = view.getUint16(e.localOff + 26, true);
        const extraLen = view.getUint16(e.localOff + 28, true);
        const start = e.localOff + 30 + nameLen + extraLen;
        const raw = bytes.subarray(start, start + e.compSize);
        let out;
        if (e.method === 0) out = raw;
        else if (e.method === 8) out = await inflateRaw(raw);
        else return null;
        if (!out) return null;
        return new TextDecoder('utf-8').decode(out);
    }

    // ── XML → Text ────────────────────────────────────────────────────
    function xmlDecodeEntities(s) {
        return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
                .replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(+d); })
                .replace(/&amp;/g, '&');
    }

    // Zieht den Inhalt aller <tag>…</tag>-Paare in Dokumentreihenfolge.
    // Sucht das NAMENSGLEICHE Schlusstag, nicht das naechstbeste "</" — sonst
    // schneidet ein verschachteltes Element den Text mittendrin ab.
    function collectTagText(xml, tagPattern) {
        const re = new RegExp('<(?:(\\w+):)?(' + tagPattern + ')\\b[^>]*?(/>|>)', 'g');
        const out = [];
        let m;
        while ((m = re.exec(xml)) !== null) {
            if (m[3] === '/>') { out.push(''); continue; }
            const closeTag = '</' + (m[1] ? m[1] + ':' : '') + m[2] + '>';
            const close = xml.indexOf(closeTag, re.lastIndex);
            if (close < 0) continue;
            out.push(xmlDecodeEntities(xml.slice(re.lastIndex, close).replace(/<[^>]*>/g, '')));
            re.lastIndex = close + closeTag.length;
        }
        return out;
    }

    // Absatzgrenzen brauchen einen Marker, der im Nutztext nicht vorkommt.
    // Ein Leerzeichen waere fatal — daran zerfaellt jeder Satz in einzelne
    // Woerter statt in Absaetze.
    const PARA_MARK = '\u0001';

    function wordXmlToParagraphs(xml) {
        const marked = xml
            .replace(/<(?:\w+:)?br\b[^>]*\/?>/g, '<w:t>\n</w:t>')
            .replace(/<(?:\w+:)?tab\b[^>]*\/?>/g, '<w:t>\t</w:t>')
            .replace(/<\/(?:\w+:)?p>/g, PARA_MARK);
        return marked.split(PARA_MARK)
            .map(function (chunk) { return collectTagText(chunk, 't').join('').replace(/[ \t]+$/, ''); })
            .filter(function (line, i, arr) { return line || (i > 0 && arr[i - 1]); });
    }

    function odfXmlToParagraphs(xml) {
        const marked = xml
            .replace(/<text:line-break\b[^>]*\/?>/g, '\n')
            .replace(/<text:tab\b[^>]*\/?>/g, '\t')
            .replace(/<\/text:(p|h)>/g, PARA_MARK);
        return marked.split(PARA_MARK)
            .map(function (chunk) { return xmlDecodeEntities(chunk.replace(/<[^>]*>/g, '')).replace(/[ \t]+$/, ''); })
            .filter(function (line, i, arr) { return line || (i > 0 && arr[i - 1]); });
    }

    // ── Office-Auszug ─────────────────────────────────────────────────
    async function extractOffice(buffer, ext) {
        const entries = readZipDirectory(buffer);
        if (!entries) return { error: 'notzip' };
        if (typeof DecompressionStream !== 'function') return { error: 'nodecompress' };
        const family = OFFICE_KINDS[ext];

        if (family === 'word') {
            const xml = await zipReadText(buffer, entries, 'word/document.xml');
            if (xml == null) return { error: 'unreadable' };
            return { type: 'text', lines: wordXmlToParagraphs(xml) };
        }
        if (family === 'odf-text' || family === 'odf-slides') {
            const xml = await zipReadText(buffer, entries, 'content.xml');
            if (xml == null) return { error: 'unreadable' };
            return { type: 'text', lines: odfXmlToParagraphs(xml) };
        }
        if (family === 'slides') {
            const names = Object.keys(entries)
                .filter(function (n) { return /^ppt\/slides\/slide\d+\.xml$/.test(n); })
                .sort(function (a, b) {
                    return (+a.match(/(\d+)/)[1]) - (+b.match(/(\d+)/)[1]);
                });
            if (!names.length) return { error: 'unreadable' };
            const lines = [];
            for (let i = 0; i < names.length; i++) {
                const xml = await zipReadText(buffer, entries, names[i]);
                if (xml == null) continue;
                lines.push(L('— Folie ', '— Slide ') + (i + 1) + ' —');
                collectTagText(xml, 't').forEach(function (t) {
                    const s = t.trim(); if (s) lines.push(s);
                });
                lines.push('');
            }
            return { type: 'text', lines: lines };
        }
        if (family === 'sheet') {
            return await extractXlsx(buffer, entries);
        }
        if (family === 'odf-sheet') {
            const xml = await zipReadText(buffer, entries, 'content.xml');
            if (xml == null) return { error: 'unreadable' };
            return { type: 'table', rows: odsToRows(xml) };
        }
        return { error: 'unreadable' };
    }

    async function extractXlsx(buffer, entries) {
        const sharedXml = await zipReadText(buffer, entries, 'xl/sharedStrings.xml');
        const shared = sharedXml ? collectSharedStrings(sharedXml) : [];
        const sheetName = Object.keys(entries)
            .filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(n); })
            .sort()[0];
        if (!sheetName) return { error: 'unreadable' };
        const xml = await zipReadText(buffer, entries, sheetName);
        if (xml == null) return { error: 'unreadable' };
        return { type: 'table', rows: sheetXmlToRows(xml, shared) };
    }

    // <si> kann mehrere <t> enthalten (formatierte Teilstuecke eines Wortes) —
    // die gehoeren zusammengeklebt, sonst zerfaellt "Kündigung" in drei Zellen.
    function collectSharedStrings(xml) {
        const out = [];
        const re = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
        let m;
        while ((m = re.exec(xml)) !== null) out.push(collectTagText(m[1], 't').join(''));
        return out;
    }

    function colIndex(ref) {
        const letters = String(ref || '').replace(/\d+/g, '');
        let n = 0;
        for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
        return Math.max(0, n - 1);
    }

    function sheetXmlToRows(xml, shared) {
        const rows = [];
        const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
        let rm;
        while ((rm = rowRe.exec(xml)) !== null && rows.length < TABLE_ROW_LIMIT) {
            const cells = [];
            const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
            let cm;
            while ((cm = cellRe.exec(rm[1])) !== null) {
                const attrs = cm[1] || cm[3] || '';
                const inner = cm[2] || '';
                const refM = attrs.match(/r="([A-Z]+\d+)"/);
                const idx = refM ? colIndex(refM[1]) : cells.length;
                const typeM = attrs.match(/t="([^"]+)"/);
                let val = '';
                if (typeM && typeM[1] === 's') {
                    const vi = +(collectTagText(inner, 'v')[0] || -1);
                    val = shared[vi] != null ? shared[vi] : '';
                } else if (typeM && typeM[1] === 'inlineStr') {
                    val = collectTagText(inner, 't').join('');
                } else {
                    val = collectTagText(inner, 'v')[0] || '';
                }
                while (cells.length < idx) cells.push('');
                cells[idx] = val;
            }
            rows.push(cells);
        }
        return rows;
    }

    function odsToRows(xml) {
        const rows = [];
        const rowRe = /<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/g;
        let rm;
        while ((rm = rowRe.exec(xml)) !== null && rows.length < TABLE_ROW_LIMIT) {
            const cells = [];
            const cellRe = /<table:table-cell\b([^>]*)>([\s\S]*?)<\/table:table-cell>|<table:table-cell\b([^>]*)\/>/g;
            let cm;
            while ((cm = cellRe.exec(rm[1])) !== null) {
                const attrs = cm[1] || cm[3] || '';
                const repM = attrs.match(/table:number-columns-repeated="(\d+)"/);
                const repeat = Math.min(repM ? +repM[1] : 1, 64);   // Deckel gegen 1024-fach leere Spalten
                const text = xmlDecodeEntities(String(cm[2] || '').replace(/<[^>]*>/g, '')).trim();
                for (let i = 0; i < repeat; i++) cells.push(text);
            }
            while (cells.length && cells[cells.length - 1] === '') cells.pop();
            rows.push(cells);
        }
        while (rows.length && !rows[rows.length - 1].length) rows.pop();
        return rows;
    }

    // ── CSV / TSV ─────────────────────────────────────────────────────
    // Trennzeichen wird gemessen, nicht angenommen: deutsche Exporte aus
    // Excel nutzen fast immer das Semikolon, und ein auf Komma festgenagelter
    // Parser macht daraus eine einzige Spalte.
    function sniffDelimiter(text) {
        const head = text.split(/\r?\n/).slice(0, 5).join('\n');
        const counts = [[';', 0], [',', 0], ['\t', 0], ['|', 0]];
        let inQuotes = false;
        for (let i = 0; i < head.length; i++) {
            const ch = head[i];
            if (ch === '"') inQuotes = !inQuotes;
            if (inQuotes) continue;
            for (let c = 0; c < counts.length; c++) if (ch === counts[c][0]) counts[c][1]++;
        }
        counts.sort(function (a, b) { return b[1] - a[1]; });
        return counts[0][1] > 0 ? counts[0][0] : ',';
    }

    function parseDelimited(text, delim) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (text[i + 1] === '"') { field += '"'; i++; }
                    else inQuotes = false;
                } else field += ch;
                continue;
            }
            if (ch === '"') { inQuotes = true; continue; }
            if (ch === delim) { row.push(field); field = ''; continue; }
            if (ch === '\n') {
                row.push(field); field = '';
                rows.push(row); row = [];
                if (rows.length >= TABLE_ROW_LIMIT) return rows;
                continue;
            }
            if (ch === '\r') continue;
            field += ch;
        }
        if (field.length || row.length) { row.push(field); rows.push(row); }
        return rows;
    }

    // ── E-Mail (.eml) ─────────────────────────────────────────────────
    // In einem Beweismittel-Archiv ist die E-Mail der haeufigste Fund. Roh
    // angezeigt ist sie eine Wand aus Transport-Headern; interessant sind
    // Absender, Empfaenger, Datum, Betreff — und der Text.
    function decodeRfc2047(s) {
        return String(s || '').replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, function (_, cs, enc, data) {
            try {
                let bytes;
                if (enc.toUpperCase() === 'B') {
                    const bin = atob(data);
                    bytes = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                } else {
                    const txt = data.replace(/_/g, ' ');
                    const arr = [];
                    for (let i = 0; i < txt.length; i++) {
                        if (txt[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(txt.substr(i + 1, 2))) {
                            arr.push(parseInt(txt.substr(i + 1, 2), 16)); i += 2;
                        } else arr.push(txt.charCodeAt(i));
                    }
                    bytes = new Uint8Array(arr);
                }
                return new TextDecoder(/utf-?8/i.test(cs) ? 'utf-8' : 'windows-1252').decode(bytes);
            } catch (e) { return data; }
        });
    }

    function decodeQuotedPrintable(s) {
        const joined = String(s).replace(/=\r?\n/g, '');
        const arr = [];
        for (let i = 0; i < joined.length; i++) {
            if (joined[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(joined.substr(i + 1, 2))) {
                arr.push(parseInt(joined.substr(i + 1, 2), 16)); i += 2;
            } else arr.push(joined.charCodeAt(i) & 0xFF);
        }
        try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(arr)); }
        catch (e) { return new TextDecoder('windows-1252').decode(new Uint8Array(arr)); }
    }

    function parseEml(raw) {
        const split = raw.search(/\r?\n\r?\n/);
        const headBlock = split < 0 ? raw : raw.slice(0, split);
        let body = split < 0 ? '' : raw.slice(split).replace(/^\r?\n\r?\n/, '');

        const headers = Object.create(null);
        headBlock.replace(/\r\n/g, '\n').split('\n').forEach(function (line) {
            if (/^\s/.test(line)) {                       // Fortsetzungszeile
                const keys = Object.keys(headers);
                if (keys.length) headers[keys[keys.length - 1]] += ' ' + line.trim();
                return;
            }
            const c = line.indexOf(':');
            if (c > 0) headers[line.slice(0, c).toLowerCase()] = line.slice(c + 1).trim();
        });

        const enc = (headers['content-transfer-encoding'] || '').toLowerCase();
        const ctype = (headers['content-type'] || '').toLowerCase();

        // Mehrteilige Mails: den text/plain-Teil nehmen, sonst den ersten.
        const boundary = (headers['content-type'] || '').match(/boundary="?([^";]+)"?/i);
        if (boundary) {
            const parts = body.split('--' + boundary[1]);
            let chosen = null;
            for (const p of parts) {
                if (/content-type:\s*text\/plain/i.test(p)) { chosen = p; break; }
            }
            if (!chosen) chosen = parts.find(function (p) { return /content-type:\s*text\//i.test(p); });
            if (chosen) {
                const ps = chosen.search(/\r?\n\r?\n/);
                const partHead = ps < 0 ? '' : chosen.slice(0, ps).toLowerCase();
                body = ps < 0 ? chosen : chosen.slice(ps).replace(/^\r?\n\r?\n/, '');
                if (/quoted-printable/.test(partHead)) body = decodeQuotedPrintable(body);
                else if (/base64/.test(partHead)) { try { body = decodeURIComponent(escape(atob(body.replace(/\s/g, '')))); } catch (e) {} }
                if (/content-type:\s*text\/html/i.test(partHead)) body = stripHtml(body);
            }
        } else {
            if (enc === 'quoted-printable') body = decodeQuotedPrintable(body);
            else if (enc === 'base64') { try { body = decodeURIComponent(escape(atob(body.replace(/\s/g, '')))); } catch (e) {} }
            if (/text\/html/.test(ctype)) body = stripHtml(body);
        }

        const pick = ['from', 'to', 'cc', 'date', 'subject', 'reply-to'];
        const meta = [];
        const labels = {
            from: L('Von', 'From'), to: L('An', 'To'), cc: 'Cc',
            date: L('Datum', 'Date'), subject: L('Betreff', 'Subject'),
            'reply-to': L('Antwort an', 'Reply to')
        };
        pick.forEach(function (k) {
            if (headers[k]) meta.push([labels[k], decodeRfc2047(headers[k])]);
        });
        return { meta: meta, body: body.trim(), headerCount: Object.keys(headers).length };
    }

    // HTML wird NIE gerendert — eine Beweismittel-Datei darf im Tresor kein
    // Skript, kein Tracking-Pixel und keinen externen Nachladepfad ausloesen.
    // Deshalb: Tags entfernen und den Text zeigen.
    function stripHtml(html) {
        return xmlDecodeEntities(
            String(html)
                .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
                .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]*>/g, '')
        ).replace(/\n{3,}/g, '\n\n').trim();
    }

    // RTF: nur so weit entkleiden, dass der Fliesstext lesbar wird.
    function stripRtf(rtf) {
        return String(rtf)
            .replace(/\\'([0-9a-fA-F]{2})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
            .replace(/\\u(-?\d+)\s?\??/g, function (_, d) { return String.fromCharCode(((+d) + 65536) % 65536); })
            .replace(/\{\\\*[\s\S]*?\}/g, '')
            .replace(/\\par[d]?\b/g, '\n')
            .replace(/\\line\b/g, '\n')
            .replace(/\\tab\b/g, '\t')
            .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
            .replace(/[{}]/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    function prettyJson(text) {
        try { return JSON.stringify(JSON.parse(text), null, 2); }
        catch (e) { return null; }
    }

    global.SchattenPreview = {
        detectKind: detectKind,
        iconKey: iconKey,
        decodeText: decodeText,
        extractOffice: extractOffice,
        sniffDelimiter: sniffDelimiter,
        parseDelimited: parseDelimited,
        parseEml: parseEml,
        stripHtml: stripHtml,
        stripRtf: stripRtf,
        prettyJson: prettyJson,
        officeFamily: function (ext) { return OFFICE_KINDS[ext] || null; },
        extOf: extOf,
        limits: {
            textBytes: TEXT_BYTE_LIMIT,
            textChars: TEXT_CHAR_LIMIT,
            tableRows: TABLE_ROW_LIMIT
        }
    };
})(window);
