// ═══ BH-TEXT MODULE ═══
// Formatierter Berichtstext (seit 01.11.2026, Wunsch des Nutzers: „wie auf der IHK-Seite").
// EINE Stelle für die Auszeichnung — Editor, Ansicht, PDF und KI hängen alle hier dran.
//
// Gespeichert wird weiter ein normaler String in den bestehenden Feldern (activities,
// dailyActivities[tag], school, instruction). Die Auszeichnung ist bewusst schlank und auch
// als Klartext lesbar, damit alles, was die Felder liest (KI-Prompts, Suche, Prüfungs-Check,
// Rahmenplan, Lernprofil, IHK-Import), ohne Umbau weiterläuft:
//   **fett**   *kursiv*   __unterstrichen__
//   "- Text"        Aufzählung          "   - Text"   Unterpunkt (Ebene 2)
//   "1. Text"       Nummerierung        "   1. Text"  nummerierter Unterpunkt
// "   - " ist dieselbe Unterpunkt-Form, die bhEntriesAlsText (bh-basis.js) seit v8.6.3
// schreibt — Altbestand wird also ohne Umwandlung richtig angezeigt.
//
// 🔴 PDF: jsPDF-Standardschriften können nur WinAnsi. Ein „◦" (U+25E6, Unterpunkt aus dem
// IHK-Import und aus KI-Antworten) kam als „%æ" heraus (gemeldet 01.11.2026). pdfSicher()
// übersetzt deshalb JEDEN Text, der ins PDF geht; Listenzeichen zeichnet pdfText() selbst.
//
// Test: node tools/bh-text.test.mjs

window.BHText = (function () {
'use strict';

const LISTE = /^( *)([-•–◦▪‣⁃·])\s+(.*)$/;
const NUMMER = /^( *)(\d{1,3})[.)]\s+(.*)$/;
const EINRUECKUNG = 2;              // ab so vielen Leerzeichen ist eine Zeile Ebene 2

// ── Zeilen ─────────────────────────────────────────────────────────────
// → [{ art: 'p'|'ul'|'ol'|'leer', ebene: 1|2, nr, text }]
function zeilen(markup) {
    return String(markup == null ? '' : markup).replace(/\r\n?/g, '\n').split('\n').map(z => {
        if (!z.trim()) return { art: 'leer', ebene: 1, text: '' };
        let m = LISTE.exec(z);
        if (m) return { art: 'ul', ebene: m[1].length >= EINRUECKUNG ? 2 : 1, text: m[3] };
        m = NUMMER.exec(z);
        if (m) return { art: 'ol', ebene: m[1].length >= EINRUECKUNG ? 2 : 1, nr: +m[2], text: m[3] };
        // Eingerückter Text ohne Zeichen bleibt eingerückter Absatz (Altbestand: "    Text")
        return { art: 'p', ebene: /^ {2,}\S/.test(z) ? 2 : 1, text: z.trim() };
    });
}

// ── Inline: Text → Läufe [{ t, b, i, u }] ──────────────────────────────
// Nur Paare zählen: ein einzelnes "*" („5 * 3") bleibt Text.
// "***x***" (fett + kursiv, so schreibt es laeufeAlsMarkup) zuerst — sonst nimmt die
// Fett-Regel "*x" als Inhalt und ein Sternchen bleibt übrig.
const INLINE = /\*\*\*(?=\S)([\s\S]*?\S)\*\*\*|\*\*(?=\S)([\s\S]*?\S)\*\*|__(?=\S)([\s\S]*?\S)__|\*(?=[^\s*])([\s\S]*?[^\s*])\*(?!\*)/;
function laeufe(text, stil) {
    stil = stil || { b: false, i: false, u: false };
    const out = [];
    let rest = String(text || '');
    while (rest) {
        const m = INLINE.exec(rest);
        if (!m) { out.push({ t: rest, ...stil }); break; }
        if (m.index > 0) out.push({ t: rest.slice(0, m.index), ...stil });
        if (m[1] != null) out.push(...laeufe(m[1], { ...stil, b: true, i: true }));
        else if (m[2] != null) out.push(...laeufe(m[2], { ...stil, b: true }));
        else if (m[3] != null) out.push(...laeufe(m[3], { ...stil, u: true }));
        else out.push(...laeufe(m[4], { ...stil, i: true }));
        rest = rest.slice(m.index + m[0].length);
    }
    // Gleiche Nachbarn zusammenlegen
    return out.reduce((a, l) => {
        const v = a[a.length - 1];
        if (v && v.b === l.b && v.i === l.i && v.u === l.u) v.t += l.t; else if (l.t) a.push({ ...l });
        return a;
    }, []);
}

function laeufeAlsMarkup(ls) {
    return (ls || []).map(l => {
        if (!l.t) return '';
        // Leerraum am Rand gehört nicht in die Marker („** fett**" wäre kein Paar mehr)
        const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(l.t);
        let t = m[2];
        if (!t) return l.t;
        if (l.i) t = '*' + t + '*';
        if (l.u) t = '__' + t + '__';
        if (l.b) t = '**' + t + '**';
        return m[1] + t + m[3];
    }).join('');
}

function klartext(markup) {
    return zeilen(markup).map(z => z.art === 'leer' ? '' : laeufe(z.text).map(l => l.t).join('')).join('\n');
}

// Zeile → Markup-Präfix
function praefix(z, nr) {
    const einr = z.ebene === 2 ? '   ' : '';
    if (z.art === 'ul') return einr + '- ';
    if (z.art === 'ol') return einr + (nr || z.nr || 1) + '. ';
    if (z.art === 'p' && z.ebene === 2) return '    ';
    return '';
}

// ── HTML (Ansicht, Editor) ─────────────────────────────────────────────
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function laeufeHtml(ls) {
    return ls.map(l => {
        let h = esc(l.t);
        if (l.i) h = '<em>' + h + '</em>';
        if (l.u) h = '<u>' + h + '</u>';
        if (l.b) h = '<strong>' + h + '</strong>';
        return h;
    }).join('');
}
// Jede Zeile ein eigener Block mit data-art/-ebene — derselbe Aufbau im Editor und in der
// Ansicht, die Listenzeichen setzt das CSS (bh-text.css). Nummern werden hier gezählt.
function zuHtml(markup, opts) {
    const zs = zeilen(markup);
    const z0 = zahlen(zs);
    const tag = (opts && opts.tag) || 'div';
    return zs.map((z, k) => '<' + tag + ' class="bt-z"' +
        (z.art === 'ul' || z.art === 'ol' ? ' data-art="' + z.art + '"' : '') +
        (z.ebene === 2 ? ' data-ebene="2"' : '') +
        (z.art === 'ol' ? ' data-nr="' + z0[k] + '"' : '') + '>' +
        (z.art === 'leer' ? '<br>' : laeufeHtml(laeufe(z.text))) + '</' + tag + '>').join('');
}
// Laufende Nummern je Ebene; eine andere Zeile dazwischen (außer tieferer Ebene) beginnt neu
function zahlen(zs) {
    const z = [0, 0, 0];
    return zs.map(x => {
        if (x.art === 'ol') {
            if (x.ebene === 1) z[2] = 0;
            z[x.ebene] += 1;
            return z[x.ebene];
        }
        if (x.art === 'ul' && x.ebene === 2) return 0;
        if (x.art === 'p' && x.ebene === 2) return 0;
        z[1] = 0; z[2] = 0;
        return 0;
    });
}

// Editor-DOM → Markup. Jede Kind-Zeile .bt-z ist eine Zeile; was der Browser sonst
// einfügt (Text direkt im Editor, <br>, <div> ohne Klasse, <p>), wird mitgelesen.
function ausDom(root) {
    const out = [];
    const linie = (el) => ({
        art: el.getAttribute && (el.getAttribute('data-art') === 'ul' || el.getAttribute('data-art') === 'ol') ? el.getAttribute('data-art') : 'p',
        ebene: el.getAttribute && el.getAttribute('data-ebene') === '2' ? 2 : 1,
        laeufe: [],
    });
    let akt = null;
    const neu = (el) => { akt = linie(el || {}); out.push(akt); return akt; };
    function inline(node, stil) {
        if (node.nodeType === 3) { (akt || neu()).laeufe.push({ t: node.nodeValue.replace(/\u00a0/g, ' ').replace(/\n/g, ' '), ...stil }); return; }
        if (node.nodeType !== 1) return;
        const n = node.nodeName;
        if (n === 'BR') { const vorher = akt; neu(); if (vorher) { akt.art = vorher.art === 'p' ? 'p' : vorher.art; akt.ebene = vorher.ebene; akt.weiter = true; } return; }
        if (n === 'DIV' || n === 'P' || n === 'LI') { neu(node); [...node.childNodes].forEach(c => inline(c, stil)); akt = null; return; }
        const s = { ...stil };
        if (n === 'B' || n === 'STRONG') s.b = true;
        if (n === 'I' || n === 'EM') s.i = true;
        if (n === 'U') s.u = true;
        if (n === 'SPAN' && node.style) {
            if (/bold|[6-9]00/.test(node.style.fontWeight)) s.b = true;
            if (node.style.fontStyle === 'italic') s.i = true;
            if (/underline/.test(node.style.textDecoration || node.style.textDecorationLine || '')) s.u = true;
        }
        [...node.childNodes].forEach(c => inline(c, s));
    }
    [...root.childNodes].forEach(c => {
        if (c.nodeType === 1 && (c.nodeName === 'DIV' || c.nodeName === 'P' || c.nodeName === 'LI')) { neu(c); [...c.childNodes].forEach(k => inline(k, { b: false, i: false, u: false })); akt = null; }
        else inline(c, { b: false, i: false, u: false });
    });
    // Ein <br> als einziges Kind einer Zeile ist der Platzhalter einer Leerzeile — kein Umbruch
    const zs = out.filter(z => !(z.weiter && !z.laeufe.some(l => l.t.trim()) && out.indexOf(z) === out.length - 1 && out.length > 1));
    const vorbereitet = zs.map(z => ({ ...z, text: laeufeAlsMarkup(mergen(z.laeufe)).replace(/\s+$/, '') }));
    const nummern = zahlen(vorbereitet.map(z => ({ art: z.text.trim() ? z.art : 'leer', ebene: z.ebene })));
    let markup = vorbereitet.map((z, k) => !z.text.trim() ? '' : praefix(z, nummern[k]) + z.text.replace(/^\s+/, '')).join('\n');
    return markup.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
}
function mergen(ls) {
    return ls.reduce((a, l) => {
        const v = a[a.length - 1];
        if (v && v.b === l.b && v.i === l.i && v.u === l.u) v.t += l.t; else a.push({ ...l });
        return a;
    }, []);
}

// ── PDF ────────────────────────────────────────────────────────────────
// WinAnsi kann über Latin-1 hinaus nur diese Zeichen; alles andere wird übersetzt oder fällt weg.
const WINANSI = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
const ERSATZ = {
    '◦': '–', '▪': '•', '▫': '–', '‣': '•', '⁃': '–', '∙': '·', '●': '•', '○': '–', '■': '•', '□': '–',
    '►': '>', '▶': '>', '→': '->', '←': '<-', '⇒': '=>', '↔': '<->', '≥': '>=', '≤': '<=', '≠': '!=',
    '≈': '~', '✓': '', '✔': '', '✗': '', '✘': '', '−': '-', '‐': '-', '‑': '-', '‒': '–', '―': '—',
    '′': "'", '″': '"', '‚': '‚', '\u2009': ' ', '\u202f': ' ', '\u200b': '',
};
function pdfSicher(s) {
    let out = '';
    for (const c of String(s == null ? '' : s)) {
        const cp = c.codePointAt(0);
        if (cp <= 0xff || WINANSI.has(c)) out += c;
        else if (ERSATZ[c] != null) out += ERSATZ[c];
        // sonst: Emoji, CJK u. Ä. — im PDF nicht darstellbar, fällt weg
    }
    return out;
}

const MM_EINZUG = 4.2;      // Einzug je Ebene
function schrift(doc, l) {
    const st = l.b && l.i ? 'bolditalic' : l.b ? 'bold' : l.i ? 'italic' : 'normal';
    doc.setFont('helvetica', st);
}
function breite(doc, t, l) { schrift(doc, l); return doc.getTextWidth(t); }

// Eine Markup-Zeile → umgebrochene PDF-Zeilen. '' = Leerzeile, sonst
// { einzug, marker, laeufe } (marker nur auf der ersten Teilzeile).
function pdfUmbruch(doc, markupZeile, maxBreite, nr) {
    const z = zeilen(markupZeile)[0];
    if (!z || z.art === 'leer') return [''];
    const liste = z.art === 'ul' || z.art === 'ol';
    const ebeneEinzug = (z.ebene - 1) * MM_EINZUG + (liste ? MM_EINZUG : 0);
    const marker = z.art === 'ul' ? (z.ebene === 2 ? '–' : '•') : z.art === 'ol' ? (nr || z.nr || 1) + '.' : '';
    const ls = laeufe(z.text).map(l => ({ ...l, t: pdfSicher(l.t) }));
    // Wörter mit Stil, Leerzeichen gehören zum Wort davor
    const woerter = [];
    ls.forEach(l => l.t.split(/(\s+)/).forEach(teil => {
        if (!teil) return;
        if (/^\s+$/.test(teil)) { if (woerter.length) woerter[woerter.length - 1].nach += ' '; return; }
        woerter.push({ t: teil, b: l.b, i: l.i, u: l.u, nach: '' });
    }));
    const platz = Math.max(10, maxBreite - ebeneEinzug);
    const out = [];
    let akt = [], w = 0;
    const fertig = () => { if (akt.length) out.push({ einzug: ebeneEinzug, marker: out.length ? '' : marker, laeufe: zusammen(akt) }); akt = []; w = 0; };
    for (const wo of woerter) {
        const bw = breite(doc, wo.t, wo), lw = wo.nach ? breite(doc, ' ', wo) : 0;
        if (akt.length && w + bw > platz) fertig();
        // Ein einzelnes Wort, das breiter ist als die Zeile: hart teilen
        if (!akt.length && bw > platz) {
            let rest = wo.t;
            while (rest) {
                let n = rest.length;
                while (n > 1 && breite(doc, rest.slice(0, n), wo) > platz) n--;
                akt.push({ ...wo, t: rest.slice(0, n), nach: '' }); w = platz; rest = rest.slice(n);
                if (rest) fertig();
            }
            if (wo.nach) akt[akt.length - 1].nach = wo.nach;
            w = breite(doc, akt.map(a => a.t + a.nach).join(''), wo);
            continue;
        }
        akt.push(wo); w += bw + lw;
    }
    fertig();
    doc.setFont('helvetica', 'normal');
    return out.length ? out : [''];
}
function zusammen(ws) {
    const ls = [];
    ws.forEach((w, k) => {
        const t = w.t + (k < ws.length - 1 ? w.nach : '');
        const v = ls[ls.length - 1];
        if (v && v.b === w.b && v.i === w.i && v.u === w.u) v.t += t; else ls.push({ t, b: w.b, i: w.i, u: w.u });
    });
    return ls;
}
// Ganzer Text → PDF-Zeilen (Nummern laufend gezählt)
function pdfZeilen(doc, markup, maxBreite) {
    const zs = String(markup == null ? '' : markup).replace(/\r\n?/g, '\n').split('\n');
    const nrs = zahlen(zeilen(zs.join('\n')));
    const out = [];
    zs.forEach((z, k) => pdfUmbruch(doc, z, maxBreite, nrs[k]).forEach(x => out.push(x)));
    return out;
}
// Zeichnet eine PDF-Zeile (Objekt aus pdfUmbruch ODER schlichter String) an x/y.
function pdfText(doc, zeile, x, y) {
    if (zeile == null || zeile === '') return;
    if (typeof zeile === 'string') { doc.text(pdfSicher(zeile), x, y); return; }
    const vorher = doc.getFont();
    let cx = x + zeile.einzug;
    if (zeile.marker) {
        doc.setFont('helvetica', 'normal');
        doc.text(zeile.marker, cx - (zeile.marker.length > 1 ? doc.getTextWidth(zeile.marker) + 1.2 : 3.2), y);
    }
    zeile.laeufe.forEach(l => {
        schrift(doc, l);
        doc.text(l.t, cx, y);
        const w = doc.getTextWidth(l.t);
        if (l.u && l.t.trim()) {
            const ende = cx + doc.getTextWidth(l.t.replace(/\s+$/, ''));
            doc.setLineWidth(0.18);
            doc.line(cx, y + 0.8, ende, y + 0.8);
        }
        cx += w;
    });
    doc.setFont(vorher.fontName, vorher.fontStyle);
}

// Einzelne Zeile ohne Block (KI-Einträge im Chat und in der Studio-Vorschau)
function inlineHtml(text) { return laeufeHtml(laeufe(text)); }

return { zeilen, laeufe, laeufeAlsMarkup, klartext, zuHtml, inlineHtml, ausDom, pdfSicher, pdfUmbruch, pdfZeilen, pdfText, zahlen };
})();
