#!/usr/bin/env node
/**
 * i18n-build.js — MyWorkLog Static-i18n Pipeline (No-Build / Cloudflare Pages)
 * ---------------------------------------------------------------------------
 * Erzeugt aus einer deutschen Quell-HTML eine STATISCHE englische Seite mit
 * fest eingebackenem Text — echtes SEO (Google indexiert echtes Englisch),
 * kein Client-JS nötig. Die deutsche Quelle bleibt UNANGETASTET.
 *
 * Zwei Modi:
 *   extract  — scannt die Quelle, schreibt de.json (Key-Registry, Wahrheit).
 *   render   — liest en.json, ersetzt Texte/Attribute, schreibt englische HTML
 *              inkl. DOCTYPE, lang="en", canonical/og:url/hreflang-Rewrite.
 *
 * WICHTIG (Lessons):
 *  - Führendes BOM MUSS vor dem jsdom-Parse weg, sonst landet der komplette
 *    <head> im <body> (leerer Head → kein CSS/SEO). Siehe stripBom().
 *  - jsdom droppt den <!DOCTYPE> → wir prependen ihn wieder.
 *  - viewBox-Casing bleibt erhalten; self-closing <path/> wird zu <path></path>
 *    (rendert identisch) — unkritisch für generierte Dateien.
 *
 * Nutzung:
 *   node tools/i18n/i18n-build.js extract <src.html> <out.de.json>
 *   node tools/i18n/i18n-build.js render  <src.html> <en.json> <out.html> <canonicalEn> <canonicalDe>
 * ---------------------------------------------------------------------------
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'SVG', 'CODE', 'TEMPLATE', 'NOSCRIPT']);
// reine Zahlen/Symbole/Icons — keine Übersetzungskandidaten
const NON_TEXT_RE = /^[\d\s.,%€$£:+\-\/×x•·|→←↑↓✓✕#()[\]{}]*$/;

function stripBom(s) { return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s; }

function isSkippable(text) {
  const t = (text || '').trim();
  if (t.length < 2) return true;
  if (NON_TEXT_RE.test(t)) return true;
  return false;
}

function slugify(text, maxWords = 5) {
  return (
    text
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, maxWords)
      .join('_')
      .slice(0, 40) || 'text'
  );
}

function nearestNamespace(el, doc, fallback) {
  let cur = el;
  while (cur && cur !== doc.body) {
    if (cur.id) {
      return cur.id
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^[A-Z]/, (c) => c.toLowerCase());
    }
    cur = cur.parentElement;
  }
  return fallback;
}

function setDeep(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function getDeep(obj, keyPath) {
  return keyPath.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), obj);
}

/**
 * Kern: geht deterministisch durch die DOM und ruft für jede übersetzbare
 * Text-/Attribut-Stelle cb({ el, key, type, attr, text }) auf.
 * IDENTISCHE Logik für extract UND render → Keys sind garantiert deckungsgleich.
 */
function walk(dom, namespaceDefault, cb) {
  const { document: doc, NodeFilter } = dom.window;
  const usedKeys = new Set();
  const makeKey = (ns, text) => {
    let base = `${ns}.${slugify(text)}`;
    let key = base, i = 2;
    while (usedKeys.has(key)) key = `${base}_${i++}`;
    usedKeys.add(key);
    return key;
  };

  // Pass 1: Text-Knoten
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);

  for (const tn of nodes) {
    const raw = tn.textContent;
    if (isSkippable(raw)) continue;
    const el = tn.parentElement;
    if (!el || SKIP_TAGS.has(el.tagName)) continue;
    if (el.closest('script, style, svg, code, template, noscript')) continue;

    const elemChildren = Array.from(el.childNodes).filter((x) => x.nodeType === 1);
    const textChildren = Array.from(el.childNodes).filter((x) => x.nodeType === 3 && x.textContent.trim().length > 0);
    // gemischter Inhalt → nicht anfassen (Markup-Schutz)
    if (elemChildren.length > 0 || textChildren.length > 1) continue;

    const text = raw.trim();
    const ns = nearestNamespace(el, doc, namespaceDefault);
    const key = makeKey(ns, text);
    cb({ el, textNode: tn, key, type: 'text', text });
  }

  // Pass 2: Attribute
  for (const attr of TRANSLATABLE_ATTRS) {
    doc.querySelectorAll(`[${attr}]`).forEach((el) => {
      const val = el.getAttribute(attr);
      if (isSkippable(val)) return;
      if (el.closest('script, style, svg')) return;
      const ns = nearestNamespace(el, doc, namespaceDefault);
      const key = makeKey(ns, val);
      cb({ el, key, type: 'attr', attr, text: val });
    });
  }
  return doc;
}

function loadDom(srcPath) {
  const raw = stripBom(fs.readFileSync(srcPath, 'utf8'));
  return { dom: new JSDOM(raw), raw };
}

// --------------------------------------------------------------------------
function cmdExtract(src, outJson) {
  const { dom } = loadDom(src);
  const dict = {};
  let count = 0;
  walk(dom, 'app', ({ key, text }) => { setDeep(dict, key, text); count++; });
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(dict, null, 2) + '\n', 'utf8');
  console.log(`extract: ${count} Strings → ${outJson}`);
}

function upsertLink(doc, selector, attrs) {
  let el = doc.head.querySelector(selector);
  if (!el) {
    el = doc.createElement('link');
    doc.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function phrasePass(dom, phrases) {
  // Ersetzt GANZE Text-Knoten, deren normalisierter Text exakt einem Phrase-Key
  // entspricht — fängt gemischten Inhalt (Icon+Text, Heading+Badge) ab, den der
  // Struktur-Walk bewusst überspringt. Nur Text-Knoten, nie Scripts/SVG.
  const { document: doc, NodeFilter } = dom.window;
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  let cnt = 0;
  for (const tn of nodes) {
    const el = tn.parentElement;
    if (!el || SKIP_TAGS.has(el.tagName)) continue;
    if (el.closest('script, style, svg, code, template, noscript')) continue;
    const orig = tn.textContent;
    const norm = orig.trim().replace(/\s+/g, ' ');
    if (Object.prototype.hasOwnProperty.call(phrases, norm)) {
      const lead = (orig.match(/^\s*/) || [''])[0];
      const trail = (orig.match(/\s*$/) || [''])[0];
      tn.textContent = lead + phrases[norm] + trail;
      cnt++;
    }
  }
  return cnt;
}

function cmdRender(src, enJsonPath, outHtml, canonicalEn, canonicalDe, phrasesPath) {
  const { dom } = loadDom(src);
  const en = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));
  const doc = dom.window.document;

  let translated = 0, missing = 0;
  const missingKeys = [];
  walk(dom, 'app', ({ el, textNode, key, type, attr, text }) => {
    const val = getDeep(en, key);
    if (val === undefined || val === null || val === '') { missing++; missingKeys.push(key); return; }
    if (val === text) return; // identisch (z.B. Marke/Code) → no-op
    if (type === 'text') { textNode.textContent = textNode.textContent.replace(text, val); }
    else { el.setAttribute(attr, val); }
    translated++;
  });

  // Phrase-Pass für gemischten Inhalt
  let phraseCount = 0;
  if (phrasesPath && fs.existsSync(phrasesPath)) {
    const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));
    phraseCount = phrasePass(dom, phrases);
  }

  // <html lang="en">
  doc.documentElement.setAttribute('lang', 'en');

  // <title>
  const titleKey = getDeep(en, '__title');
  if (titleKey && doc.head.querySelector('title')) doc.head.querySelector('title').textContent = titleKey;

  // Meta description / og / twitter (optional Overrides aus en.json __meta.*)
  const metaMap = {
    'meta[name="description"]': '__metaDescription',
    'meta[property="og:title"]': '__ogTitle',
    'meta[property="og:description"]': '__ogDescription',
    'meta[name="twitter:title"]': '__twitterTitle',
    'meta[name="twitter:description"]': '__twitterDescription',
  };
  for (const [sel, k] of Object.entries(metaMap)) {
    const v = getDeep(en, k);
    const m = doc.head.querySelector(sel);
    if (v && m) m.setAttribute('content', v);
  }

  // Canonical + og:url → englische URL
  if (canonicalEn) {
    upsertLink(doc, 'link[rel="canonical"]', { rel: 'canonical', href: canonicalEn });
    const ogUrl = doc.head.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalEn);
    const twUrl = doc.head.querySelector('meta[name="twitter:url"]');
    if (twUrl) twUrl.setAttribute('content', canonicalEn);
  }

  // hreflang-Alternates (de original, en, x-default → de)
  if (canonicalEn && canonicalDe) {
    // vorhandene alternates entfernen und sauber neu setzen
    doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((l) => l.remove());
    const add = (lang, href) => {
      const l = doc.createElement('link');
      l.setAttribute('rel', 'alternate');
      l.setAttribute('hreflang', lang);
      l.setAttribute('href', href);
      doc.head.appendChild(l);
    };
    add('de', canonicalDe);
    add('en', canonicalEn);
    add('x-default', canonicalDe);
  }

  // Sprach-Umschalter umdrehen: DE-Quelle zeigt "English → /en/",
  // die generierte EN-Seite zeigt "Deutsch → /".
  const langItem = doc.getElementById('langSwitchItem');
  if (langItem) {
    langItem.setAttribute('href', '/');
    langItem.setAttribute('hreflang', 'de');
    const lbl = doc.getElementById('langSwitchLabel');
    if (lbl) lbl.textContent = 'Deutsch';
  }

  // Runtime-Übersetzer für JS-generierten Text (nur auf /en/ aktiv, prüft lang="en").
  if (!doc.querySelector('script[src="/Assets/js/i18n-runtime.js"]')) {
    const rt = doc.createElement('script');
    rt.setAttribute('src', '/Assets/js/i18n-runtime.js');
    rt.setAttribute('defer', '');
    doc.body.appendChild(rt);
  }

  let out = '<!DOCTYPE html>\n' + dom.serialize();
  fs.mkdirSync(path.dirname(outHtml), { recursive: true });
  fs.writeFileSync(outHtml, out, 'utf8');
  console.log(`render: ${translated} übersetzt, ${phraseCount} Phrasen, ${missing} fehlend → ${outHtml}`);
  if (missing) {
    const uniq = [...new Set(missingKeys)];
    console.log(`  fehlende Keys (${uniq.length} uniq):`, uniq.slice(0, 25).join(', ') + (uniq.length > 25 ? ' …' : ''));
  }
}

// --------------------------------------------------------------------------
const [, , mode, ...args] = process.argv;
if (mode === 'extract') cmdExtract(args[0], args[1]);
else if (mode === 'render') cmdRender(args[0], args[1], args[2], args[3], args[4], args[5]);
else {
  console.error('Nutzung:');
  console.error('  node tools/i18n/i18n-build.js extract <src.html> <out.de.json>');
  console.error('  node tools/i18n/i18n-build.js render  <src.html> <en.json> <out.html> <canonicalEn> <canonicalDe>');
  process.exit(1);
}
