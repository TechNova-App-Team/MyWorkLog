// Zustimmungsseite /ki-verbinden/: nur Rückleitungen auf das eigene Gerät oder an
// bekannte KI-Assistenten (Schutz vor Zustimmungs-Phishing, Befund 29.10.2026 in
// .claude/notes/ki-briefkasten.md Falle 2). Lädt die echten Funktionen aus der Seite.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../pages/ki-verbinden/index.html', import.meta.url), 'utf8').split('\r\n').join('\n');
const a = html.indexOf('    var KI_HOSTS = ');
const b = html.indexOf('\n    }\n', html.indexOf('function zielErlaubt(uri)'));
if (a < 0 || b < 0) { console.log('FAIL  Funktionen in der Seite nicht gefunden'); process.exit(1); }
const ctx = { URL };
vm.runInNewContext(html.slice(a, b + 6) + '\nthis.zielErlaubt = zielErlaubt; this.zielHost = zielHost;', ctx);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  OK    ' : '  FAIL  ') + m); };

const erlaubt = [
  'https://claude.ai/api/mcp/auth_callback',          // echte Verbindungen in der DB
  'https://chatgpt.com/connector_platform_oauth_redirect',
  'http://localhost:53999/callback', 'http://127.0.0.1:8976/callback', 'http://[::1]:9000/cb',
  'cursor://anysphere.cursor-mcp/oauth/callback', 'vscode://vscode.github-authentication/did-authenticate',
];
const gesperrt = [
  'https://evil.example/cb', 'https://claude.ai.evil.example/cb', 'https://notclaude.ai/cb',
  'http://claude.ai/api/mcp/auth_callback',           // http an fremden Host: Klartext
  'javascript:alert(1)', 'data:text/html,x', 'file:///c:/x', 'kein-url', '',
];
erlaubt.forEach(u => ok(ctx.zielErlaubt(u) === true, 'erlaubt: ' + u));
gesperrt.forEach(u => ok(ctx.zielErlaubt(u) === false, 'gesperrt: ' + (u || '(leer)')));
ok(ctx.zielHost('https://evil.example/cb') === 'evil.example', 'Host wird im Text genannt');

console.log(`\nki-verbinden Ziel: ${pass} ok, ${fail} fehlgeschlagen`);
if (pass === 0) process.exit(1);
process.exit(fail ? 1 : 0);
