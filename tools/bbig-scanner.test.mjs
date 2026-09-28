// BBiG-Live-Scanner: Reihenfolge nach Schweregrad, Anzeige in eigener
// Schreibweise, Zähler. Lädt die echte Datei in jsdom.
// Aufruf: node tools/bbig-scanner.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const SRC = readFileSync(new URL('../components/bbig-scanner/bbig-scanner.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok  ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };

// Der Scanner hängt sich per DOMContentLoaded an (readyState ist direkt nach
// dem Konstruktor noch "loading") — vorher getippter Text kommt nie an.
async function setup(lang) {
    const dom = new JSDOM(`<!doctype html><html lang="${lang}"><body><textarea id="inpNotes"></textarea></body></html>`,
        { runScripts: 'outside-only', pretendToBeVisual: true });
    dom.window.eval(SRC);
    if (dom.window.document.readyState === 'loading') {
        await new Promise(r => dom.window.document.addEventListener('DOMContentLoaded', r));
    }
    return dom.window;
}

async function scan(win, text) {
    const n = win.document.getElementById('inpNotes');
    n.value = text;
    n.dispatchEvent(new win.Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 260));   // Debounce 200 ms
    return win.document.getElementById('bbigScannerDash');
}

// Sichtbare Reihenfolge = style.order, nicht DOM-Reihenfolge.
const visible = sc => [...sc.querySelectorAll('.bbig-alert:not(.is-leaving)')]
    .sort((a, b) => Number(a.style.order) - Number(b.style.order));

console.log('BBiG-Scanner');
{
    const win = await setup('de');
    const sc = await scan(win, 'Heute war ich total Überfordert, 11 Stunden ohne Pause, Berichtsheft zuhause.');
    const alerts = visible(sc);
    const sev = alerts.map(a => a.className.match(/bbig-alert--(\w+)/)[1]);

    ok(alerts.length >= 3, 'es gibt überhaupt mehrere Treffer (' + alerts.length + ')');
    ok(sev.includes('danger') && sev.includes('info'), 'Treffer beider Schweregrade vorhanden');
    // Bis v8.0.3: SEVERITY_RANK[x] || 9 machte aus danger (Rang 0) eine 9.
    const firstInfo = sev.indexOf('info'), lastDanger = sev.lastIndexOf('danger');
    ok(lastDanger < firstInfo, 'alle "danger" stehen vor jedem "info": ' + sev.join(','));

    const marks = alerts.map(a => a.querySelector('mark').textContent);
    ok(marks.includes('total Überfordert'), 'Treffer in eigener Schreibweise (Umlaut, Großbuchstabe): ' + marks.join(' | '));
    ok(!marks.some(m => /ueberfordert/.test(m)), 'keine normalisierte Form (ue statt ü) in der Anzeige');

    ok(alerts.every(a => a.querySelector('.bbig-alert__title').textContent.trim().length > 0), 'jeder Hinweis zeigt den Regeltitel');
    ok(!/\p{Extended_Pictographic}/u.test(sc.innerHTML), 'keine Emojis im Markup');

    const badge = sc.querySelector('.bbig-scanner__badge');
    ok(badge.textContent === alerts.length + ' Hinweise', 'Zähler stimmt: ' + badge.textContent);
    // onclick-Attribute laufen in jsdom (runScripts: outside-only) nicht — Handler direkt rufen.
    win.bbigDismissRule('bbigScannerDash', alerts[0].dataset.ruleId, alerts[0]);
    ok(badge.textContent === (alerts.length - 1) + ' Hinweise', 'Zähler zieht beim Ausblenden sofort nach: ' + badge.textContent);
}
{
    const win = await setup('en');
    const sc = await scan(win, '11 Stunden ohne Pause');
    ok(/notes?$/.test(sc.querySelector('.bbig-scanner__badge').textContent), 'EN: Zähler englisch');
    ok(/^Checks your text/.test(sc.querySelector('.bbig-scanner__status-text').textContent), 'EN: Fußzeile englisch');
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail || pass === 0 ? 1 : 0);
