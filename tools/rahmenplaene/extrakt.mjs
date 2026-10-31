// Liest Ausbildungsrahmenpläne aus den XML-Fassungen von gesetze-im-internet.de (aufgerufen von bauen.mjs).
// Drei Tabellenformen kommen vor: neue mit <thead>+colname, alte ohne Kopf (Spalten nur über die
// Position → raster()), und Schreibmaschinen-Tabellen in <pre> (asciiTabellen()).
import fs from 'node:fs';

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#160;': ' ', '&nbsp;': ' ' };
export function text(x) {
  return String(x || '')
    .replace(/<SUP[^>]*>[\s\S]*?<\/SUP>/g, '')
    .replace(/<FnR[^>]*\/>/g, '')
    // Silbentrennung am Zeilenumbruch: "Ausbil-<BR/>dungsplan" → "Ausbildungsplan", aber "Arbeits-<BR/>und" bleibt
    .replace(/([a-zäöüß])-\s*<BR\s*\/>\s*(?!(?:und|oder|sowie|bzw|bis)\b)([a-zäöüß])/g, '$1$2')
    .replace(/<BR\s*\/>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, m => ENT[m] ?? ' ')
    .replace(/­/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ ([,.;:)])/g, '$1')
    .replace(/\( /g, '(')
    .trim();
}
// Getrennte Silben ohne <BR/> (Altbestand: "Berufs- bild- position") nur im Kopf zusammenziehen, nie im Inhalt
const entTrenn = s => s;

function attrs(tag) {
  const o = {};
  for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) o[m[1]] = m[2];
  return o;
}

// Raster: jede Zelle bekommt ihre Spalten (Index) — auch ohne colname, mit morerows/namest/nameend.
function raster(tbl) {
  const specs = [...tbl.matchAll(/<colspec\b([^>]*)\/?>/g)].map(m => attrs(m[1]).colname || null);
  const idx = name => { const i = specs.indexOf(name); return i; };
  const belegt = {}; // spalte → restliche Zeilen
  const out = [];
  const zeilen = [...tbl.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)];
  for (const r of zeilen) {
    const zellen = [...r[1].matchAll(/<entry\b([^>]*?)(?:\/>|>([\s\S]*?)<\/entry>)/g)];
    let c = 0;
    const row = [];
    for (const z of zellen) {
      const a = attrs(z[1]);
      while (belegt[c] > 0) c++;
      let von = c, bis = c;
      if (a.namest && idx(a.namest) >= 0) { von = idx(a.namest); bis = a.nameend && idx(a.nameend) >= 0 ? idx(a.nameend) : von; }
      else if (a.colname && idx(a.colname) >= 0) { von = bis = idx(a.colname); }
      const raw = z[2] || '';
      row.push({ von, bis, raw, t: text(raw) });
      if (a.morerows) for (let k = von; k <= bis; k++) belegt[k] = (+a.morerows) + 1;
      c = bis + 1;
    }
    out.push(row);
    for (const k in belegt) { belegt[k]--; if (belegt[k] <= 0) delete belegt[k]; }
  }
  return { n: specs.length, zeilen: out };
}

function monate(t) {
  const m = t.match(/(\d+)\.?\s*(?:bis|-|–)\s*(\d+)\.?\s*(?:Ausbildungs)?monat/i);
  if (m) return { von: +m[1], bis: +m[2] };
  const w = t.match(/(\d+)\.?\s*(?:bis|-|–)\s*(\d+)\.?\s*Woche/i);
  if (w) return { von: Math.floor((+w[1] - 1) / 4.345) + 1, bis: Math.ceil(+w[2] / 4.345) };
  const j = t.match(/(\d+)\.\s*Ausbildungsjahr/i);
  if (j) return { von: (+j[1] - 1) * 12 + 1, bis: +j[1] * 12 };
  return null;
}
function ziele(raw, t) {
  const dl = [...raw.matchAll(/<DT>([\s\S]*?)<\/DT>\s*<DD[^>]*>([\s\S]*?)<\/DD>/g)];
  if (dl.length) return dl.map(m => ({ b: text(m[1]).replace(/\)$/, ''), t: entTrenn(text(m[2])) })).filter(z => z.t);
  // Alte Form ohne DL: "a) ... b) ..."
  if (/^[a-z]\)\s/.test(t)) return t.split(/\s(?=[a-z]\)\s)/).map(x => ({ b: x[0], t: entTrenn(x.slice(2).trim()) })).filter(z => z.t);
  return t ? [{ b: '', t: entTrenn(t) }] : [];
}
const istUeberschrift = (row, n) => row.length === 1 && (row[0].bis - row[0].von + 1) >= Math.max(2, n - 1) && row[0].t.length > 3;

// Liefert Segmente: { titel (Abschnitts-Überschrift in der Tabelle, falls da), fenster, positionen }
function tabelle(tbl, startTitel) {
  const { n, zeilen } = raster(tbl);
  const segs = [];
  let seg = null, col = null, zeit = [], akt = null;
  const neu = (titel) => { seg = { titel, col: null, zeit: [], pos: [] }; segs.push(seg); col = null; zeit = []; akt = null; };
  neu(startTitel || null);
  for (const row of zeilen) {
    if (!row.length) continue;
    if (istUeberschrift(row, n) && !monate(row[0].t) && !/^\d+$/.test(row[0].t)) { neu(row[0].t); continue; }
    // Kopfzeile?
    const kopfT = e => e.t.replace(/-\s+/g, '');
    const kTitel = row.find(e => /Ausbildungsberufsbild/i.test(e.t)) || row.find(e => /Berufsbildposition/i.test(kopfT(e))) || row.find(e => /^Qualifikation$/i.test(e.t));
    const kZiele = row.find(e => e !== kTitel && /Fertigkeiten|Kenntnisse|Qualifikationen/i.test(e.t) && e.t.length < 260);
    if (kTitel && kZiele) {
      const kNr = row.find(e => e !== kTitel && (/^Lfd/i.test(e.t) || /^Nr\.?$/i.test(e.t) || /^Berufsbildposition$/i.test(kopfT(e))));
      // Die Lernziel-Spalte kann im Kopf über mehrere Rasterspalten gehen ("a)" in der einen, Text in der nächsten)
      col = { nr: kNr ? kNr.von : null, titel: kTitel.von, ziele: kZiele.von, zieleBis: kZiele.bis };
      seg.col = col;
      for (const e of row) { const m = monate(e.t); if (m) zeit.push({ sv: e.von, sb: e.bis, ...m }); }
      seg.zeit = zeit;
      continue;
    }
    if (!col) continue;
    const mz = row.filter(e => monate(e.t));
    if (mz.length && mz.length >= row.length - 1) { for (const e of mz) zeit.push({ sv: e.von, sb: e.bis, ...monate(e.t) }); seg.zeit = zeit; continue; }
    if (row.every(e => /^\d*$/.test(e.t)) && row.filter(e => e.t).length >= 3 && row[0].t === '1') continue; // Nummernzeile 1 2 3 4
    const at = k => row.find(e => e.von <= k && k <= e.bis);
    const eNr = col.nr != null ? at(col.nr) : null;
    const eTi = at(col.titel);
    const eZi = at(col.ziele);
    const zSpalte = row.filter(e => e.von >= col.ziele && e.bis <= col.zieleBis && e !== eTi && e !== eNr);
    const nr = eNr && eNr !== eTi ? eNr.t : '';
    const titel = eTi && eTi !== eZi ? entTrenn(eTi.t) : '';
    let zl = [];
    if (zSpalte.length > 1 && /^[a-z]\)$/.test(zSpalte[0].t)) zl = ziele('', zSpalte.map(e => e.t).join(' '));
    else if (eZi) zl = ziele(eZi.raw, eZi.t);
    if (titel) {
      akt = { nr: nr.replace(/\.$/, ''), titel: titel.replace(/\s*\((?:zu )?(?:§|Paragraph)[^)]*\)\s*$/, '').trim(), ziele: [], w: {} };
      seg.pos.push(akt);
    }
    if (!akt) continue;
    akt.ziele.push(...zl);
    for (const e of row) {
      if (e === eNr || e === eTi || e === eZi || zSpalte.includes(e) || !e.t) continue;
      const getroffen = zeit.filter(z => z.sv <= e.bis && e.von <= z.sb);   // sv/sb = Rasterspalten, von/bis = Monate
      if (!getroffen.length) continue;
      if (getroffen.length > 1) akt.w.gesamt = true;
      else { const k = zeit.indexOf(getroffen[0]); const num = (e.t.match(/\d+(?:,\d+)?/g) || []).map(x => +x.replace(',', '.')).reduce((a, b) => a + b, 0); akt.w[k] = (akt.w[k] || 0) + num; }
    }
  }
  return segs.filter(s => s.pos.some(p => p.ziele.length)).map(s => {
    const fenster = s.zeit.map(z => ({ von: z.von, bis: z.bis }));
    const positionen = s.pos.filter(p => p.ziele.length).map(p => {
      const zeitW = s.zeit.map((_, k) => p.w[k] || 0);
      return { nr: p.nr, titel: p.titel, ziele: p.ziele, zeit: zeitW, gesamt: !!p.w.gesamt };
    });
    return { titel: s.titel, fenster, positionen };
  });
}

// Altbestand: Rahmenplan als Schreibmaschinen-Tabelle in <pre>, Spalten durch "I" getrennt, feste Breiten.
function asciiTabellen(n) {
  const segs = [];
  for (const pm of n.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g)) {
    const zeilen = pm[1].replace(/<\/?B>/g, '').split(/<BR\s*\/>/).map(l => l.replace(/&[a-z#0-9]+;/gi, m => ENT[m] ?? ' ').replace(/<[^>]+>/g, ''));
    let seg = null, schnitte = null, datenAb = false, grp = null, akt = null;
    const zu = (a, b) => (a && /-$/.test(a) && /^[a-zäöüß]/.test(b) && !/^(und|oder|sowie|bzw|bis)\b/.test(b)) ? a.slice(0, -1) + b : (a ? a + ' ' + b : b);
    const schliessen = () => {
      if (!grp || !seg) { grp = null; return; }
      const nr = grp.nr.trim().replace(/\.$/, '');
      const titel = grp.titel.trim().replace(/\s*\((?:§|Paragraph)[^)]*\)\s*$/, '').replace(/\s*\(§.*$/, '').trim();
      const zt = grp.ziele.trim();
      const zl = /^[a-z]\)\s/.test(zt) ? zt.split(/\s(?=[a-z]\)\s)/).map(x => ({ b: x[0], t: x.slice(2).trim() })).filter(z => z.t) : (zt ? [{ b: '', t: zt }] : []);
      if (titel && (nr || !akt)) { akt = { nr, titel, ziele: zl, zeit: [], gesamt: true }; seg.positionen.push(akt); }
      else if (akt) akt.ziele.push(...zl);
      grp = null;
    };
    for (const l of zeilen) {
      if (/^\s*Abschnitt [IVX]+/.test(l)) { schliessen(); seg = { titel: l.trim(), fenster: [], positionen: [] }; segs.push(seg); schnitte = null; datenAb = false; akt = null; continue; }
      if (!schnitte && /Lfd\.\s*I/.test(l)) {
        schnitte = [...l.matchAll(/\sI(?=\s)/g)].map(m => m.index + 1);
        if (!seg) { seg = { titel: null, fenster: [], positionen: [] }; segs.push(seg); }
        continue;
      }
      if (!schnitte) continue;
      if (!datenAb) { if (/^\s*1\s+I\s+2\s+I/.test(l)) datenAb = true; continue; }
      if (/^\s*-{8,}/.test(l)) { schliessen(); continue; }
      const teil = (a, b) => l.slice(a, b).replace(/^\s*I\s?/, '').replace(/\s*I\s*$/, '').trim();
      const c1 = teil(0, schnitte[0]), c2 = teil(schnitte[0], schnitte[1]), c3 = teil(schnitte[1], schnitte[2] ?? l.length);
      if (!grp) grp = { nr: '', titel: '', ziele: '' };
      if (c1) grp.nr += c1;
      if (c2) grp.titel = zu(grp.titel, c2);
      if (c3) grp.ziele = zu(grp.ziele, c3);
    }
    schliessen();
  }
  return segs.filter(s => s.positionen.some(p => p.ziele.length)).map(s => ({ ...s, positionen: s.positionen.filter(p => p.ziele.length) }));
}

export function berufAus(t) {
  const m = t.match(/Berufsausbildung (?:zum|zur|im|in der|in den|zu|für)\s+(.+?)(?:\s*\(Fundstelle|\s+-\s+Zeitliche|\s+Abschnitt|\s+Teil [A-Z]|\s*$)/);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}
const frAus = ctx => {
  const m = (ctx || '').match(/(?:Fachrichtung|Schwerpunkt|Einsatzgebiet)(?:en)?\s+„?([^“:]+?)[“]?(?:\s*$|:|\s+-\s+|\s+im Ausbildungsberufsbild\b)/i);
  return m ? m[1].replace(/\s+im Ausbildungsberufsbild\b.*$/, '').replace(/[.,;]$/, '').trim() : null;
};

export function verarbeite(datei, kurz) {
  const s = fs.readFileSync(datei, 'utf8');
  const norms = s.split(/<norm\b/);
  const kopf = norms[1] || '';
  const titel = text((kopf.match(/<langue>([\s\S]*?)<\/langue>/) || [])[1] || '');
  const abk = text((kopf.match(/<jurabk>([\s\S]*?)<\/jurabk>/) || [])[1] || '');
  const stand = (s.match(/builddate="(\d{8})/) || [])[1] || '';
  const abschnitte = [];
  for (const n of norms) {
    if (/<enbez>Anlage/.test(n) && /<pre\b/.test(n) && /Lfd\.\s*I/.test(n)) {
      const enbez = text((n.match(/<enbez>([\s\S]*?)<\/enbez>/) || [])[1] || '');
      const beruf = berufAus(text(n.slice(0, n.search(/<pre\b/))));
      for (const seg of asciiTabellen(n)) abschnitte.push({ anlage: enbez, beruf, abschnitt: seg.titel, fachrichtung: null, zusatz: false, wahl: /Wahl/i.test(seg.titel || ''), fenster: [], positionen: seg.positionen });
    }
    if (!/<table/.test(n)) continue;
    const enbez = text((n.match(/<enbez>([\s\S]*?)<\/enbez>/) || [])[1] || '');
    let pos = 0, beruf = null, kontext = '', zeitlich = false;
    const anlageKopf = text(n.slice(0, n.indexOf('<table'))).slice(0, 600);
    const zusatz = /Zusatzqualifikation/i.test(anlageKopf);
    // Teil "Zeitliche Gliederung" wiederholt die Positionen der sachlichen Gliederung — überspringen
    const modus = t => { if (/Zeitliche Gliederung/i.test(t)) zeitlich = true; if (/Sachliche Gliederung/i.test(t)) zeitlich = false; };
    for (const m of n.matchAll(/<table\b[\s\S]*?<\/table>/g)) {
      const vor = text(n.slice(pos, m.index));
      pos = m.index + m[0].length;
      const b = berufAus(vor); if (b) beruf = b;
      modus(vor);
      const tTitel = text((m[0].match(/<Title\b[^>]*>([\s\S]*?)<\/Title>/) || [])[1] || '');
      if (tTitel && berufAus(tTitel)) beruf = berufAus(tTitel);
      modus(tTitel);
      const vorAbschnitt = (vor.match(/((?:Abschnitt|Teil) [A-Z0-9IVX]+[^:]*:.*?)(?=Lfd\.|$)/) || [])[1];
      if (tTitel || vorAbschnitt) kontext = (tTitel || vorAbschnitt).trim();
      for (const seg of tabelle(m[0], null)) {
        if (seg.titel) { kontext = seg.titel; const bb = berufAus(seg.titel); if (bb) beruf = bb; modus(seg.titel); }
        if (zeitlich) continue;
        // "wahlqualifikationsübergreifend" (Büromanagement Abschnitt A) ist Pflicht, nicht Wahl
        const wahl = /Wahlqualifikation|Wahlbaustein|wahlweise/i.test(kontext || '') && !/übergreifend/i.test(kontext || '');
        abschnitte.push({ anlage: enbez, beruf, abschnitt: (kontext || '').slice(0, 220) || null, fachrichtung: frAus(kontext), zusatz, wahl, fenster: seg.fenster, positionen: seg.positionen });
      }
    }
  }
  return { id: kurz, titel, abk, stand, quelle: `https://www.gesetze-im-internet.de/${kurz}/`, abschnitte };
}
