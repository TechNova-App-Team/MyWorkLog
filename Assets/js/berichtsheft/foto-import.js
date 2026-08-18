// ═══ FOTO-IMPORT MODULE ═══
//
// Ein abfotografiertes Papier-Berichtsheft in eine Woche verwandeln.
//
// Warum lokal und nicht über den KI-Proxy: Ein Berichtsheft-Blatt trägt Namen,
// Betrieb und Ausbildungsstand — das ist genau die Sorte Daten, die nach
// Regel 1 das Gerät nicht verlässt. Die Texterkennung läuft deshalb komplett
// im Browser. Der Preis ist Ehrlichkeit wert: gedruckte und getippte Blätter
// erkennt sie gut, Handschrift schlecht. Beides steht so in der Oberfläche.
//
// Die Bibliothek wird erst beim ersten Klick geladen, nicht beim Seitenaufruf —
// niemand soll ein paar Megabyte herunterladen, nur weil er sein Berichtsheft
// öffnet.
//
// Das Ergebnis ist ein VORSCHLAG. Er landet im normalen Wochenformular, wo er
// geprüft und korrigiert wird, bevor irgendetwas gespeichert wird. Eine
// Texterkennung, die still danebenliegt, wäre schlimmer als gar keine.

const FOTO_TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

// Lange Kante, auf die das Bild gerechnet wird. Darunter verliert die
// Erkennung Buchstaben, darüber kostet sie nur noch Zeit.
const FOTO_ZIEL_KANTE = 2000;

var _mwlFoto = { text: '', vorschlag: null, laeuft: false, lib: null };

function mwlFotoL(de, en) {
    return (document.documentElement.lang === 'en') ? en : de;
}

// ─────────────────────────────────────────────────────────────────────────
// TEXT DEUTEN  (rein, ohne DOM — deshalb headless prüfbar)
// ─────────────────────────────────────────────────────────────────────────

const FOTO_TAGE = [
    { key: 'monday',    namen: ['montag', 'monday', 'mo'] },
    { key: 'tuesday',   namen: ['dienstag', 'tuesday', 'di'] },
    { key: 'wednesday', namen: ['mittwoch', 'wednesday', 'mi'] },
    { key: 'thursday',  namen: ['donnerstag', 'thursday', 'do'] },
    { key: 'friday',    namen: ['freitag', 'friday', 'fr'] },
];

function mwlFotoDistanz(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 3) return 99;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
        const cur = [i];
        for (let j = 1; j <= n; j++) {
            cur[j] = Math.min(
                prev[j] + 1,
                cur[j - 1] + 1,
                prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
        prev = cur;
    }
    return prev[n];
}

// Texterkennung verwechselt gerne g/q, l/1, rn/m. Ein Wochentag darf deshalb
// danebenliegen — aber nur um ein, zwei Zeichen, sonst wird jede Zeile zum
// Montag.
function mwlFotoTagAusZeile(zeile) {
    const wort = String(zeile).trim().toLowerCase().replace(/^[^a-zäöüß]+/, '').split(/[\s,:.;]+/)[0] || '';
    if (!wort) return null;
    for (const tag of FOTO_TAGE) {
        for (const name of tag.namen) {
            if (name.length <= 2) {
                if (wort === name) return tag.key;
                continue;
            }
            // 🔴 Ein laengeres Wort, das mit dem Tagesnamen ANFAENGT, ist ein
            // anderes Wort — "Montage von Baugruppen" ist kein Montag. Ueber
            // die reine Editierdistanz faellt das nicht auf: zu "montag"
            // fehlt genau ein Zeichen, wie bei einem Lesefehler. Erlaubt
            // bleibt nur das Plural-s ("montags").
            if (wort !== name && wort.startsWith(name)) {
                if (wort.slice(name.length) === 's') return tag.key;
                continue;
            }
            const toleranz = name.length >= 8 ? 2 : 1;
            if (mwlFotoDistanz(wort, name) <= toleranz) return tag.key;
        }
    }
    return null;
}

function mwlFotoDatum(s) {
    return mwlFotoDaten(s)[0] || null;
}

// ALLE Datumsangaben einer Zeile. Nur das erste zu nehmen reicht nicht:
// „Ausbildungswoche vom: 03.08.2026 bis: 07.08.2026" steht auf einer Zeile,
// und ohne das zweite Datum bleibt das Bis-Feld im Formular leer.
function mwlFotoDaten(s) {
    const out = [];
    const re = /(\d{1,2})\s*[.\/]\s*(\d{1,2})\s*[.\/]\s*(\d{2,4})/g;
    let m;
    while ((m = re.exec(String(s)))) {
        let y = +m[3];
        if (y < 100) y += (y >= 70 ? 1900 : 2000);
        const mo = +m[2], d = +m[1];
        if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
        const probe = new Date(Date.UTC(y, mo - 1, d));
        if (probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) continue;
        out.push(y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0'));
    }
    return out;
}

// Eine Stundenzahl am Zeilenende ("... erledigt    8" oder "8,5 h").
function mwlFotoStundenAmEnde(zeile) {
    const m = /(?:^|\s)(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:h|std\.?|stunden)?\s*$/i.exec(String(zeile));
    if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.'));
    if (!(n > 0 && n <= 24)) return null;
    // Ohne Einheit muss noch Text davor stehen — sonst ist die "8" eine
    // Seitenzahl oder ein Rest aus dem Formularrahmen.
    const rest = zeile.slice(0, m.index).trim();
    if (!/h|std/i.test(m[0]) && rest.length < 4) return null;
    return { stunden: n, rest: rest };
}

// Zeilen, die aus dem gedruckten Formularrahmen stammen und nicht in den
// Bericht gehören.
const FOTO_RAUSCHEN = /^(ausbildungsnachweis|betriebliche|unterweisungen|themen des|datum|unterschrift|name des|ausbildungsjahr|ausbildungsbereich|ausbildungswoche|stunden|seite|blatt|heft|woche)\b/i;

function mwlFotoParse(text) {
    const zeilen = String(text || '').split(/\r?\n/).map(z => z.replace(/\s+/g, ' ').trim());

    const daten = [];
    zeilen.forEach(z => mwlFotoDaten(z).forEach(d => { if (daten.indexOf(d) < 0) daten.push(d); }));
    daten.sort();

    let kw = null;
    const kwM = /(?:\bkw|kalenderwoche|woche(?:\s+nr\.?)?)\s*[:.]?\s*(\d{1,2})\b/i.exec(text || '');
    if (kwM && +kwM[1] >= 1 && +kwM[1] <= 53) kw = +kwM[1];

    const tage = {};
    const stunden = {};
    FOTO_TAGE.forEach(t => { tage[t.key] = []; });

    let aktuell = null;
    zeilen.forEach(z => {
        if (!z) return;
        const tag = mwlFotoTagAusZeile(z);
        if (tag) {
            aktuell = tag;
            // "Montag, 03.08. — Testumgebung aufgesetzt": alles hinter dem
            // Tagesnamen ist schon Inhalt und darf nicht verlorengehen.
            const rest = z.replace(/^[^a-zäöüß]*[a-zäöüß]+/i, '').replace(/^[\s,:.;–-]+/, '')
                          .replace(/^\d{1,2}\s*[.\/]\s*\d{1,2}(\s*[.\/]\s*\d{2,4})?[\s,:.;–-]*/, '').trim();
            if (rest && !FOTO_RAUSCHEN.test(rest)) mwlFotoZeileAnhaengen(tage, stunden, aktuell, rest);
            return;
        }
        if (!aktuell) return;
        if (FOTO_RAUSCHEN.test(z)) return;
        mwlFotoZeileAnhaengen(tage, stunden, aktuell, z);
    });

    const texte = {};
    FOTO_TAGE.forEach(t => { texte[t.key] = tage[t.key].join('\n'); });

    return {
        dateFrom: daten[0] || null,
        dateTo: daten.length > 1 ? daten[daten.length - 1] : null,
        week: kw,
        dailyActivities: texte,
        dailyHours: stunden,
        gefundeneTage: FOTO_TAGE.filter(t => texte[t.key]).length,
        rohzeilen: zeilen.filter(Boolean).length,
    };
}

function mwlFotoZeileAnhaengen(tage, stunden, tag, zeile) {
    let z = zeile.replace(/^[-•*·—–]\s*/, '').trim();
    const h = mwlFotoStundenAmEnde(z);
    if (h) {
        stunden[tag] = (stunden[tag] || 0) + h.stunden;
        z = h.rest;
    }
    if (z.length >= 2) tage[tag].push(z);
}

// ─────────────────────────────────────────────────────────────────────────
// BILD VORBEREITEN
// ─────────────────────────────────────────────────────────────────────────
// Ein Handyfoto ist zu gross, schief belichtet und farbig. Graustufen plus
// Kontrastspreizung bringen bei gedruckten Blaettern deutlich mehr als jede
// Feineinstellung an der Erkennung selbst.

function mwlFotoVorbereiten(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const skala = Math.min(1, FOTO_ZIEL_KANTE / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * skala));
            const h = Math.max(1, Math.round(img.height * skala));

            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            const ctx = cv.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, w, h);

            const bild = ctx.getImageData(0, 0, w, h);
            const px = bild.data;
            let min = 255, max = 0;
            for (let i = 0; i < px.length; i += 4) {
                const g = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
                px[i] = px[i + 1] = px[i + 2] = g;
                if (g < min) min = g;
                if (g > max) max = g;
            }
            const spanne = Math.max(1, max - min);
            for (let i = 0; i < px.length; i += 4) {
                const g = Math.max(0, Math.min(255, ((px[i] - min) * 255 / spanne) | 0));
                px[i] = px[i + 1] = px[i + 2] = g;
            }
            ctx.putImageData(bild, 0, 0);
            cv.toBlob(b => b ? resolve(b) : reject(new Error('Bild konnte nicht aufbereitet werden.')), 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht gelesen werden.')); };
        img.src = url;
    });
}

// ─────────────────────────────────────────────────────────────────────────
// TEXTERKENNUNG
// ─────────────────────────────────────────────────────────────────────────

function mwlFotoLibLaden() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (_mwlFoto.lib) return _mwlFoto.lib;
    _mwlFoto.lib = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = FOTO_TESSERACT_URL;
        s.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('lib leer'));
        s.onerror = () => {
            _mwlFoto.lib = null;   // beim nächsten Versuch neu laden, nicht ewig am Fehlschlag hängen
            reject(new Error(mwlFotoL(
                'Die Texterkennung konnte nicht geladen werden. Sie wird einmalig aus dem Netz geholt — ohne Verbindung geht das nicht.',
                'Text recognition could not be loaded. It is fetched once from the network — that needs a connection.')));
        };
        document.head.appendChild(s);
    });
    return _mwlFoto.lib;
}

async function mwlFotoErkennen(file, aufFortschritt) {
    const Tesseract = await mwlFotoLibLaden();
    aufFortschritt(mwlFotoL('Bild wird aufbereitet …', 'Preparing image …'), 0.05);
    const blob = await mwlFotoVorbereiten(file);

    aufFortschritt(mwlFotoL('Texterkennung wird vorbereitet …', 'Setting up text recognition …'), 0.1);
    const worker = await Tesseract.createWorker('deu', 1, {
        logger: m => {
            if (m.status === 'recognizing text') {
                aufFortschritt(mwlFotoL('Text wird gelesen …', 'Reading text …'), 0.2 + m.progress * 0.8);
            } else if (/loading|initializ/i.test(m.status || '')) {
                aufFortschritt(mwlFotoL('Sprachmodell wird geladen …', 'Loading language model …'), 0.12);
            }
        },
    });
    try {
        const res = await worker.recognize(blob);
        return res.data.text || '';
    } finally {
        // Ohne terminate bleibt ein Worker samt WASM-Heap im Speicher liegen —
        // bei drei Fotos hintereinander merkt man das auf dem Handy.
        try { await worker.terminate(); } catch (e) {}
    }
}

// ─────────────────────────────────────────────────────────────────────────
// OBERFLÄCHE
// ─────────────────────────────────────────────────────────────────────────

function mwlFotoOpen() {
    const ov = document.getElementById('fotoImport');
    if (!ov) return;
    mwlFotoSchritt('start');
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (typeof mwlEvent === 'function') mwlEvent('foto_import_opened');
}

function mwlFotoClose() {
    const ov = document.getElementById('fotoImport');
    if (!ov) return;
    ov.classList.remove('open');
    document.body.style.overflow = '';
}

function mwlFotoSchritt(name) {
    ['start', 'busy', 'result'].forEach(s => {
        const el = document.getElementById('fotoStep_' + s);
        if (el) el.style.display = (s === name) ? '' : 'none';
    });
}

function mwlFotoFehler(msg) {
    const box = document.getElementById('fotoError');
    if (!box) return;
    box.textContent = msg || '';
    box.style.display = msg ? '' : 'none';
}

async function mwlFotoDatei(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    input.value = '';
    if (_mwlFoto.laeuft) return;

    _mwlFoto.laeuft = true;
    mwlFotoFehler('');
    mwlFotoSchritt('busy');
    mwlFotoFortschritt(mwlFotoL('Wird gestartet …', 'Starting …'), 0.02);

    try {
        const text = await mwlFotoErkennen(file, mwlFotoFortschritt);
        _mwlFoto.text = text;
        _mwlFoto.vorschlag = mwlFotoParse(text);
        mwlFotoZeigeErgebnis();
    } catch (e) {
        mwlFotoSchritt('start');
        mwlFotoFehler(e.message || String(e));
    } finally {
        _mwlFoto.laeuft = false;
    }
}

function mwlFotoFortschritt(text, anteil) {
    const bar = document.getElementById('fotoBar');
    const lab = document.getElementById('fotoBusyText');
    if (bar) bar.style.width = Math.round(Math.max(0, Math.min(1, anteil)) * 100) + '%';
    if (lab) lab.textContent = text;
}

function mwlFotoZeigeErgebnis() {
    const v = _mwlFoto.vorschlag;
    mwlFotoSchritt('result');

    const meta = document.getElementById('fotoMeta');
    if (meta) {
        const teile = [];
        if (v.week) teile.push('KW ' + v.week);
        if (v.dateFrom) teile.push(v.dateFrom + (v.dateTo && v.dateTo !== v.dateFrom ? ' – ' + v.dateTo : ''));
        teile.push(mwlFotoL(`${v.gefundeneTage} von 5 Tagen erkannt`, `${v.gefundeneTage} of 5 days recognised`));
        meta.textContent = teile.join(' · ');
    }

    FOTO_TAGE.forEach(t => {
        const ta = document.getElementById('fotoTag_' + t.key);
        if (ta) ta.value = v.dailyActivities[t.key] || '';
    });

    const roh = document.getElementById('fotoRawText');
    if (roh) roh.value = _mwlFoto.text;

    const hinweis = document.getElementById('fotoHinweis');
    if (hinweis) {
        hinweis.style.display = v.gefundeneTage === 0 ? '' : 'none';
    }
}

// Erkannten Text ins normale Wochenformular übernehmen. Gespeichert wird
// nichts — das macht der Nutzer im Formular, nachdem er drübergesehen hat.
function mwlFotoUebernehmen() {
    const v = _mwlFoto.vorschlag;
    if (!v) return;

    FOTO_TAGE.forEach(t => {
        const ta = document.getElementById('fotoTag_' + t.key);
        if (ta) v.dailyActivities[t.key] = ta.value;
    });

    mwlFotoClose();
    openNewReportModal();
    setMode('daily');

    if (v.week) document.getElementById('reportWeek').value = v.week;
    if (v.dateFrom) document.getElementById('reportDateFrom').value = v.dateFrom;
    if (v.dateTo) document.getElementById('reportDateTo').value = v.dateTo;
    if (typeof setDailyFieldsFromData === 'function') {
        setDailyFieldsFromData(v.dailyActivities, v.dailyHours);
    }

    if (typeof showToast === 'function') {
        showToast(mwlFotoL('Aus dem Foto übernommen — bitte prüfen und dann speichern',
                           'Taken from the photo — please check, then save'), 'info');
    }
    if (typeof mwlEvent === 'function') mwlEvent('foto_import_applied');
}
