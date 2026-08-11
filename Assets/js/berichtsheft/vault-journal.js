// ═══ VAULT-JOURNAL MODULE ═══
//
// Hash-verkettetes Ereignis-Journal des Schatten-Tresors.
//
// 🔴 WAS DAS LEISTET — und was nicht:
//
// Ein einzelner `contentHash` am Eintrag (contentFingerprint() in
// schatten-berichtsheft.js) beweist nichts: wer den Eintrag aendert, rechnet
// den Hash gleich mit neu. Was fehlt, ist die REIHENFOLGE. Hier bekommt jedes
// Ereignis (angelegt / geaendert / geloescht) den Hash seines Vorgaengers
// eingebacken. Ein nachtraeglich veraendertes, entferntes oder eingeschobenes
// Ereignis bricht damit jede folgende Verkettung — und zwar sichtbar.
//
// Das Journal ist APPEND-ONLY und protokolliert Ereignisse, nicht Zustaende.
// Eintraege bleiben also editierbar (das ist gewollt, Tippfehler passieren),
// aber jede Aenderung hinterlaesst eine Spur, die sich nicht folgenlos
// herausschneiden laesst.
//
// Was es NICHT ist: ein Schutz gegen den Besitzer des Tresors. Wer das
// Passwort hat, kann das komplette Journal neu berechnen. Es gibt hier keine
// fremde Instanz, die gegenzeichnet, und die Systemuhr des Geraets ist frei
// stellbar — ein Zeitstempel allein belegt also keinen Zeitpunkt.
//
// Wogegen es hilft:
//   • stille Aenderungen durch Dritte am unverschlossenen Geraet
//   • eigenes versehentliches Ueberschreiben (die Pruefung sagt, WAS abweicht)
//   • die nachtraegliche Rundum-Faelschung: sie erzwingt, dass jeder
//     Zeitstempel und jede Reihenfolge in sich stimmig neu gebaut wird
//   • den Vorwurf „das hast du gestern alles zusammengetippt" — WENN der
//     Kettenkopf frueh ausser Haus festgehalten wurde (an die JAV mailen,
//     abfotografieren, der Vertrauensperson zeigen). Ab diesem Zeitpunkt ist
//     alles davor festgenagelt: ein spaeter geaenderter Eintrag ergibt einen
//     anderen Kopf als den, der bereits bezeugt ist.
//
// Genau so, und nicht staerker, steht es auch in der Oberflaeche.

(function (global) {
    'use strict';

    const VERSION = 'mwl-journal/1';
    const SEP = '\u001f';   // Unit Separator — kommt in Nutzertext nicht vor

    function u8ToHex(u8) {
        let out = '';
        for (let i = 0; i < u8.length; i++) out += u8[i].toString(16).padStart(2, '0');
        return out;
    }

    async function sha256Hex(str) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return u8ToHex(new Uint8Array(buf));
    }

    // ── Kanonische Form eines Eintrags ────────────────────────────────
    // 🔴 JEDES Feld, das den Inhalt traegt, MUSS hier hineinlaufen — was
    // draussen bleibt, laesst sich spurlos aendern. Bewusst NICHT drin:
    // `history` (das ist abgeleitet und waechst bei jeder Aenderung mit),
    // `updatedAt` (steht als eigenes Feld im Ereignis) und `contentHash`
    // selbst. Die Anzahl der Listen steht jeweils davor, damit sich Felder
    // nicht ueber Elementgrenzen hinweg verschieben lassen.
    function canonicalEntry(e) {
        const teile = [
            VERSION, 'entry',
            String(e.id || ''), String(e.date || ''), String(e.time || ''),
            String(e.severity || ''), String(e.category || ''), String(e.text || ''),
            String(e.status || 'open'), String(e.createdAt || ''),
            String(e.timeBasis || '')
        ];
        const w = Array.isArray(e.witnesses) ? e.witnesses : [];
        teile.push('w:' + w.length);
        w.forEach(function (x) { teile.push(String(x || '')); });

        // Anhaenge zaehlen mit: ein entferntes Beweismittel ist eine
        // inhaltliche Aenderung, auch wenn der Text gleich bleibt.
        const a = Array.isArray(e.attachments) ? e.attachments : [];
        teile.push('a:' + a.length);
        a.forEach(function (x) { teile.push(String((x && x.id) || ''), String((x && x.name) || '')); });

        // Kategorie-Zusatzfelder: Schluessel sortiert, damit die Reihenfolge
        // im Objekt keine Rolle spielt.
        const d = (e.details && typeof e.details === 'object') ? e.details : {};
        const keys = Object.keys(d).sort();
        teile.push('d:' + keys.length);
        keys.forEach(function (k) { teile.push(k, String(d[k] === undefined || d[k] === null ? '' : d[k])); });

        return teile.join(SEP);
    }

    function entryHash(e) { return sha256Hex(canonicalEntry(e)); }

    // ── Kanonische Form eines Ereignisses ─────────────────────────────
    function canonicalEvent(ev) {
        return [VERSION, 'event', String(ev.seq), String(ev.ts || ''), String(ev.action || ''),
                String(ev.entryId || ''), String(ev.contentHash || ''), String(ev.prev || '')].join(SEP);
    }

    // ── Anhaengen ─────────────────────────────────────────────────────
    // Gibt ein NEUES Array zurueck statt zu mutieren: der Aufrufer haelt eine
    // Rollback-Kopie, und ein fehlgeschlagenes Speichern darf das Journal im
    // Arbeitsspeicher nicht bereits fortgeschrieben haben.
    async function append(journal, action, entry) {
        const list = Array.isArray(journal) ? journal.slice() : [];
        const last = list.length ? list[list.length - 1] : null;
        const ev = {
            seq: last ? last.seq + 1 : 1,
            ts: new Date().toISOString(),
            action: action,
            entryId: String((entry && entry.id) || ''),
            // Beim Loeschen gibt es keinen Inhalt mehr, der Hash bleibt leer.
            contentHash: action === 'delete' ? '' : await entryHash(entry),
            prev: last ? last.hash : ''
        };
        ev.hash = await sha256Hex(canonicalEvent(ev));
        list.push(ev);
        return list;
    }

    // ── Pruefung ──────────────────────────────────────────────────────
    // Liefert einen Befund, keine Note. Vier Dinge werden unterschieden, weil
    // sie verschiedene Ursachen haben und verschieden schwer wiegen:
    //
    //   chainBreak  Die Verkettung stimmt nicht — jemand hat am Journal selbst
    //               gedreht. Das ist der schwerste Befund.
    //   changed     Ein Eintrag steht anders da, als das Journal ihn zuletzt
    //               gesehen hat. Aenderung ohne Protokoll.
    //   unlogged    Ein Eintrag existiert, hat aber nie ein Ereignis erzeugt.
    //               Normalfall: er kam ueber ein Backup oder eine
    //               Zusammenfuehrung ins Haus, nicht ueber das Formular.
    //   vanished    Das Journal kennt einen Eintrag, der ohne Loesch-Ereignis
    //               verschwunden ist.
    async function verify(journal, entries) {
        const list = Array.isArray(journal) ? journal : [];
        const rows = Array.isArray(entries) ? entries : [];
        const res = { total: list.length, chainBreak: null, changed: [], unlogged: [], vanished: [], head: '', headShort: '', ok: false };

        let prev = '';
        for (let i = 0; i < list.length; i++) {
            const ev = list[i];
            const expectedSeq = i + 1;
            if (ev.seq !== expectedSeq || ev.prev !== prev) {
                res.chainBreak = { at: expectedSeq, reason: ev.seq !== expectedSeq ? 'seq' : 'prev' };
                return res;
            }
            const recomputed = await sha256Hex(canonicalEvent(ev));
            if (recomputed !== ev.hash) {
                res.chainBreak = { at: expectedSeq, reason: 'hash' };
                return res;
            }
            prev = ev.hash;
        }
        res.head = prev;
        res.headShort = prev ? prev.slice(0, 16).replace(/(.{4})/g, '$1 ').trim() : '';

        // Letzter bekannter Stand je Eintrag
        const lastSeen = {};
        list.forEach(function (ev) { lastSeen[ev.entryId] = ev; });

        for (let i = 0; i < rows.length; i++) {
            const e = rows[i];
            const ev = lastSeen[e.id];
            if (!ev || ev.action === 'delete') { res.unlogged.push(e.id); continue; }
            const now = await entryHash(e);
            if (now !== ev.contentHash) res.changed.push({ id: e.id, since: ev.ts });
        }

        const present = {};
        rows.forEach(function (e) { present[e.id] = true; });
        Object.keys(lastSeen).forEach(function (id) {
            if (lastSeen[id].action !== 'delete' && !present[id]) res.vanished.push(id);
        });

        res.ok = !res.chainBreak && !res.changed.length && !res.unlogged.length && !res.vanished.length;
        return res;
    }

    function available() {
        return typeof crypto !== 'undefined' && !!crypto.subtle;
    }

    global.VaultJournal = {
        append: append,
        verify: verify,
        entryHash: entryHash,
        canonicalEntry: canonicalEntry,
        canonicalEvent: canonicalEvent,
        available: available,
        VERSION: VERSION
    };

})(typeof window !== 'undefined' ? window : globalThis);
