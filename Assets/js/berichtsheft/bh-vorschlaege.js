// ═══ BH-VORSCHLAEGE ═══
// Vorschlags-Chips der Formularfelder. Das ist NICHT die Engine des AI
// Studios — die steht in ais-studio.js und kennt Schreibformen und Genus.
// Herausgeloest aus pages/berichtsheft/index.html.

// ═══════════════════════════════════════
// AI SUGGESTION ENGINE — Generative Core
// ═══════════════════════════════════════

// Detect which profession(s) match the user's input
function detectProfessions(department, currentText) {
    const haystack = ((department || '') + ' ' + (currentText || '')).toLowerCase();
    const matches = [];

    for (const [key, prof] of Object.entries(AI_BRAIN.professions)) {
        let score = 0;
        for (const kw of prof.keywords) {
            if (haystack.includes(kw)) score += 3;
        }
        // Also check if any tool/object is mentioned → strong signal
        for (const t of prof.tools) {
            if (haystack.includes(t.toLowerCase())) score += 2;
        }
        for (const o of prof.objects) {
            if (haystack.includes(o.toLowerCase())) score += 1;
        }
        if (score > 0) matches.push({ key, prof, score });
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.length > 0 ? matches.slice(0, 2) : null;
}

// Randomly pick N items from an array (Fisher-Yates partial)
function pickRandom(arr, n) {
    const copy = [...arr];
    const result = [];
    for (let i = 0; i < Math.min(n, copy.length); i++) {
        const idx = Math.floor(Math.random() * (copy.length - i)) + i;
        [copy[i], copy[idx]] = [copy[idx], copy[i]];
        result.push(copy[i]);
    }
    return result;
}

// Conjugate a German infinitive into past participle (simplified heuristic)
function conjugate(verb) {
    // Common irregular mappings
    const irregulars = {
        'entwickeln': 'entwickelt', 'implementieren': 'implementiert', 'testen': 'getestet',
        'debuggen': 'debuggt', 'deployen': 'deployed', 'refactoren': 'refactored',
        'dokumentieren': 'dokumentiert', 'reviewen': 'reviewed', 'optimieren': 'optimiert',
        'automatisieren': 'automatisiert', 'konfigurieren': 'konfiguriert', 'installieren': 'installiert',
        'warten': 'gewartet', 'überwachen': 'überwacht', 'administrieren': 'administriert',
        'sichern': 'gesichert', 'patchen': 'gepatcht', 'troubleshooten': 'getroubleshot',
        'migrieren': 'migriert', 'bearbeiten': 'bearbeitet', 'prüfen': 'geprüft',
        'verbuchen': 'verbucht', 'erstellen': 'erstellt', 'pflegen': 'gepflegt',
        'koordinieren': 'koordiniert', 'kalkulieren': 'kalkuliert', 'archivieren': 'archiviert',
        'abgleichen': 'abgeglichen', 'kommunizieren': 'kommuniziert', 'mauern': 'gemauert',
        'betonieren': 'betoniert', 'verputzen': 'verputzt', 'verlegen': 'verlegt',
        'montieren': 'montiert', 'messen': 'gemessen', 'schneiden': 'geschnitten',
        'schleifen': 'geschliffen', 'abdichten': 'abgedichtet', 'verschalen': 'verschalt',
        'transportieren': 'transportiert', 'einrichten': 'eingerichtet', 'abreißen': 'abgerissen',
        'fundamentieren': 'fundamentiert', 'sägen': 'gesägt', 'hobeln': 'gehobelt',
        'fräsen': 'gefräst', 'leimen': 'geleimt', 'konstruieren': 'konstruiert',
        'furnieren': 'furniert', 'lackieren': 'lackiert', 'zeichnen': 'gezeichnet',
        'zusammenbauen': 'zusammengebaut', 'verdrahten': 'verdrahtet', 'programmieren': 'programmiert',
        'inbetriebnehmen': 'in Betrieb genommen', 'reparieren': 'repariert', 'planen': 'geplant',
        'zubereiten': 'zubereitet', 'kochen': 'gekocht', 'backen': 'gebacken',
        'anrichten': 'angerichtet', 'dekorieren': 'dekoriert', 'portionieren': 'portioniert',
        'einlagern': 'eingelagert', 'kontrollieren': 'kontrolliert', 'reinigen': 'gereinigt',
        'bestellen': 'bestellt', 'servieren': 'serviert', 'beraten': 'beraten',
        'pflegen': 'gepflegt', 'betreuen': 'betreut', 'assistieren': 'assistiert',
        'mobilisieren': 'mobilisiert', 'verabreichen': 'verabreicht', 'begleiten': 'begleitet',
        'anleiten': 'angeleitet', 'versorgen': 'versorgt', 'lagern': 'gelagert',
        'diagnostizieren': 'diagnostiziert', 'austauschen': 'ausgetauscht', 'einstellen': 'eingestellt',
        'auslesen': 'ausgelesen', 'schweißen': 'geschweißt', 'vermessen': 'vermessen',
        'färben': 'gefärbt', 'föhnen': 'geföhnt', 'waschen': 'gewaschen',
        'stylen': 'gestylt', 'hochstecken': 'hochgesteckt', 'ondulieren': 'onduliert',
        'rasieren': 'rasiert', 'tönen': 'getönt', 'blondieren': 'blondiert',
        'verkaufen': 'verkauft', 'kassieren': 'kassiert', 'einräumen': 'eingeräumt',
        'inventurisieren': 'inventurisiert', 'reklamieren': 'reklamiert', 'etikettieren': 'etikettiert',
        'umtauschen': 'umgetauscht', 'kommissionieren': 'kommissioniert', 'auslagern': 'ausgelagert',
        'verpacken': 'verpackt', 'verladen': 'verladen', 'scannen': 'gescannt',
        'sortieren': 'sortiert', 'buchen': 'gebucht', 'gestalten': 'gestaltet',
        'entwerfen': 'entworfen', 'layouten': 'gelayoutet', 'animieren': 'animiert',
        'retouchieren': 'retouchiert', 'exportieren': 'exportiert', 'drucken': 'gedruckt',
        'präsentieren': 'präsentiert', 'konzipieren': 'konzipiert', 'pflanzen': 'gepflanzt',
        'mähen': 'gemäht', 'bewässern': 'bewässert', 'mulchen': 'gemulcht',
        'düngen': 'gedüngt', 'jäten': 'gejätet', 'pflastern': 'gepflastert',
        'ausheben': 'ausgehoben', 'roden': 'gerodet', 'drehen': 'gedreht',
        'bohren': 'gebohrt', 'biegen': 'gebogen', 'stanzen': 'gestanzt',
        'entgraten': 'entgratet', 'härten': 'gehärtet', 'analysieren': 'analysiert',
        'mischen': 'gemischt', 'destillieren': 'destilliert', 'filtrieren': 'filtriert',
        'kalibrieren': 'kalibriert', 'titrieren': 'titriert', 'synthetisieren': 'synthetisiert',
        'durchführen': 'durchgeführt', 'erledigen': 'erledigt', 'vorbereiten': 'vorbereitet',
        'nachbereiten': 'nachbereitet', 'organisieren': 'organisiert', 'besprechen': 'besprochen',
        'unterstützen': 'unterstützt', 'überprüfen': 'überprüft', 'fertigstellen': 'fertiggestellt',
    };

    if (irregulars[verb]) return irregulars[verb];

    // Heuristic: -ieren → -iert, else ge- + stem + -t
    if (verb.endsWith('ieren')) return verb.slice(0, -2) + 't';
    if (verb.endsWith('en')) return 'ge' + verb.slice(0, -2) + 't';
    if (verb.endsWith('n')) return 'ge' + verb.slice(0, -1) + 't';
    return verb;
}

// Generate a single unique sentence from profession data
function generateSentence(prof) {
    const template = pickRandom(AI_BRAIN.templates, 1)[0];
    const verb = pickRandom(prof.verbs, 1)[0];
    const object = pickRandom(prof.objects, 1)[0];
    const tool = pickRandom(prof.tools, 1)[0];
    const detail = pickRandom(AI_BRAIN.details, 1)[0];
    const pastVerb = conjugate(verb);

    return template
        .replace('{V}', pastVerb)
        .replace('{O}', object)
        .replace('{T}', tool)
        .replace('{D}', detail);
}

// Learn patterns from past reports → extract usable lines
function learnFromHistory() {
    const learned = [];
    reports.forEach(r => {
        const texts = [r.activities || ''];
        if (r.dailyActivities) {
            Object.values(r.dailyActivities).forEach(t => { if (t) texts.push(t); });
        }
        texts.forEach(text => {
            text.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed.length > 15 && /^[•\-\*]/.test(trimmed)) {
                    learned.push(trimmed.replace(/^[•\-\*]\s*/, '• '));
                }
            });
        });
    });
    return [...new Set(learned)];
}

// The main AI generator — produces unique suggestions every time
function getAISuggestions(department, currentText, maxSuggestions = 6) {
    const detected = detectProfessions(department, currentText);
    const currentLower = (currentText || '').toLowerCase();
    const generated = new Set();
    const result = [];

    // 1) Generate profession-specific sentences (3-4)
    if (detected) {
        for (const match of detected) {
            const count = match === detected[0] ? 3 : 1;
            let attempts = 0;
            while (result.length < count + (match === detected[0] ? 0 : 3) && attempts < 20) {
                const sentence = generateSentence(match.prof);
                const sentenceLower = sentence.toLowerCase().replace(/^[•\-\*]\s*/, '');
                if (!generated.has(sentence) && !currentLower.includes(sentenceLower.substring(0, 25)) && !aiUsedChips.has(sentence)) {
                    generated.add(sentence);
                    result.push(sentence);
                }
                attempts++;
            }
        }
    } else {
        // No profession detected → generate from ALL professions randomly
        const allProfs = Object.values(AI_BRAIN.professions);
        const randomProfs = pickRandom(allProfs, 3);
        for (const prof of randomProfs) {
            let attempts = 0;
            while (result.length < 3 && attempts < 15) {
                const sentence = generateSentence(prof);
                if (!generated.has(sentence) && !aiUsedChips.has(sentence)) {
                    generated.add(sentence);
                    result.push(sentence);
                }
                attempts++;
            }
        }
    }

    // 2) Add 1-2 universal activities
    const universals = pickRandom(AI_BRAIN.universalActivities, 4);
    for (const u of universals) {
        const full = '• ' + u;
        if (result.length >= maxSuggestions) break;
        if (!currentLower.includes(u.toLowerCase().substring(0, 25)) && !aiUsedChips.has(full) && !generated.has(full)) {
            generated.add(full);
            result.push(full);
        }
    }

    // 3) Sprinkle in 1 learned-from-history item
    const history = learnFromHistory();
    if (history.length > 0) {
        const histPick = pickRandom(history, 3);
        for (const h of histPick) {
            if (result.length >= maxSuggestions) break;
            const hLower = h.toLowerCase().replace(/^[•\-\*]\s*/, '');
            if (!currentLower.includes(hLower.substring(0, 25)) && !aiUsedChips.has(h) && !generated.has(h)) {
                generated.add(h);
                result.push('AI: ' + h.replace(/^• /, ''));
            }
        }
    }

    // Shuffle final set & cap
    return pickRandom(result, Math.min(maxSuggestions, result.length));
}

function refreshAISuggestions(mode) {
    aiUsedChips.clear();
    renderAISuggestions(mode);
}

function renderAISuggestions(mode) {
    const department = document.getElementById('reportDepartment')?.value || '';
    let currentText = '';

    if (mode === 'weekly') {
        currentText = document.getElementById('reportActivities')?.value || '';
    } else {
        const dailyTexts = document.querySelectorAll('.daily-textarea');
        dailyTexts.forEach(ta => currentText += ' ' + ta.value);
    }

    const suggestions = getAISuggestions(department, currentText);
    const chipContainer = document.getElementById(mode === 'weekly' ? 'aiChipsWeekly' : 'aiChipsDaily');
    const contextNote = document.getElementById(mode === 'weekly' ? 'aiContextWeekly' : 'aiContextDaily');

    if (!chipContainer) return;

    chipContainer.innerHTML = suggestions.map(s => {
        const isHistory = s.startsWith('AI: ');
        const displayRaw = s.replace(/^[•\-\*]\s*|^AI:\s*/g, '').trim();
        const displayText = displayRaw.substring(0, 60);
        const fullForInsert = isHistory ? '• ' + displayRaw : (s.startsWith('•') ? s : '• ' + s);
        return `<div class="ai-chip ${isHistory ? 'history' : ''}" onclick="insertAISuggestion(this, '${mode}')" data-full="${escapeHtml(fullForInsert)}" title="${escapeHtml(fullForInsert)}">${displayText}${displayRaw.length > 60 ? '…' : ''}</div>`;
    }).join('');

    // Smart context note
    const detected = detectProfessions(department, currentText);
    if (detected && detected.length > 0) {
        const profName = detected[0].key;
        const nameMap = { software: 'IT-Entwicklung', sysadmin: 'Systemadministration', kaufmann: 'Kaufmännisch', handwerk_bau: 'Bau/Handwerk', handwerk_holz: 'Holztechnik/Tischlerei', elektro: 'Elektrotechnik', gastronomie: 'Gastronomie/Bäckerei', pflege: 'Pflege/Gesundheit', kfz: 'KFZ-Technik', friseur: 'Friseurhandwerk', einzelhandel: 'Einzelhandel', lager: 'Lagerlogistik', medien: 'Mediengestaltung', garten: 'Garten-/Landschaftsbau', metall: 'Metalltechnik', chemie: 'Chemie/Labor' };
        contextNote.innerHTML = `AI erkennt: <strong>${nameMap[profName] || profName}</strong> — Vorschläge werden generiert, nie wiederholt.`;
    } else if (department) {
        contextNote.innerHTML = `${bhIcon('')} Tippe z.B. deinen Beruf oder Tätigkeiten — die AI erkennt es automatisch.`;
    } else {
        contextNote.innerHTML = `${bhIcon('')} Gib eine Abteilung ein (z.B. &quot;Bäckerei&quot;, &quot;Maurer&quot;, &quot;IT&quot;) — die AI denkt mit.`;
    }
}

function insertAISuggestion(chipEl, mode) {
    const fullText = chipEl.getAttribute('data-full');
    chipEl.classList.add('used');
    aiUsedChips.add(fullText);

    if (mode === 'weekly') {
        const textarea = document.getElementById('reportActivities');
        const current = textarea.value.trim();
        textarea.value = current ? current + '\n' + fullText : fullText;
        document.getElementById('charCount').textContent = textarea.value.length + ' Zeichen';
        updateQualityMeter(textarea.value);
    } else {
        let target = activeDailyField;
        if (!target) {
            const fields = document.querySelectorAll('.daily-textarea');
            for (const f of fields) {
                if (!f.value.trim()) { target = f; break; }
            }
            if (!target && fields.length > 0) target = fields[0];
        }
        if (target) {
            const current = target.value.trim();
            target.value = current ? current + '\n' + fullText : fullText;
            target.dispatchEvent(new Event('input'));
        }
    }

    showToast('AI-Vorschlag eingefügt', 'success');
    setTimeout(() => renderAISuggestions(mode), 400);
}

