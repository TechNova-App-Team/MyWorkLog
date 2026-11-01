// Baut aus den Rohdaten von extrakt.mjs das Verzeichnis der Berufe + je Verordnung eine Datei.
// Aufgerufen von bauen.mjs. Berufsnamen kommen aus § 1 der Verordnung (dort im Nominativ oder
// Genitiv), NICHT aus der Rahmenplan-Überschrift (Dativ: "zum Chemielaboranten").
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { text } from './extrakt.mjs';

// § 1: Berufsnamen (männlich/weiblich) aus "Der Ausbildungsberuf X/Y wird" bzw. "Die Ausbildungsberufe 1. X/Y, 2. …"
// Genitiv → Nominativ: "Anlagenmechanikers für Sanitär-…" → "Anlagenmechaniker für Sanitär-…",
// "Bautechnischen Konstrukteurs" → "Bautechnischer Konstrukteur", "Kaufmanns im Einzelhandel" → "Kaufmann im Einzelhandel"
// Wort für Wort, nur großgeschriebene Wörter (Nomen/Adjektive im Namen), Präpositionen und "und" bleiben
function nomM(x) {
  const t = x.split(' ');
  for (let i = 0; i < t.length; i++) {
    const w = t[i];
    if (!/^[A-ZÄÖÜ]/.test(w)) continue;
    const naechstGross = i < t.length - 1 && /^[A-ZÄÖÜ]/.test(t[i + 1]);
    if (/ngestellten$/.test(w)) t[i] = w.replace(/ngestellten$/, 'ngestellter');
    else if (/ogen$/.test(w)) t[i] = w.replace(/en$/, 'e');                              // Technologen → Technologe
    else if (/(ant|ent|ist|graf|graph)en$/.test(w)) t[i] = w.replace(/en$/, '');           // Laboranten → Laborant
    else if (/(er|eur|mann|ör|är|ier|or|ar|ling|wart|ant|ent|ist|ent|eut)s$/.test(w)) t[i] = w.replace(/s$/, '');
    else if (/(nn|ied|rt|tz|ch|ff)es$/.test(w)) t[i] = w.replace(/es$/, '');               // Maschinenmannes, Silberschmiedes
    else if (/[a-zäöü-]en$/.test(w) && naechstGross) t[i] = w.replace(/en$/, 'er');       // Bautechnischen Konstrukteur → Bautechnischer
  }
  return t.join(' ');
}
function nomW(x) {
  const t = x.split(' ');
  for (let i = 0; i < t.length; i++) {
    if (/[aA]ngestellten$/.test(t[i])) t[i] = t[i].replace(/ngestellten$/, 'ngestellte');
    else if (i < t.length - 1 && /^[A-ZÄÖÜ][a-zäöü-]+en$/.test(t[i]) && /^[A-ZÄÖÜ]/.test(t[i + 1])) t[i] = t[i].replace(/en$/, 'e');
  }
  return t.join(' ');
}
// Ein Paar "männlich und weiblich" an der Stelle teilen, an der beide Hälften fast gleich lang sind
function paar(p) {
  p = p.replace(/\s*\(.*?\)\s*/g, ' ').replace(/^(der|die|den)\s+/, '').trim();
  const q = p.match(/^„(.+?)“\s+oder\s+„(.+?)“$/);
  if (q) return { m: q[1], w: q[2] };
  const gen = p.match(/^des\s+(.+?)\s+und\s+der\s+(.+)$/);
  if (gen) return { m: nomM(gen[1]), w: nomW(gen[2]) };
  if (/\//.test(p) && !/\s\/\s/.test(p)) { const i = p.indexOf('/'); return { m: p.slice(0, i).trim(), w: p.slice(i + 1).trim() }; }
  if (/\s\/\s?|\s?\/\s/.test(p)) { const [a, b] = p.split(/\s*\/\s*/); return { m: a, w: b }; }
  const idx = [...p.matchAll(/\s+und\s+(?=[A-ZÄÖÜ])/g)];
  let best = null;
  for (const m of idx) {
    const a = p.slice(0, m.index), b = p.slice(m.index + m[0].length);
    // "Holz- und Bautenschutzarbeiten": ein Ergaenzungsstrich ist kein Paar-Trenner
    if (a.endsWith('-')) continue;
    const d = Math.abs(a.length - b.length);
    if (d <= 6 && (!best || d < best.d)) best = { a, b, d };
  }
  if (best) return { m: best.a.trim(), w: best.b.trim() };
  return { m: p, w: null };
}
export function berufeAusPar1(t) {
  const paare = [];
  const start = t.search(/(Der|Die) Ausbildungsberuf/);
  if (start < 0) return paare;
  t = t.slice(start);
  for (let abs of t.split(/\s\(\d+\)\s/)) {
    if (!/^(Der|Die) Ausbildungsberuf/.test(abs)) continue;
    const body = (abs.match(/^(?:Der|Die) Ausbildungsberufe?\s+(?:mit (?:der|den) (?:Ausbildungs)?[Bb]erufsbezeichnung(?:en)?\s+)?([\s\S]+?)\s+(?:wird|werden)\s/) || [])[1];
    if (!body) continue;
    let teile;
    if (/(^|\s)1\.\s/.test(body)) teile = body.split(/\s*\d+\.\s+/).filter(Boolean);
    else teile = body.split(/\s+(?:sowie|und)\s+(?:der|die)\s+(?:darauf aufbauende\s+)?Ausbildungsberuf(?:e)?\s+(?:mit der Berufsbezeichnung\s+)?|(?<!-),\s+|\s+sowie\s+/);
    for (let x of teile) {
      x = x.replace(/,?\s*(und|sowie)?\s*$/, '').replace(/,$/, '').replace(/^(der|die)\s+(darauf aufbauende\s+)?Ausbildungsberuf\s+/, '').trim();
      if (!x || /^(nach|gemäß)\s/.test(x)) continue;
      x = x.replace(/^(zur|zum)\s+/, '');
      const pr = paar(x);
      // "Verfahrensmechaniker/Verfahrensmechanikerin in der Steine- und Erdenindustrie": Zusatz gilt für beide
      if (pr.w && !/\s/.test(pr.m)) { const z = pr.w.match(/^\S+in(\s+(?:in|im|für|der)\s.+)$/); if (z) pr.m += z[1]; }
      // Plural im Gesetzestext: "Fischwirte / Fischwirtin" → "Fischwirt"
      if (pr.w && /wirte$/.test(pr.m) && pr.m.slice(0, -1) + 'in' === pr.w) pr.m = pr.m.slice(0, -1);
      // Genitiv-s bei Umlaut in der weiblichen Form: "Kochs / Köchin", "Kapitäns / Kapitänin"
      const ohneUml = s => s.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
      if (pr.w && /[^s]s$/.test(pr.m) && /in$/.test(pr.w) && ohneUml(pr.m.slice(0, -1)) === ohneUml(pr.w.slice(0, -2))) pr.m = pr.m.slice(0, -1);
      if (pr.m) paare.push({ m: pr.m.replace(/^(der|die|des)\s+/, ''), w: pr.w && pr.w !== pr.m ? pr.w.replace(/^(der|die)\s+/, '') : null });
    }
  }
  return paare;
}

const norm = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
function enthaelt(hay, needle) { return needle && norm(hay).includes(norm(needle)); }
// Wortstamm ohne Kasus-Endung: "Chemielaboranten" ~ "Chemielaborant"
const stamm = s => norm(s).split(' ').map(w => w.replace(/(en|n|s|e)$/, '')).join(' ');

function spezial(a, berufName) {
  const b = a.beruf || '';
  // Stufenausbildung "Ausbaufacharbeiter im Schwerpunkt X sowie zum Zimmerer": der Schwerpunkt gehört nur
  // dem Beruf VOR "sowie" — der Folgeberuf hat keine Variante
  if (/\s+sowie\s+/.test(b) && berufName && !enthaelt(b.split(/\s+sowie\s+/)[0], berufName)) return null;
  const sp = b.match(/im Schwerpunkt\s+(.+?)(?:\s+sowie\s+|$)/);
  if (sp) return sp[1].trim();
  const fr = b.match(/für die Fachrichtung\s+(.+?)(?:\s+-\s+|$)/);
  if (fr) return fr[1].trim();
  if (a.fachrichtung) return a.fachrichtung.replace(/\s*-\s*sachliche.*$/i, '').replace(/\s+im Ausbildungsberufsbild\b.*$/, '').trim();
  return null;
}

// roh: Ergebnisse von extrakt.verarbeite(), eines je Verordnung
export function baue({ xmlDir, roh, zielDir }) {
fs.mkdirSync(zielDir, { recursive: true });
for (const f of fs.readdirSync(zielDir)) if (f.endsWith('.json')) fs.unlinkSync(path.join(zielDir, f));
const verzeichnis = [];
const inhalt = crypto.createHash("sha256");
const probleme = [];
let neuester = '';
for (const r of roh) {
  if (!r.abschnitte.length) continue;
  if (r.stand > neuester) neuester = r.stand;
  const xd = path.join(xmlDir, r.id);
  const xf = fs.readdirSync(xd).find(x => x.endsWith('.xml'));
  const s = fs.readFileSync(path.join(xd, xf), 'utf8');
  const p1 = s.split(/<norm\b/).find(x => /<enbez>§\s*1<\/enbez>/.test(x));
  let berufe = p1 ? berufeAusPar1(text(p1)) : [];
  if (!berufe.length) {
    // Rückfall: Titel "Verordnung über die Berufsausbildung zum X/zur Y"
    const t = r.titel.match(/Berufsausbildung zum\s+(.+?)(?:\/zur\s+(.+?))?(?:\s+und zur\s+(.+?))?\s*\*?\)?$/);
    if (t) berufe = [{ m: t[1].trim(), w: (t[2] || t[3] || '').trim() || null }];
  }
  if (!berufe.length) {
    // Letzter Rückfall: Überschrift des Rahmenplans "zum Schiffsmechaniker und zur Schiffsmechanikerin"
    for (const b of new Set(r.abschnitte.map(a => a.beruf).filter(Boolean))) {
      const [m, w] = b.split(/\s+und\s+zur\s+|\/zur\s+/);
      if (m) berufe.push({ m: m.trim(), w: w ? w.trim() : null });
    }
  }
  if (!berufe.length) { probleme.push(r.id + ': keine Berufsnamen'); continue; }

  // Abschnitt → Beruf(e)
  const zu = r.abschnitte.map(a => {
    const b = a.beruf || '';
    const treffer = berufe.map((x, i) => (enthaelt(b, x.w) || enthaelt(b, x.m) || (x.m.length > 6 && stamm(b).includes(stamm(x.m)))) ? i : -1).filter(i => i >= 0);
    return treffer.length ? treffer : berufe.map((_, i) => i); // allgemein: gilt für alle
  });
  const bOut = berufe.map((x, i) => {
    const eigene = r.abschnitte.map((a, k) => ({ a, k })).filter(({ k }) => zu[k].includes(i));
    const labels = [...new Set(eigene.map(({ a }) => spezial(a, x.m)).filter(Boolean))];
    return { m: x.m, w: x.w, varianten: labels.length > 1 ? labels : [] };
  });
  const abschnitte = r.abschnitte.map((a, k) => ({
    berufe: zu[k].length === berufe.length ? null : zu[k],
    variante: (() => { const ls = zu[k].map(i => spezial(a, berufe[i].m)).filter(Boolean); return ls[0] || null; })(),
    titel: a.abschnitt,
    pflicht: !a.zusatz && !a.wahl,
    fenster: a.fenster,
    positionen: a.positionen.map(p => ({ nr: p.nr, titel: p.titel, ziele: p.ziele.map(z => z.t), zeit: p.zeit, ...(p.gesamt ? { gesamt: 1 } : {}) })),
  }));
  // Varianten, die in den Abschnitten gar nicht vorkommen, verwerfen
  for (const b of bOut) b.varianten = b.varianten.filter(v => abschnitte.some(a => a.variante === v));
  const datei = { id: r.id, titel: r.titel, abk: r.abk, stand: r.stand, quelle: r.quelle, berufe: bOut, abschnitte, fachgespraech: r.fachgespraech || [] };
  const json = JSON.stringify(datei);
  inhalt.update(r.id + '|' + json);
  fs.writeFileSync(path.join(zielDir, r.id + '.json'), json);
  bOut.forEach((b, i) => verzeichnis.push({ id: r.id, i, m: b.m, w: b.w, v: b.varianten }));
}
verzeichnis.sort((a, b) => a.m.localeCompare(b.m, 'de'));
// Stand = jüngste Fassung einer Verordnung (nicht "heute") — ein zweiter Lauf ohne Gesetzesänderung ändert nichts
const stand = neuester ? `${neuester.slice(0, 4)}-${neuester.slice(4, 6)}-${neuester.slice(6, 8)}` : '';
// v = Inhalts-Hash aller Pläne. Die Apps laden Pläne mit ?v=…, und der Service Worker hält
// gestempelte Dateien DAUERHAFT im Cache. Hing der Stempel am Gesetzesstand, kamen eigene
// Korrekturen (Flechtwerkgestalter-Schwerpunkte, Fachgespräch-Sätze, 01.11.2026) nie an.
const v = inhalt.digest('hex').slice(0, 10);
fs.writeFileSync(path.join(zielDir, 'verzeichnis.json'), JSON.stringify({ stand, v, quelle: 'https://www.gesetze-im-internet.de/', berufe: verzeichnis }));
return { verordnungen: new Set(verzeichnis.map(v => v.id)).size, berufe: verzeichnis.length, varianten: verzeichnis.filter(v => v.v.length).length, probleme };
}
