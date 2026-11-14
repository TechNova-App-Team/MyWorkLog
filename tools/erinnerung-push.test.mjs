// Berichtsheft-Erinnerung aufs Handy (Assets/js/erinnerung-push.js) + Verdrahtung.
// Was ohne echten Push-Dienst geht: Bedienfeld je Zustand (jsdom), gemeinsamer VAPID-Schluessel,
// Service Worker oeffnet das Ziel, Klasse und Erinnerung melden das Browser-Abo nicht
// gegenseitig ab, Edge Function beansprucht vor dem Senden. Der echte Versand ist am
// 14.11.2026 Ende-zu-Ende gegen Produktion geprueft (headless Chrome, FCM, Benachrichtigung kam an).

import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let ok = 0, fehler = 0;
const ist = (b, name, detail) => {
    if (b) { ok++; console.log('  ok    ' + name); }
    else { fehler++; console.log('  FEHLT ' + name + (detail ? '\n        ' + detail : '')); }
};
const lies = p => readFileSync(p, 'utf8').split('\r\n').join('\n');
const MOD = lies('Assets/js/erinnerung-push.js');

async function bedienfeld(o) {
    const dom = new JSDOM('<!doctype html><html lang="' + (o.lang || 'de') + '"><body><div id="k" hidden></div></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
    const w = dom.window;
    if (o.push) {
        w.PushManager = function () {};
        w.Notification = { permission: o.recht || 'default', requestPermission: async () => o.recht || 'default' };
        Object.defineProperty(w.navigator, 'serviceWorker', { value: {
            getRegistration: async () => ({ pushManager: { getSubscription: async () => (o.abo ? { endpoint: o.abo } : null) } })
        } });
    }
    if (o.stand) w.localStorage.setItem('mwl_erinnerung_push', JSON.stringify(o.stand));
    w.eval(MOD);
    await w.MWLErinnerung.zeichne(w.document.getElementById('k'), { ausbilder: !!o.ausbilder });
    return w.document.getElementById('k');
}

console.log('\n▶ Bedienfeld je Zustand');
const ohne = await bedienfeld({ push: false });
ist(!ohne.hidden && ohne.textContent.includes('kann keine Benachrichtigungen') && !ohne.querySelector('.erp-an'),
    'ohne Push: Hinweis, kein Knopf');
const aus = await bedienfeld({ push: true });
ist(!!aus.querySelector('.erp-an') && aus.querySelector('.erp-tag').value === '5' && aus.querySelector('.erp-stunde').value === '13',
    'aus: Einschalten, Vorgabe Freitag 13 Uhr');
ist(aus.querySelectorAll('.erp-tag option')[0].value === '1', 'Tage beginnen mit Montag');
const gesperrt = await bedienfeld({ push: true, recht: 'denied' });
ist(gesperrt.textContent.includes('blockiert') && !gesperrt.querySelector('.erp-an'), 'blockiert: Weg in die Browser-Einstellungen, kein Knopf');
const an = await bedienfeld({ push: true, recht: 'granted', abo: 'https://fcm.googleapis.com/x', stand: { endpoint: 'https://fcm.googleapis.com/x', tag: 4, stunde: 15, wochen: true }, ausbilder: true });
ist(!!an.querySelector('.erp-aus') && an.textContent.includes('Jeden Donnerstag um 15 Uhr') && an.querySelector('.erp-marke'),
    'an: Ausschalten, gewaehlte Zeit, Marke');
ist(an.textContent.includes('Erinnerungen deines Ausbilders'), 'verbundener Azubi liest den Ausbilder-Satz');
ist(!aus.textContent.includes('Erinnerungen deines Ausbilders'), 'Gegenprobe: ohne Betrieb kein Ausbilder-Satz');
const fremd = await bedienfeld({ push: true, recht: 'granted', abo: 'https://fcm.googleapis.com/anders', stand: { endpoint: 'https://fcm.googleapis.com/x', tag: 4, stunde: 15 } });
ist(!!fremd.querySelector('.erp-an'), 'gemerkter Endpunkt passt nicht zum Browser-Abo → gilt als aus');
const en = await bedienfeld({ push: true, lang: 'en', recht: 'granted', abo: 'e', stand: { endpoint: 'e', tag: 5, stunde: 13, wochen: true } });
ist(en.textContent.includes('Every Friday at 13:00') && en.textContent.includes('Turn off'), 'englisch');

console.log('\n▶ Verdrahtung');
const vapid = s => (s.match(/const VAPID = '([^']+)'/) || [])[1];
ist(vapid(MOD) && vapid(MOD) === vapid(lies('Assets/js/klasse-profil.js')), 'derselbe VAPID-Schluessel wie die Klasse');
ist(/<script defer src="\/Assets\/js\/erinnerung-push\.js\?v=[0-9a-f]+"><\/script>/.test(lies('index.template.html')), 'App laedt das Modul (gestempelt)');
ist(/<script src="\/Assets\/js\/erinnerung-push\.js\?v=[0-9a-f]+"><\/script>/.test(lies('pages/berichtsheft/index.html')), 'Berichtsheft laedt das Modul (gestempelt)');
ist(lies('components/modals/modals.html').includes('id="alertPushBox"') && lies('components/core/alerts-toasts.js').includes("MWLErinnerung.zeichne(document.getElementById('alertPushBox'))"),
    'App: Feld in den Meldungs-Einstellungen');
ist(lies('pages/berichtsheft/index.html').includes('id="bhPushKarte"') && lies('Assets/js/berichtsheft/bh-b2b-ui.js').includes("getElementById('bhPushKarte')"),
    'Berichtsheft: Karte gezeichnet');
const SW = lies('service-worker.js');
// Kommentare raus: der Kommentar ueber dem Code zitiert die alte Zeile `|| list[0]`.
const klick = SW.slice(SW.indexOf("addEventListener('notificationclick'")).split('\n').filter(z => !z.trim().startsWith('//')).join('\n');
ist(!klick.includes('|| list[0]') && klick.includes('pathname === pfad'), 'Benachrichtigung oeffnet ihr Ziel, nicht irgendein Fenster');
ist(SW.includes("klasse ? self.clients.matchAll"), 'Klassen-Abgleich nur bei Klassen-Pushs');
ist(lies('Assets/js/klasse-profil.js').includes('root.MWLErinnerung.istAn()') && MOD.includes('klasse && klasse.push'),
    'Klasse und Erinnerung melden das geteilte Browser-Abo nicht gegenseitig ab');
const FN = lies('supabase/functions/erinnerung-push/index.ts');
const faellig = FN.slice(FN.indexOf("body.aktion === 'faellig' || body.aktion === 'test'"));
ist(faellig.indexOf('.update({ gesendet_am') > 0 && faellig.indexOf('.update({ gesendet_am') < faellig.indexOf('await senden('),
    'Edge Function beansprucht vor dem Senden (kein Doppelversand)');
ist(lies('pages/ausbilder/index.html').includes('BHB2B.erinnerungPushen(zeile.id)'), 'Cockpit stoesst den Ausbilder-Push an');

console.log(`\nerinnerung-push: ${ok} ok, ${fehler} fehlgeschlagen`);
if (ok < 15) { console.log('zu wenige Pruefungen gelaufen'); process.exit(1); }
process.exit(fehler ? 1 : 0);
