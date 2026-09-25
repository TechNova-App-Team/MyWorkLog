// Text der Anfrage an die Firma — rein, ohne Netz, damit
// `tools/impressum-abgleich.test.mjs` ihn unter Node laedt (Abschnitt 8).
//
// Die Mail geht an eine FREMDE Adresse (das Impressum der Firma), und zwei
// Werte darin tippt der Ausbilder selbst: Betriebs- und Anzeigename. Deshalb:
// - nichts davon wird ein Link, und alles, was nach Adresse aussieht, wird
//   entschaerft — sonst waere das hier ein Phishing-Versand mit dem Absender
//   myworklog.de;
// - der EINZIGE Link ist der Bestaetigungslink, und der zeigt auf myworklog.de.
//
// Ohne Backslash geschrieben (siehe impressum-pruefen/abgleich.ts).

export type MailDaten = {
  betrieb: string;
  domain: string;
  ausbilderName: string;
  ausbilderEmail: string;
  link: string;
  en?: boolean;
};

const NL = String.fromCharCode(10);

/** Frei getippter Text fuer eine fremde Mail: eine Zeile, kurz, ohne Adressen. */
export function entschaerfen(s: string, max = 80): string {
  let t = Array.from(String(s || ''), (c) => (c.charCodeAt(0) < 32 ? ' ' : c)).join('');
  t = t.replace(/[a-z][a-z0-9+.-]*:[/][/]/gi, ' ')
    .replace(/www[.]/gi, 'www ')
    .replace(/ +/g, ' ')
    .trim();
  return t.length > max ? t.slice(0, max - 1).trim() + '…' : t;
}

export function htmlEsc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Im Fliesstext verlinkt ein Mailprogramm "evil.com/login" selbst. Ein
// unsichtbares Zeichen vor dem Punkt verhindert das, ohne dass man es sieht.
function nichtVerlinken(s: string): string {
  return s.replace(/[.]/g, String.fromCharCode(0x2060) + '.');
}

export function anfrageMail(d: MailDaten): { betreff: string; text: string; html: string } {
  const betrieb = nichtVerlinken(entschaerfen(d.betrieb, 120));
  const name = nichtVerlinken(entschaerfen(d.ausbilderName, 80));
  const wer = name ? name + ' (' + d.ausbilderEmail + ')' : d.ausbilderEmail;
  const en = !!d.en;

  const betreff = en
    ? 'Please confirm: ' + (name || d.ausbilderEmail) + ' wants to sign off training records for ' + betrieb
    : 'Bitte bestätigen: ' + (name || d.ausbilderEmail) + ' möchte für ' + betrieb + ' Berichtshefte abzeichnen';

  const absaetze = en ? [
    'Hello,',
    wer + ' has set up the training company “' + betrieb + '” on MyWorkLog and would like to sign off your apprentices’ training records (Berichtsheft) digitally.',
    'We are writing to you because this address is listed in the legal notice (Impressum) of ' + d.domain + '. Please confirm only if this person trains apprentices at your company.',
    '__LINK__',
    'If you do not know this person, or they are not a trainer at your company, decline via the same link — the account then cannot sign off. The link is valid for 7 days. Confirming creates no account and costs nothing.',
    'Questions? Just reply to this email.',
    'MyWorkLog · myworklog.de',
  ] : [
    'Guten Tag,',
    wer + ' hat bei MyWorkLog den Ausbildungsbetrieb „' + betrieb + '“ angelegt und möchte darin die Ausbildungsnachweise (Berichtshefte) Ihrer Auszubildenden digital abzeichnen.',
    'Wir schreiben Ihnen, weil diese Adresse im Impressum von ' + d.domain + ' steht. Bitte bestätigen Sie nur, wenn die Person in Ihrem Betrieb ausbildet.',
    '__LINK__',
    'Kennen Sie die Person nicht oder bildet sie bei Ihnen nicht aus, lehnen Sie über denselben Link ab — dann kann dieses Konto nicht abzeichnen. Der Link gilt 7 Tage. Die Bestätigung legt kein Konto an und kostet nichts.',
    'Fragen? Antworten Sie einfach auf diese Mail.',
    'MyWorkLog · myworklog.de',
  ];
  const knopf = en ? 'Review request' : 'Anfrage ansehen';

  const text = absaetze.map((a) => (a === '__LINK__' ? knopf + ': ' + d.link : a)).join(NL + NL);

  const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2328;max-width:560px">' +
    absaetze.map((a) => a === '__LINK__'
      ? '<p style="margin:22px 0"><a href="' + htmlEsc(d.link) + '" style="display:inline-block;padding:11px 20px;border-radius:8px;background:#1f2328;color:#ffffff;text-decoration:none;font-weight:600">' +
        htmlEsc(knopf) + '</a></p>'
      : '<p style="margin:0 0 14px">' + htmlEsc(a) + '</p>').join('') +
    '</div>';

  return { betreff, text, html };
}
