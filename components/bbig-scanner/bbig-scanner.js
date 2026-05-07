// ═══ BBIG-SCANNER MODULE ═══

(function() {

// Self-contained HTML escaper — no dependency on global safeHTML/esc
function bbigEsc(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const BBIG_RULES = [
    {
        id: 'sunday',
        patterns: [/\bsonntag(s)?\b/i, /\bsonntag\b/i, /\bam\s+sonntag\b/i],
        severity: 'danger',
        law: '§ 5 JArbSchG',
        icon: '🚫',
        title: 'Sonntagsarbeit',
        text: 'Jugendliche und Azubis dürfen grundsätzlich nicht an Sonntagen beschäftigt werden. Ausnahmen (z. B. Gastronomie, Krankenhaus) erfordern gesetzliche Sonderregelungen.'
    },
    {
        id: 'weekend',
        patterns: [/\bwochenende\b/i, /\bwochenends\b/i],
        severity: 'warning',
        law: '§ 5 JArbSchG',
        icon: '⚠️',
        title: 'Wochenendarbeit',
        text: 'Samstags- und Sonntagsarbeit ist für Azubis stark eingeschränkt. Samstag ist in vielen Branchen erlaubt, Sonntag grundsätzlich nicht. Prüfe deinen Ausbildungsvertrag.'
    },
    {
        id: 'saturday',
        patterns: [/\bsamstag(s)?\b/i, /\bam\s+samstag\b/i],
        severity: 'info',
        law: '§ 17 BBiG',
        icon: 'ℹ️',
        title: 'Samstagseinsatz',
        text: 'Samstagsarbeit ist in manchen Branchen üblich. Stelle sicher, dass Freizeitausgleich gewährt wird – Azubis haben Anspruch auf mindestens 2 freie Wochentage (§ 15 JArbSchG).'
    },
    {
        id: 'overtime',
        patterns: [/\büberst(u|unden)\b/i, /\bmehrarbeit\b/i, /\büberstunde\b/i, /\büberstunden\b/i, /\bmehr\s+als.*stunden\b/i],
        severity: 'danger',
        law: '§ 17 BBiG',
        icon: '⏰',
        title: 'Überstunden / Mehrarbeit',
        text: 'Azubis dürfen keine Überstunden ohne Ausgleich leisten. Angeordnete Mehrarbeit muss zeitnah durch Freizeit ausgeglichen werden. Unbezahlte Überstunden sind rechtswidrig.'
    },
    {
        id: 'non_training',
        patterns: [/\blager\s*(aufr[äa]umen|sortier|putz|s[äa]uber)\b/i, /\baufr[äa]umen\b/i, /\bputzen\b/i, /\bs[äa]ubern\b/i, /\bkehren\b/i, /\bwischen\b/i, /\bm[üu]ll\b/i, /\bklo\b/i, /\btoilette.*reinig\b/i],
        severity: 'warning',
        law: '§ 14 BBiG',
        icon: '📋',
        title: 'Ausbildungsfremde Tätigkeit',
        text: 'Tätigkeiten wie Lager aufräumen, Putzen oder Reinigen müssen ausbildungsrelevant sein. Dauerhaft ausbildungsfremde Aufgaben verstoßen gegen § 14 BBiG (Ausbildungspflicht des Betriebs).'
    },
    {
        id: 'nightwork',
        patterns: [/\bnacht(schicht|arbeit|dienst)?\b/i, /\babends\s+nach\s+(20|21|22|23)\b/i, /\b(22|23):?\d{2}\b/, /\b0[0-5]:?\d{2}\b/],
        severity: 'danger',
        law: '§ 14 JArbSchG',
        icon: '🌙',
        title: 'Nachtarbeit',
        text: 'Für Jugendliche (unter 18 J.) ist Nachtarbeit zwischen 22:00 und 06:00 Uhr verboten. Ausnahmen gelten nur für bestimmte Branchen (z. B. Bäckerei ab 05:00 Uhr).'
    },
    {
        id: 'long_hours',
        patterns: [/\b(10|11|12|13|14)\s*stunden\b/i, /\bmehr\s+als\s*[89]\s*stunden\b/i, /\blang(em|en|er|es)?\s+tag\b/i],
        severity: 'danger',
        law: '§ 8 JArbSchG',
        icon: '🕐',
        title: 'Zu lange Arbeitszeit',
        text: 'Jugendliche dürfen maximal 8 Stunden täglich und 40 Stunden wöchentlich arbeiten. Volljährige Azubis unterliegen dem ArbZG (max. 8h täglich, ausnahmsweise 10h).'
    },
    {
        id: 'unpaid',
        patterns: [/\bunbezahlt\b/i, /\bkein(e)?\s+lohn\b/i, /\bkein(e)?\s+verg[üu]tung\b/i, /\bumsonst\s+gearbeitet\b/i, /\bkostenlos\s+gearbeitet\b/i, /\bgratis\s+gearbeitet\b/i],
        severity: 'danger',
        law: '§ 17 BBiG',
        icon: '💸',
        title: 'Unbezahlte Arbeit',
        text: 'Die Ausbildungsvergütung ist gesetzlich vorgeschrieben und muss monatlich gezahlt werden. Unbezahlte Arbeitszeiten sind nach § 17 BBiG rechtswidrig.'
    },
    {
        id: 'break',
        patterns: [/\bkein(e)?\s+pause\b/i, /\bohnepause\b/i, /\bkeine\s+ruhepause\b/i, /\bpause\s+verweigert\b/i],
        severity: 'danger',
        law: '§ 11 JArbSchG',
        icon: '☕',
        title: 'Pausenpflicht',
        text: 'Bei Arbeitszeit über 4,5h: mind. 30 min Pause. Bei über 6h: mind. 60 min. Die Pausen dürfen nicht zu Beginn oder Ende der Arbeitszeit angerechnet werden.'
    },
    {
        id: 'vacation_denied',
        patterns: [/\burlaub\s+(verweigert|abgelehnt|nicht\s+genehmigt|nicht\s+bekommen)\b/i, /\bkein\s+urlaub\b/i],
        severity: 'warning',
        law: '§ 19 BBiG',
        icon: '🏖️',
        title: 'Urlaub verweigert',
        text: 'Azubis haben Anspruch auf Erholungsurlaub: unter 16 J. = 30 Werktage, unter 17 J. = 27 Werktage, unter 18 J. = 25 Werktage, Volljährige = mind. 24 Werktage.'
    },
    {
        id: 'sick_note',
        patterns: [/\bkrank\b/i, /\bkrankmeldung\b/i, /\barbeitsunf[äa]hig\b/i, /\bkrankensch(ein|reibung)\b/i],
        severity: 'info',
        law: '§ 9 EntgFG',
        icon: '🏥',
        title: 'Krankheit & Lohnfortzahlung',
        text: 'Bei Krankheit besteht Anspruch auf Lohnfortzahlung für bis zu 6 Wochen (§ 9 EntgFG). Ab dem 4. Kranktag (oder früher laut Vertrag) ist ein ärztliches Attest erforderlich.'
    },
    {
        id: 'probation',
        patterns: [/\bprobezeit\b/i, /\bprobezeit\s+verl[äa]nger\b/i],
        severity: 'info',
        law: '§ 20 BBiG',
        icon: '📅',
        title: 'Probezeit',
        text: 'Die Probezeit beträgt mindestens 1 Monat und höchstens 4 Monate. Während der Probezeit kann das Ausbildungsverhältnis ohne Frist von beiden Seiten beendet werden.'
    },
    {
        id: 'certificate',
        patterns: [/\bzeugnis\b/i, /\bausbildungszeugnis\b/i, /\bbeurteilung\b/i],
        severity: 'info',
        law: '§ 16 BBiG',
        icon: '📄',
        title: 'Ausbildungszeugnis',
        text: 'Nach Beendigung der Ausbildung hast du Anspruch auf ein qualifiziertes Zeugnis (§ 16 BBiG), das Angaben über Art, Dauer und Ergebnis der Ausbildung enthält.'
    }
];

const DISMISSED_ALERTS = new Set();

function createScannerEl(containerId) {
    const el = document.createElement('div');
    el.className = 'bbig-scanner';
    el.id = containerId;
    el.innerHTML = `
        <div class="bbig-scanner__inner">
            <div class="bbig-scanner__header">
                <svg class="bbig-scanner__shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <polyline points="9 12 11 14 15 10"/>
                </svg>
                <span class="bbig-scanner__title">BBiG-Live-Scanner</span>
                <span class="bbig-scanner__badge">§ Legal Guard</span>
                <button class="bbig-scanner__dismiss-all" title="Alle ausblenden" onclick="bbigDismissAll('${containerId}')">×</button>
            </div>
            <div class="bbig-scanner__alerts"></div>
            <div class="bbig-scanner__footer">
                <div class="bbig-scanner__status-dot"></div>
                <span class="bbig-scanner__status-text">Echtzeit-Analyse aktiv · BBiG / JArbSchG / EntgFG</span>
            </div>
        </div>`;
    return el;
}

function scanText(text, scannerId) {
    const container = document.getElementById(scannerId);
    if (!container) return;

    const alertsEl = container.querySelector('.bbig-scanner__alerts');
    if (!alertsEl) return;

    const matches = [];
    const textLower = text.toLowerCase();

    for (const rule of BBIG_RULES) {
        if (DISMISSED_ALERTS.has(scannerId + ':' + rule.id)) continue;

        let matchedWord = null;
        for (const pattern of rule.patterns) {
            const m = text.match(pattern);
            if (m) { matchedWord = m[0]; break; }
        }

        if (matchedWord) {
            matches.push({ ...rule, matchedWord });
        }
    }

    // Remove alerts that no longer match
    const existing = alertsEl.querySelectorAll('.bbig-alert');
    existing.forEach(el => {
        const ruleId = el.dataset.ruleId;
        if (!matches.find(m => m.id === ruleId)) {
            el.style.animation = 'none';
            el.style.opacity = '0';
            el.style.transform = 'translateX(8px)';
            el.style.transition = 'opacity 0.2s, transform 0.2s';
            setTimeout(() => el.remove(), 200);
        }
    });

    // Add new alerts
    for (const match of matches) {
        if (alertsEl.querySelector(`[data-rule-id="${match.id}"]`)) continue;
        const alertEl = document.createElement('div');
        alertEl.className = `bbig-alert bbig-alert--${match.severity}`;
        alertEl.dataset.ruleId = match.id;
        alertEl.innerHTML = `
            <span class="bbig-alert__icon">${bbigEsc(match.icon)}</span>
            <div class="bbig-alert__body">
                <div class="bbig-alert__top">
                    <span class="bbig-alert__law">${bbigEsc(match.law)}</span>
                    <span class="bbig-alert__keyword">${bbigEsc(match.matchedWord)}</span>
                </div>
                <div class="bbig-alert__text">${bbigEsc(match.text)}</div>
            </div>
            <button class="bbig-alert__close" title="Ausblenden"
                onclick="bbigDismissRule('${bbigEsc(scannerId)}','${bbigEsc(match.id)}',this.closest('.bbig-alert'))">×</button>`;
        alertsEl.appendChild(alertEl);
    }

    // Toggle visibility
    const hasAlerts = alertsEl.children.length > 0;
    container.classList.toggle('bbig-scanner--active', hasAlerts);
}

function bbigDismissRule(scannerId, ruleId, alertEl) {
    DISMISSED_ALERTS.add(scannerId + ':' + ruleId);
    if (alertEl) {
        alertEl.style.transition = 'opacity 0.2s, transform 0.2s';
        alertEl.style.opacity = '0';
        alertEl.style.transform = 'translateX(8px)';
        setTimeout(() => {
            alertEl.remove();
            const container = document.getElementById(scannerId);
            if (container) {
                const hasAlerts = container.querySelector('.bbig-scanner__alerts')?.children.length > 0;
                container.classList.toggle('bbig-scanner--active', hasAlerts);
            }
        }, 220);
    }
}

function bbigDismissAll(scannerId) {
    const container = document.getElementById(scannerId);
    if (!container) return;
    container.querySelectorAll('.bbig-alert').forEach(el => {
        const ruleId = el.dataset.ruleId;
        if (ruleId) DISMISSED_ALERTS.add(scannerId + ':' + ruleId);
    });
    container.classList.remove('bbig-scanner--active');
    setTimeout(() => {
        const alertsEl = container.querySelector('.bbig-scanner__alerts');
        if (alertsEl) alertsEl.innerHTML = '';
    }, 350);
}

function attachScanner(inputId, scannerId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Inject scanner element after input
    if (!document.getElementById(scannerId)) {
        const scanner = createScannerEl(scannerId);
        input.parentNode.insertBefore(scanner, input.nextSibling);
    }

    let debounceTimer;
    input.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        // Reset dismissed alerts on new typing session (only if field was cleared)
        if (this.value.length === 0) {
            [...DISMISSED_ALERTS].forEach(key => {
                if (key.startsWith(scannerId + ':')) DISMISSED_ALERTS.delete(key);
            });
        }
        debounceTimer = setTimeout(() => scanText(this.value, scannerId), 250);
    });
}

function initBbigScanner() {
    // Nur auf der Hauptseite ausführen, nicht im Berichtsheft
    if (document.getElementById('inpNotes')) initBbigMainApp();
}

// ── BERICHTSHEFT: Zentraler Scanner der alle Felder überwacht ──
// Wird von pages/berichtsheft/index.html aufgerufen
function initBbigBerichtsheft() {
    const SCANNER_ID = 'bbigScannerBericht';

    // Erstelle zentralen Scanner-Block falls noch nicht vorhanden
    function ensureCentralScanner() {
        if (document.getElementById(SCANNER_ID)) return;
        const anchor = document.getElementById('weeklyFieldGroup')
            || document.getElementById('reportActivities')?.parentElement
            || document.querySelector('.form-group');
        if (!anchor) return;
        const scanner = createScannerEl(SCANNER_ID);
        scanner.style.marginBottom = '0';
        anchor.parentNode.insertBefore(scanner, anchor.nextSibling);
    }

    // Sammle Text aus allen aktiven Feldern
    function collectAllText() {
        const parts = [];
        const weekly = document.getElementById('reportActivities');
        if (weekly && weekly.value.trim()) parts.push(weekly.value);
        document.querySelectorAll('.daily-textarea').forEach(ta => {
            if (ta.value.trim()) parts.push(ta.value);
        });
        return parts.join('\n');
    }

    let debounce;
    function onAnyInput() {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            ensureCentralScanner();
            const text = collectAllText();
            if (!text.trim()) {
                const el = document.getElementById(SCANNER_ID);
                if (el) el.classList.remove('bbig-scanner--active');
                return;
            }
            scanText(text, SCANNER_ID);
        }, 300);
    }

    // Attach zu reportActivities
    const reportActivities = document.getElementById('reportActivities');
    if (reportActivities) reportActivities.addEventListener('input', onAnyInput);

    // Attach zu dynamisch generierten .daily-textarea (MutationObserver)
    const observer = new MutationObserver(() => {
        document.querySelectorAll('.daily-textarea:not([data-bbig])').forEach(ta => {
            ta.setAttribute('data-bbig', '1');
            ta.addEventListener('input', onAnyInput);
        });
    });
    const dailyRoot = document.getElementById('dailyFieldsContainer')
        || document.querySelector('.daily-fields-wrap')
        || document.body;
    observer.observe(dailyRoot, { childList: true, subtree: true });

    // Auch direkt bestehende scannen
    document.querySelectorAll('.daily-textarea').forEach(ta => {
        ta.setAttribute('data-bbig', '1');
        ta.addEventListener('input', onAnyInput);
    });
}

// Expose globals
window.bbigDismissRule = bbigDismissRule;
window.bbigDismissAll = bbigDismissAll;
window.initBbigBerichtsheft = initBbigBerichtsheft;

// Auto-init für Hauptseite (inpNotes + editInpNotes)
function initBbigMainApp() {
    attachScanner('inpNotes', 'bbigScannerDash');
    attachScanner('editInpNotes', 'bbigScannerEdit');

    const origOpenEditModal = window.openEditModal;
    if (typeof origOpenEditModal === 'function') {
        window.openEditModal = function(id) {
            origOpenEditModal(id);
            setTimeout(() => attachScanner('editInpNotes', 'bbigScannerEdit'), 50);
        };
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBbigScanner);
} else {
    initBbigScanner();
}

})();
