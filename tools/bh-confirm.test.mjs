// bh-confirm.test.mjs — prueft den Bestaetigungs-Dialog (bhConfirm) aus
// Assets/js/berichtsheft/bh-ui-helfer.js in jsdom.
//
// Der Escape-Fall ist der eigentliche Grund fuer diesen Test: der globale
// Handler in bh-start.js schliesst bei Escape das Berichtsformular mit. Faengt
// bhConfirm die Taste nicht in der Capture-Phase ab, verliert der Nutzer beim
// Abbrechen einer Rueckfrage seinen ungespeicherten Text — sichtbar wird das
// erst, wenn die Rueckfrage AUS einem offenen Dialog kommt.
//
// Die Warteschleife ist zugleich die Gegenprobe zu den Tastatur-Behauptungen:
// wuerde das Ereignis nicht ankommen, bliebe das Promise offen und der Lauf
// haengt, statt gruen zu melden.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import assert from 'node:assert';

const src = readFileSync('Assets/js/berichtsheft/bh-ui-helfer.js', 'utf8').split('\r\n').join('\n');
const start = src.indexOf('function bhConfirm(');
assert.ok(start > 0, 'bhConfirm gefunden');
const code = src.slice(start);

const dom = new JSDOM('<body></body>', { pretendToBeVisual: true, runScripts: 'outside-only' });
const w = dom.window;
w.eval(code + '\nwindow.bhConfirm = bhConfirm;');

async function lauf(taste) {
    const p = w.bhConfirm({ title: 'Einladungscode löschen?', text: 'Wer ihn schon hat …', code: '376-T6C-9FX' });
    await new Promise(r => w.requestAnimationFrame(r));
    const ov = w.document.getElementById('bhConfirmModal');
    assert.ok(ov, 'Overlay da');
    assert.ok(ov.classList.contains('active'), 'active gesetzt');
    assert.strictEqual(w.document.body.style.overflow, 'hidden', 'Scroll gesperrt');
    assert.ok(ov.textContent.includes('376-T6C-9FX'), 'Code steht drin');
    assert.strictEqual(w.document.activeElement, ov.querySelectorAll('button')[1], 'Fokus auf Bestaetigen');
    taste(ov);
    const antwort = await p;
    assert.strictEqual(w.document.getElementById('bhConfirmModal'), null, 'Overlay entfernt');
    assert.strictEqual(w.document.body.style.overflow, '', 'Scroll wieder frei');
    return antwort;
}

assert.strictEqual(await lauf(ov => ov.querySelectorAll('button')[1].click()), true, 'Klick auf Bestaetigen → true');
assert.strictEqual(await lauf(ov => ov.querySelectorAll('button')[0].click()), false, 'Klick auf Abbrechen → false');
assert.strictEqual(await lauf(() => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))), false, 'Escape → false');
assert.strictEqual(await lauf(() => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))), true, 'Enter → true');
assert.strictEqual(await lauf(ov => ov.dispatchEvent(new w.MouseEvent('click', { bubbles: true }))), false, 'Klick auf Hintergrund → false');

// Escape darf NICHT bis zum globalen Handler durchlaufen
let durchgelaufen = false;
w.document.addEventListener('keydown', e => { if (e.key === 'Escape') durchgelaufen = true; });
await lauf(() => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
assert.strictEqual(durchgelaufen, false, 'Escape wird gestoppt');

console.log('alle Pruefungen bestanden');
