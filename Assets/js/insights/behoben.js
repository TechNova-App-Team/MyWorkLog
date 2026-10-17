// ═══ BEHOBEN MODULE ═══
// Fixes zu Problemen aus /analytics/ ("Funktionen in der App" → Probleme). Die Seite
// vergleicht je Eintrag die 7 Tage VOR `seit` mit der Zeit danach (Stundenreihe
// problemHours vom Analytics-Proxy, immer 90 Tage) — so faellt auf, wenn ein Fehler
// nach dem Fix zurueckkommt. Wer einen Fehler aus der Liste behebt, traegt ihn hier ein.
//
// namen: Ereignisnamen wie der Proxy sie liefert ('problem_x::aktion|grund|datei').
//   Ein '*' am Ende passt auf alles mit diesem Anfang. Fuer Skriptfehler IMMER so:
//   die Zeilennummer im Namen ist die der Live-Datei und verschiebt sich mit jeder
//   Aenderung — ein exakter Name findet denselben Fehler danach nicht wieder.
// seit: Zeitpunkt des Fixes (ISO mit Zone). Live ist er erst nach Push + Build;
//   Meldungen aus der Zeit dazwischen zaehlen als "seitdem".
window.MWL_BEHOBEN = [
    {
        namen: ['problem_js_fehler::p2p-sync.js*'],
        titel: ['Geräte-Sync stürzt in älteren Browsern ab', 'Device sync crashes in older browsers'],
        seit: '2026-10-17T15:30:46+02:00'
    }
];
