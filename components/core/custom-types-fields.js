// ═══ CORE: CUSTOM-TYPES-FIELDS ═══
// User-definierte Eintrag-Typen + Custom-Fields.
// UI: inline expandierende Create-Form (KEIN nested Modal).
// Render-Stil: Clean SaaS (kein Inline-CSS-Wirrwarr).

    const DEFAULT_ENTRY_TYPES = [
        { id: 'work',     label: 'Arbeit',       emoji: '💼', color: '#a855f7', description: 'Normale Arbeitszeit' },
        // Diese Farben sind die EINE Quelle für Icon-Kachel, Badge, Zeilenrahmen und
        // Filter-Pill (siehe --type-rgb). Sie spiegeln die Tokens aus core.css —
        // gleittag bleibt bewusst cyan, sonst wäre es von holiday nicht unterscheidbar.
        { id: 'school',   label: 'Berufsschule', emoji: '📚', color: '#2563eb', description: 'Berufsschule / Noten' },
        { id: 'vacation', label: 'Urlaub',       emoji: '🌴', color: '#10b981', description: 'Urlaubstage' },
        { id: 'gleittag', label: 'Gleittag',     emoji: '⚡', color: '#06b6d4', description: 'Gleittag (Überstundenabbau)' },
        { id: 'sick',     label: 'Krankheit',    emoji: '🤒', color: '#ef4444', description: 'Krankheitstage' },
        { id: 'holiday',  label: 'Feiertag',     emoji: '🎉', color: '#f59e0b', description: 'Offizielle Feiertage' },
        { id: 'korrektur',label: 'Korrektur',    emoji: '⚖️', color: '#64748b', description: 'Manuelle Saldo-Korrektur (z.B. Angleichung ans Firmen-System)' }
    ];

    const CT_PRESET_COLORS = ['#a855f7','#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#64748b'];

    function isDefaultType(id) {
        return DEFAULT_ENTRY_TYPES.some(t => t.id === id);
    }

    // Nur Hex-Farben durchlassen — verhindert CSS-Break-Out.
    function sanitizeColor(c) {
        return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#888';
    }

    function hexToRgbStr(hex) {
        const h = sanitizeColor(hex).replace('#','');
        const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6);
        const r = parseInt(full.slice(0,2), 16);
        const g = parseInt(full.slice(2,4), 16);
        const b = parseInt(full.slice(4,6), 16);
        return `${r},${g},${b}`;
    }

    function getAllEntryTypes() {
        const overrides = (data && data.entryTypeOverrides) || {};
        const defaults = DEFAULT_ENTRY_TYPES.map(t => {
            const o = overrides[t.id];
            return o ? { ...t, ...o, id: t.id } : t;
        });
        const customs = Array.isArray(data.customEntryTypes) ? data.customEntryTypes : [];
        return [...defaults, ...customs];
    }

    function getEntryTypeInfo(typeId) {
        return getAllEntryTypes().find(t => t.id === typeId);
    }

    function getTypeEmoji(typeId) {
        const info = getEntryTypeInfo(typeId);
        return (info && info.emoji) || '📋';
    }

    function getTypeColor(typeId) {
        const info = getEntryTypeInfo(typeId);
        return (info && info.color) || '#888';
    }

    // ═══ Typ-Icons (Lucide-Style SVG) ═══
    // Die Emojis der DEFAULT_ENTRY_TYPES bleiben im Datenmodell (Export, Alt-Daten,
    // Emoji-Picker im Typ-Manager) — in der UI zeichnen wir aber SVG. Pfade sind
    // konstante Literale, deshalb via innerHTML unbedenklich.
    const TYPE_ICON_PATHS = {
        work:      '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
        school:    '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.66 2.69 3 6 3s6-1.34 6-3v-4.5"/><path d="M22 10v6"/>',
        vacation:  '<path d="M22 12a10 10 0 0 0-20 0Z"/><path d="M12 12v7a2 2 0 0 0 4 0"/><path d="M12 2v2"/>',
        gleittag:  '<path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"/>',
        sick:      '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
        holiday:   '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
        korrektur: '<path d="M12 3v18"/><path d="M3 7h3c2 0 4-1 6-2 2 1 4 2 6 2h3"/><path d="m6 7-3 7h6Z"/><path d="m18 7-3 7h6Z"/><path d="M7 21h10"/>',
        _fallback: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r="1"/>'
    };

    // Auswählbare Symbole für eigene Typen. Ohne diese Liste bekamen ALLE eigenen Typen
    // dasselbe _fallback-Etikett — sie konnten also nie so aussehen wie die Standard-Typen,
    // die je ein eigenes Icon haben. Lucide-Stil, damit sie sich nicht beißen.
    const CT_ICON_LIBRARY = [
        { id: 'tag',       label: 'Etikett', labelEn: 'Label',    path: TYPE_ICON_PATHS._fallback },
        { id: 'dumbbell',  label: 'Fitness', labelEn: 'Fitness',    path: '<path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>' },
        { id: 'heart',     label: 'Gesundheit', labelEn: 'Health', path: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>' },
        { id: 'car',       label: 'Fahrt', labelEn: 'Drive',      path: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>' },
        { id: 'train',     label: 'Bahn', labelEn: 'Train',       path: '<rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h.01"/><path d="M16 15h.01"/>' },
        { id: 'plane',     label: 'Reise', labelEn: 'Travel',      path: '<path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-.9 1.7l4.6 3.4-2.2 2.2-2.3-.6a1 1 0 0 0-1 1.6l2.4 2.4 2.4 2.4a1 1 0 0 0 1.6-1l-.6-2.3 2.2-2.2 3.4 4.6a1 1 0 0 0 1.7-.9Z"/>' },
        { id: 'home',      label: 'Homeoffice', labelEn: 'Home office', path: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>' },
        { id: 'users',     label: 'Meeting', labelEn: 'Meeting',    path: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
        { id: 'user',      label: 'Coaching', labelEn: 'Coaching',   path: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
        { id: 'presenta',  label: 'Schulung', labelEn: 'Training',   path: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>' },
        { id: 'book',      label: 'Lernen', labelEn: 'Studying',     path: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' },
        { id: 'code',      label: 'Entwicklung', labelEn: 'Development',path: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>' },
        { id: 'terminal',  label: 'Technik', labelEn: 'Tech',    path: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>' },
        { id: 'server',    label: 'Server', labelEn: 'Server',     path: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>' },
        { id: 'wrench',    label: 'Wartung', labelEn: 'Maintenance',    path: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' },
        { id: 'hardhat',   label: 'Baustelle', labelEn: 'Site',  path: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/>' },
        { id: 'phone',     label: 'Telefonat', labelEn: 'Call',  path: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>' },
        { id: 'mail',      label: 'Post', labelEn: 'Mail',       path: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>' },
        { id: 'folder',    label: 'Projekt', labelEn: 'Project',    path: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>' },
        { id: 'clipboard', label: 'Doku', labelEn: 'Docs',       path: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M8 11h8"/><path d="M8 16h5"/>' },
        { id: 'coffee',    label: 'Pause', labelEn: 'Break',      path: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h12z"/><path d="M17 9h1a3 3 0 0 1 0 6h-1"/>' },
        { id: 'moon',      label: 'Nachtschicht', labelEn: 'Night shift',path:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>' },
        { id: 'sun',       label: 'Frühschicht', labelEn: 'Early shift',path: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>' },
        { id: 'clock',     label: 'Bereitschaft', labelEn: 'On call',path:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
        { id: 'truck',     label: 'Lieferung', labelEn: 'Delivery',  path: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>' },
        { id: 'star',      label: 'Wichtig', labelEn: 'Important',    path: '<path d="M11.5 3.1a.5.5 0 0 1 .9 0l2.3 4.6 5.1.7a.5.5 0 0 1 .3.9l-3.7 3.6.9 5a.5.5 0 0 1-.8.5L12 16.1l-4.5 2.4a.5.5 0 0 1-.8-.5l.9-5-3.7-3.6a.5.5 0 0 1 .3-.9l5.1-.7z"/>' }
    ];

    // Lokaler i18n-Helfer. Die Icon-Namen bewusst NICHT ins globale MAP von
    // i18n-runtime.js: „Pause", „Projekt", „Server", „Post" kommen anderswo in der App
    // vor und wuerden dort mit uebersetzt — ein MAP-Eintrag greift auf JEDEN Textknoten.
    function ctL(de, en) { return document.documentElement.lang === 'en' ? en : de; }

    // Platzhalter im Emoji-Feld (leerer Zustand) — stand vorher mehrfach inline.
    const CT_EMOJI_PLACEHOLDER_SVG =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
      + 'stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/>'
      + '<line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';

    function ctIconPath(iconId) {
        const found = iconId && CT_ICON_LIBRARY.find(i => i.id === iconId);
        return found ? found.path : null;
    }

    function getTypeIconSvg(typeId, size, iconId) {
        // Explizit gewähltes Symbol schlägt das typ-eigene; sonst das Werks-Icon des
        // Standard-Typs, sonst das neutrale Etikett.
        const paths = ctIconPath(iconId) || TYPE_ICON_PATHS[typeId] || TYPE_ICON_PATHS._fallback;
        const s = size || 16;
        return `<svg class="type-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" `
             + `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    }

    // Icon fürs Eintrags-UI. Ein Emoji kommt nur dann zurück, wenn der User selbst
    // eins gesetzt hat (eigener Typ oder Override) — das ist Nutzer-DATEN, kein UI-Icon.
    // Alles andere zeichnet SVG.
    // Welches Emoji gilt als bewusste Wahl des Users? Bei Standard-Typen nur eins, das
    // vom Werks-Emoji ABWEICHT — wer im Typ-Manager nur die Farbe ändert, schreibt das
    // Default-Emoji mit in den Override, und das darf das SVG nicht verdrängen.
    function ctUserEmoji(typeId, info, def) {
        if (def) {
            const ovr = ((data && data.entryTypeOverrides) || {})[typeId] || {};
            return (ovr.emoji && ovr.emoji !== def.emoji) ? ovr.emoji : '';
        }
        return (info && info.emoji) || '';
    }

    // 'svg' | 'emoji'. iconMode ist die ausdrückliche Wahl im Typ-Manager. Typen von vor
    // dieser Einstellung haben kein Feld — dort entscheidet weiterhin, ob ein eigenes
    // Emoji hinterlegt ist. So sieht Bestand unverändert aus.
    function ctIconMode(typeId, info, def) {
        const explicit = info && info.iconMode;
        if (explicit === 'svg' || explicit === 'emoji') return explicit;
        return ctUserEmoji(typeId, info, def) ? 'emoji' : 'svg';
    }

    function getTypeIconHTML(typeId, size) {
        const info = getEntryTypeInfo(typeId);
        const def = DEFAULT_ENTRY_TYPES.find(t => t.id === typeId);

        if (ctIconMode(typeId, info, def) === 'emoji') {
            const em = ctUserEmoji(typeId, info, def);
            // Emoji-Modus ohne hinterlegtes Emoji faellt bewusst auf SVG zurueck, statt
            // eine leere Kachel zu zeichnen.
            if (em) return `<span class="type-icon type-icon--emoji" aria-hidden="true">${esc(em)}</span>`;
        }
        return getTypeIconSvg(typeId, size, info && info.icon);
    }

    // Typ-Farbe als "r,g,b" für --type-rgb an Icon-Kacheln. Ein unbekannter Typ
    // (gelöschter Custom-Type, Eintrag bleibt) bekommt neutrales Slate statt zu werfen.
    function getTypeRgb(typeId) {
        try { return hexToRgbStr(getTypeColor(typeId)); } catch (e) { return '148,163,184'; }
    }

    // Fertige Icon-Kachel: Wrapper mit Typ-Farbe + Icon. Für Listen, Karten, Badges.
    // extraClass hängt die vorhandene Wrapper-Klasse des jeweiligen Views mit rein.
    function getTypeIconTile(typeId, size, extraClass) {
        return `<span class="type-tile ${extraClass || ''}" style="--type-rgb:${getTypeRgb(typeId)}" aria-hidden="true">`
             + `${getTypeIconHTML(typeId, size)}</span>`;
    }

    // Label ohne führendes Emoji, mit Fallback für unbekannte/gelöschte Typen.
    function getTypeLabel(typeId) {
        const info = getEntryTypeInfo(typeId);
        if (info) {
            const clean = ctCleanLabel(info.label, '');
            if (clean) return clean;
        }
        if (String(typeId).startsWith('custom-')) return 'Eigener Typ';
        return ({ work: 'Arbeit', school: 'Berufsschule', vacation: 'Urlaub', gleittag: 'Gleittag',
                  sick: 'Krankheit', holiday: 'Feiertag', korrektur: 'Korrektur' })[typeId] || typeId;
    }

    // ═══ Override CRUD für Standard-Typen ═══
    function setDefaultTypeOverride(id, updates) {
        if (!isDefaultType(id)) return false;
        if (!data.entryTypeOverrides || typeof data.entryTypeOverrides !== 'object') data.entryTypeOverrides = {};
        const defaults = DEFAULT_ENTRY_TYPES.find(t => t.id === id);
        const current = data.entryTypeOverrides[id] || {};
        const next = { ...current, ...updates };
        // Cleanup: Wenn alle Override-Felder dem Default entsprechen → Override löschen.
        const matches = ['emoji','color','description','label'].every(k => next[k] === undefined || next[k] === defaults[k]);
        if (matches) {
            delete data.entryTypeOverrides[id];
        } else {
            data.entryTypeOverrides[id] = next;
        }
        save();
        showCustomMessage('Aktualisiert', 'Änderungen gespeichert', 'success');
        renderCustomTypesManager();
        if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
        if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
        return true;
    }

    function resetDefaultTypeOverride(id) {
        if (!data.entryTypeOverrides || !data.entryTypeOverrides[id]) return;
        showCustomConfirm(
            'Auf Standard zurücksetzen?',
            'Emoji, Farbe und Beschreibung werden auf die Werkseinstellung zurückgesetzt.',
            () => {
                delete data.entryTypeOverrides[id];
                save();
                showCustomMessage('Zurückgesetzt', 'Werkseinstellung wiederhergestellt', 'success');
                renderCustomTypesManager();
                if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
                if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
            }
        );
    }

    // ═══ Core CRUD ═══
    function createCustomType(label, emoji, color, description, countsAsWork, iconMode, icon) {
        if (!label || !color) {
            showCustomMessage('Fehler', 'Name und Farbe sind erforderlich', 'error');
            return false;
        }
        if (!Array.isArray(data.customEntryTypes)) data.customEntryTypes = [];

        // Ohne Angabe wie bisher: Emoji da -> Emoji-Modus, sonst Symbol.
        const mode = (iconMode === 'emoji' || iconMode === 'svg') ? iconMode : (emoji ? 'emoji' : 'svg');
        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        data.customEntryTypes.push({
            id,
            label: (mode === 'emoji' && emoji) ? `${emoji} ${label}` : label,
            emoji: emoji || '',
            iconMode: mode,
            icon: icon || '',
            color,
            description: description || '',
            countsAsWork: !!countsAsWork,
            createdAt: new Date().toISOString()
        });
        save();
        showCustomMessage('Eintrag-Typ erstellt', `"${label}" hinzugefügt`, 'success');
        renderCustomTypesManager();
        if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
        return true;
    }

    function editCustomType(id, updates) {
        if (!Array.isArray(data.customEntryTypes)) data.customEntryTypes = [];
        const idx = data.customEntryTypes.findIndex(t => t.id === id);
        if (idx === -1) return false;
        data.customEntryTypes[idx] = { ...data.customEntryTypes[idx], ...updates };
        save();
        showCustomMessage('Aktualisiert', 'Änderungen gespeichert', 'success');
        renderCustomTypesManager();
        if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
        return true;
    }

    function deleteCustomType(id) {
        const type = (data.customEntryTypes || []).find(t => t.id === id);
        if (!type) return;
        showCustomConfirm(
            'Typ löschen?',
            `"${type.label}" wird entfernt. Bestehende Einträge bleiben erhalten.`,
            () => {
                if (!Array.isArray(data.customEntryTypes)) data.customEntryTypes = [];
                const idx = data.customEntryTypes.findIndex(t => t.id === id);
                if (idx === -1) return;
                const deleted = data.customEntryTypes.splice(idx, 1)[0];
                save();
                showCustomMessage('Gelöscht', `"${deleted.label}" entfernt`, 'success');
                renderCustomTypesManager();
                if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
            }
        );
    }

    // ═══ Renderer: Eintrag-Typen ═══
    // Form-Singleton: ein DOM-Node, der je nach editingId zwischen Create/Edit-Modus umschaltet.
    let _ctActiveForm = null;
    let _ctEditingId = null;

    function renderCustomTypesManager() {
        const container = document.getElementById('customTypesContainer');
        if (!container) return;

        if (!Array.isArray(data.customEntryTypes)) data.customEntryTypes = [];
        const custom = data.customEntryTypes;
        const allDefaults = getAllEntryTypes().filter(t => isDefaultType(t.id));

        container.innerHTML = '';

        // — Standard-Typen (editierbar via Override) —
        const stdSection = ctEl('div', 'ct-section');
        stdSection.appendChild(ctSectionHead('Standard', allDefaults.length, true));
        const stdGrid = ctEl('div', 'ct-grid');
        allDefaults.forEach(t => stdGrid.appendChild(ctTypeRow(t, 'standard')));
        stdSection.appendChild(stdGrid);
        container.appendChild(stdSection);

        // — Custom-Typen —
        const customSection = ctEl('div', 'ct-section');
        customSection.appendChild(ctSectionHead('Deine Typen', custom.length, false));

        if (custom.length === 0) {
            customSection.appendChild(ctEmptyState(
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
                'Noch keine eigenen Typen',
                'Erstelle z.B. „Fitness", „Coaching" oder „Pendeln" für genauere Tracking-Kategorien.'
            ));
        } else {
            const grid = ctEl('div', 'ct-grid');
            custom.forEach(t => grid.appendChild(ctTypeRow(t, 'custom')));
            customSection.appendChild(grid);
        }

        // — Add Button + Inline Form (re-used für Edit) —
        const addBtn = ctEl('button', 'ct-add-btn');
        addBtn.type = 'button';
        addBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Neuer Eintrag-Typ</span>
        `;
        const form = ctTypeForm();
        _ctActiveForm = form;
        addBtn.onclick = () => {
            if (form.classList.contains('ct-form-open') && _ctEditingId === null) {
                form.classList.remove('ct-form-open');
                return;
            }
            ctFormSetMode('create');
            form.classList.add('ct-form-open');
            setTimeout(() => form.querySelector('.ct-input')?.focus(), 60);
        };
        customSection.appendChild(addBtn);
        customSection.appendChild(form);

        container.appendChild(customSection);

        // Wenn vorher Form offen war → wieder befüllen (state-preserving render).
        if (_ctEditingId) ctFormSetMode('edit', _ctEditingId);
    }

    // ═══ Type Row ═══
    function ctTypeRow(type, kind) {
        const row = ctEl('div', 'ct-row');
        const color = sanitizeColor(type.color);
        // Zeigt exakt das, was der Typ in der App zeichnet: SVG, oder das Emoji,
        // das der User hier selbst gesetzt hat.
        const emojiBox = ctEl('div', 'ct-row-emoji');
        emojiBox.dataset.tint = '1';
        emojiBox.style.setProperty('--tint-rgb', hexToRgbStr(color));
        emojiBox.innerHTML = getTypeIconHTML(type.id, 17);

        const info = ctEl('div', 'ct-row-info');
        const lbl = ctEl('div', 'ct-row-label');
        lbl.textContent = String(type.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() || type.label || '';
        const desc = ctEl('div', 'ct-row-desc');
        desc.textContent = type.description || '';
        info.appendChild(lbl);
        if (type.description) info.appendChild(desc);

        const dot = ctEl('div', 'ct-row-color-dot');
        dot.style.background = color;

        row.appendChild(emojiBox);
        row.appendChild(info);
        row.appendChild(dot);

        const actions = ctEl('div', 'ct-row-actions');

        if (kind === 'standard') {
            const hasOverride = !!(data.entryTypeOverrides && data.entryTypeOverrides[type.id]);

            const editBtn = ctEl('button', 'ct-icon-btn');
            editBtn.type = 'button';
            editBtn.title = 'Bearbeiten';
            editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            editBtn.onclick = () => {
                _ctEditingId = type.id;
                if (_ctActiveForm) {
                    ctFormSetMode('edit', type.id);
                    _ctActiveForm.classList.add('ct-form-open');
                    _ctActiveForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            };
            actions.appendChild(editBtn);

            if (hasOverride) {
                const resetBtn = ctEl('button', 'ct-icon-btn');
                resetBtn.type = 'button';
                resetBtn.title = 'Auf Standard zurücksetzen';
                resetBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
                resetBtn.onclick = () => resetDefaultTypeOverride(type.id);
                actions.appendChild(resetBtn);
            } else {
                const badge = ctEl('div', 'ct-row-badge');
                badge.textContent = 'System';
                actions.appendChild(badge);
            }
        } else {
            const editBtn = ctEl('button', 'ct-icon-btn');
            editBtn.type = 'button';
            editBtn.title = 'Bearbeiten';
            editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            editBtn.onclick = () => {
                _ctEditingId = type.id;
                if (_ctActiveForm) {
                    ctFormSetMode('edit', type.id);
                    _ctActiveForm.classList.add('ct-form-open');
                    _ctActiveForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            };
            const delBtn = ctEl('button', 'ct-icon-btn ct-icon-btn-danger');
            delBtn.type = 'button';
            delBtn.title = 'Löschen';
            delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';
            delBtn.onclick = () => deleteCustomType(type.id);
            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
        }
        row.appendChild(actions);
        return row;
    }

    // ═══ Type Form (Create + Edit) ═══
    function ctTypeForm() {
        const form = ctEl('div', 'ct-form');
        form.innerHTML = `
            <div class="ct-form-head">
                <div class="ct-form-title" data-field="form-title">Neuer Eintrag-Typ</div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field">
                    <label class="ct-field-label">Name</label>
                    <input type="text" class="ct-input" data-field="label" placeholder="z.B. Fitness, Coaching, Pendeln" maxlength="40">
                </div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field ct-field--wide">
                    <label class="ct-field-label">Icon</label>
                    <div class="ct-seg" role="tablist" data-field="icon-seg">
                        <button type="button" class="ct-seg-btn ct-seg-active" role="tab" data-mode="svg">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r="1"/></svg>
                            Symbol
                        </button>
                        <button type="button" class="ct-seg-btn" role="tab" data-mode="emoji">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                            Emoji
                        </button>
                    </div>

                    <div class="ct-icon-grid" data-field="icon-grid"></div>

                    <div data-field="emoji-pane" style="display:none;">
                        <button type="button" class="ct-emoji-trigger" data-field="emoji-trigger">
                            <div class="ct-emoji-display ct-emoji-empty" data-field="emoji-display">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                            </div>
                            <span class="ct-emoji-hint">${ctL('Klick zum Auswählen', 'Click to choose')}</span>
                            <span class="ct-emoji-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
                        </button>
                    </div>
                </div>
                <div class="ct-field">
                    <label class="ct-field-label">Farbe</label>
                    <div class="ct-color-row" data-field="color-row"></div>
                    <div class="ct-color-custom">
                        <input type="color" class="ct-color-custom-picker" data-field="color-custom" value="#a855f7">
                        <span class="ct-color-custom-label" data-field="color-hex">#A855F7</span>
                    </div>
                </div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field">
                    <label class="ct-field-label">Beschreibung (optional)</label>
                    <textarea class="ct-textarea" data-field="desc" placeholder="z.B. Personal Trainer Session" maxlength="120"></textarea>
                </div>
            </div>

            <div class="ct-form-row" data-field="counts-row">
                <div class="ct-field">
                    <label class="ct-toggle-row">
                        <input type="checkbox" data-field="counts" class="ct-toggle-input">
                        <span class="ct-toggle-knob" aria-hidden="true"></span>
                        <div class="ct-toggle-text">
                            <div class="ct-toggle-title">Zählt als Arbeitszeit</div>
                            <div class="ct-toggle-hint">Wenn aktiv, fließen Stunden in die Soll/Ist-Bilanz ein und zeigen +/− Diff. Aus = nur Tracking ohne Bilanz-Effekt.</div>
                        </div>
                    </label>
                </div>
            </div>

            <div class="ct-form-actions">
                <button type="button" class="ct-btn ct-btn-ghost" data-action="cancel">Abbrechen</button>
                <button type="button" class="ct-btn ct-btn-primary" data-action="save">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span data-field="save-label">Speichern</span>
                </button>
            </div>
        `;

        // State im Form-Node selbst speichern, damit ctFormSetMode (Modul-extern) darauf zugreifen kann.
        form._ctState = { emoji: '', color: '#a855f7', editingId: null, iconMode: 'svg', icon: '' };

        const labelInp     = form.querySelector('[data-field="label"]');
        const colorRow     = form.querySelector('[data-field="color-row"]');
        const colorPicker  = form.querySelector('[data-field="color-custom"]');
        const colorHexLbl  = form.querySelector('[data-field="color-hex"]');
        const emojiTrig    = form.querySelector('[data-field="emoji-trigger"]');
        const emojiDisp    = form.querySelector('[data-field="emoji-display"]');
        const iconGrid     = form.querySelector('[data-field="icon-grid"]');
        const iconSeg      = form.querySelector('[data-field="icon-seg"]');
        const emojiPane    = form.querySelector('[data-field="emoji-pane"]');
        const cancelBtn    = form.querySelector('[data-action="cancel"]');
        const saveBtn      = form.querySelector('[data-action="save"]');

        // — Symbol-Auswahl —
        CT_ICON_LIBRARY.forEach(ic => {
            const tile = ctEl('button', 'ct-icon-tile');
            tile.type = 'button';
            const name = ctL(ic.label, ic.labelEn || ic.label);
            tile.title = name;
            tile.setAttribute('aria-label', name);
            tile.dataset.icon = ic.id;
            tile.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" `
                           + `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic.path}</svg>`;
            tile.onclick = () => {
                form._ctState.icon = ic.id;
                ctSyncIconTiles(form);
            };
            iconGrid.appendChild(tile);
        });

        // Die Kacheln tragen die gewählte Typ-Farbe — genau das macht den Unterschied
        // zwischen "irgendein Symbol" und "sieht aus wie die Standard-Typen".
        function applyColor(c) {
            form._ctState.color = c;
            colorHexLbl.textContent = c.toUpperCase();
            colorRow.querySelectorAll('.ct-color-swatch').forEach(x => x.classList.toggle('ct-color-active', x.dataset.color === c));
            iconGrid.style.setProperty('--type-rgb', hexToRgbStr(c));
        }
        form._ctApplyColor = applyColor;

        CT_PRESET_COLORS.forEach(c => {
            const sw = ctEl('button', 'ct-color-swatch');
            sw.type = 'button';
            sw.style.background = c;
            sw.title = c;
            sw.dataset.color = c;
            sw.onclick = () => { colorPicker.value = c; applyColor(c); };
            colorRow.appendChild(sw);
        });

        // input = nur Live-Vorschau (idempotent, kein I/O). Gespeichert wird erst beim
        // Speichern-Klick — 'input' feuert bei einem Farbrad 60x/sek.
        colorPicker.oninput = (e) => applyColor(e.target.value);

        // — Modus-Umschaltung —
        iconSeg.querySelectorAll('.ct-seg-btn').forEach(btn => {
            btn.onclick = () => ctSetIconMode(form, btn.dataset.mode);
        });

        emojiTrig.id = emojiTrig.id || `emojiTrig-${Date.now()}`;
        emojiTrig.onclick = (e) => {
            e.preventDefault();
            if (typeof openEmojiPicker !== 'function') {
                showCustomMessage('Fehler', 'Emoji-Picker nicht geladen', 'error');
                return;
            }
            openEmojiPicker(emojiTrig, (em) => {
                form._ctState.emoji = em;
                form._ctState.iconMode = 'emoji';
                emojiDisp.classList.remove('ct-emoji-empty');
                emojiDisp.textContent = em;
                emojiTrig.querySelector('.ct-emoji-hint').textContent = ctL('Klick zum Ändern', 'Click to change');
            });
        };

        cancelBtn.onclick = () => {
            form.classList.remove('ct-form-open');
            _ctEditingId = null;
            ctFormReset(form);
        };

        saveBtn.onclick = () => {
            const label = labelInp.value.trim();
            const state = form._ctState;

            if (!label) {
                showCustomMessage('Name fehlt', 'Bitte gib einen Namen ein', 'error');
                labelInp.focus();
                return;
            }
            // Emoji ist optional — ohne eins zeichnet die App das Typ-Symbol in der
            // gewählten Farbe (getTypeIconHTML).

            const desc = form.querySelector('[data-field="desc"]').value.trim();
            const counts = form.querySelector('[data-field="counts"]').checked;
            const editingId = state.editingId;

            // Reset edit state BEFORE CRUD (das löst Re-Render aus → Form-Node wird ersetzt).
            _ctEditingId = null;

            // Im Symbol-Modus wandert das Emoji NICHT ins Label — sonst stünde es wieder
            // vor dem Namen, obwohl gerade ein SVG gewählt wurde.
            const useEmoji = state.iconMode === 'emoji' && !!state.emoji;

            if (editingId === null) {
                createCustomType(label, state.emoji, state.color, desc, counts, state.iconMode, state.icon);
            } else if (isDefaultType(editingId)) {
                setDefaultTypeOverride(editingId, {
                    emoji: state.emoji,
                    color: state.color,
                    description: desc,
                    label: label,
                    iconMode: state.iconMode,
                    icon: state.icon || ''
                });
            } else {
                editCustomType(editingId, {
                    label: useEmoji ? `${state.emoji} ${label}` : label,
                    emoji: state.emoji || '',
                    color: state.color,
                    description: desc,
                    countsAsWork: counts,
                    iconMode: state.iconMode,
                    icon: state.icon || ''
                });
            }

            // Form wurde während CRUD neu erstellt → über _ctActiveForm (jetzt = neuer Node) schließen.
            if (_ctActiveForm) _ctActiveForm.classList.remove('ct-form-open');
        };

        return form;
    }

    // Markiert die gewaehlte Kachel. Ist keine gesetzt, bleibt die Auswahl bewusst leer —
    // dann zeichnet die App das Werks-Icon des Typs bzw. das neutrale Etikett.
    function ctSyncIconTiles(form) {
        const sel = form._ctState.icon || '';
        form.querySelectorAll('.ct-icon-tile').forEach(t => {
            t.classList.toggle('ct-icon-active', t.dataset.icon === sel);
            t.setAttribute('aria-pressed', t.dataset.icon === sel ? 'true' : 'false');
        });
    }

    function ctSetIconMode(form, mode) {
        const m = mode === 'emoji' ? 'emoji' : 'svg';
        form._ctState.iconMode = m;
        form.querySelectorAll('[data-field="icon-seg"] .ct-seg-btn').forEach(b => {
            const on = b.dataset.mode === m;
            b.classList.toggle('ct-seg-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        form.querySelector('[data-field="icon-grid"]').style.display = m === 'svg' ? '' : 'none';
        form.querySelector('[data-field="emoji-pane"]').style.display = m === 'emoji' ? '' : 'none';
    }

    function ctFormReset(form) {
        if (!form) return;
        form._ctState = { emoji: '', color: '#a855f7', editingId: null, iconMode: 'svg', icon: '' };
        form.querySelector('[data-field="label"]').value = '';
        form.querySelector('[data-field="desc"]').value = '';
        form.querySelector('[data-field="counts"]').checked = false;
        form.querySelector('[data-field="counts-row"]').style.display = '';
        form.querySelector('[data-field="color-custom"]').value = '#a855f7';
        if (form._ctApplyColor) form._ctApplyColor('#a855f7');
        ctSetIconMode(form, 'svg');
        ctSyncIconTiles(form);
        const disp = form.querySelector('[data-field="emoji-display"]');
        disp.classList.add('ct-emoji-empty');
        disp.innerHTML = CT_EMOJI_PLACEHOLDER_SVG;
        form.querySelector('[data-field="emoji-trigger"] .ct-emoji-hint').textContent = ctL('Klick zum Auswählen', 'Click to choose');
        form.querySelector('[data-field="form-title"]').textContent = 'Neuer Eintrag-Typ';
        form.querySelector('[data-field="save-label"]').textContent = 'Speichern';
        form.querySelectorAll('.ct-color-swatch').forEach(sw => sw.classList.toggle('ct-color-active', sw.dataset.color === '#a855f7'));
    }

    function ctFormSetMode(mode, typeId) {
        const form = _ctActiveForm;
        if (!form) return;

        if (mode === 'create') {
            _ctEditingId = null;
            ctFormReset(form);
            return;
        }

        // Edit mode
        const info = getEntryTypeInfo(typeId);
        if (!info) return;

        const cleanLabel = String(info.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() || info.label || '';

        const def = DEFAULT_ENTRY_TYPES.find(t => t.id === typeId);
        form._ctState = {
            emoji: info.emoji || '',
            color: sanitizeColor(info.color),
            editingId: typeId,
            // Bestand ohne iconMode-Feld: dieselbe Herleitung wie beim Zeichnen, damit
            // das Formular zeigt, was in der App tatsaechlich zu sehen ist.
            iconMode: ctIconMode(typeId, info, def),
            icon: info.icon || ''
        };

        form.querySelector('[data-field="label"]').value = cleanLabel;
        form.querySelector('[data-field="desc"]').value = info.description || '';

        // counts-Row nur bei Custom-Types relevant — Standards haben hartcodierte Logik.
        const isStd = isDefaultType(typeId);
        form.querySelector('[data-field="counts-row"]').style.display = isStd ? 'none' : '';
        form.querySelector('[data-field="counts"]').checked = info.countsAsWork === true;

        const disp = form.querySelector('[data-field="emoji-display"]');
        if (info.emoji) {
            disp.classList.remove('ct-emoji-empty');
            disp.textContent = info.emoji;
            form.querySelector('[data-field="emoji-trigger"] .ct-emoji-hint').textContent = ctL('Klick zum Ändern', 'Click to change');
        } else {
            disp.classList.add('ct-emoji-empty');
            disp.innerHTML = CT_EMOJI_PLACEHOLDER_SVG;
            form.querySelector('[data-field="emoji-trigger"] .ct-emoji-hint').textContent = ctL('Klick zum Auswählen', 'Click to choose');
        }

        ctSetIconMode(form, form._ctState.iconMode);
        ctSyncIconTiles(form);

        form.querySelector('[data-field="color-custom"]').value = sanitizeColor(info.color);
        if (form._ctApplyColor) form._ctApplyColor(sanitizeColor(info.color));

        form.querySelector('[data-field="form-title"]').textContent = isStd ? `„${cleanLabel}" anpassen` : `„${cleanLabel}" bearbeiten`;
        form.querySelector('[data-field="save-label"]').textContent = 'Übernehmen';
    }

    // ═══ Custom Fields ═══
    function createCustomField(label, type, entryType, required, options) {
        if (!label || !type) {
            showCustomMessage('Fehler', 'Label und Typ erforderlich', 'error');
            return false;
        }
        if (!Array.isArray(data.customFields)) data.customFields = [];

        const id = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        data.customFields.push({
            id,
            label,
            type,
            entryType: entryType || 'all',
            required: !!required,
            options: type === 'select' ? (options || '').split(',').map(s => s.trim()).filter(Boolean) : [],
            createdAt: new Date().toISOString()
        });
        save();
        showCustomMessage('Custom Field erstellt', `"${label}" hinzugefügt`, 'success');
        renderCustomFieldsManager();
        if (typeof renderEntryCustomFields === 'function') renderEntryCustomFields();
        return true;
    }

    function deleteCustomField(id) {
        const field = (data.customFields || []).find(f => f.id === id);
        if (!field) return;
        showCustomConfirm(
            'Field löschen?',
            `"${field.label}" wird entfernt.`,
            () => {
                if (!Array.isArray(data.customFields)) data.customFields = [];
                const idx = data.customFields.findIndex(f => f.id === id);
                if (idx === -1) return;
                const deleted = data.customFields.splice(idx, 1)[0];
                save();
                showCustomMessage('Gelöscht', `"${deleted.label}" entfernt`, 'success');
                renderCustomFieldsManager();
                if (typeof renderEntryCustomFields === 'function') renderEntryCustomFields();
            }
        );
    }

    function renderCustomFieldsManager() {
        const container = document.getElementById('customFieldsContainer');
        if (!container) return;

        if (!Array.isArray(data.customFields)) data.customFields = [];
        const fields = data.customFields;

        container.innerHTML = '';

        const section = ctEl('div', 'ct-section');
        section.appendChild(ctSectionHead('Deine Felder', fields.length, false));

        if (fields.length === 0) {
            section.appendChild(ctEmptyState(
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>',
                'Noch keine Custom Fields',
                'Erweitere Einträge um eigene Felder wie „Client", „Billable" oder „Projekt-Code".'
            ));
        } else {
            const grid = ctEl('div', 'ct-grid');
            fields.forEach(f => grid.appendChild(ctFieldRow(f)));
            section.appendChild(grid);
        }

        const addBtn = ctEl('button', 'ct-add-btn');
        addBtn.type = 'button';
        addBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Neues Custom Field</span>
        `;
        const form = ctFieldCreateForm();
        addBtn.onclick = () => {
            const isOpen = form.classList.toggle('ct-form-open');
            if (isOpen) setTimeout(() => form.querySelector('.ct-input')?.focus(), 60);
        };
        section.appendChild(addBtn);
        section.appendChild(form);

        container.appendChild(section);
    }

    function ctFieldRow(field) {
        const row = ctEl('div', 'ct-row');
        const typeInfo = getEntryTypeInfo(field.entryType);
        const scopeLabel = field.entryType === 'all' ? 'Alle Typen' : (typeInfo ? typeInfo.label.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() : field.entryType);

        const iconBox = ctEl('div', 'ct-row-emoji');
        iconBox.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;color:var(--text-muted);"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>';

        const info = ctEl('div', 'ct-row-info');
        const lbl = ctEl('div', 'ct-row-label');
        lbl.textContent = field.label;
        const desc = ctEl('div', 'ct-row-desc');
        desc.textContent = `${scopeLabel} • ${field.type}${field.required ? ' • erforderlich' : ''}`;
        info.appendChild(lbl);
        info.appendChild(desc);

        const actions = ctEl('div', 'ct-row-actions');
        const delBtn = ctEl('button', 'ct-icon-btn ct-icon-btn-danger');
        delBtn.type = 'button';
        delBtn.title = 'Löschen';
        delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';
        delBtn.onclick = () => deleteCustomField(field.id);
        actions.appendChild(delBtn);

        row.appendChild(iconBox);
        row.appendChild(info);
        row.appendChild(actions);
        return row;
    }

    function ctFieldCreateForm() {
        const form = ctEl('div', 'ct-form');
        const allTypes = getAllEntryTypes();
        const typeOpts = allTypes.map(t => {
            const lbl = String(t.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() || t.label;
            return `<option value="${esc(t.id)}">${esc(lbl)}</option>`;
        }).join('');

        form.innerHTML = `
            <div class="ct-form-head">
                <div class="ct-form-title">Neues Custom Field</div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field">
                    <label class="ct-field-label">Bezeichnung</label>
                    <input type="text" class="ct-input" data-field="label" placeholder="z.B. Client, Projekt-Code, Billable" maxlength="40">
                </div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field">
                    <label class="ct-field-label">Feldtyp</label>
                    <select class="ct-select" data-field="type">
                        <option value="text">Text</option>
                        <option value="number">Zahl</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="select">Auswahl</option>
                    </select>
                </div>
                <div class="ct-field">
                    <label class="ct-field-label">Gilt für</label>
                    <select class="ct-select" data-field="scope">
                        <option value="all">Alle Typen</option>
                        ${typeOpts}
                    </select>
                </div>
            </div>

            <div class="ct-form-row" data-field="options-row" style="display:none;">
                <div class="ct-field">
                    <label class="ct-field-label">Auswahl-Optionen (Komma-getrennt)</label>
                    <input type="text" class="ct-input" data-field="options" placeholder="z.B. Hoch, Mittel, Niedrig">
                </div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field">
                    <label class="ct-field-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; text-transform:none; letter-spacing:0;">
                        <input type="checkbox" data-field="required" style="accent-color: var(--primary); width:14px; height:14px;">
                        <span style="font-size:0.8rem; color:var(--text-main); font-weight:500;">Pflichtfeld</span>
                    </label>
                </div>
            </div>

            <div class="ct-form-actions">
                <button type="button" class="ct-btn ct-btn-ghost" data-action="cancel">Abbrechen</button>
                <button type="button" class="ct-btn ct-btn-primary" data-action="save">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Speichern
                </button>
            </div>
        `;

        const labelInp  = form.querySelector('[data-field="label"]');
        const typeSel   = form.querySelector('[data-field="type"]');
        const scopeSel  = form.querySelector('[data-field="scope"]');
        const optsRow   = form.querySelector('[data-field="options-row"]');
        const optsInp   = form.querySelector('[data-field="options"]');
        const reqChk    = form.querySelector('[data-field="required"]');
        const cancelBtn = form.querySelector('[data-action="cancel"]');
        const saveBtn   = form.querySelector('[data-action="save"]');

        typeSel.onchange = () => {
            optsRow.style.display = typeSel.value === 'select' ? '' : 'none';
        };

        cancelBtn.onclick = () => {
            form.classList.remove('ct-form-open');
            labelInp.value = '';
            typeSel.value = 'text';
            scopeSel.value = 'all';
            optsInp.value = '';
            optsRow.style.display = 'none';
            reqChk.checked = false;
        };

        saveBtn.onclick = () => {
            const label = labelInp.value.trim();
            if (!label) {
                showCustomMessage('Bezeichnung fehlt', 'Bitte gib eine Bezeichnung ein', 'error');
                labelInp.focus();
                return;
            }
            createCustomField(label, typeSel.value, scopeSel.value, reqChk.checked, optsInp.value);
            cancelBtn.onclick();
        };

        return form;
    }

    // ═══ Custom Fields im Eintrags-Formular (Erfassen + Edit) ═══
    // Bis hierher wurden Custom Fields nur in den Settings definiert & gelistet, aber NIRGENDS
    // ins Eintrags-Formular gerendert oder mit einem Eintrag gespeichert. Das passiert jetzt hier.

    // Felder, die für einen Eintragstyp gelten ('all' + typ-spezifische).
    function getCustomFieldsForType(typeId) {
        if (!Array.isArray(data.customFields)) return [];
        return data.customFields.filter(f => f && (f.entryType === 'all' || f.entryType === typeId));
    }

    // Baut die Input-Elemente in einen Container. opts steuert CSS-Klassen (Erfassen vs. Edit-Modal).
    function cfBuildInputs(container, fields, values, opts) {
        opts = opts || {};
        const inputCls  = opts.inputClass  || 'glass-input';
        const selectCls = opts.selectClass || 'glass-select';
        const wrapCls   = opts.wrapClass   || 'entry-form__field';
        const labelCls  = opts.labelClass  || 'entry-form__label';
        const prefix    = opts.prefix      || 'cf';
        values = values || {};
        container.innerHTML = '';

        fields.forEach(f => {
            const wrap = ctEl('div', wrapCls);
            wrap.setAttribute('data-cf-wrap', f.id);
            const inputId = `${prefix}__${f.id}`;
            const val = values[f.id];

            if (f.type === 'checkbox') {
                // Checkbox: Box + Label in einer Zeile
                const row = ctEl('label', labelCls);
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '8px';
                row.style.cursor = 'pointer';
                const box = document.createElement('input');
                box.type = 'checkbox';
                box.id = inputId;
                box.style.width = '15px';
                box.style.height = '15px';
                box.style.accentColor = 'var(--primary)';
                box.checked = (val === true || val === 'true');
                box.setAttribute('data-cf-id', f.id);
                box.setAttribute('data-cf-type', 'checkbox');
                if (f.required) box.setAttribute('data-cf-required', '1');
                const span = document.createElement('span');
                span.textContent = f.label + (f.required ? ' *' : '');
                row.appendChild(box);
                row.appendChild(span);
                wrap.appendChild(row);
            } else {
                const label = ctEl('label', labelCls);
                label.setAttribute('for', inputId);
                label.textContent = f.label + (f.required ? ' *' : '');
                wrap.appendChild(label);

                let input;
                if (f.type === 'select') {
                    input = document.createElement('select');
                    input.className = selectCls;
                    const empty = document.createElement('option');
                    empty.value = ''; empty.textContent = '—';
                    input.appendChild(empty);
                    (f.options || []).forEach(o => {
                        const op = document.createElement('option');
                        op.value = o; op.textContent = o;
                        if (val === o) op.selected = true;
                        input.appendChild(op);
                    });
                } else {
                    input = document.createElement('input');
                    input.type = (f.type === 'number') ? 'number' : 'text';
                    input.className = inputCls;
                    if (val != null && val !== '') input.value = val;
                }
                input.id = inputId;
                input.setAttribute('data-cf-id', f.id);
                input.setAttribute('data-cf-type', f.type);
                if (f.required) input.setAttribute('data-cf-required', '1');
                wrap.appendChild(input);
            }
            container.appendChild(wrap);
        });
    }

    // Liest die aktuellen Werte + prüft Pflichtfelder. → { ok, values, missing }
    function cfCollect(container) {
        const out = {};
        let missing = null;
        if (!container) return { ok: true, values: out };
        container.querySelectorAll('[data-cf-id]').forEach(el => {
            const fid = el.getAttribute('data-cf-id');
            const t = el.getAttribute('data-cf-type');
            const req = el.getAttribute('data-cf-required') === '1';
            let v;
            if (t === 'checkbox') {
                v = el.checked;
                if (req && v !== true && !missing) missing = cfLabelOf(el, fid);
                if (v) out[fid] = true;
            } else {
                v = (el.value || '').trim();
                if (req && !v && !missing) missing = cfLabelOf(el, fid);
                if (v !== '') out[fid] = (t === 'number') ? v : v;
            }
        });
        return { ok: !missing, values: out, missing };
    }

    function cfLabelOf(el, fallback) {
        const wrap = el.closest('[data-cf-wrap]');
        const lbl = wrap ? wrap.querySelector('label, span') : null;
        return (lbl && lbl.textContent ? lbl.textContent.replace(/\s*\*$/, '') : fallback);
    }

    // — Erfassen-Formular —
    function renderEntryCustomFields(preserve) {
        const c = document.getElementById('entryCustomFields');
        if (!c) return;
        const sel = document.getElementById('inpType');
        const typeId = sel ? sel.value : 'all';
        const fields = getCustomFieldsForType(typeId);
        if (!fields.length) { c.style.display = 'none'; c.innerHTML = ''; return; }
        const vals = (preserve === false) ? {} : cfCollect(c).values;
        cfBuildInputs(c, fields, vals, { prefix: 'cf' });
        c.style.display = 'flex';
        c.style.flexDirection = 'column';
        c.style.gap = '0.85rem';
    }

    function collectEntryCustomFieldValues() {
        return cfCollect(document.getElementById('entryCustomFields'));
    }

    // — Edit-Modal —
    function renderEditCustomFields(entry) {
        const c = document.getElementById('editCustomFields');
        const row = document.getElementById('editCustomFieldsRow');
        if (!c) return;
        const sel = document.getElementById('editInpType');
        const typeId = sel ? sel.value : (entry ? entry.type : 'all');
        const fields = getCustomFieldsForType(typeId);
        if (!fields.length) {
            c.style.display = 'none'; c.innerHTML = '';
            if (row) row.style.display = 'none';
            return;
        }
        // Gespeicherte Werte des Eintrags + aktuell getippte (bei Typ-Wechsel) mergen.
        const stored = (entry && entry.customFieldValues) || {};
        const current = cfCollect(c).values;
        const vals = Object.assign({}, stored, current);
        cfBuildInputs(c, fields, vals, {
            prefix: 'ecf', inputClass: 'edit-input', selectClass: 'edit-select',
            wrapClass: 'edit-field full', labelClass: 'edit-label'
        });
        c.style.display = 'flex';
        c.style.flexDirection = 'column';
        c.style.gap = '14px';
        if (row) row.style.display = '';
    }

    function collectEditCustomFieldValues() {
        return cfCollect(document.getElementById('editCustomFields')).values;
    }

    // ═══ Helpers ═══
    function ctEl(tag, cls) {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        return el;
    }

    function ctSectionHead(title, count, muted) {
        const head = ctEl('div', 'ct-section-head');
        const row = ctEl('div', 'ct-section-title-row');
        const t = ctEl('div', 'ct-section-title');
        t.textContent = title;
        if (muted) t.style.color = 'var(--text-muted)';
        row.appendChild(t);
        const c = ctEl('div', 'ct-section-count');
        c.textContent = count;
        row.appendChild(c);
        head.appendChild(row);
        return head;
    }

    function ctEmptyState(iconSvg, text, hint) {
        const wrap = ctEl('div', 'ct-empty');
        wrap.innerHTML = `
            <div class="ct-empty-icon">${iconSvg}</div>
            <div class="ct-empty-text">${esc(text)}</div>
            <div class="ct-empty-hint">${esc(hint)}</div>
        `;
        return wrap;
    }

    // ═══ Entry-Form-Select Sync ═══
    // Füllt das <select id="inpType"> mit den Standard + Custom Types.
    function refreshEntryTypeSelect() {
        const sel = document.getElementById('inpType');
        if (!sel) return;
        const previousValue = sel.value;
        // 'korrektur' ist kein buchbarer Tages-Typ, sondern wird nur über die
        // Saldo-Anpassung auf dem Gleitzeit-Card erzeugt → aus dem Eintrags-Dropdown raus.
        const types = getAllEntryTypes().filter(t => t.id !== 'korrektur');
        sel.innerHTML = '';
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            // Kein Emoji-Prefix: das Icon zeichnet der Typ-Picker als SVG.
            opt.textContent = ctCleanLabel(t.label, t.id);
            sel.appendChild(opt);
        });
        if (types.some(t => t.id === previousValue)) sel.value = previousValue;
        if (typeof renderEntryTypePicker === 'function') renderEntryTypePicker();
    }

    // Entfernt ein evtl. vorangestelltes Emoji aus einem Typ-Label.
    function ctCleanLabel(label, fallback) {
        return String(label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim()
            || String(label || '').trim() || fallback || '';
    }

    // ═══ Affected UI Refresh ═══
    // Aktualisiert alle Orte mit hardcoded Type-Emojis/Labels, damit Standard-Overrides
    // sofort sichtbar werden (Historie-Pills, Dashboard-Aktivitäten, History-Filter-Select).
    function refreshTypeAffectedUI() {
        // History Pills (.hl-type-pills) — Icon als SVG, Label separat (sonst kippt die
        // i18n-Pipeline: ein Element mit SVG-Kind ist „gemischter Inhalt" und wird still
        // übersprungen). Das Label NUR anfassen, wenn der User es wirklich umbenannt hat —
        // sonst würde die englische Übersetzung mit jedem Refresh wieder deutsch.
        const pillMap = { work: 'Arbeit', school: 'Schule', vacation: 'Urlaub', gleittag: 'Gleittag', sick: 'Krank', holiday: 'Feiertag', korrektur: 'Korrektur' };
        Object.keys(pillMap).forEach(id => {
            const pill = document.querySelector(`.hl-pill.hl-pill-${id}`);
            if (!pill) return;
            const info = getEntryTypeInfo(id);
            if (!info) return;
            // --type-rgb an der PILLE (nicht am Icon) — das Icon erbt es, und der
            // aktive Zustand färbt Hintergrund/Rahmen daraus.
            pill.style.setProperty('--type-rgb', getTypeRgb(id));
            const iconEl = pill.querySelector('.hl-pill-icon');
            if (iconEl) iconEl.innerHTML = getTypeIconHTML(id, 14);
            const override = ((data && data.entryTypeOverrides) || {})[id];
            if (override && override.label) {
                const labelEl = pill.querySelector('.hl-pill-label');
                if (labelEl) labelEl.textContent = ctCleanLabel(override.label, pillMap[id]);
            }
        });

        // History Filter Select
        const histSel = document.getElementById('historyFilterType');
        if (histSel) {
            const prev = histSel.value;
            histSel.innerHTML = '<option value="all">Alle</option>';
            getAllEntryTypes().forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                const lbl = String(t.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() || t.label || t.id;
                opt.textContent = lbl;
                histSel.appendChild(opt);
            });
            histSel.value = prev;
        }

        // Entry-Form select
        refreshEntryTypeSelect();

        // Custom Fields im Erfassen-Formular (Scope hängt am gewählten Typ)
        if (typeof renderEntryCustomFields === 'function') renderEntryCustomFields();

        // Dashboard activity timeline re-render
        if (typeof renderLists === 'function') {
            try { renderLists(); } catch(e) { /* harmless if dashboard not visible */ }
        }
    }

    // Initial nach Daten-Load (init-app.js patcht erst data, danach laufen wir).
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(refreshTypeAffectedUI, 300);
    });

    // ═══ TYP-PICKER MODULE ═══
    // Sichtbare Listbox über einem nativen <select>. Grund: ein <option> rendert nur
    // Text — für SVG-Icons statt Emojis braucht es eigenes Markup. Das <select> bleibt
    // im DOM (display:none) und BLEIBT die Wert-Quelle: aller Bestandscode, der
    // .value liest oder setzt, läuft unverändert weiter.
    //
    // Markup pro Picker (siehe dashboard.html / modals.html):
    //   .type-picker > select.type-picker__native
    //                > button.type-picker__trigger > .type-picker__icon + .type-picker__value
    //                > .type-picker__panel
    (function () {
        'use strict';

        const CHECK_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            + 'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

        let openPickerEl = null;   // höchstens einer offen
        let activeIndex = -1;

        function parts(picker) {
            return {
                sel:     picker.querySelector('select'),
                trigger: picker.querySelector('.type-picker__trigger'),
                icon:    picker.querySelector('.type-picker__icon'),
                label:   picker.querySelector('.type-picker__value'),
                panel:   picker.querySelector('.type-picker__panel')
            };
        }

        function iconHTML(id, size) {
            try { return getTypeIconHTML(id, size); }
            catch (e) { return ''; } // Daten noch nicht geladen → leere Kachel statt Absturz
        }

        function paintTile(tile, typeId) {
            const rgb = getTypeRgb(typeId);
            if (rgb) tile.style.setProperty('--type-rgb', rgb); else tile.style.removeProperty('--type-rgb');
            tile.innerHTML = iconHTML(typeId, 16);
        }

        // Baut die Optionen aus den <option>s des Selects nach (inkl. Custom-Types).
        function renderPicker(picker) {
            const { sel, panel } = parts(picker);
            if (!sel || !panel) return;
            panel.innerHTML = '';
            Array.from(sel.options).forEach((opt, i) => {
                const row = document.createElement('button');
                row.type = 'button';
                row.className = 'type-option';
                row.setAttribute('role', 'option');
                row.setAttribute('aria-selected', opt.value === sel.value ? 'true' : 'false');
                row.dataset.value = opt.value;

                const tile = document.createElement('span');
                tile.className = 'type-option__icon type-tile';
                paintTile(tile, opt.value);

                const txt = document.createElement('span');
                txt.className = 'type-option__label';
                txt.textContent = opt.textContent;

                const check = document.createElement('span');
                check.className = 'type-option__check';
                check.innerHTML = CHECK_SVG;

                row.append(tile, txt, check);
                row.addEventListener('click', () => choose(picker, opt.value));
                row.addEventListener('mouseenter', () => highlight(picker, i, false));
                panel.appendChild(row);
            });
            syncTrigger(picker);
        }

        // Spiegelt den aktuellen Select-Wert in Trigger + Häkchen.
        function syncTrigger(picker) {
            const { sel, icon, label, panel } = parts(picker);
            if (!sel || !icon || !label) return;
            const opt = sel.options[sel.selectedIndex] || sel.options[0];
            if (!opt) return;
            label.textContent = opt.textContent;
            paintTile(icon, opt.value);
            if (panel) panel.querySelectorAll('.type-option').forEach(o => {
                o.setAttribute('aria-selected', o.dataset.value === sel.value ? 'true' : 'false');
            });
        }

        function choose(picker, value) {
            const { sel } = parts(picker);
            if (!sel) return;
            sel.value = value; // Mirror unten ruft syncTrigger()
            sel.dispatchEvent(new Event('change', { bubbles: true })); // toggleTimeInputs() & Co.
            closePicker(true);
        }

        function highlight(picker, i, focus) {
            const { panel } = parts(picker);
            if (!panel) return;
            const opts = panel.querySelectorAll('.type-option');
            if (!opts.length) return;
            activeIndex = (i + opts.length) % opts.length;
            opts.forEach((o, n) => o.classList.toggle('is-active', n === activeIndex));
            if (focus) opts[activeIndex].focus();
        }

        function openPicker(picker) {
            const { panel, sel, trigger } = parts(picker);
            if (!panel || !trigger) return;
            if (openPickerEl && openPickerEl !== picker) closePicker(false);
            picker.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
            openPickerEl = picker;

            // Platz messen und ggf. nach oben klappen. Die mobile Bottom-Nav liegt
            // über dem Inhalt — ihre Höhe zählt nicht als freier Platz.
            const r = picker.getBoundingClientRect();
            const nav = document.querySelector('.mobile-bottom-nav, .mobile-bottom-nav-inner');
            const navH = (nav && getComputedStyle(nav).display !== 'none') ? nav.getBoundingClientRect().height + 8 : 0;
            const spaceBelow = window.innerHeight - r.bottom - navH - 12;
            const spaceAbove = r.top - 12;
            const need = Math.min(panel.scrollHeight + 12, 320);
            const up = spaceBelow < need && spaceAbove > spaceBelow;
            picker.classList.toggle('is-up', up);
            // Nie über den Rand: Panel scrollt lieber intern.
            panel.style.maxHeight = Math.max(150, Math.min(320, up ? spaceAbove : spaceBelow)) + 'px';

            highlight(picker, Math.max(0, sel ? sel.selectedIndex : 0), true);
            document.addEventListener('mousedown', onDocDown, true);
        }

        function closePicker(refocus) {
            const picker = openPickerEl;
            if (!picker) return;
            const { trigger } = parts(picker);
            picker.classList.remove('is-open', 'is-up');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
                if (refocus) trigger.focus();
            }
            openPickerEl = null;
            document.removeEventListener('mousedown', onDocDown, true);
        }

        function onDocDown(e) {
            if (openPickerEl && !openPickerEl.contains(e.target)) closePicker(false);
        }

        function onTriggerKey(picker, e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker(picker);
            }
        }

        function onPanelKey(picker, e) {
            const { panel } = parts(picker);
            const count = panel ? panel.querySelectorAll('.type-option').length : 0;
            if (!count) return;
            switch (e.key) {
                case 'ArrowDown': e.preventDefault(); highlight(picker, activeIndex + 1, true); break;
                case 'ArrowUp':   e.preventDefault(); highlight(picker, activeIndex - 1, true); break;
                case 'Home':      e.preventDefault(); highlight(picker, 0, true); break;
                case 'End':       e.preventDefault(); highlight(picker, count - 1, true); break;
                case 'Escape':    e.preventDefault(); closePicker(true); break;
                case 'Tab':       closePicker(false); break;
                default: break;
            }
        }

        // Bestandscode setzt sel.value direkt (Voice-Input, Draft-Restore, NFC, Edit-Modal,
        // resetEdit). Ein `change` feuert dabei NICHT — deshalb hängen wir uns einmalig in
        // den value-Setter dieser Instanz, statt jeden Aufrufer anzufassen.
        function bindValueMirror(picker, sel) {
            if (sel._typePickerBound) return;
            sel._typePickerBound = true;
            const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
            if (desc && desc.get && desc.set) {
                Object.defineProperty(sel, 'value', {
                    configurable: true,
                    enumerable: true,
                    get() { return desc.get.call(this); },
                    set(v) { desc.set.call(this, v); syncTrigger(picker); }
                });
            }
            sel.addEventListener('change', () => syncTrigger(picker));
        }

        function initPicker(picker) {
            const { sel, trigger, panel } = parts(picker);
            if (!sel || !trigger || !panel || picker._inited) return;
            picker._inited = true;
            bindValueMirror(picker, sel);
            trigger.addEventListener('click', () => {
                picker.classList.contains('is-open') ? closePicker(false) : openPicker(picker);
            });
            trigger.addEventListener('keydown', (e) => onTriggerKey(picker, e));
            panel.addEventListener('keydown', (e) => onPanelKey(picker, e));
            renderPicker(picker);
        }

        function initAll()   { document.querySelectorAll('.type-picker').forEach(initPicker); }
        function renderAll() { document.querySelectorAll('.type-picker').forEach(p => { initPicker(p); renderPicker(p); }); }

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
        else initAll();

        window.renderEntryTypePicker = renderAll;
    })();
