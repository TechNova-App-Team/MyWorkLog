// Holt alle Verordnungen "über die Berufsausbildung …" von gesetze-im-internet.de (XML) in <ordner>/<kurzname>/.
// Bereits vorhandene Ordner werden übersprungen (neu holen = Ordner löschen).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export async function holen(ordner, { neu = false } = {}) {
  fs.mkdirSync(ordner, { recursive: true });
  const tocPfad = path.join(ordner, 'gii-toc.xml');
  if (neu || !fs.existsSync(tocPfad)) {
    const r = await fetch('https://www.gesetze-im-internet.de/gii-toc.xml');
    if (!r.ok) throw new Error('Inhaltsverzeichnis: HTTP ' + r.status);
    fs.writeFileSync(tocPfad, await r.text());
  }
  const toc = fs.readFileSync(tocPfad, 'utf8');
  const items = [...toc.matchAll(/<item>\s*<title>([\s\S]*?)<\/title>\s*<link>([\s\S]*?)<\/link>/g)]
    .map(m => ({ titel: m[1].replace(/\s+/g, ' ').trim(), link: m[2].trim() }))
    .filter(i => /Berufsausbildung/i.test(i.titel));
  let geholt = 0, fehl = 0;
  for (const it of items) {
    const kurz = it.link.split('/').slice(-2, -1)[0];
    const ziel = path.join(ordner, 'xml', kurz);
    if (!neu && fs.existsSync(ziel)) continue;
    const r = await fetch(it.link.replace('http://', 'https://'));
    if (!r.ok) { fehl++; console.log('FEHL', r.status, it.link); continue; }
    const zip = path.join(ordner, 'tmp.zip');
    fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
    fs.mkdirSync(ziel, { recursive: true });
    execFileSync('unzip', ['-o', '-q', zip, '-d', ziel]);
    fs.unlinkSync(zip);
    geholt++;
  }
  return { kandidaten: items.length, geholt, fehl };
}
