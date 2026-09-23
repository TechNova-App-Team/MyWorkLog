// Die Laufzeit-Uebersetzung (Assets/js/i18n-runtime.js) muss zur Ruhe kommen.
//
// Anlass (v7.5.0): translateEl schrieb jedes uebersetzbare Attribut neu, auch
// wenn die Uebersetzung gleich blieb („Navigation" → „Navigation"). Ein
// setAttribute mit gleichem Wert loest trotzdem eine Mutation aus, der eigene
// Observer reihte das Element wieder ein — ohne Ende, mit jeder Runde mehr
// Eintraegen. Auf /en/ wuchsen die Hauptthread-Bloecke so auf 96, 256, 589,
// 1173, 2394, 4844 ms; die englische App fror nach wenigen Sekunden ein.
//
// Aufruf:  node tools/i18n-runtime-ruhe.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const { JSDOM } = require('jsdom');
// I18N_RT=<datei> prueft eine andere Fassung (Gegenprobe gegen den Stand vor dem Fix).
const RT = fs.readFileSync(process.env.I18N_RT || path.join(ROOT, 'Assets/js/i18n-runtime.js'), 'utf8');

let fehler = 0;
const ok = (name, bed, info) => { console.log((bed ? '  ok   ' : '  FEHL ') + name + (info !== undefined ? '  (' + info + ')' : '')); if (!bed) fehler++; };

// Ein MAP-Eintrag, der sich selbst uebersetzt, und einer, der sich aendert —
// aus der Datei geholt, damit der Test nicht an einem Wort haengt, das spaeter fehlt.
const paare = [...RT.matchAll(/^\s*'([^'\n]+)':\s*'([^'\n]+)',?\s*$/gm)].map(m => [m[1], m[2]]);
const gleich = paare.find(([de, en]) => de === en);
const anders = paare.find(([de, en]) => de !== en && /^[A-Za-zÄÖÜäöüß ]{4,30}$/.test(de));
ok('es gibt einen MAP-Eintrag, der gleich bleibt', !!gleich, gleich && gleich[0]);
ok('es gibt einen MAP-Eintrag, der sich aendert', !!anders, anders && anders.join(' → '));

const dom = new JSDOM(`<!doctype html><html lang="en"><head><title>x</title></head><body>
  <button id="a" title="${gleich[0]}" aria-label="${gleich[0]}">x</button>
  <button id="b" title="${anders[0]}">y</button></body></html>`,
  { runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.eval(RT);

let mutationen = 0;
new w.MutationObserver(ms => { mutationen += ms.length; })
  .observe(w.document.body, { subtree: true, attributes: true, characterData: true, childList: true });

// Ein Attribut von aussen setzen, wie es die App bei jedem Neuzeichnen tut —
// genau das stiess die Schleife an.
w.document.getElementById('a').setAttribute('title', gleich[0]);
w.document.getElementById('b').setAttribute('title', anders[0]);

await new Promise(r => setTimeout(r, 1500));   // ~90 Bilder mit pretendToBeVisual
const n1 = mutationen;
await new Promise(r => setTimeout(r, 500));
const n2 = mutationen;

ok('uebersetzbares Attribut ist uebersetzt', w.document.getElementById('b').getAttribute('title') === anders[1],
   w.document.getElementById('b').getAttribute('title'));
ok('nach dem Uebersetzen kommt der Observer zur Ruhe', n2 === n1, n1 + ' → ' + n2 + ' Mutationen');
ok('insgesamt nur eine Handvoll Mutationen', n1 < 10, n1);

w.close();
if (fehler) { console.log('\n' + fehler + ' Fehler'); process.exit(1); }
console.log('\nalles ok');
