// ═══ ENGAGEMENT-SCORE ═══
//
// EINE Formel, zwei Seiten: /analytics/ zeigt sie als KPI-Kachel, /about/ im
// Abschnitt "Vertrauen in Zahlen". Bis v6.4.9 rechnete nur die Analytics-Seite,
// und /about/ trug eine handgeschriebene Zahl (86 %) ohne jede Quelle im Markup.
// Zwei Rechner auf dieselbe fachliche Groesse driften garantiert auseinander —
// deshalb steht sie hier und nirgends sonst.
//
// 🔴 WAS DIESE ZAHL IST UND WAS NICHT.
// Gemessen wird VERHALTEN: wie viele Sitzungen nach einer Seite enden und wie
// viele Seiten eine Sitzung im Schnitt oeffnet. Beides kommt aus der
// Web-Analyse, beides ist zaehlbar. Was NICHT gemessen wird, ist Zufriedenheit
// — dafuer muesste jemand gefragt worden sein, und das ist nie passiert. Die
// Kachel heisst deshalb "Engagement" und nicht "Zufriedenheit". Wer sie
// umbenennt, behauptet eine Befragung, die es nicht gibt.
//
// Die beiden Deckel stehen hier als benannte Konstanten, damit sie nicht als
// magische Zahl in einer Formelzeile verschwinden:
//   PAGES_CAP  5 Seiten je Sitzung = volle Punktzahl fuer die Seitentiefe.
//   Gewichtung 50/50 zwischen Absprungrate und Seitentiefe.
// Beides ist gesetzt, nicht gemessen — deshalb gibt `parts()` die ROHWERTE mit
// zurueck, damit die Oberflaeche sie danebenschreiben kann statt nur die Note.
//
// Test: node tools/engagement.test.mjs

(function (root) {
    'use strict';

    var PAGES_CAP = 5;
    var W_BOUNCE = 0.5;
    var W_PAGES = 0.5;

    // sum: das `summary`-Objekt des Analytics-Proxy
    // { pageviews, sessions, bounceRate (0–1), visitors, avgSessionDuration (s) }
    function parts(sum) {
        sum = sum || {};
        var sessions = Number(sum.sessions) || 0;
        var pageviews = Number(sum.pageviews) || 0;
        var bounce = Number(sum.bounceRate) || 0;

        // Ohne Sitzungen gibt es keine Seitentiefe — 0/0 waere NaN und daraus
        // wuerde weiter unten stillschweigend eine 0-Note.
        var pps = sessions > 0 ? pageviews / sessions : 0;

        var bouncePart = 1 - bounce;                       // 0–1
        var pagesPart = Math.min(pps / PAGES_CAP, 1);      // 0–1
        var score = Math.min(100, Math.round((bouncePart * W_BOUNCE + pagesPart * W_PAGES) * 100));

        return {
            score: score,
            hasData: sessions > 0,
            bounceRate: bounce,
            bouncePart: bouncePart,
            bounceScore: Math.round(bouncePart * 100),
            pagesPerSession: pps,
            pagesPart: pagesPart,
            pagesScore: Math.round(pagesPart * 100),
            sessions: sessions,
            pageviews: pageviews,
            visitors: Number(sum.visitors) || 0,
            avgSessionDuration: Number(sum.avgSessionDuration) || 0
        };
    }

    function score(sum) { return parts(sum).score; }

    // Sekunden → "7m 25s" / "48s". Die Analytics-Seite hat dafuer ihr eigenes
    // fmtDuration; hier steht es mit, damit /about/ nicht die ganze
    // insights.js (2200 Zeilen) laden muss, nur um eine Dauer zu formatieren.
    function duration(sec) {
        sec = Math.max(0, Math.round(Number(sec) || 0));
        if (sec < 60) return sec + 's';
        var m = Math.floor(sec / 60), s = sec % 60;
        if (m < 60) return m + 'm ' + s + 's';
        return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
    }

    root.mwlEngagement = {
        parts: parts,
        score: score,
        duration: duration,
        PAGES_CAP: PAGES_CAP,
        W_BOUNCE: W_BOUNCE,
        W_PAGES: W_PAGES
    };
})(typeof window !== 'undefined' ? window : globalThis);
