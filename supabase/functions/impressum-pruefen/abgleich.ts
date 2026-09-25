// Reiner Abgleich "steht der Betriebsname im Impressum?" — ohne Netz, ohne
// Deno-APIs, damit `tools/impressum-abgleich.test.mjs` ihn unter Node laedt.
//
// WARUM ueberhaupt: Ein E-Mail- oder DNS-Nachweis belegt nur die DOMAIN. Dass
// `brush-zahn.com` der "Zahn Pinsel GmbH" gehoert, steht nirgends — ausser im
// Impressum, das jede geschaeftliche Website in Deutschland fuehren muss
// (§ 5 DDG). Deshalb wird der Name dort gesucht, nicht in der Domain: ein
// Name-gegen-Domain-Vergleich wuerde genau diese Firma faelschlich abweisen.
//
// Bewusst KEINE Unschaerfe (Editierdistanz o. ae.): ein Treffer ist hier eine
// Aussage auf einer Pruefplakette. "Mueller Bau" darf nicht auf "Mueller Bad"
// passen. Normalisiert wird nur, was an derselben Firma verschieden
// geschrieben wird: Umlaute, Rechtsform, Satzzeichen, Gross/klein.

const RECHTSFORMEN = [
  'gmbh co kg', 'gmbh und co kg', 'ug haftungsbeschraenkt', 'ug haftungsbeschrankt',
  'gmbh', 'mbh', 'ug', 'ag', 'kg', 'ohg', 'gbr', 'kgaa', 'se', 'ev',
  'e k', 'ek', 'e kfm', 'e kfr', 'e kffr', 'inh', 'inhaber', 'inhaberin',
  'partg', 'partgmbb', 'ltd', 'limited', 'gmbh i g', 'eg',
];

const ENTITAETEN: Record<string, string> = {
  amp: '&', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü',
  szlig: 'ß', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', shy: '',
  eacute: 'é', egrave: 'è', ndash: '-', mdash: '-', middot: ' ', copy: ' ',
};

export function entitaetenAufloesen(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (voll, k: string) => {
    if (k[0] === '#') {
      const n = k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' ';
    }
    return k in ENTITAETEN ? ENTITAETEN[k] : voll;
  });
}

/** Kleinbuchstaben, Umlaute ausgeschrieben, alles andere als Leerzeichen. */
export function normalisieren(s: string): string {
  return entitaetenAufloesen(String(s || ''))
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/é|è|ê/g, 'e').replace(/á|à|â/g, 'a')
    .replace(/&/g, ' und ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Seitentext ohne Skripte, Styles und Tags. */
export function seitenText(html: string): string {
  return String(html || '')
    .replace(/<(script|style|noscript|svg)[^>]*>[^]*?<[/](script|style|noscript|svg)>/gi, ' ')
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ');
}

/**
 * Kern des Namens: normalisiert, Rechtsform am Ende abgeschnitten.
 * "Zahn Pinsel GmbH & Co. KG" -> "zahn pinsel"
 */
export function namensKern(name: string): string {
  let n = ' ' + normalisieren(name) + ' ';
  // Laengste zuerst, sonst frisst "kg" das Ende von "gmbh co kg" nur halb.
  const formen = [...RECHTSFORMEN].sort((a, b) => b.length - a.length);
  let geaendert = true;
  while (geaendert) {
    geaendert = false;
    for (const f of formen) {
      if (n.endsWith(' ' + f + ' ')) {
        n = n.slice(0, n.length - f.length - 1);
        geaendert = true;
      }
    }
    // "& Co." bleibt nach dem Abschneiden von "KG" als "und co" stehen.
    for (const rest of [' und co ', ' co ', ' und ']) {
      if (n.endsWith(rest)) { n = n.slice(0, n.length - rest.length + 1); geaendert = true; }
    }
  }
  return n.trim();
}

/** Sieht die Seite ueberhaupt wie ein Impressum aus? */
export function istImpressum(text: string): boolean {
  const t = ' ' + normalisieren(text) + ' ';
  return [' impressum ', ' imprint ', ' angaben gemaess ', ' angaben gem ',
          ' 5 ddg ', ' 5 tmg ', ' handelsregister ', ' registergericht ',
          ' vertretungsberechtigt', ' legal notice ']
    .some((m) => t.includes(m));
}

export type Abgleich =
  | { ok: true; kern: string }
  | { ok: false; grund: 'name_zu_kurz' | 'kein_impressum' | 'name_fehlt'; kern: string };

/**
 * Steht der Betriebsname (ohne Rechtsform) als ganze Wortfolge im Impressum?
 * Unter 4 Zeichen Kern wird nicht geurteilt — "Bau" steht auf jeder Seite.
 */
export function nameImImpressum(betriebsName: string, html: string): Abgleich {
  const kern = namensKern(betriebsName);
  if (kern.replace(/ /g, '').length < 4) return { ok: false, grund: 'name_zu_kurz', kern };
  const text = seitenText(html);
  if (!istImpressum(text)) return { ok: false, grund: 'kein_impressum', kern };
  const t = ' ' + normalisieren(text) + ' ';
  return t.includes(' ' + kern + ' ')
    ? { ok: true, kern }
    : { ok: false, grund: 'name_fehlt', kern };
}

/** Links auf der Startseite, die nach Impressum aussehen — nur derselbe Host. */
export function impressumLinks(html: string, basis: string, erlaubt: (host: string) => boolean): string[] {
  const aus: string[] = [];
  const re = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([^]*?)<[/]a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(html || ''))) && aus.length < 3) {
    const ziel = m[1], text = normalisieren(seitenText(m[2]));
    const hinweis = /impressum|imprint|legal/i.test(ziel) || /impressum|imprint|legal notice/.test(text);
    if (!hinweis) continue;
    try {
      const u = new URL(ziel, basis);
      if ((u.protocol === 'https:' || u.protocol === 'http:') && erlaubt(u.hostname) && !aus.includes(u.href)) {
        aus.push(u.href);
      }
    } catch (_) { /* kaputter Link */ }
  }
  return aus;
}

/** Private, Loopback- und Link-Local-Adressen — dorthin wird nie abgefragt. */
export function istPrivateIp(ip: string): boolean {
  const s = String(ip || '').toLowerCase();
  if (s.includes(':')) {
    return s === '::' || s === '::1' || s.startsWith('fe8') || s.startsWith('fe9') ||
      s.startsWith('fea') || s.startsWith('feb') || s.startsWith('fc') || s.startsWith('fd') ||
      s.startsWith('::ffff:');
  }
  const p = s.split('.').map(Number);
  if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19));
}
