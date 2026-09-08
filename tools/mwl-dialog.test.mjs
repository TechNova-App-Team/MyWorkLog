// bh-confirm.test.mjs — prueft den gemeinsamen Dialog aus
// Assets/js/mwl-dialog.js (mwlConfirm/mwlAlert) in jsdom.
//
// Der Escape-Fall ist der eigentliche Grund fuer diesen Test: die Seiten, die
// den Dialog benutzen, haben eigene Tastenkuerzel — im Berichtsheft schliesst
// Escape das Berichtsformular, und N/E/T legen einen neuen Dialog an. Der
// Dialog traegt NICHT die Klasse .modal.active, auf die deren Torwaechter
// schaut; er muss die Tasten deshalb selbst in der Capture-Phase schlucken.
// Faellt das weg, verliert der Nutzer beim Abbrechen einer Rueckfrage seinen
// ungespeicherten Text — und zwar lautlos.
//
// Die Warteschleife ist zugleich die Gegenprobe zu den Tastatur-Behauptungen:
// wuerde das Ereignis nicht ankommen, bliebe das Promise offen und der Lauf
// haengt, statt gruen zu melden.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import assert from 'node:assert';

const code = readFileSync('Assets/js/mwl-dialog.js', 'utf8').split('\r\n').join('\n');

const dom = new JSDOM('<body></body>', { pretendToBeVisual: true, runScripts: 'outside-only' });
const w = dom.window;
w.eval(code);
assert.strictEqual(typeof w.mwlConfirm, 'function', 'mwlConfirm ist global');
assert.strictEqual(typeof w.mwlAlert, 'function', 'mwlAlert ist global');

function box() { return w.document.querySelector('.mwlc-overlay'); }
function knoepfe(ov) { return [...ov.querySelectorAll('.mwlc-btn')]; }

async function lauf(taste, opts) {
    const p = w.mwlConfirm(opts || {
        title: 'Einladungscode löschen?', text: 'Wer ihn schon hat …', code: '376-T6C-9FX'
    });
    await new Promise(r => w.requestAnimationFrame(r));
    const ov = box();
    assert.ok(ov, 'Overlay da');
    assert.ok(ov.classList.contains('is-open'), 'is-open gesetzt');
    assert.strictEqual(w.document.body.style.overflow, 'hidden', 'Scroll gesperrt');
    taste(ov);
    const antwort = await p;
    assert.strictEqual(box(), null, 'Overlay entfernt');
    assert.strictEqual(w.document.body.style.overflow, '', 'Scroll wieder frei');
    return antwort;
}

// Inhalt und Fokus
{
    const p = w.mwlConfirm({ title: 'T', text: 'Text', code: '376-T6C-9FX' });
    await new Promise(r => w.requestAnimationFrame(r));
    const ov = box();
    assert.ok(ov.textContent.includes('376-T6C-9FX'), 'Code steht im Dialog');
    assert.strictEqual(w.document.activeElement, knoepfe(ov)[1], 'Fokus auf Bestaetigen');
    knoepfe(ov)[0].click();
    assert.strictEqual(await p, false);
}

assert.strictEqual(await lauf(ov => knoepfe(ov)[1].click()), true, 'Klick auf Bestaetigen → true');
assert.strictEqual(await lauf(ov => knoepfe(ov)[0].click()), false, 'Klick auf Abbrechen → false');
assert.strictEqual(await lauf(() => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))), false, 'Escape → false');
assert.strictEqual(await lauf(() => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))), true, 'Enter → true');
assert.strictEqual(await lauf(ov => ov.dispatchEvent(new w.MouseEvent('click', { bubbles: true }))), false, 'Klick auf Hintergrund → false');

// Hinweis-Fassung: nur ein Knopf, und der Hintergrundklick quittiert ihn.
{
    const p = w.mwlAlert('Abgezeichnet', 'Dein Ausbilder muss zurueckgeben.');
    await new Promise(r => w.requestAnimationFrame(r));
    const ov = box();
    const bs = knoepfe(ov);
    assert.strictEqual(bs[0].hidden, true, 'Abbrechen ist im Hinweis versteckt');
    assert.strictEqual(bs[1].textContent, 'Verstanden', 'Ein Knopf, und der heisst Verstanden');
    ov.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    assert.strictEqual(await p, true, 'Hinweis quittiert');
}

// 🔴 Der Kern: solange der Dialog offen ist, darf KEINE Taste die Seite
// erreichen — sonst legt N/E/T im Berichtsheft einen zweiten Dialog dahinter.
{
    const gesehen = [];
    w.document.addEventListener('keydown', e => gesehen.push(e.key));
    const p = w.mwlConfirm({ title: 'T', text: 'x' });
    await new Promise(r => w.requestAnimationFrame(r));
    for (const k of ['n', 'e', 't', 'f']) {
        w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
    }
    assert.deepStrictEqual(gesehen, [], 'keine Taste kommt bei der Seite an');
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await p;
    // Gegenprobe: ohne offenen Dialog kommen dieselben Tasten sehr wohl an.
    // Ohne diese Zeile wuerde die Behauptung oben auch dann gruen, wenn
    // dispatchEvent hier gar nichts ausloest.
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    assert.deepStrictEqual(gesehen, ['n'], 'ohne Dialog kommt die Taste an (Gegenprobe)');
}

// Die Berichtsheft-Seite kennt den Dialog unter zwei eigenen Namen —
// wenn die Weiterleitung bricht, faellt es sonst erst im Browser auf.
{
    const helfer = readFileSync('Assets/js/berichtsheft/bh-ui-helfer.js', 'utf8').split('\r\n').join('\n');
    assert.ok(/function bhConfirm\(opts\)\s*\{\s*return mwlConfirm\(opts\);/.test(helfer), 'bhConfirm reicht durch');
    assert.ok(/function bhAlert\(title, text\)\s*\{\s*return mwlAlert\(title, text\);/.test(helfer), 'bhAlert reicht durch');
    const seite = readFileSync('pages/berichtsheft/index.html', 'utf8');
    assert.ok(seite.includes('/Assets/js/mwl-dialog.js'), 'Berichtsheft laedt mwl-dialog.js');
    const schatten = readFileSync('pages/schatten-berichtsheft/index.html', 'utf8');
    assert.ok(schatten.includes('/Assets/js/mwl-dialog.js'), 'Schatten-Berichtsheft laedt mwl-dialog.js');
    const vm = readFileSync('pages/vertrags-manager/index.html', 'utf8');
    assert.ok(vm.includes('/Assets/js/mwl-dialog.js'), 'Vertrags-Manager laedt mwl-dialog.js');
}

console.log('alle Pruefungen bestanden');
