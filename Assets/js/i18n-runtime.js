// ═══ I18N-RUNTIME (EN) MODULE ═══
// Übersetzt LAUFZEIT-generierten deutschen Text auf den /en/-Seiten.
// Die statische Pipeline (tools/i18n) übersetzt nur Text, der IM HTML steht.
// Alles was JS erst zur Laufzeit einfügt (Eintrag-Typen im <select>, Chart-
// Labels, History-Pills, Toasts …) bleibt sonst deutsch. Dieses Script fängt
// genau das ab — NUR wenn <html lang="en">. Auf der deutschen Seite passiert
// NICHTS (kein Overhead, kein Risiko).
//
// Neuer deutscher JS-String sichtbar auf /en/? → hier ins MAP eintragen. Fertig.
(function () {
  'use strict';
  if (document.documentElement.lang !== 'en') return; // nur englische Seiten

  // Deutsch → Englisch. Nur ANZEIGE-Strings (App-Logik keyt auf IDs, nicht Labels).
  var MAP = {
    // Eintrag-Typen (custom-types-fields.js DEFAULT_ENTRY_TYPES + typeLabels-Maps)
    'Arbeit': 'Work',
    'Schule': 'School',
    'Berufsschule': 'Vocational school',
    'Urlaub': 'Vacation',
    'Gleittag': 'Flex day',
    'Krank': 'Sick',
    'Krankheit': 'Sickness',
    'Feiertag': 'Holiday',
    'Korrektur': 'Correction',
    // Typ-Beschreibungen
    'Normale Arbeitszeit': 'Regular working time',
    'Berufsschule / Noten': 'Vocational school / grades',
    'Urlaubstage': 'Vacation days',
    'Gleittag (Überstundenabbau)': 'Flex day (overtime reduction)',
    'Krankheitstage': 'Sick days',
    'Offizielle Feiertage': 'Official public holidays',
    'Manuelle Saldo-Korrektur (z.B. Angleichung ans Firmen-System)': 'Manual balance correction (e.g. aligning with the company system)',
    // Häufige dynamische Kurz-Labels
    'Gesamt': 'Total',
    'Stunden': 'Hours',
    'Heute': 'Today',
    'Woche': 'Week',
    'Monat': 'Month',
    'Jahr': 'Year',
    'Keine Daten': 'No data',
    'Keine Einträge': 'No entries',
    'Wird geladen…': 'Loading…',
    'Wird geladen...': 'Loading...',
    'Soll': 'Target',
    'Ist': 'Actual',
    'Differenz': 'Difference',
    'Saldo': 'Balance',
    // Manuelles App-Update (updateManager.forceUpdate → showToast)
    'App wird aktualisiert': 'Updating app',
    'Neue Version wird geladen – die Seite lädt gleich neu.': 'Loading the new version – the page will reload shortly.'
  };

  // Attribute, die ebenfalls Nutzertext tragen können
  var ATTRS = ['title', 'placeholder', 'aria-label'];
  var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, TEXTAREA: 1 };

  function translateTextNode(node) {
    var v = node.nodeValue;
    if (!v) return;
    var key = v.trim();
    if (!key || !MAP.hasOwnProperty(key)) return;
    var lead = v.match(/^\s*/)[0];
    var trail = v.match(/\s*$/)[0];
    node.nodeValue = lead + MAP[key] + trail;
  }

  function translateEl(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (el.hasAttribute && el.hasAttribute(a)) {
        var val = el.getAttribute(a);
        if (val && MAP.hasOwnProperty(val.trim())) el.setAttribute(a, MAP[val.trim()]);
      }
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1 || SKIP[root.tagName]) return;
    translateEl(root);
    for (var n = root.firstChild; n; n = n.nextSibling) walk(n);
  }

  // rAF-gedrosselter Observer: fängt spät nachgeladene/aktualisierte Labels
  var queued = false;
  var pending = [];
  function flush() {
    queued = false;
    var nodes = pending;
    pending = [];
    for (var i = 0; i < nodes.length; i++) walk(nodes[i]);
  }
  function schedule(node) {
    pending.push(node);
    if (!queued) { queued = true; requestAnimationFrame(flush); }
  }

  function start() {
    walk(document.body);
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') { schedule(m.target); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) schedule(m.addedNodes[j]);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    // Nachzügler (App-Init füllt Selects/Charts leicht verzögert)
    setTimeout(function () { walk(document.body); }, 400);
    setTimeout(function () { walk(document.body); }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
