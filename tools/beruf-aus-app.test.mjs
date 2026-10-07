// Der Berichtsheft-Assistent uebernimmt den Ausbildungsberuf aus den
// App-Einstellungen (tg_pro_data.settings.job / jobCustom).
//
// Geprueft wird die echte Funktion _berufAusApp() aus ais-studio.js, geladen
// ueber tools/berichtsheft-laden.mjs, plus die Abdeckung der Berufsliste:
// jede <option> von #confJob muss in APP_BERUFE stehen, sonst faellt ein neuer
// Beruf in den Einstellungen still auf die Stichwortsuche zurueck.
//
//   node tools/beruf-aus-app.test.mjs

import { readFileSync } from 'node:fs';
import { ladeEngine } from './berichtsheft-laden.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  OK    ' + m); } else { fail++; console.log('  FAIL  ' + m); } };

const app = (settings) => JSON.stringify({ entries: [], settings });
const lauf = (speicher) => {
    const e = ladeEngine({ speicher });
    e.intern._berufAusApp();
    const s = e.sandbox.localStorage;
    return { st: e.intern.state, profil: JSON.parse(s.getItem('ais_user_profile_v2') || 'null'), merke: s.getItem('ais_app_beruf') };
};

console.log('── Listenberuf ──');
{
    const r = lauf({ tg_pro_data: app({ job: 'industriekaufmann' }) });
    ok(r.st.customProfession === 'Industriekaufmann/frau', `Name aus der App: ${r.st.customProfession}`);
    ok(r.st.selectedProfession === 'kaufmann', `Wortschatz der Engine: ${r.st.selectedProfession}`);
    ok(r.profil && r.profil.customProfession === 'Industriekaufmann/frau', 'im Profil gespeichert');
    ok(r.merke === 'industriekaufmann|', `Vermerk gesetzt: ${r.merke}`);
}

console.log('── Eigener Beruf ──');
{
    const r = lauf({ tg_pro_data: app({ job: 'sonstige', jobCustom: 'Bäcker/in' }) });
    ok(r.st.customProfession === 'Bäcker/in', `Freitext uebernommen: ${r.st.customProfession}`);
    ok(r.st.selectedProfession === 'gastronomie', `Stichwort "bäcker" → Wortschatz Gastronomie: ${r.st.selectedProfession}`);
}
{
    const r = lauf({ tg_pro_data: app({ job: 'sonstige', jobCustom: 'Fachkraft für Lagerlogistik' }) });
    ok(r.st.customProfession === 'Fachkraft für Lagerlogistik', 'Freitext bleibt als Name stehen');
    ok(r.st.selectedProfession === 'lager', `Stichwortsuche findet den Wortschatz: ${r.st.selectedProfession}`);
}
{
    const r = lauf({ tg_pro_data: app({ job: 'sonstige', jobCustom: 'Zahntechniker/in' }) });
    ok(r.st.customProfession === 'Zahntechniker/in' && r.st.selectedProfession === 'custom', `ohne Treffer → custom: ${r.st.selectedProfession}`);
}
{
    const r = lauf({ tg_pro_data: app({ job: 'sonstige', jobCustom: '   ' }) });
    ok(r.st.selectedProfession === null && r.merke === null, '"sonstige" ohne Text uebernimmt nichts');
}
{
    // jobCustom bleibt beim Wechsel zurueck auf einen Listenberuf gespeichert —
    // gelesen werden darf es dann nicht.
    const r = lauf({ tg_pro_data: app({ job: 'elektroniker', jobCustom: 'Bäcker/in' }) });
    ok(r.st.customProfession === 'Elektroniker/in', `verstecktes Freitextfeld wird ignoriert: ${r.st.customProfession}`);
}

console.log('── Wer gewinnt ──');
{
    const r = lauf({ tg_pro_data: app({ job: '' }) });
    ok(r.st.selectedProfession === null && r.profil === null, 'kein Beruf in der App → nichts angefasst');
}
{
    // Im Assistenten bewusst anders gewaehlt, App unveraendert → Assistent behaelt seine Wahl.
    const r = lauf({
        tg_pro_data: app({ job: 'industriekaufmann' }),
        ais_app_beruf: 'industriekaufmann|',
        ais_user_profile_v2: JSON.stringify({ profession: 'friseur', customProfession: '' }),
    });
    ok(r.st.selectedProfession === null && r.profil.profession === 'friseur', 'gleicher Vermerk → Wahl im Assistenten bleibt');
}
{
    // App seitdem geaendert → die neue Angabe gewinnt.
    const r = lauf({
        tg_pro_data: app({ job: 'mediengestalter' }),
        ais_app_beruf: 'industriekaufmann|',
        ais_user_profile_v2: JSON.stringify({ profession: 'friseur', customProfession: '' }),
    });
    ok(r.st.selectedProfession === 'medien' && r.profil.profession === 'medien', 'geaenderte App-Angabe wird uebernommen');
}
{
    const r = lauf({ tg_pro_data: '{kaputt' });
    ok(r.st.selectedProfession === null, 'kaputtes tg_pro_data wirft nicht');
}

console.log('── Abdeckung der Berufsliste ──');
{
    const html = readFileSync(new URL('../components/modals/modals.html', import.meta.url), 'utf8');
    const block = html.slice(html.indexOf('id="confJob"'), html.indexOf('</select>', html.indexOf('id="confJob"')));
    const werte = [...block.matchAll(/<option value="([^"]*)"/g)].map(m => m[1]).filter(v => v && v !== 'sonstige');
    const { BERUFE } = ladeEngine();
    ok(werte.length > 10, `es gibt ueberhaupt Optionen zu pruefen: ${werte.length}`);
    const fehlt = werte.filter(v => !BERUFE.APP_BERUFE[v]);
    ok(fehlt.length === 0, 'jede Option steht in APP_BERUFE' + (fehlt.length ? ': fehlt ' + fehlt.join(', ') : ''));
    const falsch = Object.entries(BERUFE.APP_BERUFE).filter(([, [, k]]) => !BERUFE.PROFESSIONS[k]).map(([v]) => v);
    ok(falsch.length === 0, 'jeder Schluessel in APP_BERUFE gibt es in PROFESSIONS' + (falsch.length ? ': ' + falsch.join(', ') : ''));
}

console.log(`\nBeruf aus App: ${pass} ok, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
