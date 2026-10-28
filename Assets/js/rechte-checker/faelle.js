// ═══ RECHTE-CHECKER FAELLE MODULE ═══
// Die Faelle des Rechte-Checkers (Deutsch = Quelle). Gelesen von
// pages/rechte-checker/index.html UND von tools/rechte-seiten.mjs, das daraus
// je Fall eine eigene Seite /rechte-checker/<id>/ baut. Englisch steht in
// faelle.en.js, Schluessel ist die id — eine id umbenennen bricht die
// oeffentliche Adresse der Fallseite.
// In verdictDetail ist **fett** erlaubt (wird zu <strong>), sonst reiner Text.

// Rechtsstand: das Datum, an dem alle Faelle zuletzt gegen Gesetz und
// Rechtsprechung geprueft wurden. Steht auf jeder Fallseite und in der Sitemap.
// Jaehrlich zu pruefen sind mindestens: Mindestausbildungsverguetung (BIBB,
// jeweils im Oktober fuers Folgejahr), Entfernungspauschale, Kindergeld/BAB.
window.RC_STAND = '2026-10-19';
window.RC_FAELLE = [
    // ──────── ARBEITSZEIT ────────
    {
        id: 'ueberstunden',
        cat: 'arbeitszeit',
        title: '"Du machst heute Überstunden!"',
        desc: 'Der Chef verlangt, dass du länger bleibst als im Ausbildungsvertrag steht.',
        law: '§ 8 JArbSchG / § 3 ArbZG',
        severity: 3,
        verdict: 'jein',
        verdictShort: 'Nur in engen Grenzen — und nie umsonst!',
        verdictDetail: 'Für **minderjährige** Azubis ist die Grenze hart: höchstens 8 Stunden am Tag und 40 Stunden in der Woche (§ 8 JArbSchG). Überstunden darüber hinaus sind praktisch ausgeschlossen. Für **volljährige** Azubis gilt das Arbeitszeitgesetz: 8 Stunden am Tag, bis zu 10 Stunden nur, wenn es im Schnitt von 6 Monaten wieder auf 8 Stunden ausgeglichen wird (§ 3 ArbZG). Ob du überhaupt länger bleiben musst, hängt von deinem Ausbildungsvertrag und einem Tarifvertrag ab. In jedem Fall gilt: Jede Minute über der vereinbarten Ausbildungszeit muss **besonders vergütet oder durch Freizeit ausgeglichen** werden (§ 17 Abs. 7 BBiG).',
        laws: [
            { title: '§ 8 JArbSchG – Dauer der Arbeitszeit', text: 'Jugendliche dürfen nicht mehr als 8 Stunden täglich und nicht mehr als 40 Stunden wöchentlich beschäftigt werden.' },
            { title: '§ 3 ArbZG – Arbeitszeit der Arbeitnehmer', text: 'Die werktägliche Arbeitszeit der Arbeitnehmer darf 8 Stunden nicht überschreiten. Sie kann auf bis zu 10 Stunden nur verlängert werden, wenn innerhalb von 6 Monaten ein Ausgleich erfolgt.' },
            { title: '§ 17 Abs. 7 BBiG – Mehrarbeit', text: 'Eine über die vereinbarte regelmäßige tägliche Ausbildungszeit hinausgehende Beschäftigung ist besonders zu vergüten oder durch entsprechende Freizeit auszugleichen.' }
        ],
        tips: [
            'Notiere jede Überstunde schriftlich mit Datum, Uhrzeit und Grund.',
            'Weise deinen Ausbilder höflich auf die gesetzliche Regelung hin.',
            'Falls Überstunden regelmäßig verlangt werden: Kontaktiere die IHK/HWK oder deine Gewerkschaft.',
            'Überstunden müssen entweder bezahlt oder durch Freizeit ausgeglichen werden – niemals „für umsonst".'
        ],
        email: {
            subject: 'Rückfrage zur Arbeitszeit / Überstunden',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich möchte mich bezüglich der kürzlich angefallenen Überstunden an Sie wenden.

Gemäß meinem Ausbildungsvertrag beträgt meine reguläre Arbeitszeit [X Stunden/Woche]. In der vergangenen Woche habe ich jedoch insgesamt [Y Stunden] gearbeitet, was über die vereinbarte Zeit hinausgeht.

Nach § 17 Abs. 7 BBiG ist eine über die vereinbarte Ausbildungszeit hinausgehende Beschäftigung besonders zu vergüten oder durch entsprechende Freizeit auszugleichen. [Für minderjährige Auszubildende gilt zudem § 8 JArbSchG, der eine maximale Arbeitszeit von 8 Stunden täglich bzw. 40 Stunden wöchentlich vorsieht.]

Ich bitte Sie daher um Klärung, wie die angefallenen Überstunden ausgeglichen werden. Ich stehe für ein persönliches Gespräch gerne zur Verfügung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'wochenende',
        cat: 'arbeitszeit',
        title: '"Samstag kommst du auch rein!"',
        desc: 'Du sollst am Wochenende arbeiten, obwohl das nicht im Vertrag steht.',
        law: '§ 16 JArbSchG / § 9 ArbZG',
        severity: 3,
        verdict: 'jein',
        verdictShort: 'Kommt drauf an – Branche entscheidend!',
        verdictDetail: 'Für Minderjährige gilt: Samstags und sonntags ist grundsätzlich frei (§ 16–17 JArbSchG). Ausnahmen gelten nur in bestimmten Branchen (Gastronomie, Krankenhaus, Landwirtschaft etc.). Für Volljährige gilt das Arbeitszeitgesetz – Sonntags- und Feiertagsarbeit ist grundsätzlich verboten (§ 9 ArbZG), mit branchenspezifischen Ausnahmen.',
        laws: [
            { title: '§ 16 JArbSchG – Samstagsruhe', text: 'An Samstagen dürfen Jugendliche nicht beschäftigt werden. Zulässig ist die Beschäftigung Jugendlicher an Samstagen nur in bestimmten Branchen (z.B. Krankenanstalten, Gaststätten, Verkaufsstellen, Bäckereien etc.).' },
            { title: '§ 17 JArbSchG – Sonntagsruhe', text: 'An Sonntagen dürfen Jugendliche nicht beschäftigt werden. Ausnahmen gelten für die gleichen Branchen wie bei der Samstagsruhe.' },
            { title: '§ 9 ArbZG – Sonn- und Feiertagsruhe', text: 'Arbeitnehmer dürfen an Sonn- und gesetzlichen Feiertagen von 0 bis 24 Uhr nicht beschäftigt werden. Ausnahmen sind gesetzlich geregelt.' }
        ],
        tips: [
            'Prüfe deinen Ausbildungsvertrag: Ist Wochenendarbeit dort erwähnt?',
            'Check, ob deine Branche zu den gesetzlichen Ausnahmen gehört.',
            'Minderjährige haben Anspruch auf mindestens 2 freie Samstage pro Monat.',
            'Bei Samstagsarbeit muss ein anderer Werktag derselben Woche frei sein.'
        ],
        email: {
            subject: 'Rückfrage zur Wochenendarbeit',
            body: `Sehr geehrte/r [Name des Ausbilders],

bezüglich der geplanten Arbeit am Samstag, [Datum], möchte ich mich erkundigen.

In meinem Ausbildungsvertrag ist eine Arbeitszeit von Montag bis Freitag vereinbart. [Falls minderjährig: Gemäß § 16 JArbSchG dürfen Jugendliche an Samstagen grundsätzlich nicht beschäftigt werden, sofern der Betrieb nicht zu den gesetzlich definierten Ausnahmebranchen gehört.]

Ich möchte sicherstellen, dass die geplante Wochenendarbeit im Einklang mit den gesetzlichen Regelungen steht und der entsprechende Freizeitausgleich gewährt wird.

Könnten wir das in einem kurzen Gespräch klären?

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'pause',
        cat: 'arbeitszeit',
        title: '"Pause? Mach einfach durch!"',
        desc: 'Du bekommst keine richtige Pause oder sollst am Arbeitsplatz essen.',
        law: '§ 11 JArbSchG / § 4 ArbZG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Nein! Du hast Recht auf Pausen!',
        verdictDetail: 'Pausen sind gesetzlich vorgeschrieben und nicht verhandelbar. Minderjährige: Bei 4,5–6h Arbeit mind. 30 Min., bei über 6h mind. 60 Min. Pause. Volljährige: Bei 6–9h mind. 30 Min., bei über 9h mind. 45 Min. Pausen müssen im Voraus feststehen und dürfen nicht an den Anfang oder das Ende der Arbeitszeit gelegt werden.',
        laws: [
            { title: '§ 11 JArbSchG – Ruhepausen', text: 'Jugendlichen müssen im Voraus feststehende Ruhepausen von angemessener Dauer gewährt werden. Die Ruhepausen müssen mindestens betragen: 30 Minuten bei einer Arbeitszeit von mehr als 4,5 Stunden, 60 Minuten bei einer Arbeitszeit von mehr als 6 Stunden.' },
            { title: '§ 4 ArbZG – Ruhepausen', text: 'Die Arbeit ist durch im Voraus feststehende Ruhepausen von mindestens 30 Minuten bei einer Arbeitszeit von mehr als 6 bis zu 9 Stunden und 45 Minuten bei einer Arbeitszeit von mehr als 9 Stunden insgesamt zu unterbrechen.' }
        ],
        tips: [
            'Du darfst deinen Arbeitsplatz in der Pause verlassen.',
            'Pausen zählen nicht als Arbeitszeit – sie werden nicht bezahlt, aber du bist auch zu nichts verpflichtet.',
            'Dokumentiere es, wenn Pausen regelmäßig gestrichen werden.',
            'Sprich zuerst den Ausbilder an, dann ggf. den Betriebsrat.'
        ],
        email: {
            subject: 'Anliegen bezüglich der Pausenzeiten',
            body: `Sehr geehrte/r [Name des Ausbilders],

in letzter Zeit kam es wiederholt vor, dass ich meine gesetzlich vorgeschriebene Pause nicht oder nur eingeschränkt wahrnehmen konnte.

Gemäß § 11 JArbSchG (für Minderjährige) bzw. § 4 ArbZG (für Volljährige) stehen mir bei meiner täglichen Arbeitszeit Ruhepausen von mindestens [30/60] Minuten zu. Diese müssen im Voraus feststehen und tatsächlich gewährt werden.

Ich bitte darum, dass die Pausenregelung künftig eingehalten wird, und schlage vor, feste Pausenzeiten zu vereinbaren.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'nachtarbeit',
        cat: 'arbeitszeit',
        title: '"Du übernimmst die Spätschicht!"',
        desc: 'Du sollst abends oder nachts arbeiten – ist das als Azubi überhaupt erlaubt?',
        law: '§ 14 JArbSchG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein! Nachtarbeit für Minderjährige verboten!',
        verdictDetail: 'Minderjährige Azubis dürfen nur zwischen 6:00 und 20:00 Uhr beschäftigt werden (§ 14 JArbSchG). Ausnahmen gelten für wenige Branchen (Bäckereien ab 5:00, Gaststätten bis 22:00, Schichtbetrieb bis 23:00). Volljährige Azubis unterliegen dem ArbZG – hier ist Nachtarbeit möglich, aber mit besonderen Schutzvorschriften.',
        laws: [
            { title: '§ 14 JArbSchG – Nachtruhe', text: 'Jugendliche dürfen nur in der Zeit von 6 bis 20 Uhr beschäftigt werden. Abweichend davon dürfen Jugendliche über 16 Jahre im Gaststättengewerbe bis 22 Uhr, in mehrschichtigen Betrieben bis 23 Uhr und in der Landwirtschaft ab 5 Uhr oder bis 21 Uhr beschäftigt werden.' },
            { title: '§ 6 ArbZG – Nacht- und Schichtarbeit', text: 'Die werktägliche Arbeitszeit der Nachtarbeitnehmer darf 8 Stunden nicht überschreiten. Nachtarbeitnehmer sind berechtigt, sich regelmäßig arbeitsmedizinisch untersuchen zu lassen.' }
        ],
        tips: [
            'Prüfe, ob du minderjährig oder volljährig bist – die Regeln unterscheiden sich stark.',
            'Bäckerei-Azubis ab 16 dürfen ab 5 Uhr arbeiten, Gastro-Azubis ab 16 bis 22 Uhr.',
            'Bei regelmäßiger Nachtschicht: Du hast Anspruch auf arbeitsmedizinische Untersuchung.',
            'Nachtarbeit muss im Ausbildungsvertrag oder Tarifvertrag geregelt sein.'
        ],
        email: {
            subject: 'Rückfrage zur geplanten Spätschicht/Nachtarbeit',
            body: `Sehr geehrte/r [Name des Ausbilders],

mir wurde mitgeteilt, dass ich am [Datum] die Spätschicht/Nachtschicht übernehmen soll.

[Falls minderjährig: ] Gemäß § 14 JArbSchG dürfen Jugendliche grundsätzlich nur zwischen 6:00 und 20:00 Uhr beschäftigt werden. Da ich unter 18 Jahre alt bin, bitte ich um Prüfung, ob diese Einteilung mit den gesetzlichen Vorgaben vereinbar ist.

[Falls volljährig: ] Ich möchte sicherstellen, dass die Nachtarbeit im Rahmen der Regelungen des § 6 ArbZG stattfindet und die vorgeschriebene Ruhezeit eingehalten wird.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ──────── TÄTIGKEITEN ────────
    {
        id: 'putzen',
        cat: 'taetigkeit',
        title: '"Feg mal die Halle!"',
        desc: 'Du sollst putzen, aufräumen oder Tätigkeiten machen, die nichts mit deiner Ausbildung zu tun haben.',
        law: '§ 14 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Nur in Maßen – nicht als Daueraufgabe!',
        verdictDetail: 'Azubis dürfen nur mit Aufgaben betraut werden, die dem Ausbildungszweck dienen (§ 14 BBiG). Gelegentliches Aufräumen des eigenen Arbeitsplatzes ist okay. Regelmäßiges Putzen der gesamten Firma, das nichts mit der Ausbildung zu tun hat, ist eine unzulässige ausbildungsfremde Tätigkeit. Der Ausbilder ist verpflichtet, die Ausbildung nach dem Ausbildungsrahmenplan durchzuführen.',
        laws: [
            { title: '§ 14 Abs. 1 Nr. 1 BBiG – Pflichten des Ausbildenden', text: 'Ausbildende haben dafür zu sorgen, dass den Auszubildenden die berufliche Handlungsfähigkeit vermittelt wird, die zum Erreichen des Ausbildungsziels erforderlich ist. Die Ausbildung muss einem sachlich und zeitlich gegliederten Ausbildungsplan folgen.' },
            { title: '§ 14 Abs. 2 BBiG – Ausbildungsfremde Aufgaben', text: 'Dem Auszubildenden dürfen nur Aufgaben übertragen werden, die dem Ausbildungszweck dienen und seinen körperlichen Kräften angemessen sind.' }
        ],
        tips: [
            'Den eigenen Arbeitsplatz sauber halten: völlig normal und erlaubt.',
            'Regelmäßig die Halle fegen, Klos putzen, Kaffee kochen: ausbildungsfremd und nicht okay.',
            'Vergleiche die Aufgaben mit deinem Ausbildungsrahmenplan – steht Putzen drin?',
            'Dokumentiere wiederholte ausbildungsfremde Tätigkeiten mit Datum und Dauer.'
        ],
        email: {
            subject: 'Ausbildungsinhalte gemäß Ausbildungsrahmenplan',
            body: `Sehr geehrte/r [Name des Ausbilders],

in letzter Zeit wurde ich wiederholt mit Tätigkeiten beauftragt, die meiner Einschätzung nach nicht im Ausbildungsrahmenplan meines Ausbildungsberufs vorgesehen sind (z.B. [konkrete Tätigkeit beschreiben]).

Gemäß § 14 BBiG haben Ausbildende dafür zu sorgen, dass den Auszubildenden die berufliche Handlungsfähigkeit vermittelt wird. Aufgaben, die dem Ausbildungszweck nicht dienen, sollten nur in Ausnahmefällen übertragen werden.

Ich möchte meine Ausbildungszeit bestmöglich nutzen und bitte darum, dass die Aufgabenverteilung stärker am Ausbildungsrahmenplan ausgerichtet wird. Gerne können wir dazu ein Gespräch führen.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'privatbesorgungen',
        cat: 'taetigkeit',
        title: '"Hol mir mal \'nen Kaffee!"',
        desc: 'Du sollst private Erledigungen für den Chef machen – Einkäufe, Kaffee holen, Auto waschen.',
        law: '§ 14 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein! Private Besorgungen sind tabu!',
        verdictDetail: 'Private Erledigungen für den Ausbilder haben absolut nichts mit der Ausbildung zu tun und sind klar ausbildungsfremde Tätigkeiten. Du bist kein persönlicher Assistent. Der Ausbildende ist verpflichtet, dir Kenntnisse und Fertigkeiten zu vermitteln, die zum Erreichen des Ausbildungsziels nötig sind – und dazu gehört definitiv nicht das Auto des Chefs zu waschen.',
        laws: [
            { title: '§ 14 BBiG – Pflichten des Ausbildenden', text: 'Dem Auszubildenden dürfen nur Aufgaben übertragen werden, die dem Ausbildungszweck dienen und seinen körperlichen Kräften angemessen sind.' }
        ],
        tips: [
            'Private Besorgungen für den Chef sind immer unzulässig – egal wie nett er fragt.',
            'Auch "nur mal schnell" Kaffee kochen gehört nicht zu deiner Ausbildung (außer du lernst Koch/Gastro).',
            'Lehne höflich ab und verweise auf den Ausbildungszweck.',
            'Wenn der Druck zu groß wird: Melde es der IHK/HWK als Ausbildungsmangel.'
        ],
        email: {
            subject: 'Bitte um Klärung der Aufgabenverteilung',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich wende mich an Sie, weil mir in letzter Zeit wiederholt Aufgaben übertragen wurden, die nicht mit meiner Ausbildung in Zusammenhang stehen (z.B. [private Besorgungen, Kaffee holen, etc.]).

Nach § 14 BBiG dürfen Auszubildenden nur Aufgaben übertragen werden, die dem Ausbildungszweck dienen. Private Erledigungen fallen nicht in diesen Bereich.

Ich möchte meine Ausbildungszeit sinnvoll nutzen und bitte darum, dass mir künftig ausschließlich ausbildungsrelevante Aufgaben zugewiesen werden.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'eintoenig',
        cat: 'taetigkeit',
        title: '"Mach einfach weiter dasselbe!"',
        desc: 'Du machst seit Wochen oder Monaten immer die gleiche Arbeit ohne Abwechslung.',
        law: '§ 14 BBiG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Nein! Ausbildung muss vielfältig sein!',
        verdictDetail: 'Der Ausbilder ist verpflichtet, die Ausbildung nach einem sachlich und zeitlich gegliederten Ausbildungsplan (basierend auf dem Ausbildungsrahmenplan) durchzuführen. Wenn du monatelang die gleiche Tätigkeit machst, wird der Ausbildungsplan nicht eingehalten. Du hast das Recht, alle im Rahmenplan vorgesehenen Bereiche kennenzulernen.',
        laws: [
            { title: '§ 14 Abs. 1 Nr. 1 BBiG – Ausbildungsziel', text: 'Ausbildende haben dafür zu sorgen, dass den Auszubildenden die berufliche Handlungsfähigkeit vermittelt wird, die zum Erreichen des Ausbildungsziels erforderlich ist.' },
            { title: '§ 5 BBiG – Ausbildungsordnung', text: 'Die Ausbildungsordnung hat festzulegen: die sachliche und zeitliche Gliederung der Berufsausbildung (Ausbildungsrahmenplan).' }
        ],
        tips: [
            'Vergleiche deine aktuellen Aufgaben mit dem Ausbildungsrahmenplan deines Berufs.',
            'Führe dein Berichtsheft gewissenhaft – eintönige Einträge fallen der IHK auf.',
            'Bitte um ein Gespräch mit dem Ausbilder und zeige den Rahmenplan.',
            'Falls sich nichts ändert: Kontaktiere die zuständige IHK/HWK. Sie können den Betrieb überprüfen.'
        ],
        email: {
            subject: 'Anregung zur Ausbildungsgestaltung',
            body: `Sehr geehrte/r [Name des Ausbilders],

mir ist aufgefallen, dass ich seit [Zeitraum] überwiegend mit [Tätigkeit beschreiben] betraut bin. Beim Abgleich mit dem Ausbildungsrahmenplan meines Berufs stelle ich fest, dass einige Ausbildungsinhalte bisher noch nicht abgedeckt wurden.

Gemäß § 14 BBiG ist die Ausbildung so durchzuführen, dass das Ausbildungsziel in der vorgesehenen Zeit erreicht werden kann. Ich möchte sicherstellen, dass ich alle vorgesehenen Bereiche kennenlernen kann.

Können wir gemeinsam den Ausbildungsplan durchgehen und die nächsten Stationen besprechen?

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ──────── URLAUB ────────
    {
        id: 'urlaub-gestrichen',
        cat: 'urlaub',
        title: '"Dein Urlaub ist gestrichen!"',
        desc: 'Der Chef zieht deinen bereits genehmigten Urlaub zurück.',
        law: '§ 19 JArbSchG / § 3 BUrlG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein! Genehmigter Urlaub ist bindend!',
        verdictDetail: 'Einmal genehmigter Urlaub kann nur in absoluten Ausnahmefällen widerrufen werden (z.B. Existenzbedrohung des Betriebs). Dein Mindestanspruch als minderjähriger Azubi: 25–30 Werktage/Jahr je nach Alter (§ 19 JArbSchG). Volljährige: mind. 24 Werktage (§ 3 BUrlG). Tarifverträge oder Arbeitsverträge können mehr vorsehen.',
        laws: [
            { title: '§ 19 JArbSchG – Urlaub', text: 'Der Arbeitgeber hat Jugendlichen für jedes Kalenderjahr einen bezahlten Erholungsurlaub zu gewähren: mind. 30 Werktage (unter 16 J.), 27 Werktage (unter 17 J.), 25 Werktage (unter 18 J.).' },
            { title: '§ 3 BUrlG – Dauer des Urlaubs', text: 'Der Urlaub beträgt jährlich mindestens 24 Werktage (bei einer 6-Tage-Woche) bzw. 20 Arbeitstage (bei einer 5-Tage-Woche).' },
            { title: '§ 7 Abs. 1 BUrlG – Zeitpunkt des Urlaubs', text: 'Bei der zeitlichen Festlegung des Urlaubs sind die Urlaubswünsche des Arbeitnehmers zu berücksichtigen, es sei denn, dringende betriebliche Belange stehen dem entgegen.' }
        ],
        tips: [
            'Lass dir die Urlaubsgenehmigung immer schriftlich geben.',
            'Ein einmal genehmigter Urlaub ist quasi ein Vertrag – der Chef kann ihn nicht einseitig streichen.',
            'Entstehen dir durch die Stornierung Kosten (Reise etc.), muss der Arbeitgeber diese erstatten.',
            'Berufsschulferien sollten für Urlaub genutzt werden können – sprich es rechtzeitig an.'
        ],
        email: {
            subject: 'Rücknahme des genehmigten Urlaubs',
            body: `Sehr geehrte/r [Name des Ausbilders],

mir wurde mitgeteilt, dass mein bereits genehmigter Urlaub vom [Datum bis Datum] zurückgenommen werden soll.

Ich möchte darauf hinweisen, dass ein einmal genehmigter Urlaub nur in absoluten Ausnahmefällen widerrufen werden kann. Gemäß § 7 BUrlG sind die Urlaubswünsche des Arbeitnehmers bei der Festlegung zu berücksichtigen.

Ich habe bereits [Reise gebucht / entsprechende Planungen getroffen]. Sollte eine Verschiebung unumgänglich sein, bitte ich um einen schriftlichen Nachweis der dringenden betrieblichen Gründe sowie die Übernahme etwaiger Stornierungskosten.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'urlaub-bestimmen',
        cat: 'urlaub',
        title: '"Du nimmst Urlaub, wann ICH sage!"',
        desc: 'Der Chef bestimmt den gesamten Urlaubszeitpunkt allein und ignoriert deine Wünsche.',
        law: '§ 7 BUrlG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Teilweise – deine Wünsche zählen!',
        verdictDetail: 'Der Arbeitgeber muss deine Urlaubswünsche berücksichtigen (§ 7 BUrlG), kann aber aus dringenden betrieblichen Gründen ablehnen. Betriebsurlaub (z.B. Weihnachten) ist zulässig, darf aber nicht den gesamten Urlaub aufbrauchen. Mindestens ein Teil muss frei verplanbar sein.',
        laws: [
            { title: '§ 7 BUrlG – Zeitpunkt, Übertragung', text: 'Bei der zeitlichen Festlegung des Urlaubs sind die Urlaubswünsche des Arbeitnehmers zu berücksichtigen, es sei denn, dass ihrer Berücksichtigung dringende betriebliche Belange oder Urlaubswünsche anderer Arbeitnehmer entgegenstehen.' }
        ],
        tips: [
            'Reiche deine Urlaubswünsche immer schriftlich ein (E-Mail = Nachweis).',
            'Betriebsurlaub ist okay, darf aber nicht deinen gesamten Anspruch aufbrauchen.',
            'Kompromissvorschlag machen, wenn es Konflikte gibt.',
            'Falls deine Wünsche ohne Begründung abgelehnt werden: Betriebsrat oder IHK einschalten.'
        ],
        email: {
            subject: 'Urlaubsplanung und Berücksichtigung von Urlaubswünschen',
            body: `Sehr geehrte/r [Name des Ausbilders],

bezüglich der Urlaubsplanung für [Zeitraum/Jahr] möchte ich meine Wünsche einbringen.

Gemäß § 7 BUrlG sind die Urlaubswünsche der Arbeitnehmer bei der Festlegung des Urlaubs zu berücksichtigen. Ich würde meinen Urlaub gerne im Zeitraum [Wunschzeitraum] nehmen.

Gerne bin ich bereit, mich mit den Kolleginnen und Kollegen abzustimmen, um eine für alle Seiten gute Lösung zu finden.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'pruefungsfreistellung',
        cat: 'pruefung',
        title: '"Für die Prüfung nimmst du Urlaub!"',
        desc: 'Der Chef sagt, du musst für die Prüfung und Prüfungsvorbereitung Urlaub nehmen.',
        law: '§ 15 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein! Freistellung ist Pflicht!',
        verdictDetail: 'Für Prüfungen musst du **keinen Urlaub** nehmen: Der Betrieb muss dich für die Teilnahme an Prüfungen bezahlt freistellen (§ 15 Abs. 1 BBiG, § 19 BBiG). Das gilt für Zwischen- und Abschlussprüfung. Zusätzlich hast du **am Arbeitstag unmittelbar vor der schriftlichen Abschlussprüfung** frei — für alle Azubis, egal wie alt. Den freien Tag davor gibt es nur vor der schriftlichen Abschlussprüfung, nicht vor jeder Prüfung.',
        laws: [
            { title: '§ 15 Abs. 1 BBiG – Freistellung', text: 'Ausbildende haben Auszubildende für die Teilnahme an Prüfungen und an Ausbildungsmaßnahmen außerhalb der Ausbildungsstätte freizustellen, ebenso an dem Arbeitstag, der der schriftlichen Abschlussprüfung unmittelbar vorangeht.' },
            { title: '§ 19 Abs. 1 Nr. 1 BBiG – Vergütung', text: 'Für die Zeit der Freistellung nach § 15 ist die Vergütung weiterzuzahlen.' }
        ],
        tips: [
            'Du musst keinen Urlaub für Prüfungen oder Berufsschule opfern – niemals!',
            'Der Tag vor der schriftlichen Abschlussprüfung = bezahlter freier Tag.',
            'Auch Zwischenprüfungen fallen unter die Freistellungspflicht.',
            'Halte die Prüfungstermine schriftlich fest und kommuniziere sie rechtzeitig.'
        ],
        email: {
            subject: 'Freistellung für Prüfung gemäß § 15 BBiG',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum] findet meine [Zwischen-/Abschluss-]Prüfung statt. Ich möchte darauf hinweisen, dass ich gemäß § 15 BBiG für die Teilnahme an Prüfungen vom Betrieb freizustellen bin.

Zusätzlich steht mir gemäß § 15 Abs. 2 BBiG am Tag vor der schriftlichen Abschlussprüfung ein freier Tag zu.

Es handelt sich dabei um eine bezahlte Freistellung, die nicht auf meinen Urlaubsanspruch angerechnet werden darf.

Ich bitte um Bestätigung der Freistellung für [Datum/Daten].

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ──────── BERUFSSCHULE ────────
    {
        id: 'nach-schule-betrieb',
        cat: 'schule',
        title: '"Nach der Schule kommst du noch rein!"',
        desc: 'Du sollst nach einem vollen Berufsschultag noch im Betrieb arbeiten.',
        law: '§ 15 Abs. 1 BBiG / § 9 JArbSchG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'An einem langen Schultag pro Woche: nein — egal wie alt du bist!',
        verdictDetail: 'Seit der BBiG-Reform 2020 gilt für **alle** Azubis: An einem Berufsschultag mit **mehr als fünf Unterrichtsstunden** (je mindestens 45 Minuten) darfst du danach nicht mehr im Betrieb eingesetzt werden — **einmal pro Woche** (§ 15 Abs. 1 BBiG). Dieser Tag zählt mit deiner durchschnittlichen täglichen Ausbildungszeit. Hast du einen zweiten langen Schultag in derselben Woche, darf der Betrieb dich danach einsetzen; die Unterrichtszeit samt Pausen und notwendigen Wegen zwischen Schule und Betrieb wird dann angerechnet. Vor einem Unterricht, der vor 9 Uhr beginnt, darf dich niemand beschäftigen.',
        laws: [
            { title: '§ 15 Abs. 1 BBiG – Freistellung', text: 'Auszubildende dürfen nicht beschäftigt werden vor einem vor 9 Uhr beginnenden Berufsschulunterricht und an einem Berufsschultag mit mehr als fünf Unterrichtsstunden von mindestens je 45 Minuten, einmal in der Woche.' },
            { title: '§ 15 Abs. 2 BBiG – Anrechnung', text: 'Die Berufsschulunterrichtszeit einschließlich der Pausen und der notwendigen Wegezeiten wird angerechnet; der lange Berufsschultag mit der durchschnittlichen täglichen Ausbildungszeit.' },
            { title: '§ 9 JArbSchG – Berufsschule', text: 'Für Jugendliche gilt zusätzlich das Jugendarbeitsschutzgesetz mit denselben Grundregeln.' }
        ],
        tips: [
            'Ein langer Schultag (mehr als 5 Stunden) pro Woche = danach frei, auch für Volljährige.',
            'Notiere Schulzeiten und Wege im Berichtsheft — dann ist die Anrechnung belegt.',
            'Bei Blockunterricht (mind. 25 Stunden an 5 Tagen) bist du die ganze Woche freigestellt.',
            'Vor Unterricht, der vor 9 Uhr beginnt, darf dich niemand in den Betrieb holen.'
        ],
        email: {
            subject: 'Freistellung nach dem Berufsschulunterricht',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum/Wochentag] habe ich Berufsschule von [Uhrzeit] bis [Uhrzeit], was [X] Unterrichtsstunden entspricht.

[Falls minderjährig: ] Gemäß § 9 Abs. 1 JArbSchG bin ich an Berufsschultagen mit mehr als 5 Unterrichtsstunden von der betrieblichen Ausbildung befreit.

Gemäß § 15 BBiG wird die Berufsschulzeit einschließlich Pausen und Schulweg auf die Arbeitszeit angerechnet. Ich bitte um Verständnis, dass ich an diesem Tag nicht mehr im Betrieb erscheinen kann.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'schule-nicht-angerechnet',
        cat: 'schule',
        title: '"Berufsschule ist Freizeit!"',
        desc: 'Dein Chef sagt, Berufsschulzeit zählt nicht als Arbeitszeit.',
        law: '§ 15 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Falsch! Berufsschule = Arbeitszeit!',
        verdictDetail: 'Seit der BBiG-Reform 2020 gilt für **alle** Azubis, minderjährig wie volljährig: Berufsschule ist Ausbildungszeit. Angerechnet werden die Unterrichtszeit **einschließlich der Pausen und der notwendigen Wegezeiten** zwischen Schule und Betrieb (§ 15 Abs. 2 BBiG). Ein Berufsschultag mit mehr als fünf Unterrichtsstunden zählt einmal pro Woche mit deiner durchschnittlichen täglichen Ausbildungszeit, eine Blockwoche mit mindestens 25 Stunden mit der durchschnittlichen wöchentlichen. Nicht dazu gehört der Weg von zu Hause zur Schule.',
        laws: [
            { title: '§ 15 BBiG – Anrechnung', text: 'Ausbildende haben Auszubildende für die Teilnahme am Berufsschulunterricht freizustellen. Die Berufsschulzeit wird auf die betriebliche Ausbildungszeit angerechnet.' }
        ],
        tips: [
            'Diese Regelung gilt seit 2020 für ALLE Azubis – minderjährig und volljährig.',
            'Angerechnet werden auch die Pausen und der Weg zwischen Schule und Betrieb.',
            'Wenn dein Betrieb das anders handhabt, informiere die IHK/HWK.',
            'Trage die Berufsschulzeiten korrekt in dein Berichtsheft ein.'
        ],
        email: {
            subject: 'Anrechnung der Berufsschulzeit auf die Arbeitszeit',
            body: `Sehr geehrte/r [Name des Ausbilders],

mir ist aufgefallen, dass die Berufsschulzeit in meiner Arbeitszeiterfassung nicht bzw. nicht vollständig berücksichtigt wird.

Gemäß § 15 BBiG (in der seit 2020 gültigen Fassung) ist die Berufsschulzeit einschließlich der Pausen auf die betriebliche Ausbildungszeit anzurechnen. Dies gilt für alle Auszubildenden unabhängig vom Alter.

Ich bitte darum, dass die Berufsschulzeiten an meinen Schultagen korrekt als Ausbildungszeit erfasst werden.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ──────── VERGÜTUNG ────────
    {
        id: 'verguetung-niedrig',
        cat: 'geld',
        title: '"Mehr Geld? Sei froh, dass du lernst!"',
        desc: 'Deine Ausbildungsvergütung ist verdächtig niedrig – gibts da ne Grenze?',
        law: '§ 17 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Es gibt eine Mindestausbildungsvergütung!',
        verdictDetail: 'Seit 2020 gibt es eine **Mindestausbildungsvergütung** (§ 17 Abs. 2 BBiG). Sie richtet sich nach dem Jahr, in dem deine Ausbildung **begonnen** hat: Bei Beginn 2026 sind es mindestens **724 €** im 1. Ausbildungsjahr, 854 € im 2., 977 € im 3. und 1.014 € im 4. Jahr. Bei Beginn 2025: 682 / 805 / 921 / 955 €. Bei Beginn 2027: 764 / 902 / 1.031 / 1.070 €. Ausnahme: Ist dein Betrieb an einen Tarifvertrag gebunden, gilt dessen Vergütung — auch wenn sie darunter liegt (§ 17 Abs. 3 BBiG). Ohne Tarifbindung darf die Vergütung den Branchentarif um höchstens 20 % unterschreiten. Gezahlt wird spätestens am letzten Arbeitstag des Monats (§ 18 Abs. 2 BBiG).',
        laws: [
            { title: '§ 17 BBiG – Vergütungsanspruch', text: 'Ausbildende haben Auszubildenden eine angemessene Vergütung zu gewähren. Sie muss mit fortschreitender Berufsausbildung, mindestens jährlich, ansteigen. Eine Mindestausbildungsvergütung ist gesetzlich festgelegt.' },
            { title: '§ 18 BBiG – Bemessung und Fälligkeit', text: 'Die Vergütung ist für den laufenden Kalendermonat zu berechnen und spätestens am letzten Arbeitstag des Monats zu zahlen.' }
        ],
        tips: [
            'Maßgeblich ist das Jahr deines Ausbildungsbeginns, nicht das aktuelle Kalenderjahr.',
            'Prüfe, ob ein Tarifvertrag für deinen Betrieb gilt — der geht vor.',
            'Ohne Tarifbindung: höchstens 20 % unter dem Branchentarif.',
            'Zahlung muss spätestens am letzten Arbeitstag des Monats auf deinem Konto sein.'
        ],
        email: {
            subject: 'Rückfrage zur Ausbildungsvergütung',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich habe mich über die aktuellen Regelungen zur Ausbildungsvergütung informiert und möchte eine Frage klären.

Gemäß § 17 BBiG steht Auszubildenden eine angemessene Vergütung zu, die mindestens der gesetzlichen Mindestausbildungsvergütung entspricht. Für das aktuelle Jahr und mein [X.] Lehrjahr liegt diese bei [Betrag nachschlagen].

Meine derzeitige Vergütung beträgt [dein Betrag]. Ich würde gerne verstehen, wie sich diese zusammensetzt [und ob ggf. ein Tarifvertrag zur Anwendung kommt].

Können wir dazu ein kurzes Gespräch führen?

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'arbeitsmaterial',
        cat: 'geld',
        title: '"Kauf dir das Werkzeug selber!"',
        desc: 'Du sollst Arbeitsmaterial, Bücher oder Werkzeug aus eigener Tasche bezahlen.',
        law: '§ 14 BBiG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Nein! Ausbildungsmittel sind Chefsache!',
        verdictDetail: 'Der Ausbildende ist verpflichtet, dir kostenlos die Ausbildungsmittel zur Verfügung zu stellen, die für die Ausbildung und die Ablegung der Prüfungen nötig sind (§ 14 Abs. 1 Nr. 3 BBiG). Das umfasst Werkzeuge, Materialien, Fachbücher und Arbeitskleidung, die der Betrieb vorschreibt.',
        laws: [
            { title: '§ 14 Abs. 1 Nr. 3 BBiG – Ausbildungsmittel', text: 'Ausbildende haben den Auszubildenden kostenlos die Ausbildungsmittel, insbesondere Werkzeuge, Werkstoffe und Fachliteratur zur Verfügung zu stellen, die zur Berufsausbildung und zum Ablegen von Zwischen- und Abschlussprüfungen erforderlich sind.' }
        ],
        tips: [
            'Werkzeuge, Fachbücher, Software, Arbeitskleidung: alles Pflicht des Ausbilders.',
            'Schulbücher für die Berufsschule sind oft Sache des Azubis (landesabhängig).',
            'Hebe alle Belege auf, falls du etwas vorgestreckt hast – Erstattung verlangen!',
            'Vorgeschriebene Sicherheitskleidung muss immer der Betrieb stellen.'
        ],
        email: {
            subject: 'Bereitstellung von Ausbildungsmitteln',
            body: `Sehr geehrte/r [Name des Ausbilders],

für meine Ausbildung benötige ich [konkretes Material/Werkzeug/Buch beschreiben]. Bisher wurde mir nahegelegt, diese Kosten selbst zu tragen.

Gemäß § 14 Abs. 1 Nr. 3 BBiG sind Ausbildende verpflichtet, Auszubildenden die Ausbildungsmittel kostenlos zur Verfügung zu stellen, die zur Berufsausbildung und zur Ablegung der Prüfungen erforderlich sind.

Ich bitte darum, die benötigten Materialien betriebsseitig bereitzustellen, [bzw. mir die bereits verauslagten Kosten in Höhe von [Betrag] zu erstatten].

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'krank-kein-geld',
        cat: 'gesundheit',
        title: '"Krank = kein Geld!"',
        desc: 'Du bist krank und der Chef sagt, du bekommst dann kein Gehalt.',
        law: '§ 3 EntgFG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Falsch! Entgeltfortzahlung ist Gesetz!',
        verdictDetail: 'Bei Krankheit hast du Anspruch auf Weiterzahlung deiner Vergütung für bis zu 6 Wochen (§ 19 BBiG in Verbindung mit dem Entgeltfortzahlungsgesetz). Voraussetzung: Du bist länger als 4 Wochen im Betrieb und meldest dich korrekt krank (Arbeitgeber informieren + AU-Bescheinigung).',
        laws: [
            { title: '§ 19 Abs. 1 Nr. 2 BBiG – Fortzahlung der Vergütung', text: 'Auszubildenden ist die Vergütung auch zu zahlen für die Zeit der Freistellung gemäß § 15 sowie bei Arbeitsunfähigkeit bis zur Dauer von 6 Wochen.' },
            { title: '§ 3 EntgFG – Entgeltfortzahlung im Krankheitsfall', text: 'Wird ein Arbeitnehmer durch Arbeitsunfähigkeit infolge Krankheit ohne sein Verschulden an seiner Arbeitsleistung verhindert, so hat er Anspruch auf Entgeltfortzahlung durch den Arbeitgeber für die Dauer von 6 Wochen.' }
        ],
        tips: [
            'Melde dich am ersten Krankheitstag VOR Arbeitsbeginn beim Betrieb.',
            'Ab dem 3. Krankheitstag (bzw. wie im Vertrag vereinbart) brauchst du eine AU vom Arzt.',
            'Die 6-Wochen-Regel gilt pro Krankheit, nicht pro Jahr.',
            'Falls der Betrieb nicht zahlt: Schriftlich auffordern und Frist setzen.'
        ],
        email: {
            subject: 'Entgeltfortzahlung bei Krankheit',
            body: `Sehr geehrte/r [Name des Ausbilders / Personalabteilung],

ich war vom [Datum] bis [Datum] arbeitsunfähig erkrankt und habe eine entsprechende Arbeitsunfähigkeitsbescheinigung vorgelegt. In meiner Vergütungsabrechnung für [Monat] fehlt jedoch die Fortzahlung für diesen Zeitraum.

Gemäß § 19 BBiG in Verbindung mit § 3 EntgFG habe ich bei Arbeitsunfähigkeit infolge Krankheit Anspruch auf Fortzahlung der Vergütung für die Dauer von bis zu 6 Wochen.

Ich bitte um Prüfung und Nachzahlung des ausstehenden Betrags.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'arzttermin',
        cat: 'gesundheit',
        title: '"Arzttermine machst du nach Feierabend."',
        desc: 'Du hast einen Arzttermin während der Arbeitszeit und sollst dafür Urlaub nehmen oder nacharbeiten.',
        law: '§ 19 Abs. 1 Nr. 2 BBiG / § 43 JArbSchG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Wenn es nicht anders geht, hast du bezahlt frei.',
        verdictDetail: 'Grundsätzlich sollst du Arzttermine **außerhalb der Arbeitszeit** legen, wenn das möglich ist. Geht es **nicht anders** — etwa bei akuten Beschwerden, einem Facharzt, der nur vormittags Termine vergibt, oder einer Untersuchung, die nüchtern morgens stattfinden muss —, bist du für den Termin samt Weg **bezahlt freizustellen** (§ 19 Abs. 1 Nr. 2 BBiG; bei Arbeitnehmern § 616 BGB). Nacharbeiten oder Urlaub nehmen musst du dafür nicht. **Minderjährige** müssen für die vorgeschriebenen Untersuchungen nach dem Jugendarbeitsschutzgesetz ohne Entgeltausfall freigestellt werden (§ 43 JArbSchG). Bist du arbeitsunfähig krank, gilt ohnehin die Krankmeldung.',
        laws: [
            { title: '§ 19 Abs. 1 Nr. 2 BBiG – Fortzahlung', text: 'Die Vergütung ist weiterzuzahlen, wenn Auszubildende aus einem in ihrer Person liegenden Grund unverschuldet an der Ausbildung verhindert sind.' },
            { title: '§ 43 JArbSchG – Freistellung', text: 'Der Arbeitgeber hat Jugendliche für die Durchführung der ärztlichen Untersuchungen nach diesem Gesetz freizustellen; ein Entgeltausfall darf nicht eintreten.' }
        ],
        tips: [
            'Versuche zuerst einen Termin außerhalb der Arbeitszeit — das stärkt deine Position.',
            'Lass dir in der Praxis eine Bescheinigung über Termin und Dauer geben.',
            'Sag rechtzeitig Bescheid und trag den Termin im Zeitnachweis ein.',
            'Gleitzeit? Dann kann der Betrieb verlangen, dass du den Termin in die freie Zeit legst.'
        ],
        email: {
            subject: 'Arzttermin am [Datum]',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum] habe ich von [Uhrzeit] bis voraussichtlich [Uhrzeit] einen Arzttermin. Ein Termin außerhalb meiner Ausbildungszeit war leider nicht möglich, weil [Grund].

Ich bitte um Freistellung für diese Zeit nach § 19 Abs. 1 Nr. 2 BBiG. Eine Bescheinigung der Praxis reiche ich nach.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'krankmeldung-ab-tag-eins',
        cat: 'gesundheit',
        title: '"Bei uns brauchst du ab dem ersten Tag eine Krankschreibung."',
        desc: 'Du bist einen Tag krank und sollst schon dafür eine AU vom Arzt holen.',
        law: '§ 5 Abs. 1 EntgFG',
        severity: 1,
        verdict: 'ja',
        verdictShort: 'Ja, das darf der Betrieb verlangen.',
        verdictDetail: 'Krank sein musst du dem Betrieb **unverzüglich melden**, also am ersten Tag möglichst vor Arbeitsbeginn — wie, regelt der Betrieb (meist telefonisch). Eine **ärztliche Bescheinigung** ist gesetzlich erst ab dem **vierten Kalendertag** nötig, der Arbeitgeber **darf** sie aber **früher verlangen**, auch ab dem ersten Tag (§ 5 Abs. 1 EntgFG). Seit 2023 gibt es die **elektronische AU (eAU)**: Der Arzt stellt die Arbeitsunfähigkeit fest, der Betrieb ruft sie bei deiner Krankenkasse ab. Dein Teil ist, rechtzeitig zum Arzt zu gehen und den Betrieb zu informieren. Gilt die Regel nur für dich, braucht es dafür keinen besonderen Grund, sie darf aber nicht schikanös sein.',
        laws: [
            { title: '§ 5 Abs. 1 EntgFG – Anzeige- und Nachweispflicht', text: 'Der Arbeitnehmer ist verpflichtet, die Arbeitsunfähigkeit und deren voraussichtliche Dauer unverzüglich mitzuteilen. Dauert sie länger als drei Kalendertage, ist eine ärztliche Feststellung vorzulegen; der Arbeitgeber ist berechtigt, sie früher zu verlangen.' }
        ],
        tips: [
            'Melde dich vor Arbeitsbeginn — auch wenn du erst zum Arzt gehst.',
            'Sag, wie lange du voraussichtlich fehlst; eine Diagnose musst du nicht nennen.',
            'An Berufsschultagen auch die Schule nach ihren Regeln informieren.',
            'Bewahre die Ausdrucke der eAU für deine Unterlagen auf.'
        ]
    },
    {
        id: 'diagnose-chef',
        cat: 'gesundheit',
        title: '"Was hast du denn? Ich will die Diagnose wissen."',
        desc: 'Dein Ausbilder fragt, welche Krankheit du hast, oder will die Diagnose sehen.',
        law: '§ 5 EntgFG / Art. 9 DSGVO',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Nein — die Diagnose geht den Betrieb nichts an.',
        verdictDetail: 'Du musst dem Betrieb nur mitteilen, **dass** du arbeitsunfähig bist und **wie lange** voraussichtlich (§ 5 EntgFG). Die **Diagnose musst du nicht nennen** — deshalb steht sie auch nicht auf der Ausfertigung für den Arbeitgeber und nicht in der eAU, die er abruft. Gesundheitsdaten sind besonders geschützt (Art. 9 DSGVO). **Ausnahmen** sind selten: etwa bei ansteckenden Krankheiten, die Kollegen gefährden, wenn eine Fortsetzungserkrankung für die Entgeltfortzahlung geklärt werden muss (das läuft über die Krankenkasse) oder wenn es um einen Arbeitsunfall geht. Freiwillig darfst du natürlich erzählen, was du möchtest.',
        laws: [
            { title: '§ 5 Abs. 1 EntgFG – Mitteilung', text: 'Mitzuteilen sind die Arbeitsunfähigkeit und deren voraussichtliche Dauer — nicht deren Ursache.' },
            { title: 'Art. 9 Abs. 1 DSGVO – Gesundheitsdaten', text: 'Die Verarbeitung von Gesundheitsdaten ist grundsätzlich untersagt, soweit keine Ausnahme greift.' }
        ],
        tips: [
            'Ein höfliches „Das möchte ich für mich behalten" reicht.',
            'Bei ansteckenden Krankheiten: Hinweis zum Schutz der Kollegen geben, ohne Details.',
            'Hat die Krankheit mit der Arbeit zu tun (Unfall, Belastung), sag das — dann gelten andere Regeln.',
            'Wiederholtes Nachbohren kannst du JAV oder Betriebsrat melden.'
        ]
    },
    {
        id: 'krank-arbeiten',
        cat: 'gesundheit',
        title: '"Du bist krank? Dann arbeite halt von zu Hause."',
        desc: 'Du bist krankgeschrieben und sollst trotzdem Mails beantworten oder Aufgaben erledigen.',
        law: '§ 3 EntgFG / § 19 BBiG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Nein — wer arbeitsunfähig ist, muss nicht arbeiten.',
        verdictDetail: 'Krankgeschrieben heißt **arbeitsunfähig**: Du musst **keine Arbeit leisten**, auch nicht von zu Hause, keine Mails beantworten und nicht erreichbar sein. Deine Vergütung läuft bis zu sechs Wochen weiter (§ 3 EntgFG). Der Betrieb darf dich nicht unter Druck setzen, trotzdem zu arbeiten, und dir keinen Nachteil machen, weil du dich auskurierst. Du sollst dich so verhalten, dass du schnell gesund wirst — Spazierengehen oder Einkaufen ist erlaubt, wenn es die Genesung nicht behindert. Kurze Auskünfte, die nur du geben kannst (z. B. wo ein Schlüssel liegt), sind ausnahmsweise zumutbar.',
        laws: [
            { title: '§ 3 Abs. 1 EntgFG – Entgeltfortzahlung', text: 'Wird ein Arbeitnehmer durch Arbeitsunfähigkeit infolge Krankheit an seiner Arbeitsleistung verhindert, ohne dass ihn ein Verschulden trifft, hat er Anspruch auf Entgeltfortzahlung bis zur Dauer von sechs Wochen.' }
        ],
        tips: [
            'Antworte freundlich, dass du krankgeschrieben bist, und nenne das Ende der AU.',
            'Schalte eine Abwesenheitsnotiz ein und das Diensthandy aus.',
            'Arbeitest du trotzdem, kann das die Genesung gefährden — und dein Versicherungsschutz ist unklar.',
            'Wiederholter Druck: JAV, Betriebsrat oder IHK/HWK einschalten.'
        ],
        email: {
            subject: 'Erreichbarkeit während meiner Arbeitsunfähigkeit',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich bin bis voraussichtlich [Datum] arbeitsunfähig krankgeschrieben und kann in dieser Zeit keine Aufgaben übernehmen, auch nicht von zu Hause.

Sobald ich wieder gesund bin, kümmere ich mich gern um [Aufgabe].

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'krank-berufsschule',
        cat: 'gesundheit',
        title: '"Krank für den Betrieb, aber in die Schule gehst du."',
        desc: 'Du bist krankgeschrieben, und der Betrieb meint, die Berufsschule gehe trotzdem.',
        law: '§ 3 EntgFG / Schulrecht der Länder',
        severity: 1,
        verdict: 'nein',
        verdictShort: 'Arbeitsunfähig gilt auch für die Berufsschule.',
        verdictDetail: 'Eine Arbeitsunfähigkeit bezieht sich auf deine **Ausbildung insgesamt** — dazu gehört der Berufsschulunterricht. Wer arbeitsunfähig krank ist, muss auch **nicht zur Schule**. Umgekehrt gilt: Wer gesund genug für die Schule ist, ist in der Regel auch nicht arbeitsunfähig. Für die **Schule** gelten zusätzlich deren Regeln: Du musst dich dort meist am ersten Tag abmelden und eine **Entschuldigung** vorlegen, oft unabhängig von der AU für den Betrieb. Fällt eine Prüfung in die Krankheitszeit, brauchst du für den Rücktritt in der Regel ein ärztliches Attest für die Kammer.',
        laws: [
            { title: '§ 3 EntgFG – Arbeitsunfähigkeit', text: 'Arbeitsunfähig ist, wer seine vertraglich geschuldete Tätigkeit wegen Krankheit nicht ausüben kann; für Azubis gehört dazu die Teilnahme am Berufsschulunterricht.' },
            { title: 'Schulgesetze der Länder', text: 'Berufsschülerinnen und Berufsschüler müssen Fehlzeiten nach den Regeln ihrer Schule entschuldigen.' }
        ],
        tips: [
            'Melde dich am Krankheitstag beim Betrieb UND bei der Schule.',
            'Frag in der Schule, welche Entschuldigung sie braucht (Formular, Kopie der AU).',
            'Krank am Prüfungstag: sofort die Kammer informieren und ein Attest besorgen.',
            'Den versäumten Stoff mit Mitschülern nachholen — das hilft beim Berichtsheft.'
        ]
    },
    {
        id: 'krankheit-urlaub-abziehen',
        cat: 'gesundheit',
        title: '"Deine Krankheitstage ziehen wir vom Urlaub ab."',
        desc: 'Der Betrieb will Fehltage wegen Krankheit mit deinem Urlaubskonto verrechnen.',
        law: '§ 9 BUrlG / § 3 EntgFG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein — Krankheit und Urlaub haben nichts miteinander zu tun.',
        verdictDetail: 'Krankheitstage sind **Arbeitsunfähigkeit**, kein Urlaub. Für sie gilt die Entgeltfortzahlung (§ 3 EntgFG), und dein Urlaubsanspruch bleibt **unberührt**. Eine Verrechnung mit dem Urlaub ist unzulässig. Das gilt sogar, wenn du **im Urlaub** krank wirst: Die durch ärztliches Zeugnis nachgewiesenen Krankheitstage werden **nicht** auf den Jahresurlaub angerechnet (§ 9 BUrlG). Auch eine Kürzung des Urlaubs wegen vieler Krankheitstage im Jahr ist nicht erlaubt — der gesetzliche Mindesturlaub entsteht auch bei langer Krankheit.',
        laws: [
            { title: '§ 9 BUrlG – Erkrankung während des Urlaubs', text: 'Erkrankt ein Arbeitnehmer während des Urlaubs, so werden die durch ärztliches Zeugnis nachgewiesenen Tage der Arbeitsunfähigkeit auf den Jahresurlaub nicht angerechnet.' },
            { title: '§ 3 EntgFG – Entgeltfortzahlung', text: 'Bei unverschuldeter Arbeitsunfähigkeit infolge Krankheit besteht Anspruch auf Entgeltfortzahlung bis zu sechs Wochen.' }
        ],
        tips: [
            'Prüfe dein Urlaubskonto nach jeder Krankheit.',
            'Fordere eine Korrektur schriftlich, mit den Tagen der AU.',
            'Im Urlaub krank? Sofort melden und AU besorgen — sonst zählen die Tage als Urlaub.',
            'Lass dir das Urlaubskonto regelmäßig bestätigen.'
        ],
        email: {
            subject: 'Korrektur meines Urlaubskontos',
            body: `Sehr geehrte/r [Name des Ausbilders],

die Tage meiner Arbeitsunfähigkeit vom [Datum] bis [Datum] wurden von meinem Urlaubskonto abgezogen. Krankheitstage sind kein Erholungsurlaub; eine Anrechnung auf den Urlaub ist nicht zulässig (vgl. § 9 BUrlG, § 3 EntgFG).

Ich bitte um Korrektur meines Urlaubskontos um [Anzahl] Tage.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ──────── KÜNDIGUNG ────────
    {
        id: 'kuendigung-drohung',
        cat: 'kuendigung',
        title: '"Noch einmal und du fliegst!"',
        desc: 'Der Chef droht dir mit Kündigung – welche Regeln gelten?',
        law: '§ 22 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Nur unter strengen Bedingungen möglich!',
        verdictDetail: 'Nach der Probezeit kann dein Ausbildungsverhältnis nur aus wichtigem Grund fristlos gekündigt werden (§ 22 BBiG). "Wichtiger Grund" bedeutet: schwere Pflichtverletzung (z.B. Diebstahl, wiederholtes unentschuldigtes Fehlen). Vorher muss in der Regel abgemahnt werden. Eine ordentliche Kündigung durch den Betrieb ist nach der Probezeit nicht möglich!',
        laws: [
            { title: '§ 22 Abs. 1 BBiG – Kündigung in der Probezeit', text: 'Während der Probezeit kann das Berufsausbildungsverhältnis jederzeit ohne Einhalten einer Kündigungsfrist und ohne Begründung gekündigt werden.' },
            { title: '§ 22 Abs. 2 BBiG – Kündigung nach der Probezeit', text: 'Nach der Probezeit kann das Berufsausbildungsverhältnis nur aus einem wichtigen Grund ohne Einhalten einer Kündigungsfrist gekündigt werden. Der Kündigungsgrund muss schriftlich angegeben werden.' },
            { title: '§ 22 Abs. 3 BBiG – Kündigung durch Azubi', text: 'Auszubildende können mit einer Frist von 4 Wochen kündigen, wenn sie die Berufsausbildung aufgeben oder sich für eine andere Berufstätigkeit ausbilden lassen wollen.' }
        ],
        tips: [
            'In der Probezeit (1–4 Monate) kann ohne Grund gekündigt werden – von beiden Seiten.',
            'Nach der Probezeit: Es braucht einen „wichtigen Grund" UND vorherige Abmahnung (bei Pflichtverletzungen).',
            'Die Kündigung muss zwingend schriftlich erfolgen + Grund angeben.',
            'Du kannst innerhalb von 3 Wochen beim Arbeitsgericht Klage einreichen.'
        ],
        email: {
            subject: 'Bitte um Klärungsgespräch',
            body: `Sehr geehrte/r [Name des Ausbilders],

mir wurde angedeutet, dass mein Ausbildungsverhältnis möglicherweise beendet werden soll. Ich nehme das sehr ernst und möchte die Situation klären.

Ich bin bemüht, meine Ausbildung erfolgreich abzuschließen, und würde gerne verstehen, was konkret von mir erwartet wird und wie ich mich verbessern kann.

Können wir zeitnah ein Gespräch führen, um die Situation offen zu besprechen?

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'abmahnung',
        cat: 'kuendigung',
        title: '"Du bekommst eine Abmahnung!"',
        desc: 'Du hast eine Abmahnung erhalten oder es wurde dir eine angedroht.',
        law: 'Arbeitsrecht / § 22 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Möglich, aber nur bei echtem Fehlverhalten!',
        verdictDetail: 'Eine Abmahnung muss ein konkretes Fehlverhalten benennen, die verletzte Pflicht aufzeigen und die Konsequenz bei Wiederholung androhen. Pauschale Abmahnungen ("du bist zu langsam") sind unwirksam. Du hast das Recht, eine Gegendarstellung zur Personalakte zu geben. Eine Abmahnung ist oft Voraussetzung für eine spätere Kündigung.',
        laws: [
            { title: 'Abmahnungsvoraussetzungen (Arbeitsrecht)', text: 'Eine wirksame Abmahnung muss: (1) das Fehlverhalten konkret beschreiben (Datum, Art, Umstände), (2) die verletzte Pflicht benennen, (3) zur künftigen vertragsgemäßen Leistung auffordern, (4) Konsequenzen bei erneuter Pflichtverletzung androhen.' }
        ],
        tips: [
            'Prüfe, ob die Abmahnung die drei Elemente enthält: Fehlverhalten, Pflicht, Konsequenz.',
            'Du darfst eine Gegendarstellung schreiben und zur Personalakte nehmen lassen.',
            'Unterschreibe bei Erhalt nur den EMPFANG, nicht das Einverständnis!',
            'Lass dich beraten: Gewerkschaft, IHK-Ausbildungsberater oder Fachanwalt.'
        ],
        email: {
            subject: 'Gegendarstellung zur Abmahnung vom [Datum]',
            body: `Sehr geehrte/r [Name des Ausbilders / Personalabteilung],

ich habe die Abmahnung vom [Datum] erhalten und möchte hiermit eine Gegendarstellung abgeben, die ich bitte, meiner Personalakte beizulegen.

[Hier den Sachverhalt aus deiner Sicht schildern – sachlich und konkret]

Ich weise die in der Abmahnung erhobenen Vorwürfe [vollständig / teilweise] zurück. [Begründung einfügen]

Ich bitte um Aufnahme dieser Gegendarstellung in meine Personalakte gemäß meinem arbeitsrechtlichen Anspruch.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'aufhebungsvertrag',
        cat: 'kuendigung',
        title: '"Unterschreib mal hier…"',
        desc: 'Dir wird ein Aufhebungsvertrag vorgelegt, um das Ausbildungsverhältnis zu beenden.',
        law: '§ 22 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'STOPP – niemals sofort unterschreiben!',
        verdictDetail: 'Ein Aufhebungsvertrag beendet dein Ausbildungsverhältnis einvernehmlich. ABER: Du bist nicht verpflichtet zu unterschreiben! Achtung: Ein Aufhebungsvertrag kann zu einer Sperrzeit beim Arbeitsamt führen (bis zu 12 Wochen kein ALG). Du verlierst deinen Kündigungsschutz. Lass dich IMMER vorher beraten!',
        laws: [
            { title: '§ 22 BBiG – Kündigung', text: 'Das Ausbildungsverhältnis kann nach der Probezeit nur aus wichtigem Grund gekündigt werden. Alternativ kann es durch einen Aufhebungsvertrag einvernehmlich beendet werden – hierzu ist aber die Zustimmung des Azubis erforderlich.' },
            { title: '§ 159 SGB III – Sperrzeit', text: 'Hat der Arbeitnehmer durch eigenes Verhalten die Arbeitslosigkeit herbeigeführt (z.B. Aufhebungsvertrag), kann eine Sperrzeit von bis zu 12 Wochen beim Arbeitslosengeld verhängt werden.' }
        ],
        tips: [
            'NIEMALS sofort unterschreiben – nimm dir Bedenkzeit (mind. 3 Tage).',
            'Lass den Vertrag von einem Experten prüfen (Gewerkschaft, IHK, Anwalt).',
            'Ein Aufhebungsvertrag kann eine Sperrzeit beim ALG auslösen!',
            'Frag dich: Will ICH das? Du musst nicht unterschreiben, wenn du bleiben willst.',
            'Falls du minderjährig bist: Deine Erziehungsberechtigten müssen zustimmen.'
        ],
        email: {
            subject: 'Bedenkzeit bezüglich des Aufhebungsvertrags',
            body: `Sehr geehrte/r [Name des Ausbilders],

vielen Dank für das Gespräch am [Datum]. Ich habe den vorgeschlagenen Aufhebungsvertrag zur Kenntnis genommen.

Bevor ich eine solche Entscheidung treffen kann, benötige ich ausreichend Bedenkzeit und möchte den Vertrag von einer unabhängigen Stelle prüfen lassen.

Ich bitte um Verständnis, dass ich den Vertrag nicht sofort unterschreiben werde. Ich melde mich bis spätestens [Datum + 1-2 Wochen] mit meiner Rückmeldung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ──────── MOBBING ────────
    {
        id: 'mobbing',
        cat: 'mobbing',
        title: '"Stell dich nicht so an!"',
        desc: 'Du wirst am Arbeitsplatz gemobbt, beleidigt oder systematisch ausgegrenzt.',
        law: 'ArbSchG / § 241 BGB',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein! Mobbing ist nie okay!',
        verdictDetail: 'Der Arbeitgeber hat eine Fürsorgepflicht und muss dich vor Mobbing schützen (§ 241 BGB). Mobbing kann arbeitsrechtliche, zivilrechtliche und sogar strafrechtliche Konsequenzen haben. Du bist nicht schuld und musst das nicht aushalten. Systematische Beleidigungen, Ausgrenzung und Schikane sind kein "normaler Umgangston".',
        laws: [
            { title: '§ 241 Abs. 2 BGB – Fürsorgepflicht', text: 'Das Schuldverhältnis (Arbeitsverhältnis) kann jeden Teil zur Rücksicht auf die Rechte und Interessen des anderen Teils verpflichten. Der Arbeitgeber ist verpflichtet, die Persönlichkeitsrechte des Arbeitnehmers zu schützen.' },
            { title: '§ 3 ArbSchG – Grundpflichten des Arbeitgebers', text: 'Der Arbeitgeber ist verpflichtet, die erforderlichen Maßnahmen des Arbeitsschutzes zu treffen, unter Berücksichtigung der Umstände, die die Sicherheit und Gesundheit der Beschäftigten beeinflussen.' },
            { title: '§ 12 AGG – Maßnahmen bei Belästigung', text: 'Der Arbeitgeber ist verpflichtet, die erforderlichen Maßnahmen zum Schutz vor Benachteiligungen zu treffen. Bei Verstößen hat er geeignete Maßnahmen zu ergreifen (Abmahnung, Versetzung, Kündigung des Täters).' }
        ],
        tips: [
            'Führe ein Mobbing-Tagebuch: Datum, Uhrzeit, was passiert ist, wer dabei war.',
            'Such dir Verbündete: Vertrauensperson, Betriebsrat, JAV (Jugend- und Auszubildendenvertretung).',
            'Melde dich bei der IHK/HWK – die haben Ausbildungsberater für genau solche Fälle.',
            'Du kannst dich auch direkt an eine Mobbing-Beratungsstelle wenden.',
            'Deine Gesundheit geht vor – im Notfall: Arzt aufsuchen und Situation schildern.'
        ],
        email: {
            subject: 'Meldung von Vorfällen am Arbeitsplatz',
            body: `Sehr geehrte/r [Name der Vertrauensperson / Personalabteilung / Betriebsrat],

ich wende mich an Sie, weil es an meinem Arbeitsplatz wiederholt zu Situationen kommt, die mich stark belasten.

Konkret handelt es sich um folgende Vorfälle:
- [Datum]: [Beschreibung]
- [Datum]: [Beschreibung]
- [Datum]: [Beschreibung]

Diese Vorfälle beeinträchtigen meine Ausbildung und mein Wohlbefinden erheblich. Gemäß § 241 BGB besteht eine Fürsorgepflicht des Arbeitgebers, die Persönlichkeitsrechte der Beschäftigten zu schützen.

Ich bitte um ein vertrauliches Gespräch und darum, dass geeignete Maßnahmen ergriffen werden.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'diskriminierung',
        cat: 'mobbing',
        title: '"Frauen können das nicht!"',
        desc: 'Du wirst wegen Geschlecht, Herkunft, Religion oder anderen Merkmalen diskriminiert.',
        law: 'AGG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Absolut verboten – AGG schützt dich!',
        verdictDetail: 'Das Allgemeine Gleichbehandlungsgesetz (AGG) schützt dich vor Diskriminierung wegen Rasse/Herkunft, Geschlecht, Religion, Behinderung, Alter oder sexueller Identität. Das gilt für den gesamten Arbeitsalltag. Der Arbeitgeber muss aktiv dagegen vorgehen. Bei Verstößen hast du Beschwerderecht und ggf. Schadensersatzansprüche.',
        laws: [
            { title: '§ 1 AGG – Ziel des Gesetzes', text: 'Ziel des Gesetzes ist, Benachteiligungen aus Gründen der Rasse oder wegen der ethnischen Herkunft, des Geschlechts, der Religion oder Weltanschauung, einer Behinderung, des Alters oder der sexuellen Identität zu verhindern oder zu beseitigen.' },
            { title: '§ 13 AGG – Beschwerderecht', text: 'Die Beschäftigten haben das Recht, sich bei den zuständigen Stellen des Betriebs zu beschweren, wenn sie sich im Zusammenhang mit ihrem Beschäftigungsverhältnis benachteiligt fühlen.' },
            { title: '§ 15 AGG – Entschädigung und Schadensersatz', text: 'Bei einem Verstoß gegen das Benachteiligungsverbot ist der Arbeitgeber verpflichtet, den hierdurch entstandenen Schaden zu ersetzen. Wegen eines Schadens, der nicht Vermögensschaden ist, kann eine angemessene Entschädigung in Geld verlangt werden.' }
        ],
        tips: [
            'Diskriminierende Äußerungen sofort dokumentieren (Zeugen, Datum, Wortlaut).',
            'Nutze dein Beschwerderecht nach § 13 AGG – jeder Betrieb muss eine Beschwerdestelle haben.',
            'Schadensersatzansprüche müssen innerhalb von 2 Monaten geltend gemacht werden!',
            'Die Antidiskriminierungsstelle des Bundes berät kostenlos: antidiskriminierungsstelle.de'
        ],
        email: {
            subject: 'Beschwerde gemäß § 13 AGG',
            body: `Sehr geehrte/r [Beschwerdestelle / Betriebsrat / Personalabteilung],

hiermit mache ich von meinem Beschwerderecht nach § 13 AGG Gebrauch.

Am [Datum] kam es zu folgendem Vorfall:
[Sachverhalt beschreiben]

Ich sehe darin eine Benachteiligung wegen [Merkmal: Geschlecht / Herkunft / Religion / etc.] im Sinne des § 1 AGG.

Ich bitte um Prüfung des Sachverhalts und Ergreifung geeigneter Maßnahmen gemäß § 12 AGG. Ich erwarte eine Rückmeldung innerhalb von [2 Wochen].

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'zeugnis',
        cat: 'kuendigung',
        title: '"Ein Zeugnis? Brauchst du doch nicht!"',
        desc: 'Dein Chef weigert sich, dir ein Ausbildungszeugnis auszustellen.',
        law: '§ 16 BBiG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Doch! Du hast einen Anspruch darauf!',
        verdictDetail: 'Bei Beendigung des Ausbildungsverhältnisses hat der Ausbildende dir ein Zeugnis auszustellen (§ 16 BBiG). Das ist Pflicht und nicht optional! Das Zeugnis muss Angaben über Art, Dauer und Ziel der Ausbildung sowie die erworbenen Fertigkeiten enthalten. Auf dein Verlangen auch über Führung und Leistung (qualifiziertes Zeugnis).',
        laws: [
            { title: '§ 16 BBiG – Zeugnis', text: 'Ausbildende haben den Auszubildenden bei Beendigung des Berufsausbildungsverhältnisses ein schriftliches Zeugnis auszustellen. Es muss Angaben enthalten über Art, Dauer und Ziel der Berufsausbildung sowie über die erworbenen beruflichen Fertigkeiten, Kenntnisse und Fähigkeiten. Auf Verlangen sind auch Angaben über Verhalten und Leistung aufzunehmen.' }
        ],
        tips: [
            'Du hast Anspruch auf ein einfaches Zeugnis (Pflicht) oder qualifiziertes Zeugnis (auf Verlangen).',
            'Das Zeugnis muss wohlwollend formuliert sein und darf dir nicht schaden.',
            'Fordere es schriftlich und mit Fristsetzung an, wenn es nicht kommt.',
            'Kennst du die "Zeugnis-Geheimsprache"? Lass dein Zeugnis von Profis checken.'
        ],
        email: {
            subject: 'Bitte um Ausstellung eines Ausbildungszeugnisses',
            body: `Sehr geehrte/r [Name des Ausbilders],

mein Ausbildungsverhältnis endet am [Datum] / ist am [Datum] beendet worden. Ich bitte Sie, mir gemäß § 16 BBiG ein qualifiziertes Ausbildungszeugnis auszustellen, das neben Art, Dauer und Ziel der Ausbildung auch Angaben über mein Verhalten und meine Leistung enthält.

Ich bitte um Zusendung bis spätestens [Datum + 2-3 Wochen].

Vielen Dank im Voraus.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ════════════════════════════════════════════════════════════
    //  ARBEITSZEIT — weitere Szenarien
    // ════════════════════════════════════════════════════════════
    {
        id: 'ruhezeit-zwischen-schichten',
        cat: 'arbeitszeit',
        title: '"Morgen früh wieder um 6, du warst gestern bis 22 Uhr da."',
        desc: 'Zwischen Feierabend und nächstem Arbeitsbeginn liegen weniger als 11 Stunden.',
        law: '§ 13 JArbSchG / § 5 ArbZG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein, ungestörte Ruhezeit ist Pflicht!',
        verdictDetail: 'Zwischen zwei Arbeitstagen muss eine ununterbrochene Ruhezeit von mindestens 12 Stunden (Jugendliche, § 13 JArbSchG) bzw. 11 Stunden (Volljährige, § 5 ArbZG) liegen. Das gilt auch, wenn am Vortag Überstunden anfielen. Verstöße sind eine Ordnungswidrigkeit (§ 22 ArbZG) — dem Betrieb droht ein Bußgeld.',
        laws: [
            { title: '§ 13 JArbSchG – Schichtzeit', text: 'Jugendlichen ist nach Beendigung der täglichen Arbeitszeit eine ununterbrochene Freizeit von mindestens 12 Stunden zu gewähren.' },
            { title: '§ 5 ArbZG – Ruhezeit', text: 'Die Arbeitnehmer müssen nach Beendigung der täglichen Arbeitszeit eine ununterbrochene Ruhezeit von mindestens elf Stunden haben.' }
        ],
        tips: [
            'Rechne nach: Ende gestern + 11 (oder 12) Stunden = frühester Beginn heute.',
            'Bei wiederholten Verstößen: Aufsichtsbehörde (Gewerbeaufsicht) informieren — die kontrolliert das.',
            'Notiere Anfang und Ende jeder Schicht — eigene Aufzeichnungen reichen vor Gericht.',
            'In wenigen Branchen (Krankenhaus, Gaststätten, Landwirtschaft) sind Reduzierungen auf 10 h möglich — nur mit Ausgleich.'
        ],
        email: {
            subject: 'Einhaltung der Mindest-Ruhezeit zwischen den Schichten',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum] endete meine Arbeitszeit um [Uhrzeit], am Folgetag soll ich bereits um [Uhrzeit] erscheinen. Damit liegt zwischen den Schichten weniger als die gesetzlich vorgeschriebene Mindest-Ruhezeit von [11/12] Stunden (§ 5 ArbZG bzw. § 13 JArbSchG).

Ich bitte um Anpassung des Dienstplans, sodass die gesetzliche Ruhezeit eingehalten wird.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'arbeitszeitkonto-manipulation',
        cat: 'arbeitszeit',
        title: '"Die zwei Stunden ziehen wir dir wieder ab."',
        desc: 'Geleistete Stunden werden nachträglich aus dem Arbeitszeitkonto gestrichen oder die Stechuhr-Daten "korrigiert".',
        law: '§ 16 ArbZG / § 17 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein, das ist klar rechtswidrig!',
        verdictDetail: 'Der Arbeitgeber muss die gesamte tatsächlich geleistete Arbeitszeit aufzeichnen — das stellte der EuGH 2019 (C-55/18) klar, das BAG bestätigte 2022 (1 ABR 22/21). Nachträgliches Streichen, Frisieren oder Manipulieren der Aufzeichnung ist rechtswidrig und kann den Tatbestand des Vorenthaltens von Arbeitsentgelt erfüllen (§ 266a StGB bei Sozialabgaben).',
        laws: [
            { title: '§ 16 ArbZG – Aushang, Arbeitszeitnachweise', text: 'Der Arbeitgeber ist verpflichtet, die über die werktägliche Arbeitszeit von acht Stunden hinausgehende Arbeitszeit der Arbeitnehmer aufzuzeichnen. Die Aufzeichnungen sind mindestens zwei Jahre aufzubewahren.' },
            { title: 'BAG 13.09.2022 – 1 ABR 22/21', text: 'Arbeitgeber sind gesetzlich verpflichtet, die Arbeitszeit ihrer Arbeitnehmer vollständig zu erfassen.' },
            { title: '§ 17 BBiG – Vergütungsanspruch', text: 'Über die vereinbarte Ausbildungszeit hinausgehende Beschäftigung ist besonders zu vergüten oder durch Freizeit auszugleichen.' }
        ],
        tips: [
            'Führe IMMER ein eigenes Stundenkonto (Foto vom Stechschein, eigene App, Notizbuch).',
            'Fordere bei der nächsten Lohnabrechnung eine schriftliche Übersicht aller geleisteten Stunden.',
            'Beweissicherung: Geo-Tag, Email-Zeitstempel, Kollegen als Zeugen.',
            'Bei Vorenthalten von Sozialabgaben → das ist eine Straftat (§ 266a StGB), Anzeige möglich.'
        ],
        email: {
            subject: 'Korrektur des Arbeitszeitkontos',
            body: `Sehr geehrte/r [Name des Ausbilders],

bei der Durchsicht meines Arbeitszeitkontos / der Lohnabrechnung ist mir aufgefallen, dass am [Datum] [X Stunden] nicht erfasst bzw. nachträglich abgezogen wurden. Nach meiner eigenen Dokumentation habe ich an diesem Tag von [Uhrzeit] bis [Uhrzeit] gearbeitet.

Nach § 16 ArbZG ist der Arbeitgeber zur vollständigen Erfassung verpflichtet, nach § 17 Abs. 7 BBiG müssen Mehrarbeitsstunden vergütet oder ausgeglichen werden.

Ich bitte um Korrektur und Übermittlung einer schriftlichen Übersicht meines Arbeitszeitkontos.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'bereitschaftsdienst',
        cat: 'arbeitszeit',
        title: '"Du musst nur erreichbar sein — das zählt nicht."',
        desc: 'Rufbereitschaft, Bereitschaftsdienst oder ständige Erreichbarkeit wird nicht als Arbeitszeit gewertet.',
        law: '§ 2 ArbZG / EuGH C-518/15',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Kommt darauf an: Bereitschaftsdienst = Arbeitszeit, Rufbereitschaft nur teilweise.',
        verdictDetail: '**Bereitschaftsdienst** (Anwesenheit am Arbeitsplatz, sofort einsatzbereit): zählt vollständig als Arbeitszeit (EuGH C-303/98, BAG). **Rufbereitschaft** (zu Hause, mit Reaktionszeit): zählt grundsätzlich NICHT als Arbeitszeit — aber nur, wenn du deine Freizeit weitgehend frei gestalten kannst. Wenn du innerhalb von 5 Min. da sein musst, kann auch Rufbereitschaft zu Arbeitszeit werden (EuGH C-518/15 Matzak). Für Jugendliche zählt Bereitschaft voll in die Grenze von 8 Stunden am Tag, und das Nachtarbeitsverbot gilt auch dafür.',
        laws: [
            { title: '§ 2 Abs. 1 ArbZG – Begriffsbestimmungen', text: 'Arbeitszeit im Sinne dieses Gesetzes ist die Zeit vom Beginn bis zum Ende der Arbeit ohne die Ruhepausen.' },
            { title: 'EuGH C-518/15 (Matzak)', text: 'Bereitschaftszeit, während der ein Arbeitnehmer physisch an einem vom Arbeitgeber bestimmten Ort anwesend sein muss und seinen Verpflichtungen sehr eingeschränkt nachkommen kann, ist als Arbeitszeit anzusehen.' }
        ],
        tips: [
            'Bereitschaftsdienst im Betrieb → Arbeitszeit, voll zu vergüten (mindestens Mindestlohn).',
            'Rufbereitschaft mit kurzer Reaktionszeit (< 30 Min.) → meist Arbeitszeit nach EuGH.',
            'Echte Einsätze während Rufbereitschaft sind IMMER vergütungspflichtig.',
            'Als Azubi unter 18: Bereitschaft ist grundsätzlich unzulässig (§ 22 JArbSchG analog).'
        ],
        email: {
            subject: 'Bewertung der Bereitschaft als Arbeitszeit',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich übernehme seit [Datum] [Bereitschaft/Rufbereitschaft], die bisher nicht als Arbeitszeit gewertet wird.

Nach § 2 ArbZG sowie der EuGH-Rechtsprechung (C-303/98 und C-518/15) zählt Bereitschaftsdienst vollständig zur Arbeitszeit. Bei Rufbereitschaft mit kurzer Reaktionszeit ist die ganze Zeit als Arbeitszeit anzusehen.

Ich bitte um Klärung der Vergütung und Anrechnung auf meine Arbeitszeit-Konten.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'fahrtzeit-aussenstelle',
        cat: 'arbeitszeit',
        title: '"Die Fahrt zur Baustelle ist deine Sache."',
        desc: 'Der Betrieb schickt dich an wechselnde Einsatzorte und rechnet die Fahrtzeit nicht als Arbeitszeit.',
        law: 'BAG 17.10.2018 – 5 AZR 553/17',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Zur ersten Tätigkeitsstätte = Privatsache. Wechselnde Einsatzorte = Arbeitszeit!',
        verdictDetail: 'Der Weg von zu Hause zur **ersten regelmäßigen Tätigkeitsstätte** (z.B. Betrieb) ist Privatsache. Aber: Wenn dich der Arbeitgeber direkt an wechselnde Einsatzorte (Kunde, Baustelle, Außenstelle) schickt, ist die Fahrtzeit **Arbeitszeit und vergütungspflichtig** (BAG 17.10.2018). Auch wenn du Werkzeug/Material transportierst oder Fahrgemeinschaften vom AG angeordnet sind, gilt die Fahrt als Arbeitszeit.',
        laws: [
            { title: 'BAG 17.10.2018 – 5 AZR 553/17', text: 'Fahrten zu auswärtigen Tätigkeitsstätten gehören zur vertraglich geschuldeten Arbeitsleistung, soweit es sich nicht um die erste regelmäßige Tätigkeitsstätte handelt.' },
            { title: '§ 2 ArbZG – Begriffsbestimmungen', text: 'Arbeitszeit ist die Zeit vom Beginn bis zum Ende der Arbeit ohne die Ruhepausen.' }
        ],
        tips: [
            'Direkter Weg zum Kunden/Baustelle ab Wohnung = Arbeitszeit (BAG).',
            'Werkzeug abholen im Betrieb → Arbeitstag beginnt dort, nicht beim Kunden.',
            'Notiere Abfahrt und Ankunft pro Einsatzort.',
            'Im Ausbildungsvertrag kann eine pauschale Regelung stehen — die darf aber nicht unter den BAG-Maßstab fallen.'
        ],
        email: {
            subject: 'Vergütung der Fahrtzeit zu Außenstellen',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum/Zeitraum] war ich zu Einsätzen bei [Kunde / Baustelle / Außenstelle] eingeteilt. Die Fahrtzeit von [insgesamt X Stunden] wurde nicht als Arbeitszeit erfasst.

Nach der BAG-Rechtsprechung (17.10.2018 – 5 AZR 553/17) sind Fahrten zu wechselnden Tätigkeitsstätten als Arbeitszeit zu werten und vergütungspflichtig.

Ich bitte um nachträgliche Anrechnung der Fahrtzeit auf mein Arbeitszeitkonto.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'sechs-tage-woche',
        cat: 'arbeitszeit',
        title: '"Diese Woche arbeitest du sechs Tage."',
        desc: 'Montag bis Samstag im Betrieb, weil gerade viel los ist.',
        law: '§ 15 JArbSchG / § 3 ArbZG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Unter 18: höchstens fünf Tage. Ab 18: nur mit Ausgleich.',
        verdictDetail: '**Minderjährige** dürfen nur an **fünf Tagen pro Woche** beschäftigt werden, die zwei freien Tage sollen möglichst aufeinander folgen (§ 15 JArbSchG). Wer samstags arbeiten muss (nur in bestimmten Branchen erlaubt), bekommt dafür einen anderen Tag in der Woche frei (§ 16 Abs. 3 JArbSchG). Für **Volljährige** sind Werktage nach dem Arbeitszeitgesetz Montag bis Samstag; erlaubt sind bis zu 48 Stunden in der Woche (6 × 8 Stunden). Steht im Ausbildungsvertrag eine Fünf-Tage-Woche, ist jeder sechste Tag aber Mehrarbeit und muss vergütet oder durch Freizeit ausgeglichen werden (§ 17 Abs. 7 BBiG).',
        laws: [
            { title: '§ 15 JArbSchG – Fünf-Tage-Woche', text: 'Jugendliche dürfen nur an fünf Tagen in der Woche beschäftigt werden. Die beiden wöchentlichen Ruhetage sollen nach Möglichkeit aufeinander folgen.' },
            { title: '§ 3 ArbZG – Arbeitszeit', text: 'Die werktägliche Arbeitszeit darf acht Stunden nicht überschreiten; Werktage sind Montag bis Samstag.' },
            { title: '§ 17 Abs. 7 BBiG – Mehrarbeit', text: 'Beschäftigung über die vereinbarte regelmäßige Ausbildungszeit hinaus ist besonders zu vergüten oder durch Freizeit auszugleichen.' }
        ],
        tips: [
            'Schau in deinen Ausbildungsvertrag: Dort steht, wie viele Tage pro Woche vereinbart sind.',
            'Unter 18: Ein sechster Arbeitstag ist nicht erlaubt — sag das freundlich, aber klar.',
            'Ab 18: Lass dir schriftlich bestätigen, wann du den Zusatztag ausgleichen kannst.',
            'Trag jeden Zusatztag mit Stunden in deinen Arbeitszeitnachweis ein.'
        ],
        email: {
            subject: 'Arbeitstag am Samstag, [Datum]',
            body: `Sehr geehrte/r [Name des Ausbilders],

für die kommende Woche ist für mich ein zusätzlicher Arbeitstag am Samstag, [Datum], eingeplant. Laut meinem Ausbildungsvertrag arbeite ich an [fünf] Tagen pro Woche.

[Da ich noch nicht volljährig bin, darf ich nach § 15 JArbSchG nur an fünf Tagen pro Woche beschäftigt werden.] / [Ich bin bereit, den Tag zu übernehmen, und bitte um eine kurze Bestätigung, an welchem Tag ich ihn ausgleichen kann (§ 17 Abs. 7 BBiG).]

Vielen Dank für eine kurze Rückmeldung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'feiertagsarbeit',
        cat: 'arbeitszeit',
        title: '"Am Feiertag machen wir auf — du bist dabei."',
        desc: 'Der Betrieb öffnet an einem gesetzlichen Feiertag und du sollst arbeiten.',
        law: '§§ 9–11 ArbZG / § 18 JArbSchG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Grundsätzlich frei — nur bestimmte Branchen dürfen, und dann gibt es Ersatz.',
        verdictDetail: 'An gesetzlichen Feiertagen ist Arbeit **grundsätzlich verboten** (§ 9 ArbZG). Ausnahmen gibt es nur für bestimmte Tätigkeiten, etwa in Gastronomie, Krankenhäusern, Verkehr oder bei Notdiensten (§ 10 ArbZG). Wer an einem Feiertag arbeitet, der auf einen Werktag fällt, bekommt innerhalb von acht Wochen einen **Ersatzruhetag** (§ 11 ArbZG). **Minderjährige** sind besonders geschützt: Am 25. Dezember, 1. Januar, Ostersonntag und 1. Mai dürfen sie nie arbeiten, am 24. und 31. Dezember nicht nach 14 Uhr; an anderen Feiertagen nur in den erlaubten Branchen und mit einem freien Ersatztag in derselben oder der nächsten Woche (§ 18 JArbSchG).',
        laws: [
            { title: '§ 9 ArbZG – Sonn- und Feiertagsruhe', text: 'Arbeitnehmer dürfen an Sonn- und gesetzlichen Feiertagen von 0 bis 24 Uhr nicht beschäftigt werden.' },
            { title: '§ 11 ArbZG – Ausgleich', text: 'Werden Arbeitnehmer an einem auf einen Werktag fallenden Feiertag beschäftigt, müssen sie einen Ersatzruhetag haben, der innerhalb von acht Wochen zu gewähren ist.' },
            { title: '§ 18 JArbSchG – Feiertagsruhe', text: 'Am 24. und 31. Dezember nach 14 Uhr und an gesetzlichen Feiertagen dürfen Jugendliche nicht beschäftigt werden; am 25. Dezember, 1. Januar, ersten Osterfeiertag und 1. Mai ausnahmslos nicht.' }
        ],
        tips: [
            'Frag nach, unter welche Ausnahme dein Betrieb fällt — nicht jeder Laden darf öffnen.',
            'Lass dir den Ersatzruhetag gleich mit Datum bestätigen.',
            'Prüfe Tarif- oder Ausbildungsvertrag auf Feiertagszuschläge.',
            'Unter 18: 25.12., 1.1., Ostersonntag und 1.5. sind immer frei — ohne Ausnahme.'
        ],
        email: {
            subject: 'Einsatz am Feiertag [Datum]',
            body: `Sehr geehrte/r [Name des Ausbilders],

laut Dienstplan bin ich am [Feiertag, Datum] eingeteilt. Gesetzliche Feiertage sind nach § 9 ArbZG grundsätzlich arbeitsfrei; für eine Beschäftigung steht mir nach § 11 ArbZG ein Ersatzruhetag zu. [Als minderjähriger Auszubildender gilt für mich zusätzlich § 18 JArbSchG.]

Ich bitte um kurze Mitteilung, auf welche Ausnahme sich der Einsatz stützt und an welchem Tag ich den Ersatzruhetag erhalte.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'vor-der-berufsschule',
        cat: 'arbeitszeit',
        title: '"Komm vor der Schule noch kurz in den Betrieb."',
        desc: 'Der Unterricht beginnt um 8 Uhr, vorher sollst du noch etwas im Betrieb erledigen.',
        law: '§ 15 Abs. 1 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein — vor Unterricht, der vor 9 Uhr beginnt, darf dich niemand beschäftigen.',
        verdictDetail: 'Seit 2020 steht es für **alle** Azubis im Berufsbildungsgesetz: Beginnt der Berufsschulunterricht **vor 9 Uhr**, darf der Betrieb dich vorher **gar nicht** beschäftigen — auch nicht „nur kurz" (§ 15 Abs. 1 BBiG). Vorher galt das nur für Minderjährige. Beginnt der Unterricht um 9 Uhr oder später, ist ein Einsatz vorher grundsätzlich möglich, aber die Zeit muss realistisch sein: Der Weg zur Schule gehört dann zur Anrechnung (§ 15 Abs. 2 BBiG), und zu spät kommen darfst du deswegen nicht.',
        laws: [
            { title: '§ 15 Abs. 1 BBiG – Freistellung', text: 'Ausbildende dürfen Auszubildende vor einem vor 9 Uhr beginnenden Berufsschulunterricht nicht beschäftigen.' },
            { title: '§ 15 Abs. 2 BBiG – Anrechnung', text: 'Auf die Ausbildungszeit werden die Berufsschulunterrichtszeit einschließlich der Pausen und notwendigen Wegezeiten angerechnet.' },
            { title: '§ 13 Nr. 2 BBiG – Teilnahmepflicht', text: 'Auszubildende sind verpflichtet, an Ausbildungsmaßnahmen teilzunehmen, für die sie freigestellt werden — also auch pünktlich am Unterricht.' }
        ],
        tips: [
            'Schau auf deinen Stundenplan: Beginn vor 9 Uhr = vorher kein Betrieb.',
            'Die Regel gilt auch, wenn du volljährig bist.',
            'Komm nicht zu spät in die Schule, nur weil der Betrieb dich aufhält — das fällt auf dich zurück.',
            'Häuft sich das, sprich die IHK/HWK-Ausbildungsberatung an.'
        ],
        email: {
            subject: 'Einsatz vor Berufsschulbeginn',
            body: `Sehr geehrte/r [Name des Ausbilders],

an meinen Berufsschultagen ([Wochentag]) beginnt der Unterricht um [Uhrzeit]. Nach § 15 Abs. 1 BBiG dürfen Auszubildende vor einem vor 9 Uhr beginnenden Berufsschulunterricht nicht beschäftigt werden.

Ich bitte darum, mich an diesen Tagen vor dem Unterricht nicht mehr einzuplanen. Gern übernehme ich die Aufgabe zu einer anderen Zeit.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'umkleidezeit',
        cat: 'arbeitszeit',
        title: '"Umziehen ist deine Privatsache — vorher und nachher."',
        desc: 'Du musst Arbeitskleidung im Betrieb anziehen, die Zeit dafür zählt aber nicht.',
        law: '§ 611a BGB / BAG-Rechtsprechung',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Musst du die Kleidung im Betrieb anziehen, ist Umziehen Arbeitszeit.',
        verdictDetail: 'Das Bundesarbeitsgericht unterscheidet: Schreibt der Betrieb eine **bestimmte Kleidung** vor und musst du sie **im Betrieb anlegen** (Hygiene, Schutzkleidung, auffällige Dienstkleidung, die man nicht zu Hause anziehen kann oder soll), dann gehört das Umziehen samt dem Weg zur Umkleide **zur Arbeitszeit** und ist zu vergüten. Darfst du die Kleidung zu Hause anziehen und unauffällig auf dem Weg tragen, ist Umziehen Privatsache. Tarifverträge können eigene Regeln haben. Für Azubis zählt die so entstehende Zeit zur Ausbildungszeit — und damit auch zu den Höchstgrenzen.',
        laws: [
            { title: '§ 611a BGB – Arbeitsvertrag', text: 'Vergütet wird die vom Arbeitgeber verlangte Tätigkeit; dazu gehört auch das fremdnützige Umkleiden, wenn die Kleidung im Betrieb anzulegen ist.' },
            { title: 'BAG 19.09.2012 – 5 AZR 678/11', text: 'Umkleidezeiten und innerbetriebliche Wege dazu sind vergütungspflichtige Arbeitszeit, wenn das Umkleiden im Betrieb erfolgen muss.' }
        ],
        tips: [
            'Frag nach, ob du die Kleidung zu Hause anziehen darf — davon hängt alles ab.',
            'Notiere, wie lange Umziehen und Weg zur Umkleide wirklich dauern.',
            'Schutz- und Hygienekleidung muss der Betrieb stellen (siehe „Schutzkleidung").',
            'Prüfe den Tarifvertrag — dort steht oft eine pauschale Umkleidezeit.'
        ],
        email: {
            subject: 'Anrechnung der Umkleidezeiten',
            body: `Sehr geehrte/r [Name des Ausbilders],

die vorgeschriebene Arbeitskleidung muss ich im Betrieb anlegen. Dafür benötige ich vor und nach der Arbeit jeweils etwa [X Minuten] einschließlich des Wegs zur Umkleide.

Nach der Rechtsprechung des Bundesarbeitsgerichts (BAG 19.09.2012 – 5 AZR 678/11) gehören solche Umkleidezeiten zur Arbeitszeit. Ich bitte darum, sie künftig in meiner Ausbildungszeit zu berücksichtigen.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'homeoffice-azubi',
        cat: 'arbeitszeit',
        title: '"Mach heute Homeoffice, aber frag nicht ständig."',
        desc: 'Du sollst von zu Hause arbeiten — ohne Aufgaben, ohne Ansprechpartner.',
        law: '§ 14 BBiG / § 28 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Mobiles Ausbilden ist erlaubt — Alleinlassen nicht.',
        verdictDetail: 'Einen **Anspruch auf Homeoffice** hast du nicht, und der Betrieb darf dich auch nicht einfach nach Hause schicken, wenn dein Vertrag es nicht vorsieht. **Mobiles Ausbilden** ist aber zulässig, wenn es dem Ausbildungsziel dient und du dort tatsächlich ausgebildet wirst: mit Aufgaben aus dem Ausbildungsplan, einem erreichbaren Ausbilder und Feedback (§ 14 Abs. 1 BBiG). Die nötige Hard- und Software muss der Betrieb **kostenlos** stellen (§ 14 Abs. 1 Nr. 3 BBiG). Arbeitszeitgesetz, Pausen und Höchstgrenzen gelten zu Hause genauso.',
        laws: [
            { title: '§ 14 Abs. 1 Nr. 1 BBiG – Ausbildungspflicht', text: 'Ausbildende haben dafür zu sorgen, dass die berufliche Handlungsfähigkeit planmäßig und zeitlich und sachlich gegliedert vermittelt wird.' },
            { title: '§ 14 Abs. 1 Nr. 3 BBiG – Ausbildungsmittel', text: 'Ausbildungsmittel sind kostenlos zu stellen; beim digitalen mobilen Ausbilden auch die erforderliche Hard- und Software.' }
        ],
        tips: [
            'Bitte um feste Aufgaben und eine feste Zeit, in der dein Ausbilder erreichbar ist.',
            'Laptop, Software und Zugang stellt der Betrieb — du musst nichts privat kaufen.',
            'Halte im Berichtsheft fest, was du im Homeoffice gelernt hast.',
            'Pausen und Feierabend gelten auch am Küchentisch.'
        ],
        email: {
            subject: 'Betreuung im Homeoffice',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich bin an [Tagen] im Homeoffice eingeplant. Damit die Zeit für meine Ausbildung nutzbar ist, bitte ich um konkrete Aufgaben aus dem Ausbildungsplan und eine feste Zeit, in der ich Fragen stellen kann.

Außerdem benötige ich [Gerät / Zugang], um die Aufgaben zu erledigen (§ 14 Abs. 1 Nr. 3 BBiG).

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'keine-zeiterfassung',
        cat: 'arbeitszeit',
        title: '"Zeiten schreiben wir hier nicht auf."',
        desc: 'Im Betrieb gibt es keine Zeiterfassung, Überstunden „verschwinden".',
        law: '§ 3 Abs. 2 ArbSchG / BAG 13.09.2022 – 1 ABR 22/21',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Der Betrieb muss eure Arbeitszeit erfassen.',
        verdictDetail: 'Seit dem Beschluss des Bundesarbeitsgerichts vom 13.09.2022 ist klar: Arbeitgeber in Deutschland sind **verpflichtet, Beginn und Ende der Arbeitszeit** ihrer Beschäftigten zu erfassen (abgeleitet aus § 3 Abs. 2 Nr. 1 ArbSchG, nach dem EuGH-Urteil von 2019). Wie genau — Stempeluhr, App oder Tabelle —, darf der Betrieb entscheiden, aber „gar nicht" ist keine Option. Für Azubis ist das doppelt wichtig: Überstunden müssen vergütet oder ausgeglichen werden (§ 17 Abs. 7 BBiG), und das geht nur mit Nachweis. **Unabhängig davon darfst du deine Zeiten immer selbst aufschreiben** — eigene, zeitnahe Notizen sind im Streitfall ein wichtiges Beweismittel.',
        laws: [
            { title: 'BAG 13.09.2022 – 1 ABR 22/21', text: 'Arbeitgeber sind nach § 3 Abs. 2 Nr. 1 ArbSchG verpflichtet, ein System einzuführen, mit dem Beginn und Ende der täglichen Arbeitszeit erfasst werden.' },
            { title: '§ 16 Abs. 2 ArbZG – Aufzeichnung', text: 'Arbeitszeit über acht Stunden werktäglich ist aufzuzeichnen und mindestens zwei Jahre aufzubewahren.' },
            { title: '§ 17 Abs. 7 BBiG – Mehrarbeit', text: 'Beschäftigung über die vereinbarte Ausbildungszeit hinaus ist zu vergüten oder durch Freizeit auszugleichen.' }
        ],
        tips: [
            'Schreib Beginn, Ende und Pausen jeden Tag selbst auf — am besten sofort.',
            'Eine Zeiterfassungs-App mit Datum ist besser als Notizen auf Zetteln.',
            'Gibt es einen Betriebsrat, frag dort nach dem Stand der Zeiterfassung.',
            'Deine Aufzeichnungen helfen auch beim Berichtsheft.'
        ],
        email: {
            subject: 'Erfassung meiner Arbeitszeiten',
            body: `Sehr geehrte/r [Name des Ausbilders],

mir ist aufgefallen, dass meine Arbeitszeiten derzeit nicht erfasst werden. Nach der Rechtsprechung des Bundesarbeitsgerichts (BAG 13.09.2022 – 1 ABR 22/21) ist der Arbeitgeber verpflichtet, Beginn und Ende der Arbeitszeit zu erfassen.

Ich bitte darum, mir mitzuteilen, wie meine Zeiten künftig festgehalten werden. Bis dahin führe ich eine eigene Aufstellung, die ich Ihnen gern regelmäßig vorlege.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ════════════════════════════════════════════════════════════
    //  TÄTIGKEITEN — weitere Szenarien
    // ════════════════════════════════════════════════════════════
    {
        id: 'weisung-rechtswidrig',
        cat: 'taetigkeit',
        title: '"Egal ob das verboten ist, du machst das jetzt!"',
        desc: 'Dein Ausbilder gibt dir eine Anweisung, die gegen Gesetze, Sicherheitsregeln oder gute Sitten verstößt.',
        law: '§ 14 BBiG / § 106 GewO / § 138 BGB',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Rechtswidrige Weisungen darfst — musst — du verweigern!',
        verdictDetail: 'Das Weisungsrecht des Arbeitgebers endet dort, wo Gesetze oder gute Sitten verletzt werden (§ 106 GewO). Du bist nicht verpflichtet, rechtswidrige Anweisungen zu befolgen — und kannst sie sogar verweigern, ohne dass dir gekündigt werden darf (§ 22 BBiG: kein "wichtiger Grund"). Du machst dich sogar selbst strafbar, wenn du z.B. Steuern hinterziehst oder Sicherheitsvorschriften ignorierst.',
        laws: [
            { title: '§ 106 GewO – Weisungsrecht', text: 'Der Arbeitgeber kann Inhalt, Ort und Zeit der Arbeitsleistung nach billigem Ermessen bestimmen, soweit diese Arbeitsbedingungen nicht durch den Arbeitsvertrag, Bestimmungen einer Betriebsvereinbarung, eines anwendbaren Tarifvertrages oder gesetzliche Vorschriften festgelegt sind.' },
            { title: '§ 14 BBiG – Pflichten des Ausbildenden', text: 'Dem Auszubildenden dürfen nur Aufgaben übertragen werden, die dem Ausbildungszweck dienen und seinen körperlichen Kräften angemessen sind.' },
            { title: '§ 138 BGB – Sittenwidriges Rechtsgeschäft', text: 'Ein Rechtsgeschäft, das gegen die guten Sitten verstößt, ist nichtig.' }
        ],
        tips: [
            'Frag im Zweifel höflich nach: "Ist das so wirklich gewollt? Ich bin unsicher."',
            'Notiere Anweisung wörtlich + Datum/Uhrzeit/Zeugen — wichtig für Beweissicherung.',
            'Bei eindeutig strafrechtlich relevanten Aufgaben (Betrug, Diebstahl, Manipulation): konsequent ablehnen.',
            'Holst du dir die Anweisung schriftlich, hast du eine perfekte Verteidigung.'
        ],
        email: {
            subject: 'Klärung einer Anweisung',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum] wurde ich angewiesen, [konkrete Tätigkeit]. Nach meiner Einschätzung steht diese Anweisung im Widerspruch zu [Gesetz/Vorschrift/Sicherheitsregel].

Nach § 106 GewO darf das Weisungsrecht des Arbeitgebers nicht gegen gesetzliche Vorschriften verstoßen. § 14 BBiG verpflichtet zur Übertragung ausbildungsgerechter Aufgaben.

Ich bitte um Klärung — gerne in einem persönlichen Gespräch — und um eine schriftliche Bestätigung, falls die Anweisung beibehalten werden soll.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'akkordarbeit',
        cat: 'taetigkeit',
        title: '"Du arbeitest jetzt im Akkord, sonst kein Bonus."',
        desc: 'Du sollst Akkordarbeit oder leistungsbezogene Arbeit unter Zeitdruck leisten.',
        law: '§ 23 JArbSchG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Für Minderjährige verboten — für Volljährige nur mit Schutz!',
        verdictDetail: 'Jugendliche (unter 18 J.) dürfen NICHT mit Akkordarbeit oder sonstigen Arbeiten beschäftigt werden, bei denen durch ein gesteigertes Arbeitstempo höherer Verdienst erzielt werden kann (§ 23 JArbSchG). Das gilt auch für tempogetriebene Fließbandarbeit. Bei Volljährigen ist Akkord erlaubt, aber Gesundheitsgefährdung muss ausgeschlossen sein (§ 3 ArbSchG).',
        laws: [
            { title: '§ 23 JArbSchG – Akkordarbeit, tempoabhängige Arbeiten', text: 'Jugendliche dürfen nicht mit Akkordarbeit und sonstigen Arbeiten, bei denen durch ein gesteigertes Arbeitstempo ein höherer Verdienst erzielt werden kann, beschäftigt werden. Sie dürfen auch nicht bei Fließarbeit mit vorgeschriebenem Arbeitstempo eingesetzt werden.' },
            { title: '§ 3 ArbSchG – Grundpflichten', text: 'Der Arbeitgeber ist verpflichtet, die erforderlichen Maßnahmen des Arbeitsschutzes zu treffen.' }
        ],
        tips: [
            'Unter 18: Akkord ist absolut tabu — einfach verweigern, ist rechtmäßig.',
            'Auch Stückzahl-Vorgaben und Bonus-bei-Tempo zählen als Akkord-ähnlich.',
            'Bei Volljährigen: Tempo darf nicht über deine Gesundheit gehen.',
            'Bei Druck → Gewerbeaufsicht / IHK informieren, die kontrollieren das aktiv.'
        ],
        email: {
            subject: 'Akkordarbeit / Tempo-Vorgaben',
            body: `Sehr geehrte/r [Name des Ausbilders],

seit [Datum] werde ich mit [Akkord / Stückzahl-Vorgaben / Tempo-Bonus-System] beschäftigt.

[Falls minderjährig:] Nach § 23 JArbSchG ist die Beschäftigung Jugendlicher mit Akkordarbeit oder tempoabhängigen Arbeiten ausdrücklich verboten.

Ich bitte um Anpassung meiner Aufgaben.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'anderer-betrieb',
        cat: 'taetigkeit',
        title: '"Nächste Woche hilfst du bei unserer Partnerfirma aus."',
        desc: 'Du sollst in einem anderen Unternehmen arbeiten, das nicht dein Ausbildungsbetrieb ist.',
        law: '§ 10 Abs. 5 BBiG / § 14 BBiG / § 1 AÜG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Nur, wenn es Teil deiner Ausbildung ist — als Aushilfe verliehen werden darfst du nicht.',
        verdictDetail: 'Deine Ausbildung findet an der **Ausbildungsstätte** statt, die in deinem Vertrag steht. Ausbildungsabschnitte in einem anderen Betrieb sind möglich, wenn sie **dem Ausbildungsziel dienen** und vereinbart sind — etwa in einer **Verbundausbildung** (§ 10 Abs. 5 BBiG) oder weil der eigene Betrieb bestimmte Inhalte nicht vermitteln kann. Dann muss dort auch jemand ausbilden, und Vergütung sowie Pflichten deines Ausbildungsvertrags laufen weiter. Unzulässig ist, dich als **günstige Aushilfe** an eine andere Firma zu „verleihen", damit sie Personal spart — das ist keine Ausbildung (§ 14 Abs. 3 BBiG) und kann zudem unerlaubte Arbeitnehmerüberlassung sein.',
        laws: [
            { title: '§ 10 Abs. 5 BBiG – Verbundausbildung', text: 'Mehrere natürliche oder juristische Personen können in einem Ausbildungsverbund zusammenwirken, soweit die Verantwortlichkeit für die einzelnen Ausbildungsabschnitte sichergestellt ist.' },
            { title: '§ 14 Abs. 3 BBiG – Ausbildungszweck', text: 'Auszubildenden dürfen nur Aufgaben übertragen werden, die dem Ausbildungszweck dienen.' }
        ],
        tips: [
            'Frag nach, welche Inhalte aus dem Ausbildungsplan du dort lernen sollst.',
            'Lass dir die Vereinbarung schriftlich geben — mit Dauer und Ansprechpartner vor Ort.',
            'Deine Vergütung, Urlaub und Berufsschule laufen unverändert weiter.',
            'Bist du nur billige Arbeitskraft, sprich die IHK/HWK-Ausbildungsberatung an.'
        ],
        email: {
            subject: 'Einsatz bei [Firma]',
            body: `Sehr geehrte/r [Name des Ausbilders],

Sie haben angekündigt, dass ich ab [Datum] bei [Firma] eingesetzt werde. Damit der Einsatz Teil meiner Ausbildung ist, bitte ich um kurze schriftliche Mitteilung:

- welche Inhalte aus meinem Ausbildungsplan ich dort lernen soll,
- wie lange der Einsatz dauert und
- wer mich vor Ort ausbildet.

Nach § 14 Abs. 3 BBiG dürfen mir nur Aufgaben übertragen werden, die dem Ausbildungszweck dienen.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'firmenwagen-fahren',
        cat: 'taetigkeit',
        title: '"Du fährst ab jetzt die Lieferungen aus."',
        desc: 'Du hast einen Führerschein und sollst regelmäßig mit dem Firmenwagen fahren.',
        law: '§ 14 Abs. 3 BBiG / Grundsätze der Arbeitnehmerhaftung',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Gelegentlich ja, wenn es zum Beruf passt — als Daueraufgabe nicht.',
        verdictDetail: 'Fahrten können zur Ausbildung gehören, etwa wenn du mit Material zur Baustelle oder zum Kunden fährst. Wirst du aber zum **festen Fahrer** für Lieferungen, die mit deinem Beruf nichts zu tun haben, ist das eine ausbildungsfremde Tätigkeit (§ 14 Abs. 3 BBiG). Wichtig für dich: Für **Schäden am Firmenwagen** haftest du nicht unbegrenzt. Nach den Grundsätzen der Arbeitnehmerhaftung trägt der Betrieb leichte Fahrlässigkeit allein, bei mittlerer wird geteilt, nur bei grober Fahrlässigkeit oder Vorsatz zahlst du überwiegend. Bei Azubis wird die Unerfahrenheit zusätzlich berücksichtigt. Bußgelder für **eigene** Verkehrsverstöße musst du selbst tragen. Der Wagen muss verkehrssicher und versichert sein.',
        laws: [
            { title: '§ 14 Abs. 3 BBiG – Ausbildungszweck', text: 'Auszubildenden dürfen nur Aufgaben übertragen werden, die dem Ausbildungszweck dienen.' },
            { title: 'BAG GS 27.09.1994 – GS 1/89', text: 'Bei betrieblich veranlasster Tätigkeit haftet der Arbeitnehmer nach dem Grad seines Verschuldens; bei leichter Fahrlässigkeit gar nicht.' }
        ],
        tips: [
            'Frag nach, ob und wie der Wagen vollkaskoversichert ist — und wer die Selbstbeteiligung trägt.',
            'Prüfe vor jeder Fahrt kurz Reifen, Licht und Ladung und melde Mängel schriftlich.',
            'Notiere Fahrten im Berichtsheft mit dem Ausbildungsbezug (Kunde, Material, Auftrag).',
            'Bei reinen Kurierdiensten: freundlich auf den Ausbildungsplan hinweisen.'
        ],
        email: {
            subject: 'Fahrten mit dem Firmenwagen',
            body: `Sehr geehrte/r [Name des Ausbilders],

seit [Datum] übernehme ich regelmäßig Auslieferungsfahrten mit dem Firmenwagen. Ich helfe gern aus, möchte aber sicherstellen, dass meine Ausbildung nach dem Ausbildungsplan weiterläuft (§ 14 Abs. 3 BBiG).

Außerdem bitte ich um kurze Auskunft, wie der Wagen versichert ist und wie im Schadensfall verfahren wird.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'kassenfehlbetrag',
        cat: 'taetigkeit',
        title: '"Das Minus in der Kasse ziehen wir dir vom Lohn ab."',
        desc: 'Beim Kassenabschluss fehlt Geld, und du sollst es aus deiner Vergütung ersetzen.',
        law: '§ 12 Abs. 2 BBiG / § 394 BGB / Arbeitnehmerhaftung',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nicht einfach so — Haftung braucht Verschulden und Beweis.',
        verdictDetail: 'Ein **pauschaler Abzug** für Kassendifferenzen ist unzulässig. Du haftest nur, wenn dir ein **Verschulden** nachgewiesen wird, und auch dann nach den Grundsätzen der Arbeitnehmerhaftung: bei leichter Fahrlässigkeit gar nicht, bei mittlerer anteilig, bei grober Fahrlässigkeit oder Vorsatz überwiegend. Eine **Mankoabrede** (Haftung ohne Verschulden) ist nur wirksam, wenn du dafür ein angemessenes Mankogeld bekommst und allein Zugriff auf die Kasse hast — und in einem Ausbildungsvertrag sind **pauschale Schadensersatzbeträge nichtig** (§ 12 Abs. 2 Nr. 4 BBiG). Selbst wenn eine Forderung besteht, darf der Betrieb nicht unter die Pfändungsgrenze in deine Vergütung eingreifen (§ 394 BGB).',
        laws: [
            { title: '§ 12 Abs. 2 BBiG – Nichtige Vereinbarungen', text: 'Nichtig sind Vereinbarungen über Vertragsstrafen, über den Ausschluss oder die Beschränkung von Schadensersatzansprüchen und über die Festsetzung von Schadensersatz in Pauschbeträgen.' },
            { title: '§ 394 BGB – Aufrechnung', text: 'Soweit eine Forderung der Pfändung nicht unterworfen ist, findet die Aufrechnung gegen die Forderung nicht statt.' },
            { title: 'BAG GS 27.09.1994 – GS 1/89', text: 'Arbeitnehmer haften für betrieblich veranlasste Schäden abgestuft nach dem Grad ihres Verschuldens.' }
        ],
        tips: [
            'Unterschreibe kein „Schuldanerkenntnis" für eine Kassendifferenz.',
            'Bestehe darauf, dass Kassen nur von einer Person mit Zählprotokoll übergeben werden.',
            'Prüfe deine Abrechnung: Ein Abzug muss ausgewiesen und begründet sein.',
            'Bei wiederholten Abzügen: Betriebsrat, Gewerkschaft oder IHK/HWK einschalten.'
        ],
        email: {
            subject: 'Abzug wegen Kassendifferenz vom [Datum]',
            body: `Sehr geehrte/r [Name des Ausbilders],

in meiner Abrechnung für [Monat] wurde ein Betrag von [X €] wegen einer Kassendifferenz einbehalten. Mit diesem Abzug bin ich nicht einverstanden.

Eine Haftung setzt ein nachgewiesenes Verschulden voraus; pauschale Schadensersatzbeträge sind im Ausbildungsverhältnis nach § 12 Abs. 2 BBiG nichtig. Ich bitte daher um Erstattung des einbehaltenen Betrags mit der nächsten Abrechnung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'schaden-bezahlen',
        cat: 'taetigkeit',
        title: '"Du hast das Gerät kaputt gemacht — du zahlst."',
        desc: 'Dir ist bei der Arbeit etwas kaputt gegangen, und der Betrieb will Ersatz.',
        law: 'Arbeitnehmerhaftung / § 12 Abs. 2 BBiG / § 13 Nr. 5 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Bei leichter Fahrlässigkeit zahlst du nichts — und Azubis wird mehr verziehen.',
        verdictDetail: 'Für Schäden bei der Arbeit gilt der **innerbetriebliche Schadensausgleich**: Bei **leichter Fahrlässigkeit** (kann jedem mal passieren) haftest du gar nicht. Bei **mittlerer** Fahrlässigkeit wird der Schaden nach den Umständen geteilt. Nur bei **grober Fahrlässigkeit oder Vorsatz** haftest du in der Regel voll, wobei auch dann eine Begrenzung möglich ist, wenn dein Verdienst in krassem Missverhältnis zum Schaden steht. Bei Azubis zählen Alter, Erfahrung und ob du ausreichend eingewiesen und beaufsichtigt wurdest. Du bist verpflichtet, mit Werkzeug und Maschinen **pfleglich** umzugehen (§ 13 Nr. 5 BBiG) — ein Pauschalbetrag für Schäden im Vertrag ist aber nichtig (§ 12 Abs. 2 BBiG).',
        laws: [
            { title: 'BAG GS 27.09.1994 – GS 1/89', text: 'Die Haftungsbeschränkung gilt für alle Arbeiten, die durch den Betrieb veranlasst sind und aufgrund des Arbeitsverhältnisses geleistet werden.' },
            { title: '§ 13 Nr. 5 BBiG – Pflichten', text: 'Auszubildende haben Werkzeug, Maschinen und sonstige Einrichtungen pfleglich zu behandeln.' },
            { title: '§ 12 Abs. 2 Nr. 4 BBiG – Nichtig', text: 'Vereinbarungen über die Festsetzung der Höhe eines Schadensersatzes in Pauschbeträgen sind nichtig.' }
        ],
        tips: [
            'Melde den Schaden sofort und ehrlich — Verschweigen wird schnell zu grobem Verhalten.',
            'Schreib auf, wie es passiert ist und ob du eingewiesen wurdest.',
            'Unterschreibe nichts, das eine Zahlung anerkennt, bevor du beraten wurdest.',
            'Hat der Betrieb eine Versicherung, muss er sie vorrangig nutzen.'
        ],
        email: {
            subject: 'Schaden an [Gerät] am [Datum]',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum] ist mir bei [Tätigkeit] [Gerät] beschädigt worden. Ich bedaure das. Den Ablauf habe ich so festgehalten: [kurze Schilderung].

Eine Kostenübernahme durch mich kommt nach den Grundsätzen der Arbeitnehmerhaftung nur bei grober Fahrlässigkeit oder Vorsatz in Betracht, die hier nicht vorliegen. Ich bitte darum, von einem Abzug abzusehen.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ════════════════════════════════════════════════════════════
    //  URLAUB — weitere Szenarien
    // ════════════════════════════════════════════════════════════
    {
        id: 'urlaubsdauer',
        cat: 'urlaub',
        title: '"Du hast nur 20 Tage Urlaub, mehr brauchst du nicht."',
        desc: 'Du fragst dich, wie viele Urlaubstage dir gesetzlich zustehen — und ob 20 Tage rechtmäßig sind.',
        law: '§ 19 JArbSchG / § 3 BUrlG',
        severity: 2,
        verdict: 'ja',
        verdictShort: 'Mindestanspruch nach Alter (Jugendliche: 25–30 Werktage)',
        verdictDetail: 'Jugendliche haben gestaffelten Mindesturlaub (§ 19 JArbSchG): unter 16 J. = 30 Werktage, unter 17 J. = 27 Werktage, unter 18 J. = 25 Werktage. Volljährige: mind. 24 Werktage bei 6-Tage-Woche / 20 Arbeitstage bei 5-Tage-Woche (§ 3 BUrlG). Tarif- oder Arbeitsverträge können MEHR vorsehen — nie weniger. Stichtag für das Alter: 1. Januar des Kalenderjahres.',
        laws: [
            { title: '§ 19 JArbSchG – Urlaub', text: 'Der Urlaub beträgt jährlich mindestens 30 Werktage, wenn der Jugendliche zu Beginn des Kalenderjahrs noch nicht 16 Jahre alt ist; 27 Werktage, wenn der Jugendliche zu Beginn des Kalenderjahrs noch nicht 17 Jahre alt ist; 25 Werktage, wenn der Jugendliche zu Beginn des Kalenderjahrs noch nicht 18 Jahre alt ist.' },
            { title: '§ 3 BUrlG – Dauer des Urlaubs', text: 'Der Urlaub beträgt jährlich mindestens 24 Werktage.' }
        ],
        tips: [
            'Werktage = Mo–Sa. Bei 5-Tage-Woche: 24 Werktage = 20 Arbeitstage.',
            'Alter zu Jahresbeginn entscheidet — wer im Januar noch 17 ist, hat das ganze Jahr 25 Tage.',
            'Mehrurlaub aus Tarif/Vertrag = bindend, nicht kürzbar einseitig.',
            'Bei Wechsel Probezeit → Vollzeit: Urlaub anteilig bis Jahresende, danach voller Anspruch.'
        ],
        email: {
            subject: 'Klärung des Urlaubsanspruchs',
            body: `Sehr geehrte/r [Name des Ausbilders],

bei der Berechnung meines Urlaubs für [Jahr] komme ich auf folgendes:

- Mein Alter zu Jahresbeginn: [X]
- Nach § 19 JArbSchG / § 3 BUrlG ergibt sich daraus ein Mindestanspruch von [Y] Werktagen.
- Bisher wurden mir [Z] Tage zugesprochen.

Ich bitte um Prüfung und Korrektur des Urlaubskontos.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'krankheit-im-urlaub',
        cat: 'urlaub',
        title: '"Pech gehabt, deine Urlaubstage sind weg."',
        desc: 'Du wirst während deines Urlaubs krank — der Betrieb zieht die Tage trotzdem vom Urlaubskonto ab.',
        law: '§ 9 BUrlG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein! Krankheitstage zählen nicht als Urlaub!',
        verdictDetail: 'Wird ein Arbeitnehmer/Azubi während des Urlaubs arbeitsunfähig krank, werden die durch ärztliches Attest nachgewiesenen Krankheitstage **NICHT** auf den Jahresurlaub angerechnet (§ 9 BUrlG). Du musst nur: 1) sofort krank melden (auch aus dem Urlaub), 2) AU-Bescheinigung vorlegen — auch wenn sie im Ausland ausgestellt wurde. Die Urlaubstage stehen dir dann später nochmal zu.',
        laws: [
            { title: '§ 9 BUrlG – Erkrankung während des Urlaubs', text: 'Erkrankt ein Arbeitnehmer während des Urlaubs, so werden die durch ärztliches Zeugnis nachgewiesenen Tage der Arbeitsunfähigkeit auf den Jahresurlaub nicht angerechnet.' }
        ],
        tips: [
            'AU-Bescheinigung sofort beim Arzt holen — auch im Ausland (Übersetzung optional, aber hilfreich).',
            'Krankmeldung an Arbeitgeber sofort senden (E-Mail mit Attest reicht).',
            'Du musst NICHT vorzeitig aus dem Urlaub zurückkehren.',
            'Urlaubstage werden für die Krankheitstage gutgeschrieben — neu beantragen.'
        ],
        email: {
            subject: 'Krankheit während des Urlaubs — Nicht-Anrechnung',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich war vom [Datum] bis [Datum] im Urlaub. Während dieser Zeit war ich von [Datum] bis [Datum] arbeitsunfähig krank, die AU-Bescheinigung liegt im Anhang.

Nach § 9 BUrlG werden diese [X] Krankheitstage nicht auf meinen Jahresurlaub angerechnet. Ich bitte um entsprechende Gutschrift auf meinem Urlaubskonto.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'urlaub-zusammenhaengend',
        cat: 'urlaub',
        title: '"Du nimmst maximal eine Woche am Stück!"',
        desc: 'Der Betrieb erlaubt nur einzelne Urlaubstage oder kurze Phasen, aber keinen zusammenhängenden längeren Urlaub.',
        law: '§ 7 Abs. 2 BUrlG / § 19 Abs. 3 JArbSchG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Ein zusammenhängender Urlaub von mind. 12 Werktagen ist Pflicht!',
        verdictDetail: 'Der Urlaub ist zusammenhängend zu gewähren, es sei denn, dringende betriebliche oder persönliche Gründe rechtfertigen die Teilung (§ 7 Abs. 2 BUrlG). Bei mehr als 12 Werktagen Urlaub muss mindestens ein Teil 12 zusammenhängende Werktage umfassen. Für Jugendliche: Urlaub soll zusammenhängend und in der unterrichtsfreien Zeit der Berufsschule gegeben werden (§ 19 Abs. 3 JArbSchG).',
        laws: [
            { title: '§ 7 Abs. 2 BUrlG – Teilung des Urlaubs', text: 'Der Urlaub ist zusammenhängend zu gewähren, es sei denn, dass dringende betriebliche oder in der Person des Arbeitnehmers liegende Gründe eine Teilung des Urlaubs erforderlich machen. Kann der Urlaub aus diesen Gründen nicht zusammenhängend gewährt werden und hat der Arbeitnehmer Anspruch auf Urlaub von mehr als zwölf Werktagen, so muss einer der Urlaubsteile mindestens zwölf aufeinanderfolgende Werktage umfassen.' },
            { title: '§ 19 Abs. 3 JArbSchG', text: 'Der Urlaub soll Jugendlichen, die noch der Berufsschulpflicht unterliegen, möglichst in der Berufsschulferien gegeben werden.' }
        ],
        tips: [
            'Plane mindestens einen Block von 12 Werktagen (≈ 2 Wochen) im Jahr ein.',
            'Bei Berufsschulferien: Erholungsurlaub bevorzugt dort legen (Jugendliche).',
            'Bei Ablehnung: schriftliche Begründung des dringenden betrieblichen Grunds verlangen.',
            'Wenn der AG den Block dauerhaft verweigert: IHK / Gewerkschaft einschalten.'
        ],
        email: {
            subject: 'Antrag auf zusammenhängenden Urlaub',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich möchte vom [Datum] bis [Datum] ([X Werktage]) zusammenhängenden Urlaub nehmen.

Nach § 7 Abs. 2 BUrlG ist der Urlaub grundsätzlich zusammenhängend zu gewähren. Bei mehr als 12 Werktagen Jahresurlaub muss mindestens ein Teil 12 aufeinanderfolgende Werktage umfassen.

Ich bitte um Genehmigung des Antrags.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'urlaub-probezeit',
        cat: 'urlaub',
        title: '"Urlaub gibt es erst nach der Probezeit."',
        desc: 'Du bist neu im Betrieb und willst in den ersten Monaten ein paar Tage frei nehmen.',
        law: '§ 4 BUrlG / § 5 BUrlG',
        severity: 1,
        verdict: 'jein',
        verdictShort: 'Den vollen Anspruch gibt es nach 6 Monaten — Urlaub vorher ist trotzdem möglich.',
        verdictDetail: 'Den **vollen Jahresurlaub** erwirbst du nach **sechs Monaten** im Betrieb (Wartezeit, § 4 BUrlG). In dieser Zeit muss der Betrieb Urlaub nicht gewähren, er **darf** es aber, und viele tun es. Mit der Probezeit hat das nichts zu tun, sie ist oft kürzer (1–4 Monate). Wichtig: Fängst du mitten im Jahr an, hast du im ersten Jahr anteilig Anspruch — ein Zwölftel pro vollem Monat, wenn du die Wartezeit in diesem Jahr nicht mehr erfüllst (§ 5 BUrlG). Endet die Ausbildung vorher, wird nicht genommener Urlaub in Geld abgegolten.',
        laws: [
            { title: '§ 4 BUrlG – Wartezeit', text: 'Der volle Urlaubsanspruch wird erstmalig nach sechsmonatigem Bestehen des Arbeitsverhältnisses erworben.' },
            { title: '§ 5 Abs. 1 BUrlG – Teilurlaub', text: 'Anspruch auf ein Zwölftel des Jahresurlaubs für jeden vollen Monat besteht u. a. für Zeiten, für die wegen Nichterfüllung der Wartezeit kein voller Urlaubsanspruch entsteht.' }
        ],
        tips: [
            'Frag einfach — viele Betriebe gewähren Urlaub schon in den ersten Monaten.',
            'Rechne deinen Anspruch fürs erste Jahr anteilig aus (pro voller Monat ein Zwölftel).',
            'Unter 18 gilt ein höherer Mindesturlaub (siehe „Wie viel Urlaub").',
            'Lass dir genehmigten Urlaub schriftlich bestätigen.'
        ]
    },
    {
        id: 'urlaub-schulzeit',
        cat: 'urlaub',
        title: '"Nimm doch an deinem Berufsschultag Urlaub."',
        desc: 'Urlaub soll in die Schulzeit gelegt werden oder Schultage sollen als Urlaub zählen.',
        law: '§ 19 Abs. 3 JArbSchG / § 15 BBiG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Schultage sind kein Urlaub — die Schule bleibt Pflicht.',
        verdictDetail: 'Berufsschule ist Pflicht und **Ausbildungszeit**, kein Urlaub: Für Schultage bist du freigestellt (§ 15 BBiG), sie dürfen nicht von deinem Urlaub abgezogen werden. Urlaub gilt nur für Tage, an denen du sonst im Betrieb wärst. Für **Minderjährige** steht es ausdrücklich im Gesetz: Urlaub **soll in den Berufsschulferien** gegeben werden, und für jeden Berufsschultag, an dem du während des Urlaubs zur Schule gehst, bekommst du einen **zusätzlichen Urlaubstag** (§ 19 Abs. 3 JArbSchG). Für Volljährige gilt sinngemäß dasselbe: In der Schulzeit ist Urlaub praktisch wertlos, weil die Schulpflicht bleibt.',
        laws: [
            { title: '§ 19 Abs. 3 JArbSchG – Berufsschule', text: 'Der Urlaub soll Berufsschülern in der Zeit der Berufsschulferien gegeben werden. Soweit er nicht in den Ferien gegeben wird, ist für jeden Berufsschultag, an dem die Schule während des Urlaubs besucht wird, ein weiterer Urlaubstag zu gewähren.' },
            { title: '§ 15 Abs. 1 BBiG – Freistellung', text: 'Ausbildende haben Auszubildende für die Teilnahme am Berufsschulunterricht freizustellen.' }
        ],
        tips: [
            'Plane deinen Urlaub in den Schulferien — das ist für alle am einfachsten.',
            'Ziehen Schultage Urlaubstage ab, sprich es schriftlich an.',
            'Unter 18: Für jeden Schultag im Urlaub bekommst du einen Tag zurück.',
            'Schulpflicht kann dir kein Betrieb erlassen — auch nicht mit Urlaub.'
        ],
        email: {
            subject: 'Anrechnung von Berufsschultagen auf den Urlaub',
            body: `Sehr geehrte/r [Name des Ausbilders],

in meinem Urlaubsantrag für [Zeitraum] liegen [Anzahl] Berufsschultage. An diesen Tagen besuche ich die Berufsschule und bin dafür nach § 15 BBiG freigestellt; sie können daher nicht als Urlaubstage zählen. [Als minderjähriger Auszubildender steht mir nach § 19 Abs. 3 JArbSchG für jeden dieser Tage ein weiterer Urlaubstag zu.]

Ich bitte um entsprechende Korrektur meines Urlaubskontos.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'resturlaub-verfaellt',
        cat: 'urlaub',
        title: '"Dein Resturlaub verfällt am 31. Dezember."',
        desc: 'Du hast noch Urlaubstage übrig, und der Betrieb sagt, sie sind zum Jahresende weg.',
        law: '§ 7 Abs. 3 BUrlG / BAG 19.02.2019 – 9 AZR 423/16',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Nicht automatisch — der Betrieb muss dich vorher auffordern und warnen.',
        verdictDetail: 'Urlaub soll im laufenden Jahr genommen werden; eine Übertragung bis **31. März** des Folgejahres ist möglich, wenn betriebliche oder persönliche Gründe es erfordern (§ 7 Abs. 3 BUrlG). **Aber:** Seit der Rechtsprechung von EuGH und BAG verfällt Urlaub **nur**, wenn der Betrieb dich **rechtzeitig und konkret aufgefordert** hat, ihn zu nehmen, und dich **klar darauf hingewiesen** hat, dass er sonst verfällt. Hat er das nicht getan, bleibt dein Urlaub bestehen und wandert ins nächste Jahr. Konntest du Urlaub wegen Krankheit nicht nehmen, gelten eigene, längere Fristen.',
        laws: [
            { title: '§ 7 Abs. 3 BUrlG – Übertragung', text: 'Der Urlaub muss im laufenden Kalenderjahr gewährt und genommen werden. Eine Übertragung ist nur aus dringenden betrieblichen oder persönlichen Gründen statthaft; dann muss er in den ersten drei Monaten des Folgejahres genommen werden.' },
            { title: 'BAG 19.02.2019 – 9 AZR 423/16', text: 'Der Urlaubsanspruch erlischt in der Regel nur, wenn der Arbeitgeber den Arbeitnehmer zuvor in die Lage versetzt hat, ihn wahrzunehmen, und dieser ihn trotzdem aus freien Stücken nicht genommen hat.' }
        ],
        tips: [
            'Beantrage deinen Urlaub schriftlich und rechtzeitig — dann hast du einen Beleg.',
            'Bekamst du keinen Hinweis auf den Verfall, verfällt der Urlaub nicht.',
            'Notiere dir den Stand deines Urlaubskontos zum Jahresende.',
            'Bei Ende der Ausbildung wird übriger Urlaub ausgezahlt (siehe „Resturlaub am Ende").'
        ],
        email: {
            subject: 'Resturlaub aus [Jahr]',
            body: `Sehr geehrte/r [Name des Ausbilders],

laut meinen Unterlagen habe ich aus [Jahr] noch [Anzahl] Urlaubstage. Eine Aufforderung, diesen Urlaub zu nehmen, verbunden mit dem Hinweis auf einen möglichen Verfall, habe ich nicht erhalten.

Nach der Rechtsprechung des Bundesarbeitsgerichts (BAG 19.02.2019 – 9 AZR 423/16) bleibt der Urlaub in diesem Fall bestehen. Ich bitte um Bestätigung, dass die Tage auf mein Urlaubskonto übertragen werden.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'urlaubsabgeltung',
        cat: 'urlaub',
        title: '"Den Resturlaub am Ende der Ausbildung kannst du vergessen."',
        desc: 'Die Ausbildung endet, du hast noch Urlaub übrig und wirst nicht übernommen.',
        law: '§ 7 Abs. 4 BUrlG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Was du nicht mehr nehmen kannst, wird ausgezahlt.',
        verdictDetail: 'Kann Urlaub wegen der **Beendigung** des Ausbildungs- oder Arbeitsverhältnisses ganz oder teilweise nicht mehr genommen werden, ist er **in Geld abzugelten** (§ 7 Abs. 4 BUrlG). Am besten nimmst du ihn vor dem Ende — aber wenn das nicht ging, etwa wegen Prüfungen oder weil die Ausbildung mit dem Bestehen früher endet, steht dir die Auszahlung zu. Berechnet wird sie nach deinem durchschnittlichen Verdienst der letzten 13 Wochen (§ 11 BUrlG). Wirst du **übernommen**, läuft der Urlaub dagegen ins neue Arbeitsverhältnis weiter.',
        laws: [
            { title: '§ 7 Abs. 4 BUrlG – Abgeltung', text: 'Kann der Urlaub wegen Beendigung des Arbeitsverhältnisses ganz oder teilweise nicht mehr gewährt werden, so ist er abzugelten.' },
            { title: '§ 11 BUrlG – Urlaubsentgelt', text: 'Das Urlaubsentgelt bemisst sich nach dem durchschnittlichen Arbeitsverdienst der letzten dreizehn Wochen vor Beginn des Urlaubs.' }
        ],
        tips: [
            'Plane Resturlaub früh, aber denk an Prüfungstermine.',
            'Die Ausbildung endet mit dem Bestehen der Abschlussprüfung — auch vor dem Vertragsende.',
            'Prüfe deine letzte Abrechnung auf die Urlaubsabgeltung.',
            'Ausschlussfristen im Vertrag beachten: Ansprüche zügig schriftlich geltend machen.'
        ],
        email: {
            subject: 'Abgeltung meines Resturlaubs',
            body: `Sehr geehrte/r [Name des Ausbilders],

mein Ausbildungsverhältnis endet am [Datum]. Zu diesem Zeitpunkt habe ich noch [Anzahl] Urlaubstage, die ich wegen [Grund] nicht mehr nehmen kann.

Nach § 7 Abs. 4 BUrlG sind diese Tage abzugelten. Ich bitte um Auszahlung mit der letzten Abrechnung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'sonderurlaub',
        cat: 'urlaub',
        title: '"Für die Beerdigung musst du Urlaub nehmen."',
        desc: 'Ein besonderer Anlass — Todesfall, eigene Hochzeit, Geburt — und du sollst Urlaub einsetzen.',
        law: '§ 19 Abs. 1 Nr. 2 BBiG / § 616 BGB / § 25 BBiG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Bei wichtigen persönlichen Anlässen hast du bezahlt frei — als Azubi sogar sicher.',
        verdictDetail: 'Bist du **unverschuldet aus einem Grund in deiner Person** verhindert, muss deine Vergütung für eine verhältnismäßig kurze Zeit weitergezahlt werden. Für Azubis steht das ausdrücklich in § 19 Abs. 1 Nr. 2 BBiG — und weil Abweichungen zu deinen Ungunsten nichtig sind (§ 25 BBiG), kann der Ausbildungsvertrag das nicht ausschließen (bei normalen Arbeitsverträgen geht das über § 616 BGB teils schon). Anerkannte Anlässe sind z. B. **Tod naher Angehöriger**, die **eigene Hochzeit**, die **Geburt des eigenen Kindes**, eine Vorladung bei Gericht oder Behörde. Ein privater Umzug zählt in der Regel nicht. Wie viele Tage, hängt vom Anlass ab; Tarifverträge nennen oft konkrete Zahlen (meist 1–2 Tage).',
        laws: [
            { title: '§ 19 Abs. 1 Nr. 2 BBiG – Fortzahlung', text: 'Die Vergütung ist bis zur Dauer von sechs Wochen zu zahlen, wenn Auszubildende aus einem sonstigen, in ihrer Person liegenden Grund unverschuldet verhindert sind, ihre Pflichten zu erfüllen.' },
            { title: '§ 25 BBiG – Unabdingbarkeit', text: 'Eine Vereinbarung, die zuungunsten Auszubildender von den Vorschriften dieses Teils abweicht, ist nichtig.' },
            { title: '§ 616 BGB – Vorübergehende Verhinderung', text: 'Der Vergütungsanspruch bleibt bestehen, wenn der Verpflichtete für eine verhältnismäßig nicht erhebliche Zeit durch einen in seiner Person liegenden Grund ohne Verschulden an der Dienstleistung verhindert wird.' }
        ],
        tips: [
            'Sag so früh wie möglich Bescheid, worum es geht und wie lange du fehlst.',
            'Leg einen Nachweis vor, wenn er verlangt wird (z. B. Traueranzeige, Heiratsurkunde).',
            'Schau in Tarif- oder Ausbildungsvertrag: Dort stehen oft feste Tage pro Anlass.',
            'Musst du dafür trotzdem Urlaub nehmen, widersprich schriftlich.'
        ],
        email: {
            subject: 'Freistellung wegen [Anlass] am [Datum]',
            body: `Sehr geehrte/r [Name des Ausbilders],

wegen [Anlass, z. B. der Beerdigung meiner Großmutter] kann ich am [Datum] nicht im Betrieb sein.

Für diesen Fall bitte ich um bezahlte Freistellung nach § 19 Abs. 1 Nr. 2 BBiG; eine Anrechnung auf meinen Erholungsurlaub ist dafür nicht vorgesehen. Einen Nachweis reiche ich gern nach.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'bildungsurlaub',
        cat: 'urlaub',
        title: '"Bildungsurlaub? Gibt es für Azubis nicht."',
        desc: 'Du willst ein Seminar besuchen und dafür Bildungsurlaub nehmen.',
        law: 'Bildungsurlaubs- bzw. Bildungszeitgesetze der Länder',
        severity: 1,
        verdict: 'jein',
        verdictShort: 'In den meisten Bundesländern doch — die Regeln sind aber Ländersache.',
        verdictDetail: '**Bildungsurlaub** (je nach Land auch Bildungszeit oder Bildungsfreistellung) ist **zusätzlicher bezahlter Urlaub** für anerkannte Weiterbildungen und kommt nicht vom Erholungsurlaub. Geregelt ist er in **Landesgesetzen**: Die meisten Bundesländer haben ein solches Gesetz, **Bayern und Sachsen** nicht. Ob und wofür Azubis ihn nehmen dürfen, regelt jedes Land selbst; mehrere Länder beschränken ihn für Auszubildende auf politische Bildung oder auf wenige Tage während der Ausbildung. Üblich sind sonst 5 Tage pro Jahr, oft 10 Tage in zwei Jahren. Die Veranstaltung muss im Land anerkannt sein, und der Antrag muss meist einige Wochen vorher beim Betrieb liegen.',
        laws: [
            { title: 'Landesgesetze zur Bildungsfreistellung', text: 'Beschäftigte haben unter den Voraussetzungen des jeweiligen Landesgesetzes Anspruch auf bezahlte Freistellung für anerkannte Bildungsveranstaltungen; Bayern und Sachsen haben kein solches Gesetz.' }
        ],
        tips: [
            'Such nach „Bildungsurlaub" plus deinem Bundesland — dort stehen die Azubi-Regeln.',
            'Wähle eine Veranstaltung mit Anerkennung für dein Bundesland.',
            'Stell den Antrag schriftlich mit der Frist deines Landesgesetzes (oft 6 Wochen vorher).',
            'Bildungsurlaub kommt zusätzlich — dein Jahresurlaub bleibt unberührt.'
        ]
    },

    // ════════════════════════════════════════════════════════════
    //  BERUFSSCHULE — weitere Szenarien
    // ════════════════════════════════════════════════════════════
    {
        id: 'berufsschule-fahrtkosten',
        cat: 'schule',
        title: '"Die Fahrt zur Berufsschule zahlst du selbst."',
        desc: 'Du musst auf eigene Kosten zur Berufsschule, zu überbetrieblichen Lehrgängen oder zu Prüfungen fahren.',
        law: 'BAG 26.09.2002 – 6 AZR 486/00 / Tarifvertrag',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Berufsschule zahlst du meist selbst — überbetriebliche Lehrgänge zahlt der Betrieb.',
        verdictDetail: 'Fahrt- und Unterbringungskosten für die **Berufsschule** muss der Betrieb nach der Rechtsprechung grundsätzlich **nicht** tragen — auch nicht bei auswärtigem Blockunterricht (BAG 26.09.2002 – 6 AZR 486/00). Anders ist es, wenn der Betrieb dich an eine andere als die zuständige Schule schickt, wenn ein **Tarifvertrag** Erstattung vorsieht (z. B. im öffentlichen Dienst) oder dein Bundesland Zuschüsse zahlt (viele Länder fördern Fahrt und Unterkunft bei Blockunterricht). **Überbetriebliche Lehrgänge** und Ausbildungsmaßnahmen außerhalb des Betriebs gehören dagegen zur betrieblichen Ausbildung — deren Kosten trägt der Betrieb.',
        laws: [
            { title: 'BAG 26.09.2002 – 6 AZR 486/00', text: 'Der Ausbildende trägt die Kosten der betrieblichen Ausbildung, nicht aber die Kosten, die im Zusammenhang mit dem Besuch der Berufsschule entstehen.' },
            { title: '§ 14 Abs. 1 Nr. 3 BBiG – Ausbildungsmittel', text: 'Ausbildende haben Auszubildenden kostenlos die Ausbildungsmittel zur Verfügung zu stellen, die zur Berufsausbildung und zum Ablegen der Prüfungen erforderlich sind.' },
            { title: '§ 19 Abs. 1 Nr. 1 BBiG – Vergütung', text: 'Für die Zeit der Freistellung nach § 15 — also auch für Berufsschule und überbetriebliche Maßnahmen — ist die Vergütung weiterzuzahlen.' }
        ],
        tips: [
            'Frag beim Schulträger bzw. Landkreis nach Fahrtkosten- oder Unterkunftszuschüssen für Berufsschüler.',
            'Prüfe deinen Tarifvertrag — dort steht oft eine Erstattungsregel.',
            'Überbetriebliche Lehrgänge (ÜLU/ÜBA): Belege sammeln und beim Betrieb einreichen.',
            'Wohnst du nicht mehr bei den Eltern, prüfe Berufsausbildungsbeihilfe (BAB) bei der Arbeitsagentur.'
        ],
        email: {
            subject: 'Erstattung von Kosten für den überbetrieblichen Lehrgang',
            body: `Sehr geehrte/r [Name des Ausbilders],

für den überbetrieblichen Lehrgang vom [Datum] bis [Datum] in [Ort] sind mir Fahrt- und Unterkunftskosten von [Betrag €] entstanden (Belege im Anhang).

Überbetriebliche Lehrgänge gehören zur betrieblichen Ausbildung; deren Kosten trägt der Ausbildungsbetrieb. [Falls zutreffend: Auch unser Tarifvertrag sieht in § [X] eine Erstattung vor.]

Ich bitte um Erstattung mit der nächsten Vergütungszahlung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'berichtsheft-zuhause',
        cat: 'schule',
        title: '"Das Berichtsheft schreibst du zu Hause."',
        desc: 'Für den Ausbildungsnachweis gibt es im Betrieb keine Zeit — du sollst ihn in der Freizeit führen.',
        law: '§ 14 Abs. 2 BBiG / § 13 Nr. 7 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein — der Betrieb muss dir Zeit dafür am Arbeitsplatz geben.',
        verdictDetail: 'Den Ausbildungsnachweis (das **Berichtsheft**) zu führen, ist deine Pflicht (§ 13 Nr. 7 BBiG) — aber es ist **Ausbildungszeit**, keine Freizeit. Der Betrieb muss dir ausdrücklich **Gelegenheit geben, ihn am Arbeitsplatz zu führen**, und ihn **regelmäßig durchsehen** (§ 14 Abs. 2 BBiG). Er darf dich also nicht auf den Feierabend verweisen. Das ist wichtig, weil das Berichtsheft Zulassungsvoraussetzung für die Abschlussprüfung ist (§ 43 Abs. 1 Nr. 2 BBiG): Ohne geführte Nachweise kannst du nicht zur Prüfung. Ob schriftlich oder elektronisch, steht im Ausbildungsvertrag.',
        laws: [
            { title: '§ 14 Abs. 2 BBiG – Ausbildungsnachweis', text: 'Ausbildende haben Auszubildende zum Führen der Ausbildungsnachweise anzuhalten und diese regelmäßig durchzusehen. Den Auszubildenden ist Gelegenheit zu geben, den Ausbildungsnachweis am Arbeitsplatz zu führen.' },
            { title: '§ 13 Nr. 7 BBiG – Pflicht', text: 'Auszubildende haben einen schriftlichen oder elektronischen Ausbildungsnachweis zu führen.' },
            { title: '§ 43 Abs. 1 Nr. 2 BBiG – Zulassung', text: 'Zur Abschlussprüfung ist zuzulassen, wer den vorgeschriebenen Ausbildungsnachweis vorgelegt hat.' }
        ],
        tips: [
            'Schlag eine feste Zeit pro Woche vor, z. B. freitags 30 Minuten.',
            'Schreib zeitnah — am Ende der Woche weißt du noch, was du gemacht hast.',
            'Ein digitales Berichtsheft spart Zeit, wenn dein Betrieb elektronische Nachweise erlaubt.',
            'Bleibt keine Zeit, notiere das — es ist wichtig, falls es Ärger mit der Zulassung gibt.'
        ],
        email: {
            subject: 'Zeit für den Ausbildungsnachweis',
            body: `Sehr geehrte/r [Name des Ausbilders],

für das Führen meines Ausbildungsnachweises hatte ich in den letzten Wochen während der Arbeitszeit keine Gelegenheit. Nach § 14 Abs. 2 BBiG ist Auszubildenden Gelegenheit zu geben, den Ausbildungsnachweis am Arbeitsplatz zu führen.

Ich schlage vor, dafür jeweils [Tag, Uhrzeit, Dauer] einzuplanen. Gern lege ich Ihnen die Nachweise danach regelmäßig zur Durchsicht vor.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'berichtsheft-unterschrift',
        cat: 'schule',
        title: '"Unterschreiben tu ich das Berichtsheft irgendwann."',
        desc: 'Dein Ausbilder zeichnet deine Nachweise seit Monaten nicht ab.',
        law: '§ 14 Abs. 2 BBiG / § 43 Abs. 1 Nr. 2 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Durchsehen ist Pflicht — ohne Nachweise droht ein Problem bei der Zulassung.',
        verdictDetail: 'Dein Ausbilder muss deine Ausbildungsnachweise **regelmäßig durchsehen** (§ 14 Abs. 2 BBiG); in der Praxis heißt das: gegenzeichnen. Lässt er das liegen, ist das **seine** Pflichtverletzung, nicht deine. Kritisch wird es vor der Abschlussprüfung: Zugelassen wird nur, wer die vorgeschriebenen Nachweise vorgelegt hat (§ 43 Abs. 1 Nr. 2 BBiG). Viele Kammern prüfen dabei die Unterschriften. Deshalb gilt: Führe dein Berichtsheft vollständig und lückenlos, leg es regelmäßig vor und halte fest, wann du es vorgelegt hast. Bleibt die Unterschrift trotzdem aus, wende dich frühzeitig an die IHK/HWK.',
        laws: [
            { title: '§ 14 Abs. 2 BBiG – Durchsicht', text: 'Ausbildende haben Auszubildende zum Führen der Ausbildungsnachweise anzuhalten und diese regelmäßig durchzusehen.' },
            { title: '§ 43 Abs. 1 Nr. 2 BBiG – Zulassung', text: 'Zur Abschlussprüfung ist zuzulassen, wer den vorgeschriebenen schriftlichen oder elektronischen Ausbildungsnachweis vorgelegt hat.' }
        ],
        tips: [
            'Leg die Nachweise in festem Rhythmus vor, z. B. monatlich — und notiere das Datum.',
            'Ein digitales Berichtsheft mit Freigabe-Link macht das Abzeichnen für den Ausbilder einfacher.',
            'Fehlen Unterschriften kurz vor der Anmeldung zur Prüfung: sofort IHK/HWK fragen.',
            'Schreib nichts nachträglich um, was schon abgezeichnet ist.'
        ],
        email: {
            subject: 'Durchsicht meiner Ausbildungsnachweise',
            body: `Sehr geehrte/r [Name des Ausbilders],

meine Ausbildungsnachweise für den Zeitraum [von – bis] liegen Ihnen seit [Datum] zur Durchsicht vor und sind noch nicht abgezeichnet.

Da die Nachweise nach § 43 Abs. 1 Nr. 2 BBiG Voraussetzung für die Zulassung zur Abschlussprüfung sind, bitte ich um Durchsicht und Unterschrift bis [Datum].

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'blockunterricht',
        cat: 'schule',
        title: '"Nach dem Blockunterricht kommst du nachmittags noch rein."',
        desc: 'Du hast eine Woche Blockunterricht und sollst trotzdem in den Betrieb.',
        law: '§ 15 Abs. 1 BBiG / § 9 JArbSchG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'In einer Blockwoche mit mindestens 25 Stunden bist du die ganze Woche frei.',
        verdictDetail: 'Bei **Blockunterricht** mit planmäßig mindestens **25 Stunden an mindestens fünf Tagen** darf der Betrieb dich in dieser Woche **nicht beschäftigen** (§ 15 Abs. 1 BBiG) — das gilt seit 2020 für alle Azubis. Erlaubt sind nur **betriebliche Ausbildungsveranstaltungen** von bis zu **zwei Stunden pro Woche**, also z. B. ein kurzer Unterricht im Betrieb, keine normale Arbeit. Die Blockwoche wird mit deiner durchschnittlichen wöchentlichen Ausbildungszeit angerechnet (§ 15 Abs. 2 BBiG), du hast also keine Minusstunden.',
        laws: [
            { title: '§ 15 Abs. 1 BBiG – Blockunterricht', text: 'Auszubildende dürfen nicht beschäftigt werden in Berufsschulwochen mit einem planmäßigen Blockunterricht von mindestens 25 Stunden an mindestens fünf Tagen; zusätzliche betriebliche Ausbildungsveranstaltungen bis zu zwei Stunden wöchentlich sind zulässig.' },
            { title: '§ 15 Abs. 2 BBiG – Anrechnung', text: 'Berufsschulwochen nach Absatz 1 werden mit der durchschnittlichen wöchentlichen Ausbildungszeit angerechnet.' }
        ],
        tips: [
            'Prüfe den Blockplan: mindestens 25 Stunden an fünf Tagen?',
            'Eine kurze Schulung im Betrieb (bis 2 Stunden) ist erlaubt, normale Arbeit nicht.',
            'Minusstunden für die Blockwoche darf es nicht geben.',
            'Trag die Blockwoche vollständig ins Berichtsheft ein.'
        ],
        email: {
            subject: 'Einsatz während des Blockunterrichts',
            body: `Sehr geehrte/r [Name des Ausbilders],

in der Woche vom [Datum] habe ich Blockunterricht mit [Stunden] Unterrichtsstunden an fünf Tagen. Nach § 15 Abs. 1 BBiG darf ich in dieser Woche nicht im Betrieb beschäftigt werden; zulässig sind nur betriebliche Ausbildungsveranstaltungen bis zu zwei Stunden.

Ich bitte daher, mich für diese Woche nicht im Dienstplan einzuplanen.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'berufsschule-fehlen',
        cat: 'schule',
        title: '"Wenn du die Schule schwänzt, hat das Folgen."',
        desc: 'Du hast unentschuldigt in der Berufsschule gefehlt — was darf der Betrieb tun?',
        law: '§ 13 Nr. 2 BBiG / § 14 Abs. 1 Nr. 4 BBiG / § 22 BBiG',
        severity: 2,
        verdict: 'ja',
        verdictShort: 'Ja — Berufsschule ist Pflicht, Fehlen kann bis zur Kündigung führen.',
        verdictDetail: 'Für den Unterricht bist du freigestellt, aber du bist auch **verpflichtet teilzunehmen** (§ 13 Nr. 2 BBiG); der Betrieb muss dich zum Schulbesuch anhalten (§ 14 Abs. 1 Nr. 4 BBiG) und darf sich die Anwesenheit nachweisen lassen. Unentschuldigtes Fehlen ist eine **Pflichtverletzung**: Es kann eine **Abmahnung** geben, für die geschwänzte Zeit entfällt der Vergütungsanspruch, und wiederholtes Schwänzen nach Abmahnung kann ein **wichtiger Grund für eine Kündigung** sein (§ 22 Abs. 2 BBiG). Dazu kommen Schulpflicht-Folgen nach Landesrecht. Bist du krank, gilt die Krankmeldung auch für die Schule — die Schule musst du zusätzlich nach ihren Regeln informieren.',
        laws: [
            { title: '§ 13 Nr. 2 BBiG – Teilnahme', text: 'Auszubildende sind verpflichtet, an Ausbildungsmaßnahmen teilzunehmen, für die sie nach § 15 freigestellt werden.' },
            { title: '§ 14 Abs. 1 Nr. 4 BBiG – Anhalten', text: 'Ausbildende haben Auszubildende zum Besuch der Berufsschule anzuhalten.' },
            { title: '§ 22 Abs. 2 Nr. 1 BBiG – Kündigung', text: 'Nach der Probezeit kann aus einem wichtigen Grund ohne Einhalten einer Kündigungsfrist gekündigt werden.' }
        ],
        tips: [
            'Krank? Melde dich beim Betrieb UND bei der Schule nach deren Regeln.',
            'Hast du eine Abmahnung bekommen, nimm sie ernst — die nächste kann die letzte sein.',
            'Probleme in der Schule? Sprich Lehrkraft, Ausbilder oder Ausbildungsberatung an, bevor du fehlst.',
            'Verspätung wegen Bus oder Bahn sofort der Schule melden und Beleg aufheben.'
        ]
    },
    {
        id: 'pruefungswiederholung',
        cat: 'pruefung',
        title: '"Durchgefallen? Pech, du bist raus."',
        desc: 'Du hast eine Prüfung nicht bestanden — der Betrieb will das Ausbildungsverhältnis sofort beenden.',
        law: '§ 21 Abs. 3 BBiG / § 37 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Du hast Anspruch auf Wiederholung — Vertrag verlängert sich auf Verlangen!',
        verdictDetail: 'Wer die Abschlussprüfung nicht besteht, kann sie zweimal wiederholen (§ 37 Abs. 1 BBiG). Auf dein Verlangen verlängert sich das Ausbildungsverhältnis bis zur nächsten Wiederholungsprüfung, höchstens um 1 Jahr (§ 21 Abs. 3 BBiG). Der Betrieb darf dich nicht "rausschmeißen" — die Verlängerung ist dein Recht. Vergütung läuft weiter.',
        laws: [
            { title: '§ 21 Abs. 3 BBiG – Beendigung', text: 'Besteht der Auszubildende die Abschlussprüfung nicht, so verlängert sich das Berufsausbildungsverhältnis auf sein Verlangen bis zur nächstmöglichen Wiederholungsprüfung, höchstens um ein Jahr.' },
            { title: '§ 37 Abs. 1 BBiG – Abschlussprüfung', text: 'Die Abschlussprüfung kann zweimal wiederholt werden.' }
        ],
        tips: [
            'Stelle den Verlängerungs-Antrag SCHRIFTLICH und VOR dem regulären Ausbildungsende.',
            'Während der Verlängerung: volle Ausbildungsvergütung läuft weiter.',
            'Auch Berufsschulpflicht bleibt — du darfst Wiederholungs-Klassen besuchen.',
            'Beratung bei der IHK/HWK ist kostenlos — die Anmeldung zur Wiederholung läuft auch über sie.'
        ],
        email: {
            subject: 'Verlängerung des Ausbildungsverhältnisses gem. § 21 Abs. 3 BBiG',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich habe die Abschlussprüfung am [Datum] leider nicht bestanden. Ich beabsichtige, die Prüfung zum nächstmöglichen Termin zu wiederholen.

Hiermit beantrage ich gemäß § 21 Abs. 3 BBiG die Verlängerung meines Ausbildungsverhältnisses bis zur nächsten Wiederholungsprüfung, längstens jedoch um ein Jahr.

Ich bitte um schriftliche Bestätigung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'zwischenpruefung',
        cat: 'pruefung',
        title: '"Zur Zwischenprüfung musst du nicht, die zählt eh nicht."',
        desc: 'Der Betrieb will dich am Tag der Zwischenprüfung im Betrieb haben.',
        law: '§ 43 Abs. 1 Nr. 2 BBiG / § 15 Abs. 1 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Doch — ohne Teilnahme keine Zulassung zur Abschlussprüfung.',
        verdictDetail: 'Die Teilnahme an der **Zwischenprüfung** ist Voraussetzung für die **Zulassung zur Abschlussprüfung** (§ 43 Abs. 1 Nr. 2 BBiG) — auch wenn ihr Ergebnis in vielen Berufen nicht in die Note eingeht. Bei der **gestreckten Abschlussprüfung** gibt es statt der Zwischenprüfung „Teil 1", und der **zählt** schon für das Endergebnis. Für die Prüfung musst du **bezahlt freigestellt** werden (§ 15 Abs. 1 BBiG, § 19 Abs. 1 BBiG), und der Betrieb muss dich bei der Kammer anmelden. Dich davon abzuhalten, gefährdet deinen Abschluss.',
        laws: [
            { title: '§ 43 Abs. 1 Nr. 2 BBiG – Zulassung', text: 'Zur Abschlussprüfung ist zuzulassen, wer an den vorgeschriebenen Zwischenprüfungen teilgenommen hat.' },
            { title: '§ 15 Abs. 1 BBiG – Freistellung', text: 'Ausbildende haben Auszubildende für die Teilnahme an Prüfungen freizustellen.' }
        ],
        tips: [
            'Prüfungstermin früh weitergeben und schriftlich bestätigen lassen.',
            'Frag nach, ob du gestreckt geprüft wirst — dann zählt Teil 1 mit.',
            'Melde dich bei der Kammer, wenn du keine Einladung bekommst.',
            'Der Prüfungstag ist Ausbildungszeit — kein Urlaub, keine Minusstunden.'
        ],
        email: {
            subject: 'Zwischenprüfung am [Datum]',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum] findet meine Zwischenprüfung bei der [IHK/HWK] statt. Die Teilnahme ist nach § 43 Abs. 1 Nr. 2 BBiG Voraussetzung für meine Zulassung zur Abschlussprüfung; für den Prüfungstag bin ich nach § 15 Abs. 1 BBiG freizustellen.

Ich bitte um kurze Bestätigung, dass ich an diesem Tag nicht im Betrieb eingeplant bin.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'pruefungsgebuehr',
        cat: 'pruefung',
        title: '"Die Prüfungsgebühr zahlst du."',
        desc: 'Der Betrieb will die Kosten für Zwischen- oder Abschlussprüfung von dir zurück.',
        law: '§ 14 Abs. 1 Nr. 3 BBiG / § 12 Abs. 2 Nr. 1 BBiG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Nein — die Kosten der Prüfungen trägt der Ausbildungsbetrieb.',
        verdictDetail: 'Die **Prüfungsgebühren** der Kammer für Zwischen- und Abschlussprüfung trägt der **Ausbildungsbetrieb**; sie gehören zu den Kosten der Ausbildung. Auch alles, was du **für die Prüfung** brauchst (Prüfungsmaterial, Werkstücke, Werkzeug), muss er kostenlos stellen (§ 14 Abs. 1 Nr. 3 BBiG). Eine Vereinbarung, nach der du für deine Ausbildung zahlst, ist **nichtig** (§ 12 Abs. 2 Nr. 1 BBiG). Das gilt auch für eine **Wiederholungsprüfung**, solange du noch in Ausbildung bist. Nach dem Ende des Ausbildungsverhältnisses — etwa wenn du eine Prüfung später ohne Vertrag wiederholst — kann das anders aussehen.',
        laws: [
            { title: '§ 14 Abs. 1 Nr. 3 BBiG – Ausbildungsmittel', text: 'Ausbildende haben die Mittel kostenlos zur Verfügung zu stellen, die zum Ablegen von Zwischen- und Abschlussprüfungen erforderlich sind.' },
            { title: '§ 12 Abs. 2 Nr. 1 BBiG – Nichtig', text: 'Nichtig ist eine Vereinbarung über die Verpflichtung Auszubildender, für die Berufsausbildung eine Entschädigung zu zahlen.' }
        ],
        tips: [
            'Die Rechnung der Kammer geht in der Regel direkt an den Betrieb.',
            'Wurde dir etwas abgezogen: Abrechnung prüfen und schriftlich zurückfordern.',
            'Prüfungsmaterial und Werkstücke stellt ebenfalls der Betrieb.',
            'Bei Unsicherheit beantwortet die Kammer die Frage verbindlich.'
        ],
        email: {
            subject: 'Prüfungsgebühr [Zwischen-/Abschlussprüfung]',
            body: `Sehr geehrte/r [Name des Ausbilders],

mit meiner Abrechnung für [Monat] wurde ein Betrag von [X €] für die Prüfungsgebühr einbehalten. Die Kosten der Prüfung trägt der Ausbildende; eine Vereinbarung, nach der Auszubildende für ihre Ausbildung zahlen, ist nach § 12 Abs. 2 Nr. 1 BBiG nichtig.

Ich bitte um Erstattung mit der nächsten Abrechnung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'vorzeitige-zulassung',
        cat: 'pruefung',
        title: '"Früher zur Prüfung? Das geht bei uns nicht."',
        desc: 'Deine Noten sind gut, und du willst die Abschlussprüfung vorziehen.',
        law: '§ 45 Abs. 1 BBiG / § 8 Abs. 1 BBiG',
        severity: 1,
        verdict: 'jein',
        verdictShort: 'Doch — über die Zulassung entscheidet die Kammer, nicht der Betrieb allein.',
        verdictDetail: 'Rechtfertigen deine **Leistungen** es, kannst du **vor Ablauf der Ausbildungszeit** zur Abschlussprüfung zugelassen werden (§ 45 Abs. 1 BBiG). Der Betrieb und die Berufsschule werden **angehört**, entscheiden tut aber die Kammer. Üblich sind gute Noten in der Berufsschule und gute Leistungen im Betrieb; viele Kammern ziehen um bis zu sechs Monate vor. Davon zu unterscheiden ist die **Verkürzung** der Ausbildungszeit schon beim oder kurz nach Vertragsschluss, die Betrieb und Azubi **gemeinsam** beantragen (§ 8 Abs. 1 BBiG). Wer vorzeitig besteht, beendet die Ausbildung mit der Bekanntgabe des Ergebnisses.',
        laws: [
            { title: '§ 45 Abs. 1 BBiG – Vorzeitige Zulassung', text: 'Auszubildende können nach Anhörung der Ausbildenden und der Berufsschule vor Ablauf ihrer Ausbildungszeit zur Abschlussprüfung zugelassen werden, wenn ihre Leistungen dies rechtfertigen.' },
            { title: '§ 8 Abs. 1 BBiG – Verkürzung', text: 'Auf gemeinsamen Antrag hat die zuständige Stelle die Ausbildungszeit zu kürzen, wenn zu erwarten ist, dass das Ausbildungsziel in der gekürzten Zeit erreicht wird.' }
        ],
        tips: [
            'Frag deine Kammer nach ihren Kriterien (oft Notenschnitt 2,0 oder besser).',
            'Hol dir eine Stellungnahme der Berufsschule frühzeitig ein.',
            'Achte auf die Anmeldefristen — oft mehrere Monate vor dem Prüfungstermin.',
            'Plane die Lernzeit: Vorzeitig heißt auch weniger Vorbereitung.'
        ]
    },

    // ════════════════════════════════════════════════════════════
    //  GELD — weitere Szenarien
    // ════════════════════════════════════════════════════════════
    {
        id: 'mindestausbildungsverguetung',
        cat: 'geld',
        title: '"550 € im Monat sind doch ok als Azubi."',
        desc: 'Du bekommst weniger als die gesetzliche Mindestausbildungsvergütung.',
        law: '§ 17 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Unter dem Mindestbetrag? Dann ist die Vergütung zu niedrig!',
        verdictDetail: 'Die **Mindestausbildungsvergütung** (§ 17 Abs. 2 BBiG) hängt am Jahr deines **Ausbildungsbeginns** und steigt mit jedem Ausbildungsjahr um feste Aufschläge (+18 %, +35 %, +40 %). Beginn 2025: 682 / 805 / 921 / 955 €. Beginn 2026: **724 / 854 / 977 / 1.014 €**. Beginn 2027: 764 / 902 / 1.031 / 1.070 € (vom Bundesministerium im Bundesgesetzblatt bekannt gemacht). Ein tarifgebundener Betrieb darf den Tarif zahlen, auch wenn er darunter liegt (§ 17 Abs. 3 BBiG). Ein Betrieb ohne Tarifbindung darf den Branchentarif um höchstens 20 % unterschreiten (§ 17 Abs. 4 BBiG). Zu wenig gezahlt? Die Differenz kannst du nachfordern — achte auf Ausschlussfristen im Vertrag.',
        laws: [
            { title: '§ 17 Abs. 1 BBiG – Angemessene Vergütung', text: 'Ausbildende haben Auszubildenden eine angemessene Vergütung zu gewähren. Sie steigt mit fortschreitender Berufsausbildung, mindestens jährlich, an.' },
            { title: '§ 17 Abs. 2 BBiG – Mindestvergütung', text: 'Eine Vergütung unter den gesetzlichen Mindestbeträgen ist nicht angemessen. Die Beträge werden jährlich fortgeschrieben und im Bundesgesetzblatt bekannt gemacht.' },
            { title: '§ 17 Abs. 3 BBiG – Tarifvertrag', text: 'Angemessen ist auch eine für den Ausbildenden geltende tarifvertragliche Vergütung, selbst wenn sie die Mindestvergütung unterschreitet.' }
        ],
        tips: [
            'Ausbildungsbeginn im Vertrag nachsehen — danach richtet sich dein Mindestbetrag für die ganze Ausbildung.',
            'Tarifbindung erfragen: Bei Tarifbindung gilt der Tarif, sonst der Mindestbetrag bzw. die 80-%-Regel.',
            'Zu wenig bekommen? Schriftlich nachfordern und Ausschlussfristen im Vertrag beachten.',
            'Die IHK/HWK prüft Vergütungen schon bei der Eintragung des Vertrags — frag dort nach.'
        ],
        email: {
            subject: 'Anpassung der Ausbildungsvergütung an Mindestsätze',
            body: `Sehr geehrte/r [Name des Ausbilders],

bei der Prüfung meiner Vergütung im Vergleich zur gesetzlichen Mindestausbildungsvergütung (§ 17 BBiG) bzw. dem branchenüblichen Tarifvertrag stelle ich fest, dass mein aktuelles Gehalt von [X €] unter der Mindestgrenze für mein [1./2./3./4.] Ausbildungsjahr in [Jahr] liegt.

Ich bitte um Anpassung und Nachzahlung der Differenz für die zurückliegenden Monate.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'jaehrliche-steigerung',
        cat: 'geld',
        title: '"Im zweiten Jahr verdienst du genauso viel wie im ersten."',
        desc: 'Dein Lohn wird beim Übergang ins nächste Ausbildungsjahr nicht erhöht.',
        law: '§ 17 Abs. 1 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Steigerung ist Pflicht — mindestens jährlich!',
        verdictDetail: 'Die Ausbildungsvergütung muss mit fortschreitender Ausbildung **mindestens einmal jährlich ansteigen** (§ 17 Abs. 1 BBiG). Das ist keine Kulanz, sondern Pflicht. Wie hoch, regelt ein geltender Tarifvertrag; sonst gilt mindestens die gesetzliche Mindestvergütung deines Beginn-Jahrgangs mit ihren festen Aufschlägen (+18 % im 2., +35 % im 3., +40 % im 4. Jahr gegenüber dem 1. Jahr, § 17 Abs. 2 BBiG). Eine Vergütung, die über die Lehrjahre gleich bleibt, ist rechtswidrig.',
        laws: [
            { title: '§ 17 Abs. 1 BBiG – Vergütung', text: 'Die Vergütung ist nach dem Lebensalter des Auszubildenden so zu bemessen, dass sie mit fortschreitender Berufsausbildung, mindestens jährlich, ansteigt.' }
        ],
        tips: [
            'Beim Wechsel ins neue Lehrjahr aktiv nachfragen, wann die Erhöhung kommt.',
            'Steigerung gilt ab dem Tag des Übergangs (z.B. Ausbildungsbeginn-Jahrestag).',
            'Bei Nicht-Anpassung: Nachzahlung der Differenz möglich (3 Jahre Verjährung).',
            'Tarifvertrag prüfen — oft sind die Steigerungen festgeschrieben.'
        ],
        email: {
            subject: 'Anpassung der Vergütung im neuen Ausbildungsjahr',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum] bin ich in mein [2./3./4.] Ausbildungsjahr eingetreten. Die Ausbildungsvergütung wurde bisher nicht angepasst.

§ 17 Abs. 1 Satz 2 BBiG schreibt eine mindestens jährliche Erhöhung der Ausbildungsvergütung verbindlich vor.

Ich bitte um Anpassung mit Wirkung zum [Datum].

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'ueberstunden-verguetung',
        cat: 'geld',
        title: '"Die paar Überstunden bezahlen wir nicht."',
        desc: 'Du hast Überstunden geleistet, sollst aber weder Geld noch Freizeit-Ausgleich bekommen.',
        law: '§ 17 Abs. 7 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Überstunden müssen vergütet oder durch Freizeit ausgeglichen werden!',
        verdictDetail: 'Eine über die vereinbarte Ausbildungszeit hinausgehende Beschäftigung ist **besonders zu vergüten oder durch entsprechende Freizeit auszugleichen** (§ 17 Abs. 7 BBiG). Pauschalabgeltung im Ausbildungsvertrag ("alle Überstunden mit Vergütung abgegolten") ist UNZULÄSSIG — solche Klauseln sind nichtig. Auch "Kulanz"-Überstunden gibt es nicht.',
        laws: [
            { title: '§ 17 Abs. 7 BBiG – Überstunden-Vergütung', text: 'Eine über die vereinbarte regelmäßige tägliche Ausbildungszeit hinausgehende Beschäftigung ist besonders zu vergüten oder durch entsprechende Freizeit auszugleichen.' }
        ],
        tips: [
            'Pauschalklauseln im Ausbildungsvertrag sind unwirksam — du kannst trotzdem fordern.',
            'Wahlrecht: Geld ODER Freizeit-Ausgleich. Du kannst nicht beides, aber du wählst.',
            'Genaue Aufzeichnung der Überstunden ist Gold wert (Datum, Anlass, Dauer).',
            'Höhe: Stundenwert = monatliche Vergütung / vereinbarte Monatsstunden, ggf. zzgl. Zuschlag.'
        ],
        email: {
            subject: 'Ausgleich geleisteter Überstunden',
            body: `Sehr geehrte/r [Name des Ausbilders],

in den letzten [Wochen/Monaten] habe ich [X] Überstunden geleistet (Aufstellung im Anhang).

Nach § 17 Abs. 7 BBiG sind diese Stunden entweder durch Vergütung oder durch Freizeit auszugleichen. Ich entscheide mich für [Freizeitausgleich / Auszahlung].

Ich bitte um schriftliche Bestätigung des Ausgleichs.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'schulbuecher-kosten',
        cat: 'geld',
        title: '"Schulbücher und Taschenrechner zahlst du selbst."',
        desc: 'Für die Berufsschule brauchst du Bücher und Material — wer zahlt?',
        law: '§ 14 Abs. 1 Nr. 3 BBiG / Lernmittelfreiheit der Länder',
        severity: 1,
        verdict: 'jein',
        verdictShort: 'Material für den Betrieb zahlt der Betrieb — Schulbücher oft du oder das Land.',
        verdictDetail: 'Der Betrieb muss dir **kostenlos alle Ausbildungsmittel** stellen, die du für die **betriebliche Ausbildung und die Prüfungen** brauchst: Werkzeug, Werkstoffe, Fachliteratur, beim mobilen Ausbilden auch Hard- und Software (§ 14 Abs. 1 Nr. 3 BBiG). Material, das **nur die Berufsschule** verlangt, gehört nach herrschender Meinung **nicht** dazu. Ob du Schulbücher selbst kaufen musst, regeln die Bundesländer über die **Lernmittelfreiheit** — in manchen Ländern stellt die Schule Bücher kostenlos oder leihweise, in anderen zahlst du einen Eigenanteil. Viele Betriebe und Tarifverträge übernehmen die Kosten trotzdem freiwillig. Brauchst du dasselbe Buch auch im Betrieb oder für die Prüfung, ist es ein Ausbildungsmittel.',
        laws: [
            { title: '§ 14 Abs. 1 Nr. 3 BBiG – Ausbildungsmittel', text: 'Ausbildende haben Auszubildenden kostenlos die Ausbildungsmittel, insbesondere Werkzeuge, Werkstoffe und Fachliteratur, zur Verfügung zu stellen, die zur Berufsausbildung und zum Ablegen von Zwischen- und Abschlussprüfungen erforderlich sind.' }
        ],
        tips: [
            'Frag in der Schule nach Ausleihe oder Lernmittelfreiheit in deinem Bundesland.',
            'Frag im Betrieb — viele übernehmen Schulbücher freiwillig.',
            'Prüfungsliteratur und Tabellenbücher, die du auch im Betrieb nutzt, muss der Betrieb stellen.',
            'Bewahre Quittungen auf: Selbst gezahlte Arbeitsmittel kannst du steuerlich absetzen.'
        ]
    },
    {
        id: 'verguetung-zu-spaet',
        cat: 'geld',
        title: '"Die Vergütung kommt diesen Monat etwas später."',
        desc: 'Deine Ausbildungsvergütung ist zum Monatsende nicht auf dem Konto.',
        law: '§ 18 Abs. 2 BBiG / § 286 BGB',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Spätestens am letzten Arbeitstag des Monats muss sie da sein.',
        verdictDetail: 'Die Ausbildungsvergütung für den laufenden Monat ist **spätestens am letzten Arbeitstag des Monats** zu zahlen (§ 18 Abs. 2 BBiG). Das ist eine feste gesetzliche Frist — eine Zahlung „Mitte nächsten Monats" ist für Azubis nicht zulässig, auch nicht per Vertrag (§ 25 BBiG). Zahlt der Betrieb nicht, ist er ab dem Folgetag **in Verzug** und schuldet **Verzugszinsen** (§§ 286, 288 BGB). Bleibt die Vergütung wiederholt oder dauerhaft aus, kann das ein **wichtiger Grund** sein, das Ausbildungsverhältnis selbst zu kündigen (§ 22 Abs. 2 Nr. 1 BBiG) — davor solltest du dich beraten lassen.',
        laws: [
            { title: '§ 18 Abs. 2 BBiG – Fälligkeit', text: 'Die Vergütung für den laufenden Kalendermonat ist spätestens am letzten Arbeitstag des Monats zu zahlen.' },
            { title: '§ 286 BGB – Verzug', text: 'Ist für die Leistung eine Zeit nach dem Kalender bestimmt, kommt der Schuldner ohne Mahnung in Verzug, wenn er nicht zur bestimmten Zeit leistet.' },
            { title: '§ 25 BBiG – Unabdingbarkeit', text: 'Vereinbarungen, die zuungunsten Auszubildender von diesen Vorschriften abweichen, sind nichtig.' }
        ],
        tips: [
            'Erinnere freundlich, aber schriftlich, mit Datum der Fälligkeit.',
            'Gibt es einen Grund (z. B. Fehler in der Buchhaltung), lass dir einen festen Termin nennen.',
            'Bei wiederholter Verspätung: IHK/HWK oder Gewerkschaft einschalten.',
            'Schulden die Lage ernst? Lohnrückstände können über das Arbeitsgericht eingeklagt werden.'
        ],
        email: {
            subject: 'Ausstehende Ausbildungsvergütung für [Monat]',
            body: `Sehr geehrte/r [Name des Ausbilders],

meine Ausbildungsvergütung für [Monat] ist bisher nicht auf meinem Konto eingegangen. Nach § 18 Abs. 2 BBiG ist die Vergütung spätestens am letzten Arbeitstag des Monats zu zahlen.

Ich bitte um Überweisung bis spätestens [Datum] und um kurze Information, falls es eine Verzögerung gibt.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'ausbildungskosten-zurueck',
        cat: 'geld',
        title: '"Wenn du abbrichst, zahlst du die Ausbildungskosten zurück."',
        desc: 'Im Vertrag steht eine Rückzahlungsklausel oder Vertragsstrafe bei Abbruch.',
        law: '§ 12 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Solche Klauseln sind im Ausbildungsvertrag nichtig.',
        verdictDetail: 'Das Berufsbildungsgesetz verbietet ausdrücklich, dass Azubis für ihre Ausbildung zahlen. **Nichtig** sind Vereinbarungen über eine **Entschädigung für die Berufsausbildung**, **Vertragsstrafen**, den **Ausschluss oder die Beschränkung von Schadensersatzansprüchen** und **Schadensersatz in Pauschbeträgen** (§ 12 Abs. 2 BBiG). Eine Klausel „bei Abbruch zahlst du X €" oder „Rückzahlung der Lehrgangskosten" ist deshalb unwirksam — egal, ob du sie unterschrieben hast. Der Rest des Vertrags bleibt gültig. Nur bei einem echten, nachgewiesenen Schaden nach einer unberechtigten Vertragsauflösung kann der Betrieb Ersatz verlangen, und dafür gelten enge Fristen (§ 23 BBiG).',
        laws: [
            { title: '§ 12 Abs. 2 BBiG – Nichtige Vereinbarungen', text: 'Nichtig sind Vereinbarungen über die Verpflichtung Auszubildender, für die Berufsausbildung eine Entschädigung zu zahlen, Vertragsstrafen, den Ausschluss oder die Beschränkung von Schadensersatzansprüchen und die Festsetzung von Schadensersatz in Pauschbeträgen.' },
            { title: '§ 23 BBiG – Schadensersatz', text: 'Wird das Berufsausbildungsverhältnis nach der Probezeit vorzeitig gelöst, können Schadensersatzansprüche nur innerhalb von drei Monaten nach Beendigung geltend gemacht werden.' }
        ],
        tips: [
            'Unterschreibe keine Rückzahlungsvereinbarung — sie wäre ohnehin nichtig.',
            'Wird Geld von deiner letzten Vergütung einbehalten, fordere es schriftlich zurück.',
            'Lass den Vertrag bei der IHK/HWK prüfen — sie trägt ihn nur ein, wenn er rechtmäßig ist.',
            'Fortbildungen NACH der Ausbildung können anders geregelt sein.'
        ],
        email: {
            subject: 'Rückzahlungsforderung Ausbildungskosten',
            body: `Sehr geehrte/r [Name],

Sie fordern von mir die Zahlung von [X €] für [Ausbildungskosten / Vertragsstrafe]. Vereinbarungen, nach denen Auszubildende für ihre Berufsausbildung eine Entschädigung zahlen oder eine Vertragsstrafe leisten, sind nach § 12 Abs. 2 BBiG nichtig.

Ich weise die Forderung daher zurück und bitte um Auszahlung des einbehaltenen Betrags bis [Datum].

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'lehrgeld',
        cat: 'geld',
        title: '"Für den Ausbildungsplatz zahlst du eine Gebühr."',
        desc: 'Du sollst Lehrgeld, Schulgeld oder eine Gebühr für den Ausbildungsplatz zahlen.',
        law: '§ 12 Abs. 2 Nr. 1 BBiG / § 17 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein — bei einer dualen Ausbildung zahlst du nichts, du wirst bezahlt.',
        verdictDetail: 'In einer **dualen Ausbildung nach BBiG oder Handwerksordnung** hast du Anspruch auf eine **angemessene Vergütung** (§ 17 BBiG), und jede Vereinbarung, nach der du für die Ausbildung etwas zahlen musst, ist **nichtig** (§ 12 Abs. 2 Nr. 1 BBiG). „Lehrgeld" gibt es seit Jahrzehnten nicht mehr. Anders ist es bei **schulischen Ausbildungen** an privaten Schulen (z. B. manche Gesundheits- oder Gestaltungsberufe): Dort kann Schulgeld anfallen, weil kein Ausbildungsvertrag mit einem Betrieb besteht. Prüf also, ob dein Vertrag ein Berufsausbildungsvertrag ist, der bei der Kammer eingetragen wird.',
        laws: [
            { title: '§ 12 Abs. 2 Nr. 1 BBiG – Nichtig', text: 'Nichtig ist eine Vereinbarung über die Verpflichtung Auszubildender, für die Berufsausbildung eine Entschädigung zu zahlen.' },
            { title: '§ 17 Abs. 1 BBiG – Vergütung', text: 'Ausbildende haben Auszubildenden eine angemessene Vergütung zu gewähren.' }
        ],
        tips: [
            'Zahle nichts im Voraus — seriöse Ausbildungsbetriebe verlangen kein Geld.',
            'Frag nach, ob der Vertrag bei IHK/HWK eingetragen wird.',
            'Bei schulischen Ausbildungen: Schulgeld-Erstattung oder BAföG prüfen.',
            'Verdacht auf Abzocke? Kammer oder Verbraucherzentrale informieren.'
        ]
    },
    {
        id: 'kost-und-logis',
        cat: 'geld',
        title: '"Essen und Zimmer ziehen wir dir von der Vergütung ab."',
        desc: 'Der Betrieb stellt Unterkunft oder Verpflegung und rechnet sie gegen deine Vergütung.',
        law: '§ 17 Abs. 6 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Erlaubt — aber höchstens zu Sachbezugswerten und nie mehr als 75 % der Vergütung.',
        verdictDetail: 'Sachleistungen wie **Unterkunft** oder **Verpflegung** dürfen auf die Vergütung angerechnet werden, aber nur zu den amtlichen **Sachbezugswerten** der Sozialversicherung — nicht zu einem frei erfundenen Preis — und **höchstens bis 75 % der Bruttovergütung** (§ 17 Abs. 6 BBiG). Mindestens ein Viertel muss dir also immer in Geld bleiben. Das muss vereinbart sein, in der Regel im Ausbildungsvertrag. Kannst du die Sachleistung aus einem berechtigten Grund nicht nutzen (z. B. weil du krank zu Hause bist), wird sie dir in Geld abgegolten (§ 19 Abs. 2 BBiG). Das kommt vor allem in Hotellerie, Gastronomie und Landwirtschaft vor.',
        laws: [
            { title: '§ 17 Abs. 6 BBiG – Sachleistungen', text: 'Sachleistungen können in Höhe der nach dem SGB IV festgesetzten Sachbezugswerte angerechnet werden, jedoch nicht über 75 Prozent der Bruttovergütung hinaus.' },
            { title: '§ 19 Abs. 2 BBiG – Abgeltung', text: 'Können Auszubildende während der Zeit, für die die Vergütung fortzuzahlen ist, aus berechtigtem Grund Sachleistungen nicht abnehmen, sind diese nach den Sachbezugswerten abzugelten.' }
        ],
        tips: [
            'Schau in die Abrechnung: Der Abzug muss als Sachbezug ausgewiesen sein.',
            'Vergleiche mit den aktuellen Sachbezugswerten (Sozialversicherungsentgeltverordnung).',
            'Rechne nach: Mindestens 25 % deiner Bruttovergütung müssen in Geld ausgezahlt werden.',
            'Wurde nichts vereinbart, darf auch nichts abgezogen werden.'
        ],
        email: {
            subject: 'Anrechnung von Sachleistungen',
            body: `Sehr geehrte/r [Name des Ausbilders],

in meiner Abrechnung für [Monat] wurden [X €] für [Unterkunft / Verpflegung] abgezogen. Nach § 17 Abs. 6 BBiG dürfen Sachleistungen höchstens zu den amtlichen Sachbezugswerten und nicht über 75 % der Bruttovergütung hinaus angerechnet werden.

Ich bitte um Prüfung und Erläuterung der Berechnung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'weihnachtsgeld-azubi',
        cat: 'geld',
        title: '"Weihnachtsgeld bekommen nur die Festangestellten."',
        desc: 'Alle im Betrieb bekommen Weihnachts- oder Urlaubsgeld, nur die Azubis nicht.',
        law: 'Tarifvertrag / betriebliche Übung / Gleichbehandlungsgrundsatz',
        severity: 1,
        verdict: 'jein',
        verdictShort: 'Ein gesetzlicher Anspruch fehlt — aber Tarif, Vertrag oder Gleichbehandlung können ihn geben.',
        verdictDetail: 'Ein **gesetzliches** Weihnachts- oder Urlaubsgeld gibt es nicht. Ein Anspruch kann sich aber ergeben aus: einem **Tarifvertrag** (oft auch ausdrücklich für Azubis), deinem **Ausbildungsvertrag**, einer **Betriebsvereinbarung** oder einer **betrieblichen Übung** (der Betrieb zahlt mehrere Jahre vorbehaltlos). Zahlt der Betrieb freiwillig, muss er den **Gleichbehandlungsgrundsatz** beachten: Er darf Gruppen nur aus einem **sachlichen Grund** ausnehmen. Ein solcher Grund kann im unterschiedlichen Zweck der Zahlung liegen (z. B. Belohnung für Betriebstreue), ein bloßes „Azubis kriegen nichts" reicht nicht immer.',
        laws: [
            { title: 'Gleichbehandlungsgrundsatz (BAG)', text: 'Gewährt der Arbeitgeber freiwillige Leistungen nach einem erkennbaren System, darf er einzelne Beschäftigte oder Gruppen nicht ohne sachlichen Grund ausnehmen.' },
            { title: '§ 10 Abs. 2 BBiG – Anwendbares Recht', text: 'Auf den Berufsausbildungsvertrag sind die für den Arbeitsvertrag geltenden Rechtsvorschriften und Rechtsgrundsätze anzuwenden.' }
        ],
        tips: [
            'Schau in Tarifvertrag und Ausbildungsvertrag nach „Jahressonderzahlung".',
            'Frag den Betriebsrat, ob es eine Betriebsvereinbarung gibt.',
            'Frag freundlich nach dem Grund, warum Azubis ausgenommen sind.',
            'Hat der Betrieb Azubis früher mitbezahlt, kann eine betriebliche Übung bestehen.'
        ]
    },
    {
        id: 'fahrtkosten-arbeit',
        cat: 'geld',
        title: '"Die Fahrt zur Arbeit zahlt dir keiner."',
        desc: 'Du pendelst täglich in den Betrieb und fragst dich, ob dir dafür etwas zusteht.',
        law: '§ 9 Abs. 1 Nr. 4 EStG / § 3 Nr. 15 EStG',
        severity: 1,
        verdict: 'ja',
        verdictShort: 'Stimmt meist — aber über die Steuer bekommst du etwas zurück.',
        verdictDetail: 'Der Weg von zu Hause zum Betrieb ist grundsätzlich **Privatsache**; der Betrieb muss ihn nicht bezahlen, außer Tarif- oder Ausbildungsvertrag sehen das vor. Viele Betriebe zahlen aber freiwillig ein **Jobticket** oder einen Zuschuss — für öffentliche Verkehrsmittel **steuerfrei** (§ 3 Nr. 15 EStG). Über deine **Steuererklärung** kannst du die **Entfernungspauschale** ansetzen: seit 2026 **38 Cent je Kilometer** der einfachen Strecke, ab dem ersten Kilometer (§ 9 Abs. 1 Nr. 4 EStG). Das lohnt sich vor allem, wenn Lohnsteuer einbehalten wurde. Fahrten zu wechselnden Einsatzorten oder zu überbetrieblichen Lehrgängen sind etwas anderes (siehe „Fahrtzeit zur Außenstelle").',
        laws: [
            { title: '§ 9 Abs. 1 Nr. 4 EStG – Entfernungspauschale', text: 'Für die Wege zwischen Wohnung und erster Tätigkeitsstätte ist für jeden Arbeitstag eine Entfernungspauschale je vollen Kilometer der Entfernung anzusetzen (seit 2026: 0,38 Euro ab dem ersten Kilometer).' },
            { title: '§ 3 Nr. 15 EStG – Jobticket', text: 'Steuerfrei sind Zuschüsse des Arbeitgebers zu Fahrten mit öffentlichen Verkehrsmitteln, die zusätzlich zum ohnehin geschuldeten Arbeitslohn gezahlt werden.' }
        ],
        tips: [
            'Frag nach einem Jobticket oder Fahrtkostenzuschuss — viele Betriebe zahlen freiwillig.',
            'Mach eine Steuererklärung: Als Azubi bekommst du einbehaltene Lohnsteuer oft komplett zurück.',
            'Notiere deine Arbeitstage und die Strecke für die Entfernungspauschale.'
        ]
    },
    {
        id: 'kindergeld-bab',
        cat: 'geld',
        title: '"Als Azubi bekommst du kein Kindergeld mehr."',
        desc: 'Du verdienst jetzt selbst Geld und fragst dich, was mit Kindergeld und Zuschüssen ist.',
        law: '§ 32 Abs. 4 EStG / §§ 56 ff. SGB III',
        severity: 1,
        verdict: 'nein',
        verdictShort: 'Doch — in der ersten Ausbildung gibt es Kindergeld, egal wie viel du verdienst.',
        verdictDetail: 'Für Kinder in der **ersten Berufsausbildung** gibt es **Kindergeld bis zum 25. Geburtstag**, und zwar **unabhängig von der Höhe deiner Ausbildungsvergütung** (§ 32 Abs. 4 EStG). Ausgezahlt wird es in der Regel an deine Eltern, die es dir weitergeben können. Wohnst du wegen der Ausbildung **nicht mehr bei deinen Eltern**, weil der Betrieb zu weit weg ist, kannst du **Berufsausbildungsbeihilfe (BAB)** bei der Agentur für Arbeit beantragen (§§ 56 ff. SGB III); ob und wie viel du bekommst, hängt von deinem und dem Einkommen deiner Eltern ab. Für eine eigene Wohnung kann außerdem Wohngeld infrage kommen.',
        laws: [
            { title: '§ 32 Abs. 4 EStG – Kinder in Ausbildung', text: 'Ein Kind, das das 18., aber noch nicht das 25. Lebensjahr vollendet hat, wird berücksichtigt, wenn es für einen Beruf ausgebildet wird; in der Erstausbildung ohne Prüfung einer Erwerbstätigkeit.' },
            { title: '§ 56 SGB III – Berufsausbildungsbeihilfe', text: 'Auszubildende haben Anspruch auf Berufsausbildungsbeihilfe während einer förderungsfähigen Berufsausbildung, wenn sie zum förderungsberechtigten Personenkreis gehören und ihnen die erforderlichen Mittel nicht anderweitig zur Verfügung stehen.' }
        ],
        tips: [
            'Deine Eltern müssen der Familienkasse den Ausbildungsbeginn melden — Ausbildungsvertrag beifügen.',
            'BAB-Rechner der Arbeitsagentur nutzen, bevor du den Antrag stellst.',
            'BAB möglichst vor Ausbildungsbeginn beantragen — rückwirkend gibt es nur wenig.',
            'Nach der ersten Ausbildung gelten für Kindergeld strengere Regeln.'
        ]
    },
    {
        id: 'probezeit-weniger-geld',
        cat: 'geld',
        title: '"In der Probezeit gibt es weniger Geld."',
        desc: 'Der Betrieb will in den ersten Monaten eine geringere Vergütung zahlen.',
        law: '§ 17 BBiG / § 25 BBiG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Nein — die volle Vergütung gilt ab dem ersten Tag.',
        verdictDetail: 'Die Probezeit ist Teil der Ausbildung, und die vereinbarte, **angemessene Vergütung** gilt **ab dem ersten Tag** (§ 17 BBiG). Eine niedrigere „Probezeit-Vergütung" unter dem Mindestbetrag deines Jahrgangs oder unter dem geltenden Tarif ist unzulässig, und Vereinbarungen zu deinen Ungunsten sind **nichtig** (§ 25 BBiG). Die Vergütung steigt erst mit dem **Ausbildungsjahr**, nicht mit dem Ende der Probezeit. Hast du zu wenig bekommen, kannst du die Differenz nachfordern.',
        laws: [
            { title: '§ 17 Abs. 1 BBiG – Vergütung', text: 'Ausbildende haben Auszubildenden eine angemessene Vergütung zu gewähren; sie steigt mit fortschreitender Ausbildung, mindestens jährlich.' },
            { title: '§ 25 BBiG – Unabdingbarkeit', text: 'Eine Vereinbarung, die zuungunsten Auszubildender von den Vorschriften dieses Teils abweicht, ist nichtig.' }
        ],
        tips: [
            'Vergleiche deine erste Abrechnung mit der Vergütung im Ausbildungsvertrag.',
            'Prüfe, ob sie mindestens dem Mindestbetrag deines Beginn-Jahres entspricht.',
            'Fordere eine Differenz schriftlich nach — mit Monat und Betrag.',
            'Die IHK/HWK hilft, wenn der Betrieb nicht einlenkt.'
        ],
        email: {
            subject: 'Höhe meiner Ausbildungsvergütung während der Probezeit',
            body: `Sehr geehrte/r [Name des Ausbilders],

für die Monate [Monate] wurde mir eine Vergütung von [X €] gezahlt, während mein Ausbildungsvertrag [Y €] vorsieht. Eine geringere Vergütung während der Probezeit ist nach §§ 17, 25 BBiG nicht zulässig.

Ich bitte um Nachzahlung der Differenz von insgesamt [Z €] mit der nächsten Abrechnung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ════════════════════════════════════════════════════════════
    //  KÜNDIGUNG — weitere Szenarien
    // ════════════════════════════════════════════════════════════
    {
        id: 'kuendigung-probezeit',
        cat: 'kuendigung',
        title: '"In der Probezeit fliegst du jederzeit raus."',
        desc: 'Du bist noch in der Probezeit und der Chef droht mit jederzeitiger Kündigung.',
        law: '§ 22 Abs. 1 BBiG / § 20 BBiG',
        severity: 2,
        verdict: 'ja',
        verdictShort: 'Stimmt — aber die Probezeit ist auf 1–4 Monate begrenzt!',
        verdictDetail: 'Während der Probezeit kann das Ausbildungsverhältnis von beiden Seiten jederzeit ohne Frist und ohne Begründung gekündigt werden (§ 22 Abs. 1 BBiG). ABER: Probezeit muss zwischen 1 und 4 Monaten liegen (§ 20 BBiG) — länger ist unzulässig. Sobald die Probezeit vorbei ist, kann der Betrieb nur noch aus **wichtigem Grund** kündigen. Kündigungen wegen Diskriminierung sind auch in der Probezeit verboten (§ 7 AGG). Auch in der Probezeit muss die Kündigung **schriftlich** erfolgen — per WhatsApp oder E-Mail ist sie unwirksam (§ 22 Abs. 3 BBiG).',
        laws: [
            { title: '§ 20 BBiG – Probezeit', text: 'Das Berufsausbildungsverhältnis beginnt mit der Probezeit. Sie muss mindestens einen Monat und darf höchstens vier Monate betragen.' },
            { title: '§ 22 Abs. 1 BBiG – Kündigung Probezeit', text: 'Während der Probezeit kann das Berufsausbildungsverhältnis jederzeit ohne Einhalten einer Kündigungsfrist gekündigt werden.' }
        ],
        tips: [
            'Probezeit-Ende notieren (4 Monate nach Vertragsbeginn = Spätestens).',
            'Kündigung muss SCHRIFTLICH erfolgen — mündlich ist unwirksam (§ 22 Abs. 3 BBiG, § 623 BGB).',
            'Bei AGG-Verstoß (Diskriminierung): Kündigung anfechtbar, Schadensersatz möglich.',
            'JAV / Betriebsrat können bei Kündigungen angehört werden (§ 102 BetrVG).'
        ],
        email: {
            subject: 'Klärung des Probezeit-Endes',
            body: `Sehr geehrte/r [Name des Ausbilders],

mein Ausbildungsverhältnis hat am [Datum] begonnen. Nach § 20 BBiG endet die Probezeit damit spätestens am [Datum + 4 Monate].

Bitte bestätigen Sie mir das vereinbarte Probezeit-Ende und teilen mit, ob es Bedenken hinsichtlich meiner Eignung gibt, damit ich diese ausräumen kann.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'kuendigung-aus-wichtigem-grund',
        cat: 'kuendigung',
        title: '"Einmal zu spät → fristlose Kündigung!"',
        desc: 'Nach kleineren Verfehlungen droht der Betrieb mit fristloser Kündigung aus wichtigem Grund.',
        law: '§ 22 Abs. 2 Nr. 1 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Wichtiger Grund = schwerer Pflichtenverstoß + meist vorherige Abmahnung!',
        verdictDetail: 'Nach der Probezeit ist eine **fristlose Kündigung** nur aus wichtigem Grund möglich (§ 22 Abs. 2 Nr. 1 BBiG). Wichtiger Grund = schwere Pflichtverletzung, bei der dem AG die Fortsetzung des Ausbildungsverhältnisses nicht zumutbar ist. Typisch: Diebstahl, wiederholte unentschuldigte Fehlzeiten, körperliche Gewalt. **Voraussetzung in der Regel: vorherige Abmahnung**. Einmaliges Zuspätkommen reicht nicht. Frist: spätestens 2 Wochen nach Kenntnis des Grunds (§ 22 Abs. 4 BBiG).',
        laws: [
            { title: '§ 22 Abs. 2 Nr. 1 BBiG – Außerordentliche Kündigung', text: 'Nach der Probezeit kann das Berufsausbildungsverhältnis nur aus einem wichtigen Grund ohne Einhalten einer Kündigungsfrist gekündigt werden.' },
            { title: '§ 22 Abs. 3 BBiG – Schriftform + Grund', text: 'Die Kündigung muss schriftlich und in den Fällen des Absatzes 2 unter Angabe der Kündigungsgründe erfolgen.' },
            { title: '§ 22 Abs. 4 BBiG – 2-Wochen-Frist', text: 'Eine Kündigung aus wichtigem Grund ist unwirksam, wenn die ihr zugrunde liegenden Tatsachen dem zur Kündigung Berechtigten länger als zwei Wochen bekannt sind.' }
        ],
        tips: [
            'Kündigungsschreiben prüfen: schriftlich? Grund angegeben? Datum?',
            '2-Wochen-Frist seit Kenntnis vom Grund — sonst Kündigung unwirksam.',
            'Bei wirtschaftlich-existenziellem Konflikt: SOFORT Klage beim Arbeitsgericht (3 Wochen Frist, § 4 KSchG analog § 22 BBiG).',
            'Schlichtungsausschuss der IHK vor Klage — oft Pflicht, hilft bei Einigung.'
        ],
        email: {
            subject: 'Erhalt der Kündigung — Rückfragen',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich habe am [Datum] Ihre Kündigung aus wichtigem Grund erhalten.

Damit ich die Wirksamkeit prüfen kann, bitte ich Sie um:
1) Eindeutige Bezeichnung des wichtigen Grundes (§ 22 Abs. 3 BBiG),
2) Angabe, wann Sie von dem Sachverhalt Kenntnis erhielten (§ 22 Abs. 4 BBiG: 2-Wochen-Frist),
3) Eventuell vorausgegangene Abmahnungen.

Ich behalte mir die Anrufung des Schlichtungsausschusses und ggf. die Klage vor dem Arbeitsgericht vor.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'schlichtungsausschuss-ihk',
        cat: 'kuendigung',
        title: '"Klagen kannst du gerne, da hast du keine Chance."',
        desc: 'Du willst gegen Kündigung, Vergütung oder anderen Streit vorgehen — der Betrieb winkt ab.',
        law: '§ 111 Abs. 2 ArbGG',
        severity: 2,
        verdict: 'ja',
        verdictShort: 'IHK/HWK haben Schlichtungsausschüsse — kostenlos und vor Klage!',
        verdictDetail: 'Gibt es bei deiner Kammer einen **Schlichtungsausschuss** für Ausbildungsstreitigkeiten, musst du ihn vor einer Klage beim Arbeitsgericht anrufen (§ 111 Abs. 2 ArbGG). Das Verfahren ist kostenfrei und meist schneller als ein Prozess. Der Spruch des Ausschusses wird nur wirksam, wenn **beide Seiten ihn innerhalb einer Woche anerkennen**; dann kann daraus vollstreckt werden. Wird er nicht anerkannt, kannst du innerhalb von **zwei Wochen** nach dem Spruch Klage beim Arbeitsgericht erheben.',
        laws: [
            { title: '§ 111 Abs. 2 ArbGG – Schlichtungsausschuss', text: 'In Streitigkeiten aus einem bestehenden Berufsausbildungsverhältnis kann die Anrufung des Arbeitsgerichts erst dann erfolgen, wenn vorher der Ausschuss zur Behandlung der Streitigkeit angerufen worden ist.' }
        ],
        tips: [
            'Anlaufstelle: IHK / Handwerkskammer deiner Region (siehe ihk.de / hwk.de).',
            'Kostenlos, in den meisten Fällen ohne Anwaltszwang.',
            'Bei Kündigungsstreit: trotzdem 3-Wochen-Frist beachten (§ 4 KSchG).',
            'Gewerkschafts-Mitglieder bekommen oft Rechtsschutz und Beratung dazu.'
        ],
        email: {
            subject: 'Anrufung des Schlichtungsausschusses',
            body: `Sehr geehrte Damen und Herren der [IHK/HWK Region],

ich rufe hiermit gemäß § 111 Abs. 2 ArbGG den Schlichtungsausschuss in folgender Streitigkeit aus dem Berufsausbildungsverhältnis an:

Beteiligte:
- Auszubildende/r: [Name, Anschrift]
- Ausbildungsbetrieb: [Firma, Anschrift]

Streitgegenstand: [kurze Sachverhaltsschilderung]

Antrag: [konkrete Forderung]

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'nach-pruefung-weiterarbeiten',
        cat: 'kuendigung',
        title: '"Bestanden? Dann arbeite erstmal weiter, Vertrag kommt später."',
        desc: 'Du hast die Abschlussprüfung bestanden und arbeitest ohne neuen Vertrag weiter.',
        law: '§ 21 Abs. 2 BBiG / § 24 BBiG',
        severity: 2,
        verdict: 'ja',
        verdictShort: 'Dann hast du automatisch einen unbefristeten Arbeitsvertrag.',
        verdictDetail: 'Die Ausbildung endet mit der **Bekanntgabe des Prüfungsergebnisses**, wenn du vor dem vertraglichen Ende bestehst (§ 21 Abs. 2 BBiG). Arbeitest du danach **weiter**, ohne dass ausdrücklich etwas anderes vereinbart wurde, entsteht automatisch ein **Arbeitsverhältnis auf unbestimmte Zeit** (§ 24 BBiG) — mit Gehalt als Fachkraft statt Ausbildungsvergütung. Ein später nachgeschobener befristeter Vertrag ändert daran nichts mehr, weil eine Befristung vor Arbeitsbeginn schriftlich vereinbart sein muss. Dein Gehalt richtet sich dann nach Tarif, Vereinbarung oder dem, was im Betrieb für vergleichbare Fachkräfte üblich ist.',
        laws: [
            { title: '§ 21 Abs. 2 BBiG – Ende', text: 'Bestehen Auszubildende vor Ablauf der Ausbildungszeit die Abschlussprüfung, so endet das Berufsausbildungsverhältnis mit Bekanntgabe des Ergebnisses durch den Prüfungsausschuss.' },
            { title: '§ 24 BBiG – Weiterarbeit', text: 'Werden Auszubildende im Anschluss an das Berufsausbildungsverhältnis beschäftigt, ohne dass hierüber ausdrücklich etwas vereinbart worden ist, so gilt ein Arbeitsverhältnis auf unbestimmte Zeit als begründet.' },
            { title: '§ 14 Abs. 4 TzBfG – Schriftform', text: 'Die Befristung eines Arbeitsvertrages bedarf zu ihrer Wirksamkeit der Schriftform.' }
        ],
        tips: [
            'Notiere das Datum, an dem dir das Ergebnis bekannt gegeben wurde.',
            'Ab dann steht dir Fachkraft-Gehalt zu — nicht mehr Ausbildungsvergütung.',
            'Unterschreibe einen nachträglich vorgelegten befristeten Vertrag nicht ungeprüft.',
            'Lass dir die Weiterbeschäftigung schriftlich bestätigen.'
        ],
        email: {
            subject: 'Weiterbeschäftigung nach bestandener Abschlussprüfung',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum] wurde mir das Ergebnis meiner bestandenen Abschlussprüfung bekannt gegeben. Seitdem bin ich ohne gesonderte Vereinbarung weiter im Betrieb tätig.

Nach § 24 BBiG ist damit ein Arbeitsverhältnis auf unbestimmte Zeit entstanden. Ich bitte um schriftliche Bestätigung sowie um Mitteilung meines Gehalts ab dem [Datum].

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'bleibeverpflichtung',
        cat: 'kuendigung',
        title: '"Nach der Ausbildung bleibst du zwei Jahre bei uns — steht im Vertrag."',
        desc: 'Der Ausbildungsvertrag verpflichtet dich, nach dem Abschluss im Betrieb zu bleiben.',
        law: '§ 12 Abs. 1 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Eine solche Klausel ist nichtig — außer in den letzten sechs Monaten freiwillig vereinbart.',
        verdictDetail: 'Vereinbarungen, die dich für die Zeit **nach der Ausbildung** in deiner beruflichen Tätigkeit **beschränken**, sind **nichtig** (§ 12 Abs. 1 BBiG). Darunter fallen Bleibeklauseln, Wettbewerbsverbote und „du darfst nicht zur Konkurrenz". Du darfst nach der Ausbildung frei wählen, wo du arbeitest. **Einzige Ausnahme:** Du verpflichtest dich **innerhalb der letzten sechs Monate** der Ausbildung freiwillig, danach ein Arbeitsverhältnis mit deinem Ausbildungsbetrieb einzugehen. Eine Klausel, die schon beim Vertragsschluss unterschrieben wurde, gilt nicht.',
        laws: [
            { title: '§ 12 Abs. 1 BBiG – Nichtige Vereinbarungen', text: 'Eine Vereinbarung, die Auszubildende für die Zeit nach Beendigung des Berufsausbildungsverhältnisses in der Ausübung ihrer beruflichen Tätigkeit beschränkt, ist nichtig. Dies gilt nicht, wenn sich Auszubildende innerhalb der letzten sechs Monate verpflichten, danach mit den Ausbildenden ein Arbeitsverhältnis einzugehen.' }
        ],
        tips: [
            'Eine Bleibeklausel aus dem Ausbildungsvertrag kannst du ignorieren.',
            'Bekommst du in den letzten sechs Monaten ein Angebot, prüf Gehalt und Dauer in Ruhe.',
            'Auch Rückzahlungsdrohungen für den Fall, dass du gehst, sind nichtig (§ 12 Abs. 2 BBiG).',
            'Willst du bleiben? Dann verhandle das Angebot selbstbewusst.'
        ]
    },
    {
        id: 'selbst-kuendigen',
        cat: 'kuendigung',
        title: '"Du willst aufhören? Das geht nicht so einfach."',
        desc: 'Du willst die Ausbildung abbrechen oder in einen anderen Beruf oder Betrieb wechseln.',
        law: '§ 22 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Du kannst kündigen — wie, hängt von Probezeit und Grund ab.',
        verdictDetail: '**In der Probezeit** kannst du jederzeit **ohne Frist und ohne Begründung** kündigen (§ 22 Abs. 1 BBiG). **Danach** hast du zwei Wege: Mit einer Frist von **vier Wochen**, wenn du die **Ausbildung ganz aufgibst** oder dich für einen **anderen Beruf** ausbilden lassen willst (§ 22 Abs. 2 Nr. 2 BBiG), oder **fristlos aus wichtigem Grund**, etwa bei schweren Pflichtverletzungen des Betriebs (Nr. 1). Willst du **denselben Beruf in einem anderen Betrieb** lernen, ist das kein Kündigungsgrund nach Nr. 2 — dann geht es über einen **Aufhebungsvertrag** im Einvernehmen oder einen wichtigen Grund. Die Kündigung muss immer **schriftlich** sein, nach der Probezeit mit Angabe der Gründe (§ 22 Abs. 3 BBiG). Bist du minderjährig, müssen deine Eltern unterschreiben.',
        laws: [
            { title: '§ 22 Abs. 1 BBiG – Probezeit', text: 'Während der Probezeit kann das Berufsausbildungsverhältnis jederzeit ohne Einhalten einer Kündigungsfrist gekündigt werden.' },
            { title: '§ 22 Abs. 2 BBiG – Nach der Probezeit', text: 'Nach der Probezeit kann nur gekündigt werden aus einem wichtigen Grund ohne Kündigungsfrist oder von Auszubildenden mit einer Kündigungsfrist von vier Wochen, wenn sie die Berufsausbildung aufgeben oder sich für eine andere Berufstätigkeit ausbilden lassen wollen.' },
            { title: '§ 22 Abs. 3 BBiG – Form', text: 'Die Kündigung muss schriftlich und in den Fällen des Absatzes 2 unter Angabe der Kündigungsgründe erfolgen; die elektronische Form ist ausgeschlossen.' }
        ],
        tips: [
            'Sprich vorher mit der IHK/HWK-Ausbildungsberatung — oft gibt es eine Lösung.',
            'Für einen Betriebswechsel im selben Beruf: Aufhebungsvertrag und neuer Vertrag, Zeit wird angerechnet.',
            'Kündigung auf Papier, unterschrieben, Zugang belegen (Übergabe mit Zeugen oder Einwurf-Einschreiben).',
            'Achte auf Sperrzeiten beim Arbeitslosengeld, wenn du ohne Anschluss gehst.'
        ],
        email: {
            subject: 'Kündigung meines Berufsausbildungsverhältnisses (Vorlage für den Brief)',
            body: `[Dein Name, Anschrift]
[Name des Betriebs, Anschrift]
[Ort, Datum]

Kündigung des Berufsausbildungsverhältnisses

Sehr geehrte/r [Name],

hiermit kündige ich mein Berufsausbildungsverhältnis vom [Datum Vertrag] fristgerecht mit einer Frist von vier Wochen zum [Datum].

Grund: Ich gebe die Berufsausbildung auf / Ich möchte mich für die Berufstätigkeit als [anderer Beruf] ausbilden lassen (§ 22 Abs. 2 Nr. 2 BBiG).

Bitte bestätigen Sie mir den Erhalt dieser Kündigung und stellen Sie mir ein Ausbildungszeugnis aus (§ 16 BBiG).

Mit freundlichen Grüßen
[Unterschrift]
[ggf. Unterschrift der Erziehungsberechtigten]`
        }
    },
    {
        id: 'kuendigung-whatsapp',
        cat: 'kuendigung',
        title: '"Hiermit bist du gekündigt." — per WhatsApp',
        desc: 'Die Kündigung kommt als Nachricht, E-Mail oder nur mündlich.',
        law: '§ 22 Abs. 3 BBiG / § 126 BGB',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Unwirksam — eine Kündigung muss auf Papier und unterschrieben sein.',
        verdictDetail: 'Eine Kündigung des Ausbildungsverhältnisses muss **schriftlich** erfolgen, und die **elektronische Form ist ausdrücklich ausgeschlossen** (§ 22 Abs. 3 BBiG). Eine Kündigung per **WhatsApp, SMS, E-Mail, Foto eines Briefs oder mündlich** ist deshalb **unwirksam** — dein Ausbildungsverhältnis besteht weiter, ebenso dein Anspruch auf Vergütung. Schriftlich heißt: ein Papier mit **eigenhändiger Unterschrift** (§ 126 BGB). Nach der Probezeit muss die Kündigung außerdem die **Gründe** nennen. Bei Minderjährigen muss sie den Eltern zugehen. Wichtig: Erscheine weiter zur Ausbildung bzw. biete deine Arbeit an, sonst kann es Streit über die Vergütung geben.',
        laws: [
            { title: '§ 22 Abs. 3 BBiG – Form', text: 'Die Kündigung muss schriftlich erfolgen; die elektronische Form ist ausgeschlossen.' },
            { title: '§ 126 Abs. 1 BGB – Schriftform', text: 'Ist durch Gesetz schriftliche Form vorgeschrieben, so muss die Urkunde von dem Aussteller eigenhändig durch Namensunterschrift unterzeichnet werden.' }
        ],
        tips: [
            'Mach einen Screenshot der Nachricht, aber reagiere nicht mit „okay".',
            'Biete deine Arbeit schriftlich weiter an — du bist weiterhin Azubi.',
            'Kommt danach eine schriftliche Kündigung: Frist für eine Klage bzw. den Schlichtungsausschuss beachten.',
            'Sofort Beratung holen: IHK/HWK, Gewerkschaft oder Fachanwalt.'
        ],
        email: {
            subject: 'Ihre Nachricht vom [Datum]',
            body: `Sehr geehrte/r [Name],

Ihre Nachricht vom [Datum] per [WhatsApp / E-Mail] kann mein Ausbildungsverhältnis nicht beenden. Nach § 22 Abs. 3 BBiG muss eine Kündigung schriftlich erfolgen; die elektronische Form ist ausgeschlossen.

Mein Ausbildungsverhältnis besteht daher fort. Ich biete meine Arbeitsleistung weiterhin an und werde am [Datum] wie gewohnt im Betrieb erscheinen.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'uebernahme',
        cat: 'kuendigung',
        title: '"Übernahme? Darauf hast du keinen Anspruch."',
        desc: 'Das Ende der Ausbildung naht, und du weißt nicht, ob du übernommen wirst.',
        law: '§ 78a BetrVG / § 12 Abs. 1 BBiG / Tarifverträge',
        severity: 1,
        verdict: 'jein',
        verdictShort: 'Meist stimmt das — außer für JAV- und Betriebsratsmitglieder oder nach Tarif.',
        verdictDetail: 'Ein **allgemeiner Anspruch** auf Übernahme besteht nicht: Das Ausbildungsverhältnis endet mit dem Bestehen der Prüfung bzw. zum Vertragsende. **Ausnahmen:** Bist du Mitglied der **JAV, des Betriebsrats** oder einer anderen Arbeitnehmervertretung, muss der Betrieb dir **drei Monate vor Ende** schriftlich mitteilen, wenn er dich nicht übernehmen will; verlangst du in den letzten drei Monaten schriftlich die Weiterbeschäftigung, gilt ein unbefristetes Arbeitsverhältnis als begründet (§ 78a BetrVG), außer ein Gericht entscheidet anders. Viele **Tarifverträge** (z. B. Metall- und Elektroindustrie) sehen eine befristete Übernahme vor. Und: Arbeitest du nach dem Ende ohne Absprache weiter, bist du unbefristet angestellt (§ 24 BBiG).',
        laws: [
            { title: '§ 78a Abs. 2 BetrVG – Weiterbeschäftigung', text: 'Verlangt ein Auszubildender, der Mitglied der Jugend- und Auszubildendenvertretung oder des Betriebsrats ist, innerhalb der letzten drei Monate vor Beendigung schriftlich die Weiterbeschäftigung, so gilt ein Arbeitsverhältnis auf unbestimmte Zeit als begründet.' },
            { title: '§ 12 Abs. 1 BBiG – Verpflichtung', text: 'In den letzten sechs Monaten der Ausbildung können sich Auszubildende wirksam verpflichten, danach ein Arbeitsverhältnis mit dem Ausbildungsbetrieb einzugehen.' }
        ],
        tips: [
            'Frag spätestens sechs Monate vor dem Ende nach deinen Chancen.',
            'Schau in den Tarifvertrag nach einer Übernahmeregel.',
            'Als JAV-/Betriebsratsmitglied: Weiterbeschäftigung in den letzten drei Monaten schriftlich verlangen.',
            'Melde dich spätestens drei Monate vor Ende bei der Agentur für Arbeit arbeitsuchend.'
        ]
    },
    {
        id: 'kuendigung-wegen-krankheit',
        cat: 'kuendigung',
        title: '"Du bist zu oft krank — dann müssen wir uns trennen."',
        desc: 'Wegen häufiger Krankheit droht der Betrieb mit Kündigung.',
        law: '§ 22 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'In der Probezeit möglich — danach kaum.',
        verdictDetail: '**In der Probezeit** kann der Betrieb ohne Grund kündigen, also auch wegen Krankheit (§ 22 Abs. 1 BBiG). **Nach der Probezeit** geht eine Kündigung durch den Betrieb nur noch **aus wichtigem Grund** (§ 22 Abs. 2 Nr. 1 BBiG), und **Krankheit ist grundsätzlich kein wichtiger Grund**: Du kannst nichts dafür. Nur in extremen Ausnahmefällen, etwa wenn feststeht, dass das Ausbildungsziel wegen der Krankheit dauerhaft nicht mehr erreicht werden kann, kommt eine Kündigung in Betracht. Langes Fehlen kann allerdings dazu führen, dass die Ausbildung **verlängert** werden muss (§ 8 Abs. 2 BBiG). Vorgetäuschte Krankheit ist dagegen eine schwere Pflichtverletzung.',
        laws: [
            { title: '§ 22 Abs. 2 Nr. 1 BBiG – Wichtiger Grund', text: 'Nach der Probezeit kann das Berufsausbildungsverhältnis vom Ausbildenden nur aus einem wichtigen Grund ohne Einhalten einer Kündigungsfrist gekündigt werden.' },
            { title: '§ 8 Abs. 2 BBiG – Verlängerung', text: 'In Ausnahmefällen kann die zuständige Stelle auf Antrag Auszubildender die Ausbildungszeit verlängern, wenn die Verlängerung erforderlich ist, um das Ausbildungsziel zu erreichen.' }
        ],
        tips: [
            'Melde jede Krankheit korrekt und rechtzeitig — das nimmt dem Betrieb Argumente.',
            'Bei längerer Krankheit: Verlängerung der Ausbildung bei der Kammer beantragen.',
            'Krankheit mit Arbeitsbezug (Allergie, Rücken)? Gesundheitsschutz ansprechen.',
            'Kündigung erhalten? Sofort Beratung holen, Fristen laufen.'
        ]
    },
    {
        id: 'schwangerschaft',
        cat: 'kuendigung',
        title: '"Schwanger in der Ausbildung — das passt hier nicht."',
        desc: 'Du bist schwanger und machst dir Sorgen um deinen Ausbildungsplatz.',
        law: '§ 17 MuSchG / § 7a BBiG / § 8 Abs. 2 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Kündigung verboten — und die Ausbildung lässt sich anpassen.',
        verdictDetail: 'Ab Beginn der Schwangerschaft bis **vier Monate nach der Entbindung** darf der Betrieb dir **nicht kündigen** (§ 17 MuSchG) — auch nicht in der Probezeit, wenn er von der Schwangerschaft weiß oder sie ihm innerhalb von zwei Wochen nach der Kündigung mitgeteilt wird. Das **Mutterschutzgesetz** gilt ausdrücklich auch für Azubis: Es gibt Beschäftigungsverbote für gefährliche Tätigkeiten, die Schutzfristen vor und nach der Geburt und bezahlte Freistellung für Vorsorgeuntersuchungen. Die Ausbildung kann danach in **Teilzeit** weiterlaufen (§ 7a BBiG) oder auf Antrag **verlängert** werden (§ 8 Abs. 2 BBiG); auch Elternzeit ist möglich und verlängert die Ausbildung.',
        laws: [
            { title: '§ 17 Abs. 1 MuSchG – Kündigungsverbot', text: 'Die Kündigung gegenüber einer Frau ist unzulässig während ihrer Schwangerschaft und bis zum Ende von vier Monaten nach der Entbindung, wenn dem Arbeitgeber die Schwangerschaft bekannt ist oder innerhalb von zwei Wochen mitgeteilt wird.' },
            { title: '§ 7a BBiG – Teilzeitausbildung', text: 'Die Berufsausbildung kann in Teilzeit durchgeführt werden; die tägliche oder wöchentliche Ausbildungszeit kann um höchstens 50 Prozent verkürzt werden.' }
        ],
        tips: [
            'Teile die Schwangerschaft dem Betrieb mit, sobald du dich sicher fühlst — erst dann greift der Schutz praktisch.',
            'Lass dir die Gefährdungsbeurteilung für deinen Arbeitsplatz erklären.',
            'Sprich mit der IHK/HWK über Teilzeit oder Verlängerung.',
            'Beratung gibt es auch bei Schwangerenberatungsstellen und der Gewerkschaft.'
        ]
    },
    {
        id: 'insolvenz-betrieb',
        cat: 'kuendigung',
        title: '"Der Betrieb ist pleite — wie geht es mit dir weiter?"',
        desc: 'Dein Ausbildungsbetrieb ist insolvent oder schließt.',
        law: '§§ 165 ff. SGB III / § 22 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Dein Geld ist für drei Monate gesichert — und die Kammer hilft beim Wechsel.',
        verdictDetail: 'Eine Insolvenz beendet dein Ausbildungsverhältnis **nicht automatisch**. Ausstehende Vergütung der letzten **drei Monate vor der Insolvenzeröffnung** zahlt die Agentur für Arbeit als **Insolvenzgeld** (§§ 165 ff. SGB III) — den Antrag musst du innerhalb von **zwei Monaten** stellen. Stellt der Betrieb den Betrieb ganz ein, kann ihm die Ausbildung unmöglich werden; dann ist eine Kündigung aus wichtigem Grund denkbar. Die **IHK/HWK** hilft dir, einen neuen Ausbildungsbetrieb zu finden, und deine bisherige Ausbildungszeit wird **angerechnet**. Wird der Betrieb verkauft, gehst du in der Regel mit auf den neuen Inhaber über.',
        laws: [
            { title: '§ 165 SGB III – Insolvenzgeld', text: 'Beschäftigte haben Anspruch auf Insolvenzgeld für die vorausgehenden drei Monate des Arbeitsverhältnisses, wenn sie bei Eintritt eines Insolvenzereignisses noch Ansprüche auf Arbeitsentgelt haben; Azubis sind eingeschlossen.' },
            { title: '§ 324 Abs. 3 SGB III – Frist', text: 'Insolvenzgeld ist innerhalb einer Ausschlussfrist von zwei Monaten nach dem Insolvenzereignis zu beantragen.' }
        ],
        tips: [
            'Sofort die IHK/HWK informieren — sie kennt offene Ausbildungsplätze.',
            'Insolvenzgeld innerhalb von zwei Monaten beantragen.',
            'Lass dir ein Zwischenzeugnis und eine Bescheinigung über die bisherige Ausbildungszeit geben.',
            'Unterschreibe keinen Aufhebungsvertrag, ohne beraten zu sein.'
        ]
    },
    {
        id: 'probezeit-verlaengert',
        cat: 'kuendigung',
        title: '"Wir verlängern deine Probezeit um drei Monate."',
        desc: 'Kurz vor Ende der Probezeit will der Betrieb sie verlängern.',
        law: '§ 20 BBiG / § 25 BBiG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Höchstens vier Monate — verlängern geht nur bei langer Unterbrechung.',
        verdictDetail: 'Die Probezeit muss **mindestens einen und darf höchstens vier Monate** betragen (§ 20 BBiG). Eine längere Probezeit oder eine Verlängerung über vier Monate hinaus ist unzulässig, Vereinbarungen dazu sind nichtig (§ 25 BBiG). Nach der Rechtsprechung ist nur eine Ausnahme anerkannt: Wurde die Ausbildung während der Probezeit **erheblich unterbrochen** (z. B. lange Krankheit, mehr als ein Drittel der Probezeit) und steht im Vertrag, dass sie sich dann verlängert, kann sie um die Dauer der Unterbrechung länger laufen. Ein „Wir sind noch nicht sicher" reicht nicht. Nach Ablauf der Probezeit kann der Betrieb nur noch aus wichtigem Grund kündigen.',
        laws: [
            { title: '§ 20 BBiG – Probezeit', text: 'Das Berufsausbildungsverhältnis beginnt mit der Probezeit. Sie muss mindestens einen Monat und darf höchstens vier Monate betragen.' },
            { title: '§ 25 BBiG – Unabdingbarkeit', text: 'Eine Vereinbarung, die zuungunsten Auszubildender von den Vorschriften dieses Teils abweicht, ist nichtig.' }
        ],
        tips: [
            'Rechne nach, wann deine Probezeit laut Vertrag endet.',
            'Unterschreibe keine Verlängerung, wenn es keine lange Unterbrechung gab.',
            'Frag nach, was konkret verbessert werden soll — und arbeite daran.',
            'Bei Unsicherheit: IHK/HWK-Ausbildungsberatung anrufen.'
        ],
        email: {
            subject: 'Verlängerung der Probezeit',
            body: `Sehr geehrte/r [Name des Ausbilders],

Sie haben mir vorgeschlagen, meine Probezeit bis [Datum] zu verlängern. Nach § 20 BBiG darf die Probezeit höchstens vier Monate betragen; eine darüber hinausgehende Vereinbarung ist nach § 25 BBiG nichtig.

Gern spreche ich mit Ihnen darüber, was ich in meiner Ausbildung verbessern kann.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ════════════════════════════════════════════════════════════
    //  MOBBING — weitere Szenarien
    // ════════════════════════════════════════════════════════════
    {
        id: 'sexuelle-belaestigung',
        cat: 'mobbing',
        title: '"Stell dich nicht so an, das war doch nur ein Witz."',
        desc: 'Du wirst sexuell belästigt — durch Berührungen, anzügliche Sprüche oder Übergriffe.',
        law: '§ 3 Abs. 4 AGG / § 12 AGG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Sexuelle Belästigung ist verboten — und der Arbeitgeber muss handeln!',
        verdictDetail: 'Sexuelle Belästigung am Arbeitsplatz ist eine Form der Benachteiligung (§ 3 Abs. 4 AGG) und ausdrücklich verboten. Das umfasst: unerwünschte Berührungen, sexuell konnotierte Bemerkungen, Zeigen pornografischer Inhalte, ungewollte Annäherungen — auch wenn sie als "Witz" gemeint waren. Der Arbeitgeber MUSS Schutzmaßnahmen treffen (§ 12 AGG): Abmahnung, Versetzung, Kündigung des Täters. Du hast Beschwerderecht, Schadensersatz, Schmerzensgeld und Leistungsverweigerungsrecht (§ 14 AGG).',
        laws: [
            { title: '§ 3 Abs. 4 AGG – Begriff sexuelle Belästigung', text: 'Eine sexuelle Belästigung ist eine Benachteiligung, wenn ein unerwünschtes, sexuell bestimmtes Verhalten, dazu gehören auch unerwünschte sexuelle Handlungen und Aufforderungen zu diesen, sexuell bestimmte körperliche Berührungen, Bemerkungen sexuellen Inhalts sowie unerwünschtes Zeigen und sichtbares Anbringen von pornographischen Darstellungen, bezweckt oder bewirkt, dass die Würde der betreffenden Person verletzt wird.' },
            { title: '§ 12 AGG – Maßnahmen des Arbeitgebers', text: 'Der Arbeitgeber ist verpflichtet, die erforderlichen Maßnahmen zum Schutz vor Benachteiligungen zu treffen. Bei Verstößen muss er die im Einzelfall geeigneten Maßnahmen ergreifen (Abmahnung, Umsetzung, Versetzung oder Kündigung des Verursachers).' },
            { title: '§ 14 AGG – Leistungsverweigerungsrecht', text: 'Ergreift der Arbeitgeber keine oder offensichtlich ungeeignete Maßnahmen zur Unterbindung einer Belästigung oder sexuellen Belästigung am Arbeitsplatz, sind die betroffenen Beschäftigten berechtigt, ihre Tätigkeit ohne Verlust des Arbeitsentgelts einzustellen.' },
            { title: '§ 15 AGG – Schadensersatz und Entschädigung', text: 'Wegen eines Schadens, der nicht Vermögensschaden ist, kann der oder die Beschäftigte eine angemessene Entschädigung in Geld verlangen.' }
        ],
        tips: [
            'Schaffe Beweise: Datum, Ort, Wortlaut, Zeugen, ggf. Foto/Audio (Vorsicht: heimliche Aufnahmen Dritter sind problematisch).',
            'Beschwerde an Arbeitgeber, JAV, Betriebsrat — Arbeitgeber MUSS handeln (§ 13 AGG).',
            'Anlaufstellen: Antidiskriminierungsstelle des Bundes (antidiskriminierungsstelle.de), Frauennotruf (08000 116 016).',
            'Bei Übergriff: SOFORT Polizei (110). Strafanzeige möglich (§§ 184i, 177 StGB).'
        ],
        email: {
            subject: 'Beschwerde gemäß § 13 AGG — sexuelle Belästigung',
            body: `Sehr geehrte/r [Geschäftsführung / Personalleitung],

hiermit erstatte ich gemäß § 13 AGG Beschwerde wegen sexueller Belästigung am Arbeitsplatz durch [Name der Person].

Sachverhalt:
- Datum: [...]
- Ort: [...]
- Verhalten: [...]
- Zeugen: [...]

Ich fordere Sie auf, gemäß § 12 AGG unverzüglich geeignete Maßnahmen zu treffen, um weitere Belästigungen zu unterbinden. Eine schriftliche Stellungnahme erbitte ich innerhalb von [14 Tagen].

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'anschreien-beleidigung',
        cat: 'mobbing',
        title: '"Bist du zu blöd dafür?" — der Chef schreit dich an.',
        desc: 'Dein Ausbilder oder Kollegen schreien dich an, beleidigen oder demütigen dich.',
        law: '§ 14 Abs. 1 Nr. 5 BBiG / § 84 BetrVG / § 185 StGB',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein — Beleidigungen und Demütigung muss niemand aushalten.',
        verdictDetail: 'Der Betrieb muss dafür sorgen, dass du **charakterlich gefördert** und **nicht gefährdet** wirst (§ 14 Abs. 1 Nr. 5 BBiG). Anschreien, Beleidigungen, Bloßstellen vor anderen oder Drohungen sind damit nicht vereinbar — und können eine **Beleidigung im Sinne des Strafrechts** sein (§ 185 StGB). Du hast ein **Beschwerderecht** (§ 84 BetrVG), auch ohne Betriebsrat, und darfst dafür keine Nachteile erleiden. Kritik an deiner Arbeit ist erlaubt — der Ton nicht. Hält das an, kann es ein wichtiger Grund sein, die Ausbildung zu beenden oder den Betrieb zu wechseln; die Kammer unterstützt dich dabei.',
        laws: [
            { title: '§ 14 Abs. 1 Nr. 5 BBiG – Schutzpflicht', text: 'Ausbildende haben dafür zu sorgen, dass Auszubildende charakterlich gefördert sowie sittlich und körperlich nicht gefährdet werden.' },
            { title: '§ 84 BetrVG – Beschwerderecht', text: 'Jeder Arbeitnehmer hat das Recht, sich bei den zuständigen Stellen des Betriebs zu beschweren, wenn er sich benachteiligt, ungerecht behandelt oder in sonstiger Weise beeinträchtigt fühlt.' },
            { title: '§ 185 StGB – Beleidigung', text: 'Die Beleidigung wird mit Freiheitsstrafe bis zu einem Jahr oder mit Geldstrafe bestraft.' }
        ],
        tips: [
            'Führe ein Protokoll: Datum, Uhrzeit, Wortlaut, Zeugen.',
            'Sag ruhig und klar: „Bitte sprechen Sie in einem normalen Ton mit mir."',
            'Sprich JAV, Betriebsrat oder eine Vertrauensperson an.',
            'Die IHK/HWK-Ausbildungsberatung ist auch dafür zuständig — vertraulich.'
        ],
        email: {
            subject: 'Umgangston am [Datum]',
            body: `Sehr geehrte/r [Name],

am [Datum] wurde ich in [Situation] angeschrien und als [Wortlaut] bezeichnet. Ich nehme Kritik an meiner Arbeit ernst und möchte daraus lernen — einen solchen Umgangston möchte ich aber nicht hinnehmen.

Ich bitte um ein Gespräch, wie wir künftig sachlich miteinander arbeiten können. Gern kann [JAV / Betriebsrat / Vertrauensperson] daran teilnehmen.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },

    // ════════════════════════════════════════════════════════════
    //  SICHERHEIT — neue Kategorie
    // ════════════════════════════════════════════════════════════
    {
        id: 'schutzkleidung',
        cat: 'sicherheit',
        title: '"Sicherheitsschuhe kannst du dir selbst kaufen."',
        desc: 'Der Betrieb verlangt PSA (persönliche Schutzausrüstung), will sie aber nicht stellen.',
        law: '§ 3 ArbSchG / § 14 BBiG Abs. 1 Nr. 3',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'PSA muss der Betrieb kostenlos stellen — IMMER!',
        verdictDetail: 'Persönliche Schutzausrüstung (Sicherheitsschuhe, Helm, Handschuhe, Schutzbrille, Gehörschutz, Atemschutz, Schutzkleidung) muss der Arbeitgeber **kostenlos** zur Verfügung stellen (§ 3 Abs. 3 ArbSchG, § 2 PSA-BV). Bei Azubis zusätzlich aus § 14 Abs. 1 Nr. 3 BBiG (Ausbildungsmittel). Eine Beteiligung des Azubis ist UNZULÄSSIG. Beschäftigung ohne PSA ist eine Ordnungswidrigkeit, bei Unfall haftet der Betrieb.',
        laws: [
            { title: '§ 3 Abs. 3 ArbSchG – Kosten des Arbeitsschutzes', text: 'Kosten für Maßnahmen nach diesem Gesetz darf der Arbeitgeber nicht den Beschäftigten auferlegen.' },
            { title: '§ 14 Abs. 1 Nr. 3 BBiG – Ausbildungsmittel', text: 'Ausbildende haben den Auszubildenden kostenlos die Ausbildungsmittel, insbesondere Werkzeuge und Werkstoffe zur Verfügung zu stellen.' },
            { title: '§ 2 PSA-BV – PSA-Benutzungsverordnung', text: 'Der Arbeitgeber hat persönliche Schutzausrüstungen bereitzustellen, die u.a. den Anforderungen entsprechen.' }
        ],
        tips: [
            'PSA = JEDE Schutzausrüstung — egal ob teuer (Sicherheitsschuhe) oder günstig (Handschuhe).',
            'Auch Reinigung und Ersatz bei Verschleiß zahlt der Betrieb.',
            'Bei Weigerung: Beschwerde an Sicherheitsbeauftragten, Betriebsrat, Berufsgenossenschaft.',
            'Ohne PSA arbeiten: Du darfst die Arbeit verweigern (§ 14 AGG analog).'
        ],
        email: {
            subject: 'Bereitstellung persönlicher Schutzausrüstung',
            body: `Sehr geehrte/r [Name des Ausbilders],

für meine Tätigkeit an [Arbeitsplatz / Maschine] ist [PSA-Typ] zwingend erforderlich. Diese wurde mir bislang nicht zur Verfügung gestellt.

Nach § 3 Abs. 3 ArbSchG und § 14 Abs. 1 Nr. 3 BBiG ist die PSA vom Betrieb kostenlos zu stellen. Ich bitte um Bereitstellung bis [Datum] — andernfalls kann ich die Tätigkeit aus Sicherheitsgründen nicht ausführen.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'gefahrenstoffe',
        cat: 'sicherheit',
        title: '"Misch die Säure mal eben um, dauert keine fünf Minuten."',
        desc: 'Du sollst als Jugendlicher mit Gefahrstoffen, gefährlichen Maschinen oder unter Hitze/Lärm arbeiten.',
        law: '§ 22 JArbSchG / GefStoffV',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Jugendliche dürfen keine gefährlichen Arbeiten ausführen!',
        verdictDetail: 'Jugendliche (unter 18 J.) dürfen NICHT beschäftigt werden mit Arbeiten, die ihre Leistungsfähigkeit übersteigen, sittliche Gefahren bringen oder Gefahren für Leben/Gesundheit ausgehen (§ 22 JArbSchG): gefährliche Stoffe, Lärm > 85 dB, Hitze/Kälte/Nässe in gefahrbringendem Ausmaß, biologische Arbeitsstoffe der Risikogruppe 2-4. AUSNAHME: zur Erreichung des Ausbildungsziels, wenn fachkundige Aufsicht vorhanden ist (§ 22 Abs. 2 JArbSchG).',
        laws: [
            { title: '§ 22 JArbSchG – Gefährliche Arbeiten', text: 'Jugendliche dürfen nicht beschäftigt werden mit Arbeiten, die ihre physische oder psychische Leistungsfähigkeit übersteigen, mit Arbeiten, die sittliche Gefahren mit sich bringen, mit Arbeiten, die mit Unfallgefahren verbunden sind, von denen anzunehmen ist, dass Jugendliche sie wegen mangelnden Sicherheitsbewusstseins oder mangelnder Erfahrung nicht erkennen oder nicht abwenden können.' },
            { title: '§ 22 Abs. 2 JArbSchG – Ausnahme zur Ausbildung', text: 'Absatz 1 gilt nicht für die Beschäftigung Jugendlicher, soweit dies zur Erreichung ihres Ausbildungsziels erforderlich ist und ihr Schutz durch die Aufsicht eines Fachkundigen gewährleistet ist.' }
        ],
        tips: [
            'Liste verbotener Stoffe/Tätigkeiten: TRGS 905 (Gefahrstoffverordnung).',
            'Fachkundige Aufsicht heißt: Person direkt daneben, nicht "im Haus".',
            'Lärm, Vibration, Strahlung → spezifische Grenzwerte in Verordnungen.',
            'Beschäftigungsverbot besteht — kein Verzicht durch Azubi möglich.'
        ],
        email: {
            subject: 'Tätigkeit mit Gefahrstoffen / gefährlichen Arbeiten',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum] wurde ich angewiesen, [Tätigkeit mit Stoff/Maschine] auszuführen.

Als Jugendliche/r unter 18 Jahren unterliege ich dem Beschäftigungsverbot des § 22 JArbSchG. Eine Tätigkeit ist nur unter fachkundiger direkter Aufsicht und zur Erreichung des Ausbildungsziels zulässig.

Ich bitte um Klärung, ob die Voraussetzungen vorliegen, andernfalls um Übertragung einer geeigneten Aufgabe.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'arbeitsunfall',
        cat: 'sicherheit',
        title: '"Pflaster drauf, weitermachen — keine große Sache."',
        desc: 'Du hast dich am Arbeitsplatz verletzt — der Betrieb will das nicht als Unfall melden.',
        law: '§ 193 SGB VII / § 14 ArbSchG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Jeder Arbeitsunfall mit > 3 Tagen AU MUSS gemeldet werden!',
        verdictDetail: 'Ein Arbeitsunfall (auch Wegeunfall) muss vom Arbeitgeber binnen 3 Tagen an die Berufsgenossenschaft (BG) gemeldet werden, wenn er zu mehr als 3 Tagen Arbeitsunfähigkeit führt (§ 193 SGB VII). Bist du über den Unfalltag hinaus arbeitsunfähig oder länger in Behandlung, gehst du zum **Durchgangsarzt** (D-Arzt) — nicht zum Hausarzt. Verbandbuch-Eintrag IMMER (auch bei Bagatellen, 5 Jahre Aufbewahrung). Verzichten oder verschleiern macht den AG haftbar.',
        laws: [
            { title: '§ 193 SGB VII – Unfallanzeige', text: 'Die Unternehmer haben Unfälle von Versicherten in ihren Unternehmen, durch die ein Versicherter getötet oder so verletzt wird, dass er mehr als drei Tage arbeitsunfähig wird, binnen drei Tagen anzuzeigen.' },
            { title: '§ 14 ArbSchG – Aufgaben des Arbeitgebers', text: 'Der Arbeitgeber hat die Beschäftigten über Sicherheit und Gesundheitsschutz bei der Arbeit zu unterweisen.' }
        ],
        tips: [
            'Verbandbuch ist Pflicht — JEDEN Vorfall eintragen lassen (auch Schnitt am Finger).',
            'Bei Verletzung über Pflaster hinaus: D-Arzt aufsuchen (Liste bei BG.de).',
            'BG zahlt Heilbehandlung + Verletztengeld unabhängig vom Verschulden.',
            'Keine Meldung durch AG? Du kannst es selbst der BG melden — kostenfrei.'
        ],
        email: {
            subject: 'Meldung des Arbeitsunfalls vom [Datum]',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum] habe ich mich bei der Arbeit verletzt: [kurze Schilderung]. Es kam zu einer Arbeitsunfähigkeit von [X] Tagen, die ärztliche Behandlung erfolgte beim [D-Arzt].

Ich bitte um folgende Maßnahmen:
1) Eintrag in das Verbandbuch (§ 24 DGUV V 1),
2) Unfallanzeige an die Berufsgenossenschaft (§ 193 SGB VII),
3) Bestätigung mit Kopie der Anzeige an mich.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'sicherheitsbelehrung',
        cat: 'sicherheit',
        title: '"Belehrung? Mach einfach was die Anderen machen."',
        desc: 'Du wirst an Maschinen / Gefahrenbereichen eingesetzt, ohne eine Sicherheitsunterweisung bekommen zu haben.',
        law: '§ 12 ArbSchG / § 29 JArbSchG / § 4 DGUV V 1',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Unterweisung ist Pflicht — vor Tätigkeit, regelmäßig!',
        verdictDetail: 'Der Arbeitgeber muss alle Beschäftigten **vor Aufnahme der Tätigkeit und anschließend mindestens jährlich** über Sicherheit und Gesundheitsschutz unterweisen (§ 12 ArbSchG, § 4 DGUV V 1). Für Jugendliche zusätzlich: **vor erstmaliger Beschäftigung und mindestens halbjährlich** (§ 29 JArbSchG). Inhalte: spezifische Gefahren, Schutzmaßnahmen, Notfallregeln. Dokumentation Pflicht (Unterschrift). Ohne Unterweisung darfst du gefährliche Arbeiten verweigern.',
        laws: [
            { title: '§ 12 ArbSchG – Unterweisung', text: 'Der Arbeitgeber hat die Beschäftigten über Sicherheit und Gesundheitsschutz bei der Arbeit während ihrer Arbeitszeit ausreichend und angemessen zu unterweisen. Die Unterweisung muss bei der Einstellung, bei Veränderungen im Aufgabenbereich, der Einführung neuer Arbeitsmittel oder einer neuen Technologie vor Aufnahme der Tätigkeit der Beschäftigten erfolgen.' },
            { title: '§ 29 JArbSchG – Unterweisung über Unfall- und Gesundheitsgefahren', text: 'Der Arbeitgeber hat den Jugendlichen vor Beginn der Beschäftigung und bei wesentlichen Änderungen der Arbeitsbedingungen über die Unfall- und Gesundheitsgefahren, denen er bei der Beschäftigung ausgesetzt ist, sowie über die Einrichtungen und Maßnahmen zur Abwendung dieser Gefahren zu unterweisen. Er hat die Jugendlichen vor der erstmaligen Beschäftigung an Maschinen oder gefährlichen Arbeitsstellen sowie beim Umgang mit gefährlichen Arbeitsstoffen besonders zu unterweisen. Die Unterweisungen sind in angemessenen Zeitabständen, mindestens aber halbjährlich, zu wiederholen.' }
        ],
        tips: [
            'Frag NACH Unterweisung in Schriftform — Datum, Inhalte, Unterschrift.',
            'Bei fehlender Unterweisung an gefährlichen Stellen: Tätigkeit verweigern → kein Pflichtverstoß.',
            'Halbjährlich für Jugendliche, jährlich für Volljährige.',
            'Auch arbeitsmedizinische Vorsorge (G-Untersuchungen) klären lassen.'
        ],
        email: {
            subject: 'Sicherheitsunterweisung gemäß § 12 ArbSchG / § 29 JArbSchG',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich werde seit dem [Datum] an [Maschine / Tätigkeit] eingesetzt, ohne dass eine Sicherheitsunterweisung erfolgte.

§ 12 ArbSchG (bzw. § 29 JArbSchG für Jugendliche) sieht eine Unterweisung VOR Aufnahme der Tätigkeit und mindestens halbjährliche Wiederholung vor.

Ich bitte um kurzfristige Durchführung und Dokumentation der Unterweisung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'arbeitsmedizinische-untersuchung',
        cat: 'sicherheit',
        title: '"J1-Untersuchung? Brauchst du nicht."',
        desc: 'Du bist Jugendliche/r und sollst arbeiten, ohne dass eine Erstuntersuchung stattgefunden hat.',
        law: '§ 32 JArbSchG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Erstuntersuchung ist Pflicht — ohne Bescheinigung keine Beschäftigung!',
        verdictDetail: 'Jugendliche dürfen nur beschäftigt werden, wenn sie **vor Beginn der Beschäftigung** ärztlich untersucht wurden (Erstuntersuchung, § 32 JArbSchG). Nach einem Jahr Beschäftigung: Nachuntersuchung (§ 33). Die Untersuchungen sind kostenfrei (Bescheinigungs-Erstattung über das Bundesland). Der Arbeitgeber MUSS die Bescheinigung vorliegen haben — sonst Beschäftigungsverbot. Verstöße sind eine Ordnungswidrigkeit (§ 58 JArbSchG).',
        laws: [
            { title: '§ 32 JArbSchG – Erstuntersuchung', text: 'Ein Jugendlicher darf in den ersten zwölf Monaten nach Beginn der Berufsausbildung oder Beschäftigung nur beschäftigt werden, wenn er innerhalb der letzten vierzehn Monate vor Beginn der Beschäftigung von einem Arzt untersucht worden ist und dem Arbeitgeber eine von diesem Arzt ausgestellte Bescheinigung vorliegt.' },
            { title: '§ 33 JArbSchG – Erste Nachuntersuchung', text: 'Nach Ablauf des ersten Beschäftigungsjahres darf der Arbeitgeber den Jugendlichen nur weiterbeschäftigen, wenn dieser sich innerhalb der letzten drei Monate hat nachuntersuchen lassen.' }
        ],
        tips: [
            'Untersuchung kostenfrei beim Hausarzt oder beim Betriebsarzt.',
            'Bescheinigung (gelb-rosa-grün-Schein) sicher aufbewahren.',
            'Nachuntersuchung nach 1 Jahr — Termin selbst beobachten.',
            'Bei fehlender Bescheinigung: Du darfst rechtmäßig nicht arbeiten.'
        ],
        email: {
            subject: 'Erstuntersuchung gemäß § 32 JArbSchG',
            body: `Sehr geehrte/r [Name des Ausbilders],

zur Klärung meiner Beschäftigungsfähigkeit: Ich habe meine [Erstuntersuchung / Nachuntersuchung] am [Datum] absolviert, die Bescheinigung liegt im Anhang / Original im Personalbüro.

Bitte bestätigen Sie die Erfassung im Personalakt.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'psychische-belastung',
        cat: 'sicherheit',
        title: '"Heul nicht rum, das gehört zum Job."',
        desc: 'Du leidest unter dauerhaftem psychischen Druck, Mobbing, Stress oder bist am Limit.',
        law: '§ 5 ArbSchG / § 618 BGB',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Psychische Belastungen sind eine Gefährdung — Arbeitgeber-Pflicht zum Handeln!',
        verdictDetail: 'Der Arbeitgeber muss eine **Gefährdungsbeurteilung** durchführen, die ausdrücklich auch **psychische Belastungen** umfasst (§ 5 Abs. 3 Nr. 6 ArbSchG). Die Fürsorgepflicht (§ 618 BGB) gilt auch für die psychische Gesundheit. Wenn dauerhafter Stress, Mobbing, Überforderung oder Angst herrschen, muss er Maßnahmen treffen. Bist du deswegen krank, gilt die normale Krankschreibung mit Entgeltfortzahlung — eine Diagnose musst du dem Betrieb nicht nennen.',
        laws: [
            { title: '§ 5 Abs. 3 Nr. 6 ArbSchG – Gefährdungsbeurteilung', text: 'Eine Gefährdung kann sich insbesondere ergeben durch psychische Belastungen bei der Arbeit.' },
            { title: '§ 618 BGB – Fürsorgepflicht', text: 'Der Dienstberechtigte hat Räume, Vorrichtungen oder Gerätschaften, die er zur Verrichtung der Dienste zu beschaffen hat, so einzurichten und zu unterhalten und Dienstleistungen, die unter seiner Anordnung oder seiner Leitung vorzunehmen sind, so zu regeln, dass der Verpflichtete gegen Gefahr für Leben und Gesundheit soweit geschützt ist, als die Natur der Dienstleistung es gestattet.' }
        ],
        tips: [
            'Hausarzt-Termin → AU-Bescheinigung mit Diagnose schützt arbeitsrechtlich.',
            'Telefonseelsorge 24/7 kostenfrei: 0800 111 0 111 oder 0800 111 0 222.',
            'JAV / Betriebsrat / Vertrauensperson einbeziehen — sie können Druck rausnehmen.',
            'Wechsel des Ausbildungsbetriebs ist möglich (§ 22 BBiG ggf. mit Aufhebung) — vorher Beratung.'
        ],
        email: {
            subject: 'Hinweis auf erhöhte psychische Belastung am Arbeitsplatz',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich möchte Sie auf eine deutliche psychische Belastungssituation hinweisen, die mich am Arbeitsplatz seit [Zeitraum] betrifft: [kurze Schilderung — Überforderung / Konflikte / Druck].

Nach § 5 Abs. 3 Nr. 6 ArbSchG ist die Bewertung psychischer Belastungen Teil der Gefährdungsbeurteilung. Ich bitte um ein vertrauliches Gespräch und ggf. Anpassung der Arbeitsbedingungen.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'hitze-arbeitsplatz',
        cat: 'sicherheit',
        title: '"35 Grad im Büro? Da musst du durch."',
        desc: 'Im Sommer wird es am Arbeitsplatz extrem heiß, und nichts passiert.',
        law: 'ASR A3.5 / § 3a ArbStättV / § 28a JArbSchG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Hitzefrei gibt es nicht — aber ab 26 °C soll und ab 30 °C muss gehandelt werden.',
        verdictDetail: 'Einen Anspruch auf **Hitzefrei** gibt es nicht. Die **Technische Regel für Arbeitsstätten ASR A3.5** legt aber Stufen fest: In Arbeitsräumen **soll** die Lufttemperatur **26 °C** nicht überschreiten. Über 26 °C **sollen**, über **30 °C müssen** Maßnahmen getroffen werden — etwa Jalousien, Lüften am Morgen, Gleitzeit, lockerere Kleiderregeln und Getränke. Über **35 °C** ist ein Raum ohne besondere Maßnahmen (Luftduschen, Entwärmungsphasen, Hitzeschutzkleidung) **nicht als Arbeitsraum geeignet**. Für **Jugendliche** und Schwangere gilt eine besondere Gefährdungsbeurteilung. Bei konkreter Gesundheitsgefahr darfst du die Arbeit an dieser Stelle unterbrechen und musst das sofort melden.',
        laws: [
            { title: 'ASR A3.5 – Raumtemperatur', text: 'Die Lufttemperatur in Arbeitsräumen soll +26 °C nicht überschreiten; bei über +30 °C müssen wirksame Maßnahmen ergriffen werden, über +35 °C ist der Raum ohne technische oder organisatorische Maßnahmen nicht als Arbeitsraum geeignet.' },
            { title: '§ 3a ArbStättV – Einrichten und Betreiben', text: 'Der Arbeitgeber hat dafür zu sorgen, dass Arbeitsstätten so betrieben werden, dass von ihnen keine Gefährdungen für Sicherheit und Gesundheit ausgehen.' }
        ],
        tips: [
            'Miss die Temperatur und notiere Werte mit Uhrzeit.',
            'Schlag konkrete Maßnahmen vor: früher anfangen, Ventilator, Getränke, Jalousien.',
            'Wird dir schwindelig oder übel: Arbeit unterbrechen, Bescheid sagen, Erste Hilfe.',
            'Mit Betriebsrat: er bestimmt beim Gesundheitsschutz mit.'
        ],
        email: {
            subject: 'Temperatur am Arbeitsplatz',
            body: `Sehr geehrte/r [Name],

an meinem Arbeitsplatz [Raum] habe ich in den letzten Tagen Temperaturen von [X °C] gemessen ([Datum, Uhrzeit]). Nach der ASR A3.5 sind ab 30 °C Maßnahmen zum Schutz der Beschäftigten zu ergreifen.

Ich schlage vor: [z. B. früherer Arbeitsbeginn / Ventilator / Getränke]. Ich bitte um eine kurze Rückmeldung, welche Maßnahmen umgesetzt werden.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'alkohol-rauchen',
        cat: 'sicherheit',
        title: '"Komm, ein Bier zum Feierabend — trinkst du mit?"',
        desc: 'Alkohol im Betrieb, Feierabendbier, Rauchen am Arbeitsplatz — was gilt?',
        law: '§ 31 Abs. 2 JArbSchG / § 15 DGUV Vorschrift 1 / § 5 ArbStättV',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Für Minderjährige gelten klare Verbote — und für alle: nicht berauscht arbeiten.',
        verdictDetail: 'Der Arbeitgeber darf **Jugendlichen keine alkoholischen Getränke oder Tabakwaren** geben, deren Abgabe nach dem Jugendschutzgesetz verboten ist (§ 31 Abs. 2 JArbSchG) — unter 16 also gar keinen Alkohol, unter 18 keinen Schnaps und keine Zigaretten oder E-Zigaretten. Für **alle** gilt: Du darfst dich nicht durch Alkohol oder Drogen in einen Zustand versetzen, in dem du dich oder andere gefährdest (§ 15 DGUV Vorschrift 1). Viele Betriebe haben ein generelles Alkoholverbot. Beim **Rauchen** muss der Betrieb Nichtraucher wirksam schützen (§ 5 ArbStättV) — du musst also nicht passiv mitrauchen. Niemand darf dich zum Trinken drängen.',
        laws: [
            { title: '§ 31 Abs. 2 JArbSchG – Genussmittel', text: 'Der Arbeitgeber darf Jugendlichen keine alkoholischen Getränke, Tabakwaren und anderen in § 9 bzw. § 10 JuSchG genannten Erzeugnisse geben, deren Abgabe danach verboten ist.' },
            { title: '§ 15 Abs. 2 DGUV Vorschrift 1 – Rauschmittel', text: 'Versicherte dürfen sich durch den Konsum von Alkohol, Drogen oder anderen berauschenden Mitteln nicht in einen Zustand versetzen, durch den sie sich selbst oder andere gefährden können.' },
            { title: '§ 5 ArbStättV – Nichtraucherschutz', text: 'Der Arbeitgeber hat die erforderlichen Maßnahmen zu treffen, damit die nichtrauchenden Beschäftigten wirksam vor den Gesundheitsgefahren durch Tabakrauch geschützt sind.' }
        ],
        tips: [
            'Ein freundliches „Nein danke" reicht — niemand darf dich drängen.',
            'Unter 18: Der Betrieb darf dir weder Schnaps noch Zigaretten geben.',
            'Wer berauscht an Maschinen arbeitet, verliert schnell den Versicherungsschutz.',
            'Rauch am Arbeitsplatz stört dich? Nichtraucherschutz schriftlich ansprechen.'
        ]
    },

    // ════════════════════════════════════════════════════════════
    //  AUSBILDUNG — neue Kategorie
    // ════════════════════════════════════════════════════════════
    {
        id: 'ausbildungsplan-existenz',
        cat: 'ausbildung',
        title: '"Ausbildungsplan? Wir machen, was gerade anfällt."',
        desc: 'Es gibt keinen schriftlichen Ausbildungsplan, du wirst nach Bedarf eingesetzt.',
        law: '§ 5 BBiG / § 14 Abs. 1 Nr. 1 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Ein sachlich und zeitlich gegliederter Plan ist Pflicht!',
        verdictDetail: 'Die Ausbildungsordnung (für jeden Beruf zentral festgelegt) sieht einen **Ausbildungsrahmenplan** vor (§ 5 Abs. 1 Nr. 4 BBiG). Daraus muss der Betrieb einen betrieblichen Ausbildungsplan ableiten und im Ausbildungsvertrag dokumentieren (§ 11 Abs. 1 Nr. 4 BBiG). Der Plan muss SACHLICH (welche Inhalte) und ZEITLICH (wann) gegliedert sein. Ohne Plan keine ordnungsgemäße Ausbildung → Mangel kann zur außerordentlichen Kündigung durch den Azubi führen (§ 22 BBiG).',
        laws: [
            { title: '§ 5 Abs. 1 Nr. 4 BBiG – Ausbildungsordnung', text: 'Die Ausbildungsordnung hat festzulegen die sachliche und zeitliche Gliederung der Vermittlung der beruflichen Fertigkeiten, Kenntnisse und Fähigkeiten (Ausbildungsrahmenplan).' },
            { title: '§ 11 Abs. 1 Nr. 4 BBiG – Niederschrift Ausbildungsvertrag', text: 'Die Niederschrift muss enthalten: sachliche und zeitliche Gliederung der Berufsausbildung.' },
            { title: '§ 14 Abs. 1 Nr. 1 BBiG – Pflichten', text: 'Ausbildende haben dafür zu sorgen, dass den Auszubildenden die berufliche Handlungsfähigkeit vermittelt wird, die zum Erreichen des Ausbildungsziels erforderlich ist, und die Berufsausbildung in einer durch ihren Zweck gebotenen Form planmäßig, zeitlich und sachlich gegliedert so durchzuführen, dass das Ausbildungsziel in der vorgesehenen Ausbildungszeit erreicht werden kann.' }
        ],
        tips: [
            'Ausbildungsrahmenplan für deinen Beruf gibt es kostenfrei bei der IHK/HWK.',
            'Bei fehlendem Plan: schriftlich anfordern + Frist setzen (z.B. 4 Wochen).',
            'Berichtsheft konsequent nach Ausbildungsrahmenplan-Strukturen führen — dokumentiert Lücken.',
            'Bei dauerhaft fehlenden Inhalten: IHK-Ausbildungsberater einschalten.'
        ],
        email: {
            subject: 'Anforderung des betrieblichen Ausbildungsplans',
            body: `Sehr geehrte/r [Name des Ausbilders],

zur Sicherstellung einer strukturierten Ausbildung gemäß § 5, § 11 Abs. 1 Nr. 4 und § 14 Abs. 1 Nr. 1 BBiG bitte ich um schriftliche Übermittlung des betrieblichen Ausbildungsplans bzw. der sachlich-zeitlichen Gliederung meiner Ausbildung.

Ich bitte um Übermittlung bis [Datum + 4 Wochen].

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'ausbilder-nie-da',
        cat: 'ausbildung',
        title: '"Der Chef ist nicht da, frag jemand anderen."',
        desc: 'Der eingetragene Ausbilder ist dauerhaft abwesend, niemand anders kümmert sich.',
        law: '§ 28 BBiG / § 30 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Ausbilder muss persönlich + fachlich + pädagogisch geeignet anwesend sein!',
        verdictDetail: 'Wer ausbildet, muss **persönlich und fachlich geeignet** sein (§ 28 BBiG); zur fachlichen Eignung gehören auch berufs- und arbeitspädagogische Kenntnisse, meist nachgewiesen über die Ausbildereignungsprüfung (AEVO, § 30 BBiG). Der Betrieb muss die Ausbildung selbst durchführen oder einen Ausbilder ausdrücklich beauftragen (§ 14 Abs. 1 Nr. 2 BBiG) — einer, der praktisch nie da ist, erfüllt das nicht. Die IHK/HWK überwacht die Eignung (§ 32 BBiG) und kann Mängel beanstanden; im Ernstfall kann die zuständige Landesbehörde das Ausbilden untersagen (§ 33 BBiG).',
        laws: [
            { title: '§ 28 BBiG – Persönliche Eignung', text: 'Wer Auszubildende einstellt oder ausbildet, muss persönlich geeignet sein. Persönlich nicht geeignet ist insbesondere, wer Kinder und Jugendliche nicht beschäftigen darf.' },
            { title: '§ 30 BBiG – Fachliche Eignung', text: 'Fachlich geeignet ist, wer die beruflichen Fertigkeiten, Kenntnisse und Fähigkeiten sowie berufs- und arbeitspädagogische Fertigkeiten besitzt.' },
            { title: '§ 32 BBiG – Untersagung', text: 'Die zuständige Stelle hat die Einstellung und Ausbildung von Auszubildenden zu untersagen, wenn die persönliche oder fachliche Eignung fehlt.' }
        ],
        tips: [
            'Erfasse Daten + Stunden, in denen kein Ausbilder verfügbar war.',
            'Anstelle des Ausbilders: hat der Betrieb eine "ausbildende Fachkraft" benannt? Wenn nicht, klare Lücke.',
            'IHK-Ausbildungsberater einschalten — die kontrollieren die Eignung.',
            'Bei dauerhaftem Defizit: Wechsel des Ausbildungsbetriebs ggf. möglich.'
        ],
        email: {
            subject: 'Verfügbarkeit des Ausbilders',
            body: `Sehr geehrte/r [Geschäftsführung / Personalleitung],

mein eingetragener Ausbilder Herr/Frau [Name] ist seit [Datum/Zeitraum] dauerhaft nicht verfügbar. Eine ausbildende Fachkraft als Vertretung wurde mir nicht benannt.

Nach §§ 28, 30 BBiG ist die Anwesenheit eines persönlich + fachlich geeigneten Ausbilders Voraussetzung für eine ordnungsgemäße Berufsausbildung.

Ich bitte um Klärung, wie die Ausbildung künftig sichergestellt wird. Andernfalls werde ich die zuständige IHK / HWK informieren.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'ausbildungszeit-verkuerzung',
        cat: 'ausbildung',
        title: '"Verkürzen? Geht nicht, Vertrag ist Vertrag."',
        desc: 'Du möchtest deine Ausbildung wegen guter Leistung oder Vorbildung verkürzen.',
        law: '§ 8 BBiG',
        severity: 2,
        verdict: 'ja',
        verdictShort: 'Verkürzung möglich — bei Antrag + Zustimmung der Kammer!',
        verdictDetail: 'Die Ausbildungszeit kann auf gemeinsamen Antrag von Azubi und Betrieb durch die zuständige Stelle (IHK/HWK) verkürzt werden, wenn zu erwarten ist, dass das Ausbildungsziel in der gekürzten Zeit erreicht wird (§ 8 Abs. 1 BBiG). Anrechnungsgründe: Abitur/Fachabitur, einschlägige Vorbildung, gute Leistung. Faustregel: bis zu 12 Monate Verkürzung üblich. Auch eine Verlängerung bei Bedarf möglich (§ 8 Abs. 2). Im Zweifel: vorzeitige Zulassung zur Prüfung (§ 45 Abs. 1 BBiG) prüfen.',
        laws: [
            { title: '§ 8 Abs. 1 BBiG – Verkürzung', text: 'Auf gemeinsamen Antrag der Auszubildenden und Ausbildenden hat die zuständige Stelle die Ausbildungszeit zu kürzen, wenn zu erwarten ist, dass das Ausbildungsziel in der gekürzten Zeit erreicht wird.' },
            { title: '§ 45 Abs. 1 BBiG – Vorzeitige Zulassung zur Prüfung', text: 'Auszubildende können vor Ablauf ihrer Ausbildungszeit zur Abschlussprüfung zugelassen werden, wenn ihre Leistungen dies rechtfertigen.' }
        ],
        tips: [
            'Antrag gemeinsam mit Betrieb stellen — bei Bedarf IHK um Vermittlung bitten.',
            'Abitur: meist 12 Monate Verkürzung, Fachhochschulreife 6 Monate (variiert nach Beruf).',
            'Bei Bestnoten in Berufsschule: vorzeitige Prüfung möglich (§ 45 BBiG).',
            'Auch wenn der Betrieb ablehnt: einseitig kann der Azubi vorzeitige Prüfung beantragen.'
        ],
        email: {
            subject: 'Antrag auf Verkürzung der Ausbildungszeit gem. § 8 BBiG',
            body: `Sehr geehrte/r [Name des Ausbilders],

ich möchte gemäß § 8 Abs. 1 BBiG die Verkürzung meiner Ausbildungszeit um [X Monate] beantragen.

Begründung:
- [Schulische Vorbildung: Abitur / Fachabitur / einschlägiger Vorberuf]
- [Leistungsstand: aktueller Notendurchschnitt / Beurteilung]

Ich bitte um einen gemeinsamen Antrag bei der zuständigen Kammer.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'vertrag-nicht-eingetragen',
        cat: 'ausbildung',
        title: '"Einen schriftlichen Vertrag brauchen wir nicht."',
        desc: 'Du hast angefangen, aber keinen Ausbildungsvertrag bekommen, oder er ist nicht bei der Kammer eingetragen.',
        law: '§ 11 BBiG / § 36 BBiG / § 43 Abs. 1 Nr. 3 BBiG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Doch — ohne Niederschrift und Eintragung droht dir die Prüfungszulassung.',
        verdictDetail: 'Der Betrieb muss den wesentlichen Inhalt des Ausbildungsvertrags **vor Beginn der Ausbildung schriftlich** niederlegen, unterschreiben und dir (bei Minderjährigen auch den Eltern) **aushändigen** (§ 11 BBiG). Dazu gehören u. a. Beruf, Beginn und Dauer, Ausbildungsplan, tägliche Ausbildungszeit, Probezeit, Vergütung und Urlaub. Außerdem muss er **unverzüglich die Eintragung** ins Verzeichnis der Ausbildungsverhältnisse bei der IHK/HWK **beantragen** (§ 36 BBiG). Das ist für dich entscheidend: Zur Abschlussprüfung wird nur zugelassen, wessen Ausbildungsverhältnis **eingetragen** ist — oder wer nachweist, dass die fehlende Eintragung nicht seine Schuld ist (§ 43 Abs. 1 Nr. 3 BBiG).',
        laws: [
            { title: '§ 11 Abs. 1 BBiG – Niederschrift', text: 'Ausbildende haben unverzüglich nach Abschluss des Berufsausbildungsvertrages, spätestens vor Beginn der Berufsausbildung, den wesentlichen Inhalt schriftlich niederzulegen.' },
            { title: '§ 36 Abs. 1 BBiG – Eintragung', text: 'Ausbildende haben unverzüglich nach Abschluss des Berufsausbildungsvertrages die Eintragung in das Verzeichnis der Berufsausbildungsverhältnisse zu beantragen.' },
            { title: '§ 43 Abs. 1 Nr. 3 BBiG – Zulassung', text: 'Zur Abschlussprüfung ist zuzulassen, wessen Berufsausbildungsverhältnis eingetragen oder aus einem nicht von ihm zu vertretenden Grund nicht eingetragen ist.' }
        ],
        tips: [
            'Fordere den Vertrag schriftlich an — er steht dir vor Beginn zu.',
            'Frag bei der IHK/HWK nach, ob dein Ausbildungsverhältnis eingetragen ist.',
            'Bewahre alle Nachweise auf: Zusage, Lohnabrechnungen, Schulanmeldung.',
            'Kommt nichts, informiere die Kammer — sie kann den Betrieb zur Eintragung auffordern.'
        ],
        email: {
            subject: 'Ausbildungsvertrag und Eintragung bei der Kammer',
            body: `Sehr geehrte/r [Name des Ausbilders],

seit dem [Datum] befinde ich mich in der Ausbildung zum/zur [Beruf]. Einen schriftlichen Ausbildungsvertrag habe ich bisher nicht erhalten.

Nach § 11 BBiG ist der wesentliche Vertragsinhalt vor Beginn der Ausbildung schriftlich niederzulegen und auszuhändigen; nach § 36 BBiG ist die Eintragung bei der [IHK/HWK] zu beantragen. Ich bitte um Übergabe des Vertrags und um kurze Bestätigung der Eintragung bis [Datum].

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'teilzeitausbildung',
        cat: 'ausbildung',
        title: '"Ausbildung in Teilzeit? Gibt es nicht."',
        desc: 'Du willst wegen Kind, Pflege, Gesundheit oder Nebenverdienst in Teilzeit ausgebildet werden.',
        law: '§ 7a BBiG / § 17 Abs. 5 BBiG',
        severity: 1,
        verdict: 'jein',
        verdictShort: 'Doch — seit 2020 für alle möglich, wenn Betrieb und du es vereinbaren.',
        verdictDetail: 'Seit 2020 kann **jede** Berufsausbildung in **Teilzeit** durchgeführt werden, einen besonderen Grund wie Kind oder Pflege braucht es nicht mehr (§ 7a BBiG). Voraussetzung ist eine **Vereinbarung** mit dem Betrieb im Ausbildungsvertrag — einen einseitigen Anspruch hast du nicht. Die tägliche oder wöchentliche Ausbildungszeit darf um **höchstens 50 %** gekürzt werden. Die **Ausbildungsdauer verlängert sich** entsprechend, höchstens auf das **Eineinhalbfache**. Die **Vergütung** darf anteilig gekürzt werden, aber nicht stärker als die Ausbildungszeit (§ 17 Abs. 5 BBiG). Teilzeit lässt sich mit einer Verkürzung nach § 8 BBiG kombinieren.',
        laws: [
            { title: '§ 7a Abs. 1 BBiG – Teilzeit', text: 'Die Berufsausbildung kann in Teilzeit durchgeführt werden. Im Berufsausbildungsvertrag ist dafür die Verkürzung der täglichen oder wöchentlichen Ausbildungszeit zu vereinbaren; sie darf nicht mehr als 50 Prozent betragen.' },
            { title: '§ 7a Abs. 2 BBiG – Dauer', text: 'Die Dauer der Teilzeitberufsausbildung verlängert sich entsprechend, höchstens jedoch bis zum Eineinhalbfachen der Dauer, die in der Ausbildungsordnung festgelegt ist.' },
            { title: '§ 17 Abs. 5 BBiG – Vergütung', text: 'Bei einer Teilzeitberufsausbildung kann eine angemessene Verringerung der Vergütung vorgenommen werden; sie darf nicht stärker sein als die Verringerung der Ausbildungszeit.' }
        ],
        tips: [
            'Sprich den Wunsch früh an — am besten schon vor Vertragsschluss.',
            'Die IHK/HWK berät zu Teilzeitmodellen und trägt sie ein.',
            'Prüfe Zuschüsse: BAB, Kinderzuschlag oder Wohngeld können die Lücke schließen.',
            'Berufsschulzeiten bleiben gleich — Teilzeit gilt für den Betrieb.'
        ]
    },
    {
        id: 'ausland',
        cat: 'ausbildung',
        title: '"Ein Auslandspraktikum während der Ausbildung? Unmöglich."',
        desc: 'Du willst einen Teil deiner Ausbildung im Ausland machen, z. B. mit Erasmus+.',
        law: '§ 2 Abs. 3 BBiG',
        severity: 1,
        verdict: 'jein',
        verdictShort: 'Möglich — bis zu einem Viertel der Ausbildungszeit, wenn es dem Ausbildungsziel dient.',
        verdictDetail: 'Teile der Berufsausbildung können **im Ausland** stattfinden, wenn das **dem Ausbildungsziel dient** (§ 2 Abs. 3 BBiG). Insgesamt sollen sie **ein Viertel** der Ausbildungsdauer nicht überschreiten. Der Auslandsaufenthalt gilt dann als **Teil der Ausbildung**: Dein Vertrag läuft weiter, ebenso Vergütung und Versicherung, und die Zeit wird angerechnet. Einen Anspruch darauf hast du nicht — der Betrieb muss zustimmen. Gefördert wird das z. B. über **Erasmus+**, das Reise, Unterkunft und Sprachkurs bezuschusst; Organisation übernehmen oft die Kammern oder die Berufsschule.',
        laws: [
            { title: '§ 2 Abs. 3 BBiG – Ausland', text: 'Teile der Berufsausbildung können im Ausland durchgeführt werden, wenn dies dem Ausbildungsziel dient. Ihre Gesamtdauer soll ein Viertel der in der Ausbildungsordnung festgelegten Ausbildungsdauer nicht überschreiten.' }
        ],
        tips: [
            'Frag bei IHK/HWK nach Mobilitätsberatern — die helfen bei Planung und Förderung.',
            'Kläre mit dem Betrieb, welche Inhalte aus dem Ausbildungsplan du dort lernst.',
            'Plane mit Vorlauf: Erasmus+-Anträge brauchen oft mehrere Monate.',
            'Dokumentiere den Aufenthalt im Berichtsheft wie jede andere Ausbildungszeit.'
        ]
    },
    {
        id: 'ausbildung-verlaengern',
        cat: 'ausbildung',
        title: '"Verlängern? Du musst in der normalen Zeit fertig werden."',
        desc: 'Du warst lange krank oder kommst nicht hinterher und willst mehr Zeit.',
        law: '§ 8 Abs. 2 BBiG / § 21 Abs. 3 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Auf deinen Antrag kann die Kammer verlängern — der Betrieb wird nur angehört.',
        verdictDetail: 'In Ausnahmefällen **verlängert die Kammer** die Ausbildungszeit **auf deinen Antrag**, wenn das nötig ist, um das Ausbildungsziel zu erreichen (§ 8 Abs. 2 BBiG). Typische Gründe sind **längere Krankheit**, Schwangerschaft, erhebliche Ausbildungsmängel im Betrieb oder Lernschwierigkeiten. Der Betrieb wird **angehört**, muss aber nicht zustimmen. Davon zu unterscheiden: Fällst du durch die Abschlussprüfung, verlängert sich das Ausbildungsverhältnis auf dein **Verlangen** automatisch bis zur nächsten Wiederholungsprüfung, höchstens um ein Jahr (§ 21 Abs. 3 BBiG).',
        laws: [
            { title: '§ 8 Abs. 2 BBiG – Verlängerung', text: 'In Ausnahmefällen kann die zuständige Stelle auf Antrag Auszubildender die Ausbildungszeit verlängern, wenn die Verlängerung erforderlich ist, um das Ausbildungsziel zu erreichen. Vor der Entscheidung sind die Ausbildenden zu hören.' },
            { title: '§ 21 Abs. 3 BBiG – Nicht bestanden', text: 'Bestehen Auszubildende die Abschlussprüfung nicht, so verlängert sich das Berufsausbildungsverhältnis auf ihr Verlangen bis zur nächstmöglichen Wiederholungsprüfung, höchstens um ein Jahr.' }
        ],
        tips: [
            'Den Antrag stellst du bei der Kammer — frühzeitig, nicht erst kurz vor der Prüfung.',
            'Belege den Grund (AU-Bescheinigungen, Fehlzeiten, Schulberichte).',
            'Sprich mit Betrieb und Berufsschule, bevor du den Antrag stellst.',
            'Nicht bestanden? Verlängerung schriftlich verlangen — sie gilt dann automatisch.'
        ]
    },

    // ════════════════════════════════════════════════════════════
    //  MITBESTIMMUNG — neue Kategorie
    // ════════════════════════════════════════════════════════════
    {
        id: 'jav-betriebsrat-zugang',
        cat: 'mitbestimmung',
        title: '"Zur JAV gehst du in der Freizeit."',
        desc: 'Du willst die Jugend- und Auszubildendenvertretung (JAV) oder den Betriebsrat ansprechen — das soll nicht während der Arbeitszeit gehen.',
        law: '§ 39 BetrVG / § 65 BetrVG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Du darfst BR/JAV WÄHREND der Arbeitszeit aufsuchen — ohne Lohnabzug!',
        verdictDetail: 'Jeder Beschäftigte (auch Azubi) darf den Betriebsrat / die JAV während der Arbeitszeit ohne Minderung des Lohns aufsuchen (§ 39 Abs. 3 BetrVG). Anliegen können sein: Beschwerde, Beratung, Konflikt mit AG. Die Sprechstunden sind im Betrieb zu organisieren. JAV-Mitglieder selbst werden für ihre Tätigkeit freigestellt (§ 65 BetrVG i.V.m. § 37 BetrVG).',
        laws: [
            { title: '§ 39 Abs. 3 BetrVG – Sprechstunden des Betriebsrats', text: 'Jeder Arbeitnehmer hat das Recht, während der Sprechstunden den Betriebsrat aufzusuchen.' },
            { title: '§ 39 Abs. 2 BetrVG – Versäumnis von Arbeitszeit', text: 'Versäumnis von Arbeitszeit, das zur Wahrnehmung von Sprechstunden des Betriebsrats erforderlich ist, ist nicht zu einer Lohnminderung berechtigt.' },
            { title: '§ 65 BetrVG – Stellung der JAV', text: 'Die Vorschriften über den Betriebsrat finden auf die JAV sinngemäße Anwendung.' }
        ],
        tips: [
            'Termin BR/JAV-Sprechstunde notieren — als Beweis der erfassten Arbeitszeit.',
            'Auch JAV-Sitzungen / Schulungen sind bezahlte Freistellungszeit (§ 65 i.V.m. § 37 BetrVG).',
            'Anliegen kann auch außerhalb der Sprechstunde dringend nachgegangen werden (§ 39 Abs. 3).',
            'Kein Betriebsrat? Du hast Wahl-Initiativrecht (§ 17a BetrVG).'
        ],
        email: {
            subject: 'JAV / Betriebsrat-Sprechstunde — Freistellung',
            body: `Sehr geehrte/r [Name des Ausbilders],

am [Datum] werde ich die Sprechstunde des Betriebsrats / der JAV in Anspruch nehmen (ca. [Zeit von - bis]).

Nach § 39 Abs. 2 BetrVG ist diese Zeit als Arbeitszeit zu werten und führt nicht zu einer Vergütungsminderung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'jav-wahlrecht',
        cat: 'mitbestimmung',
        title: '"Wahlen? Brauchen wir nicht, wir sind zu klein."',
        desc: 'Im Betrieb wird keine JAV gewählt, obwohl Azubis und jüngere Beschäftigte vorhanden sind.',
        law: '§ 60 BetrVG / § 61 BetrVG',
        severity: 2,
        verdict: 'ja',
        verdictShort: 'JAV-Wahl ist Pflicht ab 5 wahlberechtigten Jugendlichen/Azubis!',
        verdictDetail: 'Eine **Jugend- und Auszubildendenvertretung (JAV)** wird gewählt, wenn im Betrieb mindestens 5 Beschäftigte unter 18 Jahren **oder** zur Berufsausbildung Beschäftigte unter 25 Jahren arbeiten (§ 60 BetrVG). **Voraussetzung:** Es gibt einen Betriebsrat. Wahlberechtigt sind Beschäftigte unter 18 und alle Azubis, wählbar sind Beschäftigte unter 25 und — seit 2021 — **alle Azubis unabhängig vom Alter** (§ 61 BetrVG). Die Amtszeit beträgt 2 Jahre.',
        laws: [
            { title: '§ 60 BetrVG – Errichtung und Aufgabe', text: 'In Betrieben mit in der Regel mindestens fünf Arbeitnehmern, die das 18. Lebensjahr noch nicht vollendet haben oder die zu ihrer Berufsausbildung beschäftigt sind, werden JAV gebildet.' },
            { title: '§ 61 BetrVG – Wahlberechtigung und Wählbarkeit', text: 'Wahlberechtigt sind alle Arbeitnehmer des Betriebs, die das 18. Lebensjahr noch nicht vollendet haben, sowie die Arbeitnehmer, die zu ihrer Berufsausbildung beschäftigt sind und das 25. Lebensjahr noch nicht vollendet haben.' },
            { title: '§ 70 BetrVG – Aufgaben der JAV', text: 'Die JAV hat insbesondere Maßnahmen zu beantragen, die den jugendlichen Arbeitnehmern und den zu ihrer Berufsausbildung Beschäftigten dienen.' }
        ],
        tips: [
            'Kein BR + > 5 Azubis: Erst BR-Wahl initiieren (§ 17a BetrVG), dann JAV.',
            'Wahlinitiative kann von DREI wahlberechtigten Azubis ausgehen.',
            'Wahlperiode 2 Jahre — Termine immer Q1 (typisch März/April).',
            'JAV hat starke Mitspracherechte bei Übernahme, Schulungen, Beschwerden.'
        ],
        email: {
            subject: 'JAV-Wahl im Betrieb',
            body: `Sehr geehrte Beschäftigte des Betriebsrats,

als Azubi im Betrieb möchte ich die Wahl einer Jugend- und Auszubildendenvertretung (§ 60 BetrVG) anregen. Nach unserer Einschätzung sind die Voraussetzungen (mindestens 5 wahlberechtigte Beschäftigte unter 25 / 18 J.) erfüllt.

Ich bitte um Information über die nächsten Schritte zur Wahlvorbereitung.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'datenschutz-ueberwachung',
        cat: 'mitbestimmung',
        title: '"Wir überwachen alle PCs, das ist normal."',
        desc: 'Der Betrieb überwacht heimlich PC-Aktivitäten, E-Mails, Kamera oder Standort.',
        law: '§ 26 BDSG / Art. 88 DSGVO / § 87 Abs. 1 Nr. 6 BetrVG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Heimliche Überwachung ist verboten — Betriebsrat muss zustimmen!',
        verdictDetail: 'Der Einsatz von technischen Einrichtungen zur Verhaltens- oder Leistungskontrolle (Kameras, Keylogger, GPS, Email-Auswertung) bedarf der Zustimmung des Betriebsrats (§ 87 Abs. 1 Nr. 6 BetrVG). Datenverarbeitung von Beschäftigten ist nur erlaubt, soweit erforderlich und mit Information (§ 26 BDSG). Heimliche Überwachung ist nahezu immer rechtswidrig — Beweise daraus unverwertbar, Schmerzensgeld möglich (BAG 27.07.2017 – 2 AZR 681/16).',
        laws: [
            { title: '§ 26 BDSG – Datenverarbeitung Beschäftigte', text: 'Personenbezogene Daten von Beschäftigten dürfen für Zwecke des Beschäftigungsverhältnisses verarbeitet werden, wenn dies für die Durchführung des Beschäftigungsverhältnisses erforderlich ist.' },
            { title: '§ 87 Abs. 1 Nr. 6 BetrVG – Mitbestimmung Überwachung', text: 'Der Betriebsrat hat mitzubestimmen über die Einführung und Anwendung von technischen Einrichtungen, die dazu bestimmt sind, das Verhalten oder die Leistung der Arbeitnehmer zu überwachen.' },
            { title: 'BAG 27.07.2017 – 2 AZR 681/16', text: 'Heimlich erstellte Aufzeichnungen über das Verhalten von Arbeitnehmern sind im Kündigungsschutzprozess unverwertbar.' }
        ],
        tips: [
            'Frage nach: Welche Daten werden gesammelt? Wo gespeichert? Wer hat Zugriff?',
            'Datenschutzbeauftragten im Unternehmen anrufen — kostenfrei für Beschäftigte.',
            'Bei Verstößen: Datenschutz-Aufsichtsbehörde des Bundeslandes informieren (kostenfrei).',
            'Heimliche Überwachung → Schmerzensgeld realistisch (typisch 2.000–8.000 €).'
        ],
        email: {
            subject: 'Auskunft gem. Art. 15 DSGVO',
            body: `Sehr geehrte/r [Geschäftsführung / Datenschutzbeauftragte/r],

hiermit fordere ich gemäß Art. 15 DSGVO Auskunft über alle personenbezogenen Daten, die das Unternehmen über meine Person verarbeitet, insbesondere:

1) Welche Daten werden erhoben (PC-Aktivität, E-Mail, Kamera, Standort, Login)?
2) Zwecke der Verarbeitung
3) Empfänger der Daten
4) Speicherdauer
5) Rechtsgrundlage

Bitte um Auskunft binnen eines Monats.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'handyverbot',
        cat: 'privat',
        title: '"Handys bleiben während der Arbeit im Spind."',
        desc: 'Der Betrieb verbietet private Handynutzung während der Arbeitszeit.',
        law: '§ 106 GewO / § 87 Abs. 1 Nr. 1 BetrVG',
        severity: 1,
        verdict: 'ja',
        verdictShort: 'Ja, ein Verbot privater Nutzung ist grundsätzlich erlaubt.',
        verdictDetail: 'Während der Arbeitszeit schuldest du Arbeit — private Handynutzung darf der Betrieb deshalb **einschränken oder verbieten** (Weisungsrecht, § 106 GewO). Auch Regeln wie „Handy in den Spind" sind meist zulässig, besonders aus Sicherheits- oder Datenschutzgründen. Gibt es einen **Betriebsrat**, muss er bei solchen Regeln zum Ordnungsverhalten mitbestimmen (§ 87 Abs. 1 Nr. 1 BetrVG). In den **Pausen** darfst du dein Handy nutzen, denn die Pause ist deine freie Zeit. Und in echten Notfällen muss deine Familie dich erreichen können, etwa über das Betriebstelefon. Verstöße können eine Abmahnung nach sich ziehen.',
        laws: [
            { title: '§ 106 GewO – Weisungsrecht', text: 'Der Arbeitgeber kann Inhalt, Ort und Zeit der Arbeitsleistung sowie die Ordnung und das Verhalten im Betrieb nach billigem Ermessen näher bestimmen.' },
            { title: '§ 87 Abs. 1 Nr. 1 BetrVG – Mitbestimmung', text: 'Der Betriebsrat hat mitzubestimmen in Fragen der Ordnung des Betriebs und des Verhaltens der Arbeitnehmer im Betrieb.' }
        ],
        tips: [
            'In der Pause gehört das Handy dir.',
            'Gib deiner Familie die Nummer des Betriebs für Notfälle.',
            'Braucht ihr das Handy für die Arbeit (Fotos, Authentifizierung), muss der Betrieb das regeln.',
            'Mit Betriebsrat: Frag nach der Betriebsvereinbarung.'
        ]
    },
    {
        id: 'kleiderordnung-tattoo',
        cat: 'privat',
        title: '"Die Tattoos deckst du ab, und die Haare kommen ab."',
        desc: 'Der Betrieb macht Vorgaben zu Kleidung, Tattoos, Piercings oder Frisur.',
        law: '§ 106 GewO / Art. 2 GG / § 87 Abs. 1 Nr. 1 BetrVG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Kleidung: oft ja. Eingriffe in dein Aussehen außerhalb der Arbeit: kaum.',
        verdictDetail: 'Der Betrieb darf Vorgaben zum Erscheinungsbild machen, wenn es dafür einen **sachlichen Grund** gibt: Sicherheit (keine Ringe an Maschinen), Hygiene (Haare zusammenbinden in der Küche), Kundenkontakt (einheitliche Kleidung). Das Abdecken von Tattoos während der Arbeit kann im Kundenkontakt verlangt werden. Je stärker eine Vorgabe in dein **Persönlichkeitsrecht** eingreift und über die Arbeitszeit hinauswirkt — etwa Haare abschneiden oder ein Tattoo entfernen —, desto gewichtiger muss der Grund sein; das ist nur selten zulässig. Vorgaben dürfen nicht diskriminieren, z. B. wegen Religion (AGG). Mit Betriebsrat ist eine Kleiderordnung mitbestimmungspflichtig.',
        laws: [
            { title: '§ 106 GewO – Weisungsrecht', text: 'Weisungen zu Ordnung und Verhalten müssen billigem Ermessen entsprechen, also die Interessen beider Seiten abwägen.' },
            { title: 'Art. 2 Abs. 1 GG – Persönlichkeitsrecht', text: 'Jeder hat das Recht auf die freie Entfaltung seiner Persönlichkeit; dazu gehört auch das äußere Erscheinungsbild.' },
            { title: '§ 1 AGG – Benachteiligungsverbot', text: 'Benachteiligungen wegen Religion, Weltanschauung, Herkunft oder Geschlecht sind verboten — auch über Kleiderregeln.' }
        ],
        tips: [
            'Frag nach dem Grund der Vorgabe — Sicherheit und Hygiene sind meist berechtigt.',
            'Vorgeschriebene Dienstkleidung muss in der Regel der Betrieb stellen.',
            'Lange Ärmel oder Pflaster für Tattoos sind ein üblicher Kompromiss.',
            'Bei religiösen Kleidungsstücken (z. B. Kopftuch) dich vorher beraten lassen.'
        ],
        email: {
            subject: 'Vorgaben zum Erscheinungsbild',
            body: `Sehr geehrte/r [Name des Ausbilders],

Sie haben mich gebeten, [Vorgabe]. Ich möchte die Regeln des Betriebs gern einhalten und bitte um kurze Erläuterung, auf welchem Grund die Vorgabe beruht.

Für den Arbeitsalltag schlage ich [Kompromiss, z. B. lange Ärmel / Haare zusammengebunden] vor.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'social-media-post',
        cat: 'privat',
        title: '"Wegen deines Posts gibt es eine Abmahnung."',
        desc: 'Du hast privat etwas über den Betrieb oder Kollegen gepostet.',
        law: 'Art. 5 GG / § 13 Nr. 6 BBiG / § 22 BBiG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Meinung ja — Beleidigungen, Geheimnisse und Fotos von anderen nein.',
        verdictDetail: 'Auch als Azubi hast du **Meinungsfreiheit** (Art. 5 GG): Sachliche Kritik oder ein Post über einen anstrengenden Tag sind erlaubt. Grenzen sind **Beleidigungen** von Ausbilder, Kollegen oder Kunden, das Verbreiten von **Betriebs- und Geschäftsgeheimnissen** (§ 13 Nr. 6 BBiG), Fotos oder Videos von Kollegen ohne deren Einwilligung und Bilder aus Bereichen, in denen Fotografieren verboten ist. Solche Posts können eine **Abmahnung** rechtfertigen, schwere Fälle (z. B. grobe Beleidigung) sogar eine Kündigung aus wichtigem Grund (§ 22 Abs. 2 BBiG). Auch „private" Gruppen und Storys sind nicht wirklich privat, wenn Kollegen mitlesen.',
        laws: [
            { title: 'Art. 5 Abs. 1 GG – Meinungsfreiheit', text: 'Jeder hat das Recht, seine Meinung in Wort, Schrift und Bild frei zu äußern; Grenzen setzen u. a. das Recht der persönlichen Ehre.' },
            { title: '§ 13 Nr. 6 BBiG – Verschwiegenheit', text: 'Auszubildende haben über Betriebs- und Geschäftsgeheimnisse Stillschweigen zu wahren.' }
        ],
        tips: [
            'Keine Namen, keine Fotos von Kollegen, keine internen Infos — dann bist du fast immer sicher.',
            'Ärger lieber im persönlichen Gespräch oder bei JAV/Betriebsrat klären.',
            'Bei einer Abmahnung: Gegendarstellung zur Personalakte ist dein Recht.',
            'Lösche einen Post, der zu weit ging, und entschuldige dich — das zählt bei der Bewertung.'
        ]
    },
    {
        id: 'nebenjob',
        cat: 'privat',
        title: '"Ein Nebenjob neben der Ausbildung? Verboten!"',
        desc: 'Du willst am Wochenende oder abends etwas dazuverdienen.',
        law: 'Art. 12 GG / § 2 Abs. 1 ArbZG / § 8 JArbSchG',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Ein Nebenjob ist grundsätzlich erlaubt — mit Grenzen.',
        verdictDetail: 'Ein **pauschales Verbot** ist unwirksam, denn deine Freizeit gehört dir (Berufsfreiheit, Art. 12 GG). Der Betrieb darf einen Nebenjob aber untersagen, wenn **berechtigte Interessen** betroffen sind: wenn er deine Ausbildung beeinträchtigt (du kommst übermüdet), wenn er bei einem **Konkurrenten** ist, oder wenn die **Höchstarbeitszeit** überschritten wird. Arbeitszeiten bei mehreren Arbeitgebern werden **zusammengerechnet** (§ 2 Abs. 1 ArbZG); für Minderjährige gelten die 8 Stunden am Tag und 40 Stunden in der Woche für alle Jobs zusammen. Steht in deinem Vertrag eine **Anzeigepflicht**, musst du den Nebenjob melden. Im Urlaub darfst du keinen Job machen, der dem Erholungszweck widerspricht (§ 8 BUrlG).',
        laws: [
            { title: '§ 2 Abs. 1 ArbZG – Arbeitszeit', text: 'Arbeitszeiten bei mehreren Arbeitgebern sind zusammenzurechnen.' },
            { title: '§ 8 BUrlG – Erwerbstätigkeit im Urlaub', text: 'Während des Urlaubs darf der Arbeitnehmer keine dem Urlaubszweck widersprechende Erwerbstätigkeit leisten.' },
            { title: '§ 4 Abs. 5 JArbSchG – Mehrere Arbeitgeber', text: 'Wird ein Jugendlicher von mehreren Arbeitgebern beschäftigt, werden die Arbeits- und Schichtzeiten sowie die Arbeitstage zusammengerechnet.' }
        ],
        tips: [
            'Schau in deinen Vertrag, ob du einen Nebenjob anzeigen musst — dann kurz schriftlich melden.',
            'Rechne alle Stunden zusammen: Ausbildung + Nebenjob dürfen die Höchstgrenzen nicht reißen.',
            'Kein Job bei der direkten Konkurrenz deines Ausbildungsbetriebs.',
            'Achte auf genug Schlaf vor Berufsschule und Prüfungen.'
        ],
        email: {
            subject: 'Anzeige einer Nebentätigkeit',
            body: `Sehr geehrte/r [Name des Ausbilders],

hiermit zeige ich an, dass ich ab [Datum] eine Nebentätigkeit bei [Arbeitgeber, Branche] aufnehme, und zwar [Umfang, z. B. samstags 4 Stunden].

Die Tätigkeit steht nicht in Konkurrenz zu unserem Betrieb und beeinträchtigt meine Ausbildung und den Berufsschulbesuch nicht. Die gesetzlichen Höchstarbeitszeiten halte ich insgesamt ein.

Mit freundlichen Grüßen
[Dein Name]`
        }
    },
    {
        id: 'gewerkschaft',
        cat: 'mitbestimmung',
        title: '"Gewerkschaft? Wenn du da eintrittst, kannst du gehen."',
        desc: 'Du willst in eine Gewerkschaft eintreten, und der Betrieb sieht das gar nicht gern.',
        law: 'Art. 9 Abs. 3 GG / § 7 AGG',
        severity: 3,
        verdict: 'nein',
        verdictShort: 'Nein — der Beitritt ist dein Grundrecht, Nachteile deswegen sind verboten.',
        verdictDetail: 'Das Recht, eine Gewerkschaft zu gründen und **ihr beizutreten**, ist ein **Grundrecht** (Koalitionsfreiheit, Art. 9 Abs. 3 GG). Abreden, die dieses Recht einschränken oder behindern, sind **nichtig**, und Maßnahmen dagegen sind **rechtswidrig** — so steht es direkt im Grundgesetz, und es gilt auch zwischen dir und deinem Betrieb. Eine Kündigung, Abmahnung oder schlechtere Behandlung wegen einer Mitgliedschaft ist unzulässig. Der Betrieb darf dich in der Regel auch **nicht fragen**, ob du Mitglied bist. Gewerkschaften bieten Azubis meist günstige Beiträge, Rechtsberatung und Rechtsschutz.',
        laws: [
            { title: 'Art. 9 Abs. 3 GG – Koalitionsfreiheit', text: 'Das Recht, zur Wahrung und Förderung der Arbeits- und Wirtschaftsbedingungen Vereinigungen zu bilden, ist für jedermann und für alle Berufe gewährleistet. Abreden, die dieses Recht einschränken oder zu behindern suchen, sind nichtig, hierauf gerichtete Maßnahmen sind rechtswidrig.' }
        ],
        tips: [
            'Dein Beitritt ist Privatsache — du musst ihn nicht melden.',
            'Mit Mitgliedschaft hast du meist kostenlose Rechtsberatung im Arbeitsrecht.',
            'Wirst du benachteiligt: alles notieren und die Gewerkschaft einschalten.',
            'Viele Gewerkschaften haben eigene Jugend- und Azubi-Gruppen.'
        ]
    },
    {
        id: 'streik-azubi',
        cat: 'mitbestimmung',
        title: '"Azubis dürfen nicht streiken."',
        desc: 'Deine Gewerkschaft ruft zum Warnstreik auf, und du willst mitmachen.',
        law: 'Art. 9 Abs. 3 GG / BAG-Rechtsprechung',
        severity: 2,
        verdict: 'jein',
        verdictShort: 'Doch — wenn es um eure Ausbildungsbedingungen geht und die Gewerkschaft aufruft.',
        verdictDetail: 'Azubis dürfen sich an **Streiks** beteiligen, wenn die Gewerkschaft dazu aufruft und der Streik **auch ihre Ausbildungsbedingungen** betrifft, etwa weil im Tarifvertrag die Ausbildungsvergütung verhandelt wird. Das Bundesarbeitsgericht hat das für **kurze Warnstreiks** ausdrücklich anerkannt. Während des Streiks gibt es **keine Vergütung**; Gewerkschaftsmitglieder bekommen meist **Streikgeld**. Wegen der Teilnahme an einem rechtmäßigen Streik darf dir **nicht gekündigt** oder abgemahnt werden. Ein **„wilder" Streik** ohne Gewerkschaftsaufruf ist dagegen nicht geschützt, und die **Berufsschule** bleibt auch an Streiktagen Pflicht.',
        laws: [
            { title: 'Art. 9 Abs. 3 GG – Koalitionsfreiheit', text: 'Die Koalitionsfreiheit schützt auch die Betätigung der Gewerkschaften, einschließlich des Arbeitskampfs.' },
            { title: 'Rechtsprechung des Bundesarbeitsgerichts', text: 'Auszubildende dürfen sich an kurzen, zeitlich begrenzten Warnstreiks beteiligen, wenn die Gewerkschaft auch über ihre Ausbildungsvergütung verhandelt.' }
        ],
        tips: [
            'Mach nur bei einem Streik mit, zu dem deine Gewerkschaft aufruft.',
            'Melde dich beim Streiklokal an — das ist für Streikgeld und Nachweis wichtig.',
            'Fällt der Streik auf einen Schultag, geht die Schule vor.',
            'Prüfungen sind kein Streiktag: An Prüfungstagen nicht streiken.'
        ]
    },
    {
        id: 'betriebsversammlung',
        cat: 'mitbestimmung',
        title: '"Zur Betriebsversammlung müssen Azubis nicht."',
        desc: 'Es gibt eine Betriebsversammlung, und du sollst stattdessen weiterarbeiten.',
        law: '§§ 42, 44 BetrVG / § 71 BetrVG',
        severity: 2,
        verdict: 'nein',
        verdictShort: 'Doch — Azubis gehören zur Belegschaft und dürfen bezahlt teilnehmen.',
        verdictDetail: 'Als Azubi bist du **Arbeitnehmer im Sinne des Betriebsverfassungsgesetzes** und darfst an **Betriebsversammlungen** teilnehmen. Sie finden in der Regel **während der Arbeitszeit** statt, und die Zeit der Teilnahme samt zusätzlicher Wegezeiten wird **wie Arbeitszeit vergütet** (§ 44 BetrVG). Der Betrieb darf dich nicht davon abhalten. Gibt es eine **JAV**, kann sie zusätzlich eine eigene **Jugend- und Auszubildendenversammlung** einberufen (§ 71 BetrVG), für die dasselbe gilt. Dort kannst du Fragen und Probleme rund um die Ausbildung ansprechen.',
        laws: [
            { title: '§ 42 Abs. 1 BetrVG – Betriebsversammlung', text: 'Die Betriebsversammlung besteht aus den Arbeitnehmern des Betriebs; sie wird vom Vorsitzenden des Betriebsrats geleitet.' },
            { title: '§ 44 Abs. 1 BetrVG – Zeitpunkt und Vergütung', text: 'Die Betriebsversammlungen finden während der Arbeitszeit statt. Die Zeit der Teilnahme einschließlich zusätzlicher Wegezeiten ist den Arbeitnehmern wie Arbeitszeit zu vergüten.' },
            { title: '§ 71 BetrVG – Jugend- und Auszubildendenversammlung', text: 'Die Jugend- und Auszubildendenvertretung kann vor oder nach jeder Betriebsversammlung im Einvernehmen mit dem Betriebsrat eine betriebliche Jugend- und Auszubildendenversammlung einberufen.' }
        ],
        tips: [
            'Die Einladung hängt meist am Schwarzen Brett oder kommt per Mail vom Betriebsrat.',
            'Sag deinem Ausbilder Bescheid, dass du teilnimmst.',
            'Nutze die Versammlung, um Ausbildungsthemen anzusprechen.',
            'Die Zeit zählt als Arbeitszeit — notiere sie im Zeitnachweis.'
        ]
    }
];

// Umgangssprache → Fall-ids, fuer die Suche.
window.RC_STICHWORTE = {
    // Arbeitszeit
    'überstunden':    ['ueberstunden'], 'überstunde': ['ueberstunden'],
    'länger bleiben': ['ueberstunden'], 'länger arbeiten': ['ueberstunden'],
    'mehr arbeiten':  ['ueberstunden'], 'nachsitzen': ['ueberstunden'],
    'wochenende':     ['wochenende'], 'samstag': ['wochenende'], 'sonntag': ['wochenende'],
    'samstags':       ['wochenende'], 'sonntags': ['wochenende'],
    'feiertag':       ['wochenende', 'feiertagsarbeit'], 'feiertags': ['wochenende'],
    'pause':          ['pause'], 'mittagspause': ['pause'], 'essen': ['pause'],
    'keine pause':    ['pause'], 'durcharbeiten': ['pause'], 'pausen': ['pause'],
    'raucherpause':   ['pause'], 'essenpause': ['pause'],
    'nachtarbeit':    ['nachtarbeit'], 'spätschicht': ['nachtarbeit'], 'nachtschicht': ['nachtarbeit'],
    'abends':         ['nachtarbeit'], 'nachts': ['nachtarbeit'], 'schichtarbeit': ['nachtarbeit'],
    'spät arbeiten':  ['nachtarbeit'], 'frühschicht': ['nachtarbeit'],

    // Tätigkeiten
    'putzen':         ['putzen'], 'fegen': ['putzen'], 'aufräumen': ['putzen'],
    'halle fegen':    ['putzen'], 'klo putzen': ['putzen'], 'toilette': ['putzen'],
    'sauber machen':  ['putzen'], 'wischen': ['putzen'], 'staubsaugen': ['putzen'],
    'müll':           ['putzen'], 'reinigen': ['putzen'], 'schrubben': ['putzen'],
    'kaffee':         ['privatbesorgungen'], 'kaffee holen': ['privatbesorgungen'],
    'einkaufen':      ['privatbesorgungen'], 'auto waschen': ['privatbesorgungen'],
    'besorgungen':    ['privatbesorgungen'], 'privat': ['privatbesorgungen'],
    'brötchen holen':  ['privatbesorgungen'], 'post holen': ['privatbesorgungen'],
    'eintönig':        ['eintoenig'], 'immer das gleiche': ['eintoenig'],
    'monoton':         ['eintoenig'], 'langweilig': ['eintoenig'],
    'nichts neues':    ['eintoenig'], 'abwechslung': ['eintoenig'],
    'nur kopieren':    ['eintoenig'], 'immer dasselbe': ['eintoenig'],

    // Urlaub
    'urlaub':          ['urlaub-gestrichen', 'urlaub-bestimmen', 'pruefungsfreistellung'],
    'urlaub gestrichen': ['urlaub-gestrichen'], 'urlaub weg': ['urlaub-gestrichen'],
    'urlaub streichen': ['urlaub-gestrichen'], 'urlaub storniert': ['urlaub-gestrichen'],
    'kein urlaub':     ['urlaub-gestrichen'],
    'urlaub bestimmen': ['urlaub-bestimmen'], 'urlaub wann chef will': ['urlaub-bestimmen'],
    'ferien':          ['urlaub-gestrichen', 'urlaub-bestimmen', 'urlaub-schulzeit'],
    'prüfung urlaub':  ['pruefungsfreistellung'], 'prüfung freistellung': ['pruefungsfreistellung'],
    'prüfung frei':    ['pruefungsfreistellung'], 'klausur': ['pruefungsfreistellung'],
    'abschlussprüfung': ['pruefungsfreistellung'], 'zwischenprüfung': ['pruefungsfreistellung', 'zwischenpruefung'],

    // Berufsschule
    'berufsschule':    ['nach-schule-betrieb', 'schule-nicht-angerechnet'],
    'schule':          ['nach-schule-betrieb', 'schule-nicht-angerechnet'],
    'nach schule':     ['nach-schule-betrieb'], 'nach berufsschule': ['nach-schule-betrieb'],
    'nach der schule': ['nach-schule-betrieb'], 'schule arbeitszeit': ['schule-nicht-angerechnet'],
    'schule freizeit': ['schule-nicht-angerechnet'], 'schule nicht angerechnet': ['schule-nicht-angerechnet'],
    'blockunterricht': ['nach-schule-betrieb', 'schule-nicht-angerechnet', 'blockunterricht'],
    'schulweg':        ['schule-nicht-angerechnet'],

    // Geld
    'geld':            ['verguetung-niedrig', 'krank-kein-geld', 'arbeitsmaterial'],
    'gehalt':          ['verguetung-niedrig', 'krank-kein-geld'],
    'vergütung':       ['verguetung-niedrig'], 'zu wenig geld': ['verguetung-niedrig'],
    'lohn':            ['verguetung-niedrig', 'krank-kein-geld'],
    'mindestlohn':     ['verguetung-niedrig'], 'mindestvergütung': ['verguetung-niedrig'],
    'werkzeug':        ['arbeitsmaterial'], 'arbeitsmaterial': ['arbeitsmaterial'],
    'material':        ['arbeitsmaterial'], 'selber kaufen': ['arbeitsmaterial'],
    'bücher':          ['arbeitsmaterial'], 'fachbuch': ['arbeitsmaterial'],
    'arbeitskleidung': ['arbeitsmaterial'], 'sicherheitsschuhe': ['arbeitsmaterial'],
    'krank':           ['krank-kein-geld'], 'krankheit': ['krank-kein-geld'],
    'krank kein geld': ['krank-kein-geld'], 'lohnfortzahlung': ['krank-kein-geld'],
    'arbeitsunfähig':  ['krank-kein-geld'], 'krankgeschrieben': ['krank-kein-geld'],

    // Kündigung
    'kündigung':       ['kuendigung-drohung', 'abmahnung', 'aufhebungsvertrag'],
    'gekkündigt':      ['kuendigung-drohung'], 'rausschmiss': ['kuendigung-drohung'],
    'fliegen':         ['kuendigung-drohung'], 'rausfliegen': ['kuendigung-drohung'],
    'feuern':          ['kuendigung-drohung'], 'gefeuert': ['kuendigung-drohung', 'kuendigung-whatsapp'],
    'probezeit':       ['kuendigung-drohung'],
    'abmahnung':       ['abmahnung'], 'abgemahnt': ['abmahnung'],
    'verwarnung':      ['abmahnung'], 'ermahnung': ['abmahnung'],
    'aufhebungsvertrag': ['aufhebungsvertrag'], 'unterschreiben': ['aufhebungsvertrag'],
    'vertrag unterschreiben': ['aufhebungsvertrag'], 'aufhebung': ['aufhebungsvertrag'],
    'zeugnis':         ['zeugnis'], 'arbeitszeugnis': ['zeugnis'],
    'ausbildungszeugnis': ['zeugnis'], 'kein zeugnis': ['zeugnis'],

    // Mobbing
    'mobbing':         ['mobbing', 'diskriminierung'], 'gemobbt': ['mobbing'],
    'beleidigung':     ['mobbing', 'anschreien-beleidigung'], 'beleidigt': ['mobbing', 'anschreien-beleidigung'],
    'schikane':        ['mobbing'], 'anschreien': ['mobbing', 'anschreien-beleidigung'],
    'ausgegrenzt':     ['mobbing'], 'fertig machen': ['mobbing'],
    'diskriminierung': ['diskriminierung'], 'diskriminiert': ['diskriminierung'],
    'rassismus':       ['diskriminierung'], 'sexismus': ['diskriminierung'],
    'herkunft':        ['diskriminierung'], 'frauen': ['diskriminierung'],
    'behindert':       ['diskriminierung'], 'religion': ['diskriminierung'],
    'kopftuch':        ['diskriminierung', 'kleiderordnung-tattoo'], 'hautfarbe': ['diskriminierung'],

    // ── Arbeitszeit (erweitert) ──
    'ruhezeit':        ['ruhezeit-zwischen-schichten'], '11 stunden': ['ruhezeit-zwischen-schichten'],
    'zwischen schichten': ['ruhezeit-zwischen-schichten'], 'schichtwechsel': ['ruhezeit-zwischen-schichten'],
    'zu früh':         ['ruhezeit-zwischen-schichten'], 'kein schlaf': ['ruhezeit-zwischen-schichten'],
    'stunden gestrichen': ['arbeitszeitkonto-manipulation'], 'arbeitszeitkonto': ['arbeitszeitkonto-manipulation'],
    'stechuhr':        ['arbeitszeitkonto-manipulation'], 'zeiterfassung': ['arbeitszeitkonto-manipulation', 'keine-zeiterfassung'],
    'stunden abgezogen': ['arbeitszeitkonto-manipulation'], 'manipuliert': ['arbeitszeitkonto-manipulation'],
    'schwarzarbeit':   ['arbeitszeitkonto-manipulation'], 'minusstunden': ['arbeitszeitkonto-manipulation'],
    'bereitschaft':    ['bereitschaftsdienst'], 'rufbereitschaft': ['bereitschaftsdienst'],
    'rufdienst':       ['bereitschaftsdienst'], 'erreichbar':  ['bereitschaftsdienst'],
    'auf abruf':       ['bereitschaftsdienst'],
    'fahrtzeit':       ['fahrtzeit-aussenstelle'], 'anfahrt':   ['fahrtzeit-aussenstelle'],
    'baustelle':       ['fahrtzeit-aussenstelle'], 'außendienst': ['fahrtzeit-aussenstelle'],
    'kunde fahren':    ['fahrtzeit-aussenstelle'], 'einsatzort': ['fahrtzeit-aussenstelle'],

    // ── Tätigkeiten (erweitert) ──
    'weisung':         ['weisung-rechtswidrig'], 'anweisung':  ['weisung-rechtswidrig'],
    'illegal':         ['weisung-rechtswidrig'], 'rechtswidrig': ['weisung-rechtswidrig'],
    'verweigern':      ['weisung-rechtswidrig'], 'verboten':   ['weisung-rechtswidrig'],
    'akkord':          ['akkordarbeit'], 'akkordarbeit': ['akkordarbeit'],
    'fließband':       ['akkordarbeit'], 'stückzahl':    ['akkordarbeit'],
    'tempo':           ['akkordarbeit'], 'leistungslohn': ['akkordarbeit'],

    // ── Urlaub (erweitert) ──
    'urlaubsdauer':    ['urlaubsdauer'], 'wie viele tage urlaub': ['urlaubsdauer'],
    'urlaubsanspruch': ['urlaubsdauer'], 'urlaubstage':  ['urlaubsdauer'],
    '24 tage':         ['urlaubsdauer'], '25 tage':      ['urlaubsdauer'],
    '27 tage':         ['urlaubsdauer'], '30 tage':      ['urlaubsdauer'],
    'krank im urlaub': ['krankheit-im-urlaub'], 'krank urlaub': ['krankheit-im-urlaub'],
    'urlaub erkrankt': ['krankheit-im-urlaub'], 'attest urlaub': ['krankheit-im-urlaub'],
    'zusammenhängend': ['urlaub-zusammenhaengend'], 'urlaub am stück': ['urlaub-zusammenhaengend'],
    '12 werktage':     ['urlaub-zusammenhaengend'], '2 wochen urlaub': ['urlaub-zusammenhaengend'],
    'urlaub geteilt':  ['urlaub-zusammenhaengend'],

    // ── Berufsschule (erweitert) ──
    'fahrtkosten':     ['berufsschule-fahrtkosten', 'fahrtkosten-arbeit'], 'fahrtkosten erstattung': ['berufsschule-fahrtkosten'],
    'überbetrieblich': ['berufsschule-fahrtkosten'], 'übu':           ['berufsschule-fahrtkosten'],
    'blockschule':     ['berufsschule-fahrtkosten', 'blockunterricht'], 'unterkunft':    ['berufsschule-fahrtkosten'],
    'durchgefallen':   ['pruefungswiederholung'], 'nicht bestanden': ['pruefungswiederholung'],
    'wiederholung':    ['pruefungswiederholung'], 'wiederholungsprüfung': ['pruefungswiederholung'],
    'nachprüfung':     ['pruefungswiederholung'], 'verlängerung':  ['pruefungswiederholung', 'ausbildung-verlaengern'],

    // ── Geld (erweitert) ──
    'mindestausbildungsvergütung': ['mindestausbildungsverguetung'], 'mindestvergütung azubi': ['mindestausbildungsverguetung'],
    'mindestens lehrjahr': ['mindestausbildungsverguetung'], 'untergrenze lohn': ['mindestausbildungsverguetung'],
    'jährliche steigerung': ['jaehrliche-steigerung'], 'gehalt steigt nicht': ['jaehrliche-steigerung'],
    'gleicher lohn':   ['jaehrliche-steigerung'], 'lohn eingefroren': ['jaehrliche-steigerung'],
    'erhöhung':        ['jaehrliche-steigerung'], 'lohnerhöhung':   ['jaehrliche-steigerung'],
    'überstunden bezahlen': ['ueberstunden-verguetung'], 'überstunden vergüten': ['ueberstunden-verguetung'],
    'überstunden ausgleich': ['ueberstunden-verguetung'], 'mehrarbeit bezahlen': ['ueberstunden-verguetung'],

    // ── Kündigung (erweitert) ──
    'probezeit kündigung': ['kuendigung-probezeit'], 'während probezeit': ['kuendigung-probezeit'],
    'probezeit ende':  ['kuendigung-probezeit'], 'probezeit 4 monate': ['kuendigung-probezeit'],
    'fristlose kündigung': ['kuendigung-aus-wichtigem-grund'], 'wichtiger grund': ['kuendigung-aus-wichtigem-grund'],
    'außerordentliche kündigung': ['kuendigung-aus-wichtigem-grund'], 'fristlos rausgeworfen': ['kuendigung-aus-wichtigem-grund'],
    'schlichtungsausschuss': ['schlichtungsausschuss-ihk'], 'schlichtung': ['schlichtungsausschuss-ihk'],
    'arbeitsgericht':  ['schlichtungsausschuss-ihk'], 'klagen':        ['schlichtungsausschuss-ihk'],
    'ihk schlichtung': ['schlichtungsausschuss-ihk'], 'klage':         ['schlichtungsausschuss-ihk'],

    // ── Persönlichkeitsschutz (erweitert) ──
    'sexuelle belästigung': ['sexuelle-belaestigung'], 'angegrabscht': ['sexuelle-belaestigung'],
    'angefasst':       ['sexuelle-belaestigung'], 'po geklopft':   ['sexuelle-belaestigung'],
    'anzüglich':       ['sexuelle-belaestigung'], 'anzügliche witze': ['sexuelle-belaestigung'],
    'übergriff':       ['sexuelle-belaestigung'], 'catcalling':    ['sexuelle-belaestigung'],
    'me too':          ['sexuelle-belaestigung'],

    // ── Sicherheit (neu) ──
    'schutzkleidung':  ['schutzkleidung'], 'sicherheitsschuhe': ['schutzkleidung'],
    'helm':            ['schutzkleidung'], 'schutzbrille':    ['schutzkleidung'],
    'handschuhe':      ['schutzkleidung'], 'psa':             ['schutzkleidung'],
    'gehörschutz':     ['schutzkleidung'], 'atemschutz':      ['schutzkleidung'],
    'gefahrstoff':     ['gefahrenstoffe'], 'gefährliche stoffe': ['gefahrenstoffe'],
    'säure':           ['gefahrenstoffe'], 'chemikalien':     ['gefahrenstoffe'],
    'asbest':          ['gefahrenstoffe'], 'lärm':            ['gefahrenstoffe'],
    'gefährliche arbeit': ['gefahrenstoffe'], 'gift':           ['gefahrenstoffe'],
    'unfall':          ['arbeitsunfall'], 'arbeitsunfall':   ['arbeitsunfall'],
    'verletzt':        ['arbeitsunfall'], 'verletzung':      ['arbeitsunfall'],
    'berufsgenossenschaft': ['arbeitsunfall'], 'd-arzt':       ['arbeitsunfall'],
    'durchgangsarzt':  ['arbeitsunfall'], 'verbandbuch':     ['arbeitsunfall'],
    'unterweisung':    ['sicherheitsbelehrung'], 'sicherheitsbelehrung': ['sicherheitsbelehrung'],
    'sicherheitsunterweisung': ['sicherheitsbelehrung'], 'einweisung': ['sicherheitsbelehrung'],
    'maschinenführerschein': ['sicherheitsbelehrung'], 'stapler':    ['sicherheitsbelehrung'],
    'untersuchung':    ['arbeitsmedizinische-untersuchung', 'arzttermin'], 'j1': ['arbeitsmedizinische-untersuchung'],
    'erstuntersuchung': ['arbeitsmedizinische-untersuchung'], 'nachuntersuchung': ['arbeitsmedizinische-untersuchung'],
    'arbeitsmedizin':  ['arbeitsmedizinische-untersuchung'], 'jugendarbeitsschutz untersuchung': ['arbeitsmedizinische-untersuchung'],
    'burnout':         ['psychische-belastung'], 'depression':     ['psychische-belastung'],
    'überfordert':     ['psychische-belastung'], 'kann nicht mehr': ['psychische-belastung'],
    'panik':           ['psychische-belastung'], 'schlaflos':      ['psychische-belastung'],
    'stress':          ['psychische-belastung'], 'psychisch fertig': ['psychische-belastung'],
    'fürsorgepflicht': ['psychische-belastung'],

    // ── Ausbildung (neu) ──
    'ausbildungsplan': ['ausbildungsplan-existenz'], 'kein ausbildungsplan': ['ausbildungsplan-existenz'],
    'ausbildungsrahmenplan': ['ausbildungsplan-existenz'], 'strukturierte ausbildung': ['ausbildungsplan-existenz'],
    'ohne plan':       ['ausbildungsplan-existenz'],
    'ausbilder nicht da': ['ausbilder-nie-da'], 'kein ausbilder': ['ausbilder-nie-da'],
    'alleine gelassen': ['ausbilder-nie-da'], 'ohne anleitung': ['ausbilder-nie-da'],
    'niemand zeigt':   ['ausbilder-nie-da'], 'im stich gelassen': ['ausbilder-nie-da'],
    'ausbildungseignung': ['ausbilder-nie-da'], 'ada-schein':    ['ausbilder-nie-da'],
    'verkürzung':      ['ausbildungszeit-verkuerzung', 'vorzeitige-zulassung'], 'ausbildung verkürzen': ['ausbildungszeit-verkuerzung'],
    'verkürzen':       ['ausbildungszeit-verkuerzung', 'vorzeitige-zulassung'], 'vorzeitige prüfung': ['ausbildungszeit-verkuerzung'],
    'abitur azubi':    ['ausbildungszeit-verkuerzung'],

    // ── Mitbestimmung (neu) ──
    'jav':             ['jav-betriebsrat-zugang', 'jav-wahlrecht'],
    'betriebsrat':     ['jav-betriebsrat-zugang', 'jav-wahlrecht'],
    'sprechstunde':    ['jav-betriebsrat-zugang'], 'jav sprechen': ['jav-betriebsrat-zugang'],
    'jav-wahl':        ['jav-wahlrecht'], 'wahlrecht':      ['jav-wahlrecht'],
    'jugendvertretung': ['jav-wahlrecht'], 'azubivertretung': ['jav-wahlrecht'],
    'gewerkschaft':    ['jav-betriebsrat-zugang', 'gewerkschaft'],
    'überwachung':     ['datenschutz-ueberwachung'], 'kamera':       ['datenschutz-ueberwachung'],
    'datenschutz':     ['datenschutz-ueberwachung'], 'spionage':     ['datenschutz-ueberwachung'],
    'dsgvo':           ['datenschutz-ueberwachung'], 'keylogger':    ['datenschutz-ueberwachung'],
    'gps tracking':    ['datenschutz-ueberwachung'], 'email kontrolliert': ['datenschutz-ueberwachung'],
    'pc überwacht':    ['datenschutz-ueberwachung'],

    // Ergaenzt 19.10.2026
    'sechs tage': ['sechs-tage-woche'],
    '6 tage': ['sechs-tage-woche'],
    'samstag arbeiten': ['sechs-tage-woche'],
    'sechstagewoche': ['sechs-tage-woche'],
    'fünf tage woche': ['sechs-tage-woche'],
    'jeden tag arbeiten': ['sechs-tage-woche'],
    'feiertage': ['feiertagsarbeit'],
    'feiertagsarbeit': ['feiertagsarbeit'],
    'ostern arbeiten': ['feiertagsarbeit'],
    'weihnachten arbeiten': ['feiertagsarbeit'],
    'silvester arbeiten': ['feiertagsarbeit'],
    '1. mai': ['feiertagsarbeit'],
    'ersatzruhetag': ['feiertagsarbeit'],
    'feiertagszuschlag': ['feiertagsarbeit'],
    'vor der schule': ['vor-der-berufsschule'],
    'vor schulbeginn': ['vor-der-berufsschule'],
    'morgens vor der schule': ['vor-der-berufsschule'],
    'vor 9 uhr': ['vor-der-berufsschule'],
    'vor dem unterricht': ['vor-der-berufsschule'],
    'erst in den betrieb dann schule': ['vor-der-berufsschule'],
    'umziehen': ['umkleidezeit'],
    'umkleiden': ['umkleidezeit'],
    'umkleidezeit': ['umkleidezeit'],
    'arbeitskleidung anziehen': ['umkleidezeit'],
    'dienstkleidung': ['umkleidezeit'],
    'umkleide': ['umkleidezeit'],
    'homeoffice': ['homeoffice-azubi'],
    'home office': ['homeoffice-azubi'],
    'von zu hause': ['homeoffice-azubi'],
    'mobiles arbeiten': ['homeoffice-azubi'],
    'remote': ['homeoffice-azubi'],
    'zuhause arbeiten': ['homeoffice-azubi'],
    'laptop': ['homeoffice-azubi'],
    'stunden aufschreiben': ['keine-zeiterfassung'],
    'stempeln': ['keine-zeiterfassung'],
    'stempeluhr': ['keine-zeiterfassung'],
    'arbeitszeit aufschreiben': ['keine-zeiterfassung'],
    'stundenzettel': ['keine-zeiterfassung'],
    'keine zeiterfassung': ['keine-zeiterfassung'],
    'andere firma': ['anderer-betrieb'],
    'anderer betrieb': ['anderer-betrieb'],
    'partnerfirma': ['anderer-betrieb'],
    'ausgeliehen': ['anderer-betrieb'],
    'verliehen': ['anderer-betrieb'],
    'aushelfen': ['anderer-betrieb'],
    'verbundausbildung': ['anderer-betrieb'],
    'tochterfirma': ['anderer-betrieb'],
    'filiale': ['anderer-betrieb'],
    'firmenwagen': ['firmenwagen-fahren'],
    'auto fahren': ['firmenwagen-fahren'],
    'ausliefern': ['firmenwagen-fahren'],
    'lieferungen fahren': ['firmenwagen-fahren'],
    'fahrer': ['firmenwagen-fahren'],
    'transporter': ['firmenwagen-fahren'],
    'führerschein': ['firmenwagen-fahren'],
    'unfall firmenwagen': ['firmenwagen-fahren'],
    'blitzer': ['firmenwagen-fahren'],
    'kasse': ['kassenfehlbetrag'],
    'kassendifferenz': ['kassenfehlbetrag'],
    'fehlbetrag': ['kassenfehlbetrag'],
    'minus in der kasse': ['kassenfehlbetrag'],
    'manko': ['kassenfehlbetrag'],
    'lohnabzug': ['kassenfehlbetrag'],
    'vom lohn abziehen': ['kassenfehlbetrag'],
    'geld fehlt': ['kassenfehlbetrag'],
    'kaputt gemacht': ['schaden-bezahlen'],
    'schaden': ['schaden-bezahlen'],
    'beschädigt': ['schaden-bezahlen'],
    'zerbrochen': ['schaden-bezahlen'],
    'schadensersatz': ['schaden-bezahlen'],
    'haftung': ['schaden-bezahlen'],
    'selbst bezahlen': ['schaden-bezahlen'],
    'reparatur bezahlen': ['schaden-bezahlen'],
    'werkzeug kaputt': ['schaden-bezahlen'],
    'handy': ['handyverbot'],
    'handyverbot': ['handyverbot'],
    'smartphone': ['handyverbot'],
    'handy abgeben': ['handyverbot'],
    'spind': ['handyverbot'],
    'private nutzung': ['handyverbot'],
    'whatsapp bei der arbeit': ['handyverbot'],
    'tattoo': ['kleiderordnung-tattoo'],
    'tattoos': ['kleiderordnung-tattoo'],
    'piercing': ['kleiderordnung-tattoo'],
    'frisur': ['kleiderordnung-tattoo'],
    'haare': ['kleiderordnung-tattoo'],
    'kleiderordnung': ['kleiderordnung-tattoo'],
    'dresscode': ['kleiderordnung-tattoo'],
    'bart': ['kleiderordnung-tattoo'],
    'nagellack': ['kleiderordnung-tattoo'],
    'schmuck': ['kleiderordnung-tattoo'],
    'instagram': ['social-media-post'],
    'tiktok': ['social-media-post'],
    'social media': ['social-media-post'],
    'post': ['social-media-post'],
    'gepostet': ['social-media-post'],
    'story': ['social-media-post'],
    'facebook': ['social-media-post'],
    'lästern': ['social-media-post'],
    'kritik am chef': ['social-media-post'],
    'whatsapp gruppe': ['social-media-post'],
    'nebenjob': ['nebenjob'],
    'minijob': ['nebenjob'],
    'nebentätigkeit': ['nebenjob'],
    'zweitjob': ['nebenjob'],
    'dazuverdienen': ['nebenjob'],
    'nebenbei arbeiten': ['nebenjob'],
    'kellnern am wochenende': ['nebenjob'],
    'urlaub probezeit': ['urlaub-probezeit'],
    'urlaub am anfang': ['urlaub-probezeit'],
    'wartezeit': ['urlaub-probezeit'],
    'erste monate urlaub': ['urlaub-probezeit'],
    'teilurlaub': ['urlaub-probezeit'],
    'anteiliger urlaub': ['urlaub-probezeit'],
    'urlaub schultag': ['urlaub-schulzeit'],
    'urlaub berufsschule': ['urlaub-schulzeit'],
    'schulferien': ['urlaub-schulzeit'],
    'urlaub in der schulzeit': ['urlaub-schulzeit'],
    'schultag als urlaub': ['urlaub-schulzeit'],
    'resturlaub': ['resturlaub-verfaellt'],
    'urlaub verfällt': ['resturlaub-verfaellt'],
    'verfall': ['resturlaub-verfaellt'],
    'urlaub übertragen': ['resturlaub-verfaellt'],
    'urlaub ins nächste jahr': ['resturlaub-verfaellt'],
    '31. märz': ['resturlaub-verfaellt'],
    'jahresende urlaub': ['resturlaub-verfaellt'],
    'urlaubsabgeltung': ['urlaubsabgeltung'],
    'urlaub auszahlen': ['urlaubsabgeltung'],
    'resturlaub ende': ['urlaubsabgeltung'],
    'urlaub ausbildungsende': ['urlaubsabgeltung'],
    'urlaub geld': ['urlaubsabgeltung'],
    'nicht übernommen urlaub': ['urlaubsabgeltung'],
    'sonderurlaub': ['sonderurlaub'],
    'beerdigung': ['sonderurlaub'],
    'trauerfall': ['sonderurlaub'],
    'todesfall': ['sonderurlaub'],
    'hochzeit': ['sonderurlaub'],
    'heirat': ['sonderurlaub'],
    'geburt': ['sonderurlaub'],
    'umzug': ['sonderurlaub'],
    'gerichtstermin': ['sonderurlaub'],
    'freistellung anlass': ['sonderurlaub'],
    'arzttermin': ['arzttermin'],
    'arzt': ['arzttermin'],
    'zahnarzt': ['arzttermin'],
    'facharzt': ['arzttermin'],
    'termin beim arzt': ['arzttermin'],
    'nacharbeiten arzt': ['arzttermin'],
    'bildungsurlaub': ['bildungsurlaub'],
    'bildungszeit': ['bildungsurlaub'],
    'bildungsfreistellung': ['bildungsurlaub'],
    'seminar': ['bildungsurlaub'],
    'weiterbildung urlaub': ['bildungsurlaub'],
    'fortbildung': ['bildungsurlaub'],
    'berichtsheft': ['berichtsheft-zuhause'],
    'ausbildungsnachweis': ['berichtsheft-zuhause'],
    'berichtsheft zu hause': ['berichtsheft-zuhause'],
    'berichtsheft freizeit': ['berichtsheft-zuhause'],
    'berichtsheft schreiben': ['berichtsheft-zuhause'],
    'wochenbericht': ['berichtsheft-zuhause'],
    'tagesbericht': ['berichtsheft-zuhause'],
    'berichtsheft unterschrift': ['berichtsheft-unterschrift'],
    'unterschreibt nicht': ['berichtsheft-unterschrift'],
    'abzeichnen': ['berichtsheft-unterschrift'],
    'berichtsheft kontrolle': ['berichtsheft-unterschrift'],
    'ausbilder unterschreibt': ['berichtsheft-unterschrift'],
    'gegenzeichnen': ['berichtsheft-unterschrift'],
    'zulassung berichtsheft': ['berichtsheft-unterschrift'],
    'blockwoche': ['blockunterricht'],
    'block': ['blockunterricht'],
    'nach dem block arbeiten': ['blockunterricht'],
    'schulwoche': ['blockunterricht'],
    'schwänzen': ['berufsschule-fehlen'],
    'geschwänzt': ['berufsschule-fehlen'],
    'schule fehlen': ['berufsschule-fehlen'],
    'unentschuldigt': ['berufsschule-fehlen'],
    'fehlstunden': ['berufsschule-fehlen'],
    'berufsschule gefehlt': ['berufsschule-fehlen'],
    'abmahnung schule': ['berufsschule-fehlen'],
    'schulbücher': ['schulbuecher-kosten'],
    'schulbuch': ['schulbuecher-kosten'],
    'bücher bezahlen': ['schulbuecher-kosten'],
    'taschenrechner': ['schulbuecher-kosten'],
    'tabellenbuch': ['schulbuecher-kosten'],
    'lernmittel': ['schulbuecher-kosten'],
    'schulmaterial': ['schulbuecher-kosten'],
    'fachbücher': ['schulbuecher-kosten'],
    'teil 1': ['zwischenpruefung'],
    'gestreckte prüfung': ['zwischenpruefung'],
    'gestreckte abschlussprüfung': ['zwischenpruefung'],
    'zwischenprüfung pflicht': ['zwischenpruefung'],
    'prüfung teil eins': ['zwischenpruefung'],
    'prüfungsgebühr': ['pruefungsgebuehr'],
    'prüfungsgebühren': ['pruefungsgebuehr'],
    'prüfung bezahlen': ['pruefungsgebuehr'],
    'prüfungskosten': ['pruefungsgebuehr'],
    'gebühr ihk': ['pruefungsgebuehr'],
    'wiederholungsprüfung kosten': ['pruefungsgebuehr'],
    'vorzeitige zulassung': ['vorzeitige-zulassung'],
    'früher prüfung': ['vorzeitige-zulassung'],
    'prüfung vorziehen': ['vorzeitige-zulassung'],
    'früher fertig': ['vorzeitige-zulassung'],
    'notenschnitt': ['vorzeitige-zulassung'],
    'nach der prüfung': ['nach-pruefung-weiterarbeiten'],
    'weiterarbeiten': ['nach-pruefung-weiterarbeiten'],
    'kein vertrag': ['nach-pruefung-weiterarbeiten', 'vertrag-nicht-eingetragen'],
    'bestanden': ['nach-pruefung-weiterarbeiten'],
    'ausbildung vorbei': ['nach-pruefung-weiterarbeiten'],
    'unbefristet': ['nach-pruefung-weiterarbeiten'],
    'gehalt nach ausbildung': ['nach-pruefung-weiterarbeiten'],
    'ende der ausbildung': ['nach-pruefung-weiterarbeiten'],
    'gehalt zu spät': ['verguetung-zu-spaet'],
    'vergütung zu spät': ['verguetung-zu-spaet'],
    'lohn kommt nicht': ['verguetung-zu-spaet'],
    'kein geld bekommen': ['verguetung-zu-spaet'],
    'gehalt nicht gezahlt': ['verguetung-zu-spaet'],
    'zahltag': ['verguetung-zu-spaet'],
    'überweisung fehlt': ['verguetung-zu-spaet'],
    'ausbildungskosten': ['ausbildungskosten-zurueck'],
    'zurückzahlen': ['ausbildungskosten-zurueck'],
    'rückzahlung': ['ausbildungskosten-zurueck'],
    'vertragsstrafe': ['ausbildungskosten-zurueck'],
    'abbruch kosten': ['ausbildungskosten-zurueck'],
    'strafe abbruch': ['ausbildungskosten-zurueck'],
    'lehrgangskosten': ['ausbildungskosten-zurueck'],
    'lehrgeld': ['lehrgeld'],
    'gebühr ausbildungsplatz': ['lehrgeld'],
    'schulgeld': ['lehrgeld'],
    'für ausbildung bezahlen': ['lehrgeld'],
    'ausbildungsgebühr': ['lehrgeld'],
    'abzocke': ['lehrgeld'],
    'bleiben müssen': ['bleibeverpflichtung'],
    'bleibeklausel': ['bleibeverpflichtung'],
    'zwei jahre bleiben': ['bleibeverpflichtung'],
    'wettbewerbsverbot': ['bleibeverpflichtung'],
    'konkurrenz': ['bleibeverpflichtung'],
    'nach der ausbildung bleiben': ['bleibeverpflichtung'],
    'bindung': ['bleibeverpflichtung'],
    'kost und logis': ['kost-und-logis'],
    'unterkunft abziehen': ['kost-und-logis'],
    'zimmer': ['kost-und-logis'],
    'personalzimmer': ['kost-und-logis'],
    'verpflegung': ['kost-und-logis'],
    'essen abziehen': ['kost-und-logis'],
    'sachbezug': ['kost-und-logis'],
    'sachleistung': ['kost-und-logis'],
    'weihnachtsgeld': ['weihnachtsgeld-azubi'],
    'urlaubsgeld': ['weihnachtsgeld-azubi'],
    'sonderzahlung': ['weihnachtsgeld-azubi'],
    'bonus': ['weihnachtsgeld-azubi'],
    '13. gehalt': ['weihnachtsgeld-azubi'],
    'jahressonderzahlung': ['weihnachtsgeld-azubi'],
    'prämie': ['weihnachtsgeld-azubi'],
    'pendeln': ['fahrtkosten-arbeit'],
    'pendlerpauschale': ['fahrtkosten-arbeit'],
    'entfernungspauschale': ['fahrtkosten-arbeit'],
    'jobticket': ['fahrtkosten-arbeit'],
    'deutschlandticket': ['fahrtkosten-arbeit'],
    'weg zur arbeit': ['fahrtkosten-arbeit'],
    'spritkosten': ['fahrtkosten-arbeit'],
    'kindergeld': ['kindergeld-bab'],
    'bab': ['kindergeld-bab'],
    'berufsausbildungsbeihilfe': ['kindergeld-bab'],
    'wohngeld': ['kindergeld-bab'],
    'zuschuss': ['kindergeld-bab'],
    'eigene wohnung': ['kindergeld-bab'],
    'familienkasse': ['kindergeld-bab'],
    'ausziehen': ['kindergeld-bab'],
    'probezeit gehalt': ['probezeit-weniger-geld'],
    'weniger geld probezeit': ['probezeit-weniger-geld'],
    'probezeit vergütung': ['probezeit-weniger-geld'],
    'erster monat weniger': ['probezeit-weniger-geld'],
    'gehalt kürzen': ['probezeit-weniger-geld'],
    'krankschreibung': ['krankmeldung-ab-tag-eins'],
    'au': ['krankmeldung-ab-tag-eins'],
    'krankmeldung': ['krankmeldung-ab-tag-eins'],
    'ab dem ersten tag': ['krankmeldung-ab-tag-eins'],
    'gelber schein': ['krankmeldung-ab-tag-eins'],
    'eau': ['krankmeldung-ab-tag-eins'],
    'attest': ['krankmeldung-ab-tag-eins'],
    'krank melden': ['krankmeldung-ab-tag-eins'],
    'diagnose': ['diagnose-chef'],
    'was hast du': ['diagnose-chef'],
    'krankheit nennen': ['diagnose-chef'],
    'grund krankmeldung': ['diagnose-chef'],
    'chef fragt krankheit': ['diagnose-chef'],
    'gesundheitsdaten': ['diagnose-chef'],
    'krank arbeiten': ['krank-arbeiten'],
    'trotz krankheit arbeiten': ['krank-arbeiten'],
    'krank erreichbar': ['krank-arbeiten'],
    'krankgeschrieben mails': ['krank-arbeiten'],
    'krank homeoffice': ['krank-arbeiten'],
    'krank anrufen': ['krank-arbeiten'],
    'krank schule': ['krank-berufsschule'],
    'krank berufsschule': ['krank-berufsschule'],
    'schule trotz au': ['krank-berufsschule'],
    'entschuldigung schule': ['krank-berufsschule'],
    'krank prüfung': ['krank-berufsschule'],
    'attest prüfung': ['krank-berufsschule'],
    'krankheitstage urlaub': ['krankheit-urlaub-abziehen'],
    'krank vom urlaub abziehen': ['krankheit-urlaub-abziehen'],
    'urlaub gekürzt krank': ['krankheit-urlaub-abziehen'],
    'fehltage urlaub': ['krankheit-urlaub-abziehen'],
    'krankheit verrechnen': ['krankheit-urlaub-abziehen'],
    'selbst kündigen': ['selbst-kuendigen'],
    'ausbildung abbrechen': ['selbst-kuendigen'],
    'aufhören': ['selbst-kuendigen'],
    'abbruch': ['selbst-kuendigen'],
    'betrieb wechseln': ['selbst-kuendigen'],
    'ausbildungsplatz wechseln': ['selbst-kuendigen'],
    'beruf wechseln': ['selbst-kuendigen'],
    'kündigungsfrist azubi': ['selbst-kuendigen'],
    'whatsapp kündigung': ['kuendigung-whatsapp'],
    'kündigung per mail': ['kuendigung-whatsapp'],
    'kündigung sms': ['kuendigung-whatsapp'],
    'mündlich gekündigt': ['kuendigung-whatsapp'],
    'rausgeschmissen': ['kuendigung-whatsapp'],
    'schriftform kündigung': ['kuendigung-whatsapp'],
    'übernahme': ['uebernahme'],
    'übernommen': ['uebernahme'],
    'nach ausbildung übernommen': ['uebernahme'],
    'weiterbeschäftigung': ['uebernahme'],
    'festanstellung': ['uebernahme'],
    'nicht übernommen': ['uebernahme'],
    'job nach ausbildung': ['uebernahme'],
    'zu oft krank': ['kuendigung-wegen-krankheit'],
    'krank gekündigt': ['kuendigung-wegen-krankheit'],
    'kündigung krankheit': ['kuendigung-wegen-krankheit'],
    'viele krankheitstage': ['kuendigung-wegen-krankheit'],
    'fehlzeiten kündigung': ['kuendigung-wegen-krankheit'],
    'krankheitsbedingte kündigung': ['kuendigung-wegen-krankheit'],
    'schwanger': ['schwangerschaft'],
    'schwangerschaft': ['schwangerschaft'],
    'mutterschutz': ['schwangerschaft'],
    'baby': ['schwangerschaft'],
    'elternzeit': ['schwangerschaft'],
    'kind bekommen': ['schwangerschaft'],
    'insolvenz': ['insolvenz-betrieb'],
    'pleite': ['insolvenz-betrieb'],
    'betrieb schließt': ['insolvenz-betrieb'],
    'firma zu': ['insolvenz-betrieb'],
    'insolvenzgeld': ['insolvenz-betrieb'],
    'betriebsschließung': ['insolvenz-betrieb'],
    'konkurs': ['insolvenz-betrieb'],
    'probezeit verlängern': ['probezeit-verlaengert'],
    'probezeit verlängert': ['probezeit-verlaengert'],
    'längere probezeit': ['probezeit-verlaengert'],
    'probezeit vier monate': ['probezeit-verlaengert'],
    'probezeit dauer': ['probezeit-verlaengert'],
    'angeschrien': ['anschreien-beleidigung'],
    'demütigen': ['anschreien-beleidigung'],
    'bloßstellen': ['anschreien-beleidigung'],
    'schreit mich an': ['anschreien-beleidigung'],
    'respektlos': ['anschreien-beleidigung'],
    'runtermachen': ['anschreien-beleidigung'],
    'hitze': ['hitze-arbeitsplatz'],
    'hitzefrei': ['hitze-arbeitsplatz'],
    'zu heiß': ['hitze-arbeitsplatz'],
    '30 grad': ['hitze-arbeitsplatz'],
    '35 grad': ['hitze-arbeitsplatz'],
    'temperatur büro': ['hitze-arbeitsplatz'],
    'sommer arbeit': ['hitze-arbeitsplatz'],
    'klimaanlage': ['hitze-arbeitsplatz'],
    'kälte': ['hitze-arbeitsplatz'],
    'alkohol': ['alkohol-rauchen'],
    'bier': ['alkohol-rauchen'],
    'feierabendbier': ['alkohol-rauchen'],
    'trinken': ['alkohol-rauchen'],
    'betrunken': ['alkohol-rauchen'],
    'rauchen': ['alkohol-rauchen'],
    'zigarette': ['alkohol-rauchen'],
    'vape': ['alkohol-rauchen'],
    'drogen': ['alkohol-rauchen'],
    'kiffen': ['alkohol-rauchen'],
    'ausbildungsvertrag': ['vertrag-nicht-eingetragen'],
    'vertrag fehlt': ['vertrag-nicht-eingetragen'],
    'nicht eingetragen': ['vertrag-nicht-eingetragen'],
    'eintragung ihk': ['vertrag-nicht-eingetragen'],
    'schriftlicher vertrag': ['vertrag-nicht-eingetragen'],
    'mündlicher vertrag': ['vertrag-nicht-eingetragen'],
    'teilzeit': ['teilzeitausbildung'],
    'teilzeitausbildung': ['teilzeitausbildung'],
    'weniger stunden': ['teilzeitausbildung'],
    'ausbildung mit kind': ['teilzeitausbildung'],
    'pflege': ['teilzeitausbildung'],
    'alleinerziehend': ['teilzeitausbildung'],
    'ausland': ['ausland'],
    'auslandspraktikum': ['ausland'],
    'erasmus': ['ausland'],
    'praktikum ausland': ['ausland'],
    'england': ['ausland'],
    'austausch': ['ausland'],
    'verlängern': ['ausbildung-verlaengern'],
    'mehr zeit': ['ausbildung-verlaengern'],
    'ausbildung verlängern': ['ausbildung-verlaengern'],
    'hinterher': ['ausbildung-verlaengern'],
    'lange krank': ['ausbildung-verlaengern'],
    'igmetall': ['gewerkschaft'],
    'verdi': ['gewerkschaft'],
    'eintreten': ['gewerkschaft'],
    'mitglied': ['gewerkschaft'],
    'koalitionsfreiheit': ['gewerkschaft'],
    'dgb jugend': ['gewerkschaft'],
    'streik': ['streik-azubi'],
    'warnstreik': ['streik-azubi'],
    'streiken': ['streik-azubi'],
    'streikgeld': ['streik-azubi'],
    'tarifverhandlung': ['streik-azubi'],
    'arbeitskampf': ['streik-azubi'],
    'betriebsversammlung': ['betriebsversammlung'],
    'jugendversammlung': ['betriebsversammlung'],
    'azubiversammlung': ['betriebsversammlung'],
    'versammlung': ['betriebsversammlung'],
    'belegschaftsversammlung': ['betriebsversammlung']
};

// Titel fuer Google (<title>, og:title, FAQ-Frage) — die H1 bleibt das Chef-Zitat.
// Grund (Search Console 29.09.–26.10.2026): Fallseiten standen im Schnitt auf
// Position 6,8, aber die CTR lag bei 0,8 %. Wer "bekommen azubis weihnachtsgeld"
// sucht, sah "Weihnachtsgeld bekommen nur die Festangestellten." — klingt wie die
// falsche Antwort. Formuliert nach den echten Suchanfragen; nur Faelle mit
// nennenswerten Impressionen. Fehlt ein Fall hier, bleibt der alte Titel.
window.RC_SEO = {
    'weihnachtsgeld-azubi': 'Bekommen Azubis Weihnachtsgeld? Was gilt in der Ausbildung',
    'pruefungsfreistellung': 'Prüfung in der Ausbildung: Muss ich dafür Urlaub nehmen?',
    'krank-berufsschule': 'Krankgeschrieben: Muss ich als Azubi in die Berufsschule?',
    'krankmeldung-ab-tag-eins': 'Krankschreibung ab dem ersten Tag – darf der Betrieb das?',
    'nachtarbeit': 'Dürfen Azubis nachts arbeiten? Nachtarbeit unter 18',
    'berichtsheft-zuhause': 'Berichtsheft zuhause schreiben – muss ich das?',
    'berufsschule-fahrtkosten': 'Fahrtkosten zur Berufsschule: Wer zahlt beim Azubi?',
    'arzttermin': 'Arzttermin während der Arbeitszeit – was gilt für Azubis?',
    'schulbuecher-kosten': 'Schulbücher in der Ausbildung: Wer muss sie zahlen?',
    'akkordarbeit': 'Akkordarbeit in der Ausbildung – ist das erlaubt?',
    'kuendigung-wegen-krankheit': 'Kündigung wegen Krankheit in der Ausbildung – geht das?',
    'berichtsheft-unterschrift': 'Wer muss das Berichtsheft unterschreiben – und wann?',
    'urlaub-schulzeit': 'Urlaub an Berufsschultagen nehmen – muss ich das?',
    'blockunterricht': 'Blockunterricht: Muss ich danach noch in den Betrieb?',
    'kassenfehlbetrag': 'Kassendifferenz als Azubi: Muss ich das Minus zahlen?',
    'nebenjob': 'Nebenjob in der Ausbildung – ist das erlaubt?',
    'probezeit-verlaengert': 'Probezeit in der Ausbildung verlängern – geht das?',
    'fahrtkosten-arbeit': 'Fahrtkosten zur Arbeit als Azubi: Wer zahlt?',
    'ausbildungskosten-zurueck': 'Ausbildung abbrechen: Muss ich Geld zurückzahlen?',
    'feiertagsarbeit': 'Arbeiten am Feiertag als Azubi – ist das erlaubt?',
    'urlaubsabgeltung': 'Resturlaub am Ende der Ausbildung: Wird er ausgezahlt?',
    'lehrgeld': 'Lehrgeld für die Ausbildung zahlen – ist das erlaubt?',
    'wochenende': 'Samstags arbeiten als Azubi – ist das erlaubt?',
    'jav-wahlrecht': 'JAV-Wahl im Betrieb: Ab wann ist sie Pflicht?',
    'putzen': 'Putzen als Azubi – muss ich das machen?',
    'verguetung-zu-spaet': 'Ausbildungsvergütung zu spät – wann muss sie da sein?',
    'umkleidezeit': 'Ist Umziehen Arbeitszeit? Was für Azubis gilt',
    'handyverbot': 'Handyverbot in der Ausbildung – ist das erlaubt?',
    'berufsschule-fehlen': 'Berufsschule schwänzen als Azubi: Welche Folgen drohen?',
    'sicherheitsbelehrung': 'Sicherheitsunterweisung für Azubis: Wann ist sie Pflicht?',
    'zwischenpruefung': 'Zählt die Zwischenprüfung? Muss ich teilnehmen?',
    'sechs-tage-woche': '6-Tage-Woche als Azubi – ist das erlaubt?',
    'selbst-kuendigen': 'Ausbildung selbst kündigen: Fristen und Wege',
};
