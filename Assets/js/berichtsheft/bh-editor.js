// ═══ BH-EDITOR MODULE ═══
// Formatierbare Berichtsfelder (seit 01.11.2026, „wie auf der IHK-Seite"): Werkzeugleiste mit
// Fett, Kursiv, Unterstrichen, Aufzählung, Nummerierung, Einrücken/Ausrücken.
//
// 🔴 Das <textarea> bleibt die DATENQUELLE. Der Editor legt sich nur darüber:
// - Jeder Code, der .value liest (Speichern, KI, Qualität, Entwurf), liest weiter das Feld.
// - Jeder Code, der .value SETZT (KI-Übernahme, Zeiterfassung, IHK-Import, Bericht laden),
//   landet in einem Setter auf DIESEM Element (anbinden()) und zeichnet den Editor neu.
//   Ohne den Setter stünde im Editor der alte Text, während das Feld den neuen speichert.
// - form.reset() setzt den Wert ohne Setter → eigener reset-Listener.
// - Das Feld bleibt fokussierbar (nur unsichtbar), damit ein `required` den Browser nicht
//   stumm am Absenden hindert (verstecktes Pflichtfeld = „An invalid form control is not
//   focusable", kein Hinweis für den Nutzer).
// Inhalt ↔ Markup: BHText (bh-text.js). Jede Zeile ist ein <div class="bt-z"> mit data-art /
// data-ebene; Enter kopiert das div samt Attributen — so entsteht der nächste Listenpunkt
// ohne eigenen Code.

window.BHEditor = (function () {
'use strict';

const ZIEL = '#reportActivities, #reportInstruction, #reportSchool, textarea.daily-textarea';
const L = (de, en) => document.documentElement.lang === 'en' ? en : de;
const nativ = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

const SVG = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
const KNOEPFE = [
    { cmd: 'bold', de: 'Fett', en: 'Bold', taste: ['Strg+B', 'Ctrl+B'], svg: SVG('<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>') },
    { cmd: 'italic', de: 'Kursiv', en: 'Italic', taste: ['Strg+I', 'Ctrl+I'], svg: SVG('<line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/>') },
    { cmd: 'underline', de: 'Unterstrichen', en: 'Underline', taste: ['Strg+U', 'Ctrl+U'], svg: SVG('<path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/>') },
    { trenner: true },
    { cmd: 'ul', de: 'Aufzählung', en: 'Bulleted list', svg: SVG('<line x1="9" x2="20" y1="6" y2="6"/><line x1="9" x2="20" y1="12" y2="12"/><line x1="9" x2="20" y1="18" y2="18"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>') },
    { cmd: 'ol', de: 'Nummerierung', en: 'Numbered list', svg: SVG('<line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>') },
    { cmd: 'ein', de: 'Unterpunkt (einrücken)', en: 'Sub-item (indent)', taste: ['Tab', 'Tab'], svg: SVG('<polyline points="3 8 7 12 3 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/>') },
    { cmd: 'aus', de: 'Ausrücken', en: 'Outdent', taste: ['Umschalt+Tab', 'Shift+Tab'], svg: SVG('<polyline points="7 8 3 12 7 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/>') },
];

let befehlsModusGesetzt = false;
function befehlsModus() {
    if (befehlsModusGesetzt) return;
    befehlsModusGesetzt = true;
    try { document.execCommand('defaultParagraphSeparator', false, 'div'); } catch (e) {}
    try { document.execCommand('styleWithCSS', false, false); } catch (e) {}   // <b>/<i>/<u> statt <span style>
}

// ── Zeilen im Editor ──
const LEER = '<div class="bt-z"><br></div>';
function zeilenVon(feld) { return [...feld.children].filter(z => z.classList && z.classList.contains('bt-z')); }
function zeileVon(feld, knoten) {
    let n = knoten && knoten.nodeType === 3 ? knoten.parentNode : knoten;
    while (n && n !== feld && !(n.parentNode === feld)) n = n.parentNode;
    return n && n !== feld ? n : null;
}
function markierteZeilen(feld) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return [];
    const r = sel.getRangeAt(0);
    const a = zeileVon(feld, r.startContainer) || (r.startContainer === feld ? feld.children[r.startOffset] || feld.lastElementChild : null);
    // Strg+A / „alles markieren": die Grenze liegt am Feld selbst, nicht in einer Zeile
    const b = zeileVon(feld, r.endContainer) || (r.endContainer === feld ? feld.children[Math.max(0, r.endOffset - 1)] : null) || a;
    if (!a) return [];
    const alle = zeilenVon(feld);
    const i = alle.indexOf(a), j = alle.indexOf(b);
    return i < 0 ? [a] : alle.slice(Math.min(i, j < 0 ? i : j), Math.max(i, j < 0 ? i : j) + 1);
}

// Was der Browser außerhalb der Zeilen anlegt (Text direkt im Feld nach „alles löschen",
// <br>, nacktes <div>), wird zu Zeilen — Schreibmarke bleibt, wo sie war.
function ordnen(feld) {
    if (!feld.firstChild) { feld.innerHTML = LEER; setzeMarke(feld.firstChild, 0); return; }
    const sel = window.getSelection();
    const marke = sel && sel.rangeCount ? { n: sel.anchorNode, o: sel.anchorOffset } : null;
    let wrap = null, geaendert = false;
    [...feld.childNodes].forEach(n => {
        if (n.nodeType === 1 && (n.nodeName === 'DIV' || n.nodeName === 'P')) {
            if (!n.classList.contains('bt-z')) { n.classList.add('bt-z'); }
            wrap = null; return;
        }
        if (n.nodeType === 3 && !n.nodeValue.length) return;
        if (!wrap) { wrap = document.createElement('div'); wrap.className = 'bt-z'; feld.insertBefore(wrap, n); }
        wrap.appendChild(n); geaendert = true;
    });
    if (geaendert && marke && marke.n && feld.contains(marke.n)) setzeMarke(marke.n, marke.o);
}
function setzeMarke(knoten, offset) {
    try {
        const r = document.createRange();
        r.setStart(knoten, Math.min(offset, knoten.nodeType === 3 ? knoten.nodeValue.length : knoten.childNodes.length));
        r.collapse(true);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    } catch (e) {}
}
function nummerieren(feld) {
    const zs = zeilenVon(feld);
    const nrs = BHText.zahlen(zs.map(z => ({
        art: !z.textContent.trim() ? 'leer' : (z.dataset.art === 'ul' || z.dataset.art === 'ol') ? z.dataset.art : 'p',
        ebene: z.dataset.ebene === '2' ? 2 : 1,
    })));
    zs.forEach((z, k) => { if (z.dataset.art === 'ol') z.dataset.nr = nrs[k] || 1; else delete z.dataset.nr; });
}

// ── Anbinden ──
function anbinden(ta) {
    if (!ta || ta._bt) return;
    befehlsModus();
    const box = document.createElement('div');
    box.className = 'bt';
    const leiste = document.createElement('div');
    leiste.className = 'bt-leiste';
    leiste.setAttribute('role', 'toolbar');
    leiste.setAttribute('aria-label', L('Text formatieren', 'Format text'));
    leiste.innerHTML = KNOEPFE.map(k => k.trenner ? '<span class="bt-trenner" aria-hidden="true"></span>'
        : '<button type="button" class="bt-knopf" data-cmd="' + k.cmd + '" aria-pressed="false" title="' + L(k.de, k.en) + (k.taste ? ' (' + L(k.taste[0], k.taste[1]) + ')' : '') + '" aria-label="' + L(k.de, k.en) + '">' + k.svg + '</button>').join('');
    const feld = document.createElement('div');
    feld.className = 'bt-feld';
    feld.contentEditable = 'true';
    feld.setAttribute('role', 'textbox');
    feld.setAttribute('aria-multiline', 'true');
    feld.setAttribute('spellcheck', 'true');
    feld.dataset.platzhalter = ta.getAttribute('placeholder') || '';
    const label = ta.id && document.querySelector('label[for="' + ta.id + '"]');
    feld.setAttribute('aria-label', label ? label.textContent.trim() : (ta.getAttribute('placeholder') || L('Text', 'Text')).split('\n')[0]);
    const zeilenZahl = parseInt(ta.getAttribute('rows'), 10) || 4;
    feld.style.minHeight = 'calc(' + zeilenZahl + ' * 1.6em + 20px)';
    if (ta.classList.contains('daily-textarea')) box.classList.add('bt-tag');
    box.appendChild(leiste);
    box.appendChild(feld);
    ta.parentNode.insertBefore(box, ta.nextSibling);
    box.appendChild(ta);   // Feld IN die Box: ein Pflichtfeld-Hinweis des Browsers erscheint dann am Editor
    ta.classList.add('bt-quelle');
    ta.tabIndex = -1;
    ta.setAttribute('aria-hidden', 'true');

    let syncen = false;
    const zeichnen = (wert) => {
        feld.innerHTML = BHText.zuHtml(wert) || LEER;
        feld.classList.toggle('ist-leer', !String(wert || '').trim());
        nummerieren(feld);
    };
    const zurueck = () => {
        ordnen(feld);
        nummerieren(feld);
        const md = BHText.ausDom(feld);
        feld.classList.toggle('ist-leer', !md.trim());
        if (nativ.get.call(ta) === md) return;
        syncen = true;
        nativ.set.call(ta, md);
        syncen = false;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
    };
    // Setter auf DIESEM Element: programmatische Werte zeichnen den Editor neu
    Object.defineProperty(ta, 'value', {
        configurable: true,
        get() { return nativ.get.call(this); },
        set(v) { nativ.set.call(this, v); if (!syncen) zeichnen(v); },
    });
    ta._bt = { feld, zeichnen };
    zeichnen(nativ.get.call(ta));

    feld.addEventListener('input', zurueck);
    feld.addEventListener('focus', () => box.classList.add('ist-aktiv'));
    feld.addEventListener('blur', () => box.classList.remove('ist-aktiv'));
    ta.addEventListener('focus', () => feld.focus());      // Browser springt beim Pflichtfeld-Hinweis hierher
    if (ta.form && !ta.form._btReset) {
        ta.form._btReset = true;
        ta.form.addEventListener('reset', () => setTimeout(() => {
            ta.form.querySelectorAll('textarea.bt-quelle').forEach(t => t._bt && t._bt.zeichnen(nativ.get.call(t)));
        }, 0));
    }

    leiste.addEventListener('mousedown', (e) => { if (e.target.closest('.bt-knopf')) e.preventDefault(); });   // Markierung behalten
    leiste.addEventListener('click', (e) => {
        const k = e.target.closest('.bt-knopf');
        if (!k) return;
        if (document.activeElement !== feld) feld.focus();
        befehl(feld, k.dataset.cmd);
        zurueck();
        zustand(feld, leiste);
    });
    feld.addEventListener('keydown', (e) => {
        const strg = e.ctrlKey || e.metaKey;
        if (strg && !e.altKey && /^[biu]$/i.test(e.key)) {
            e.preventDefault();
            befehl(feld, { b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()]);
            zurueck(); zustand(feld, leiste);
            return;
        }
        const zs = markierteZeilen(feld);
        const z = zs[0];
        if (e.key === 'Tab' && z && (z.dataset.art || e.shiftKey && z.dataset.ebene)) {
            // Nur in Listen: sonst bleibt Tab der Weg zum nächsten Feld (Tastaturbedienung)
            e.preventDefault();
            befehl(feld, e.shiftKey ? 'aus' : 'ein');
            zurueck(); zustand(feld, leiste);
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey && z && z.dataset.art && !z.textContent.trim()) {
            // Leerer Listenpunkt + Enter: Liste beenden (eine Ebene hoch, dann normaler Text)
            e.preventDefault();
            if (z.dataset.ebene === '2') delete z.dataset.ebene; else { delete z.dataset.art; delete z.dataset.nr; }
            zurueck(); zustand(feld, leiste);
            return;
        }
        if (e.key === 'Backspace' && z && z.dataset.art && zs.length === 1) {
            const sel = window.getSelection();
            if (sel.isCollapsed && amZeilenanfang(z, sel)) {
                e.preventDefault();
                if (z.dataset.ebene === '2') delete z.dataset.ebene; else { delete z.dataset.art; delete z.dataset.nr; }
                zurueck(); zustand(feld, leiste);
            }
        }
    });
    feld.addEventListener('paste', (e) => {
        const t = e.clipboardData && e.clipboardData.getData('text/plain');
        if (t == null) return;
        e.preventDefault();
        // Fremde Formatierung (Word, Webseiten) bleibt draußen; Listen im Klartext erkennt BHText
        if (!/\n/.test(t)) document.execCommand('insertText', false, t);
        else document.execCommand('insertHTML', false, BHText.zuHtml(t.replace(/\r\n?/g, '\n')));
        zurueck();
    });
    document.addEventListener('selectionchange', () => { if (document.activeElement === feld) zustand(feld, leiste); });
}

function amZeilenanfang(z, sel) {
    try {
        const r = document.createRange();
        r.setStart(z, 0);
        r.setEnd(sel.anchorNode, sel.anchorOffset);
        return r.toString().length === 0;
    } catch (e) { return false; }
}

function befehl(feld, cmd) {
    if (cmd === 'bold' || cmd === 'italic' || cmd === 'underline') { document.execCommand(cmd, false, null); return; }
    let zs = markierteZeilen(feld);
    if (!zs.length) { ordnen(feld); zs = markierteZeilen(feld); }
    if (!zs.length) return;
    if (cmd === 'ul' || cmd === 'ol') {
        const alle = zs.every(z => z.dataset.art === cmd);
        zs.forEach(z => { if (alle) { delete z.dataset.art; delete z.dataset.ebene; } else z.dataset.art = cmd; });
    } else if (cmd === 'ein') {
        // Unterpunkt: eingerückt mit Strich, wie im IHK-Portal
        zs.forEach(z => { z.dataset.ebene = '2'; if (!z.dataset.art) z.dataset.art = 'ul'; });
    } else if (cmd === 'aus') {
        zs.forEach(z => { if (z.dataset.ebene === '2') delete z.dataset.ebene; else { delete z.dataset.art; } });
    }
    nummerieren(feld);
}

function zustand(feld, leiste) {
    const z = markierteZeilen(feld)[0];
    const an = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        ul: !!z && z.dataset.art === 'ul',
        ol: !!z && z.dataset.art === 'ol',
        ein: !!z && z.dataset.ebene === '2',
        aus: false,
    };
    leiste.querySelectorAll('.bt-knopf').forEach(k => k.setAttribute('aria-pressed', String(!!an[k.dataset.cmd])));
}

// Alle passenden Felder — auch die, die bh-tagesmodus.js später per innerHTML anlegt
function alleAnbinden(wurzel) { (wurzel || document).querySelectorAll(ZIEL).forEach(anbinden); }
function start() {
    if (typeof BHText === 'undefined') return;
    alleAnbinden();
    new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes) {
            if (n.nodeType !== 1) continue;
            if (n.matches && n.matches(ZIEL)) anbinden(n); else if (n.querySelector && n.querySelector(ZIEL)) alleAnbinden(n);
        }
    }).observe(document.body, { childList: true, subtree: true });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

return { anbinden, alleAnbinden };
})();
