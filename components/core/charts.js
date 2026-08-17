// ═══ CORE: CHARTS ═══
    // --- CHARTS & PERFORMANCE ---

    // ─── KPI-WERT MIT EINHEIT ────────────────────────────────────────
    // Die Hauptwerte stehen als `<div>34,2<span class="kpi-v2__unit">h</span></div>`
    // im HTML. Ein schlichtes `el.innerText = wert` wuerde das <span>
    // mitloeschen — danach steht ueberall eine nackte Zahl ohne Einheit,
    // und es faellt niemandem auf, weil der erste Frame noch stimmt.
    // Deshalb: Zahl als Textknoten setzen, Einheit als Knoten anhaengen.
    function setKpiValue(el, numStr, unit, sign) {
        if (!el) return;
        el.textContent = numStr;
        if (unit) {
            const u = document.createElement('span');
            u.className = 'kpi-v2__unit';
            u.textContent = unit;
            el.appendChild(u);
        }
        el.classList.toggle('is-pos', sign > 0);
        el.classList.toggle('is-neg', sign < 0);
    }

    // ─── ABWEICHUNGSBALKEN ───────────────────────────────────────────
    // Loest den frueheren Ring ab. Der rechnete `pct = 0.5 + val/40`:
    // ein SALDO auf einem Fortschrittsbogen, bei dem 0 h halb voll
    // aussah und "voll" +20 h Ueberstunden bedeutete — also eher eine
    // Warnung als ein Erfolg. Die Skala stand nirgends.
    //
    // Hier waechst der Balken aus einer sichtbaren Nulllinie heraus, die
    // Enden sind beziffert, und die Skala kommt aus den Einstellungen
    // des Nutzers statt aus einer festen 40.
    //
    //   barId  Container mit .devbar__fill und [data-dev-min|max]
    //   valId  Element fuer den Zahlwert (mit Einheiten-<span>)
    //   val    Saldo in Stunden (Vorzeichen ist die Aussage)
    //   scale  Betrag, der einem vollen Ausschlag entspricht
    function setDeviation(barId, valId, val, scale, decimals) {
        const bar = document.getElementById(barId);
        const txt = document.getElementById(valId);
        const dec = (typeof decimals === 'number') ? decimals : 1;

        if (txt) {
            const v = (typeof roundHours === 'function') ? roundHours(val, dec) : val;
            const nf = new Intl.NumberFormat(
                (typeof mwlLocale === 'function') ? mwlLocale() : 'de-DE',
                { minimumFractionDigits: dec, maximumFractionDigits: dec }
            );
            // Vorzeichen selbst setzen: Intl liefert kein fuehrendes "+".
            setKpiValue(txt, (v >= 0 ? '+' : '−') + nf.format(Math.abs(v)), 'h', v === 0 ? 0 : (v > 0 ? 1 : -1));
        }

        if (!bar) return;
        const fill = bar.querySelector('.devbar__fill');
        const lo   = bar.querySelector('[data-dev-min]');
        const hi   = bar.querySelector('[data-dev-max]');
        const S    = Math.max(Math.abs(scale) || 0, 0.5); // nie durch 0 teilen

        // Halbe Spur = voller Ausschlag in eine Richtung.
        const ratio   = Math.max(-1, Math.min(1, val / S));
        const clamped = Math.abs(val) > S;
        const halfPct = Math.abs(ratio) * 50;

        bar.setAttribute('data-sign', val > 0 ? 'pos' : (val < 0 ? 'neg' : 'zero'));
        if (fill) {
            fill.style.left  = (val >= 0 ? 50 : 50 - halfPct) + '%';
            fill.style.width = Math.max(halfPct, val === 0 ? 0 : 1.5) + '%';
            fill.classList.toggle('is-clamped', clamped);
        }

        const s = Math.round(S);
        if (lo) lo.textContent = '−' + s + ' h';
        if (hi) hi.textContent = '+' + s + ' h';
        bar.title = clamped
            ? 'Wert liegt außerhalb der Skala von ±' + s + ' h'
            : 'Skala ±' + s + ' h';
    }

    // Wochensoll aus den Einstellungen — nie eine feste Zahl, sonst
    // rechnet ein Teilzeit-Azubi gegen fremde Vorgaben.
    function weeklyTargetHours() {
        if (typeof data === 'undefined' || !data || !data.settings) return 40;
        const h = data.settings.hours;
        if (!Array.isArray(h)) return 40;
        const sum = h.reduce((a, b) => a + (parseFloat(b) || 0), 0);
        return sum > 0 ? sum : 40;
    }

    // Zielpunkt fuer alle "jetzt erfassen"-Aufforderungen der leeren
    // Zustaende. Scrollt zum Formular und setzt den Fokus auf das erste
    // Feld, damit die Tastatur-Reise dort weitergeht, wo der Klick war.
    function focusEntryForm() {
        const form = document.querySelector('[data-item-id="entry-form"]') ||
                     document.querySelector('.entry-form');
        if (!form) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        const first = document.getElementById('inpDate');
        if (first) setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (e) {} }, reduce ? 0 : 380);
    }

    function getRelativeTime(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        const todayStr = toLocalISODate(now);
        const yesterdayDate = new Date(now); yesterdayDate.setDate(now.getDate() - 1);
        const yesterdayStr = toLocalISODate(yesterdayDate);
        if (dateStr === todayStr) return 'heute';
        if (dateStr === yesterdayStr) return 'gestern';
        const diffDays = Math.round((now - d) / (1000*60*60*24));
        if (diffDays > 0 && diffDays <= 7) return `vor ${diffDays}d`;
        if (diffDays > 7 && diffDays <= 14) return 'letzte Woche';
        return d.toLocaleDateString(mwlLocale());
    }

    // ═══ ACTIVITY DAY TABS STATE ═══
    window.activityDayTabs = {
        selectedDate: null,
        allDates: [],
        entriesByDate: {}
    };

    // ═══ AKTIVITÄTS-KARTE (Dashboard „Letzte Aktivitäten") ═══
    // Eine Quelle für Erst-Render UND Tab-Wechsel — vorher stand dieselbe Karte
    // zweimal im File und ist beim Ändern zwangsläufig auseinandergelaufen.
    // Tooltip-Marker im Saldo-Trend (Streak positiv/negativ)
    const TT_ICON_OK   = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;color:#10b981"><path d="M20 6 9 17l-5-5"/></svg>';
    const TT_ICON_WARN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;color:#f59e0b"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';

    // Zählt der Typ in die Arbeitszeit-Bilanz? Standards ja, Custom-Types nur per Flag.
    function activityCountsAsWork(id) {
        if (typeof getEntryTypeInfo === 'function') {
            const info = getEntryTypeInfo(id);
            if (info && String(id).startsWith('custom-')) return info.countsAsWork === true;
        }
        return !String(id).startsWith('custom-');
    }

    function activityRelativeTime(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const diffMs = new Date() - d;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays  = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffHours < 1) return 'gerade eben';
        if (diffHours < 24) return `vor ${diffHours}h`;
        if (diffDays === 1) return 'gestern';
        if (diffDays < 7) return `vor ${diffDays}d`;
        return d.toLocaleDateString(mwlLocale(), { month: 'short', day: 'numeric' });
    }

    // 🔴 `entry.info` ist KEIN Freitextfeld, sondern ein Pipe-String:
    // handleEntry() startet mit info = <Notiz des Nutzers> und stellt dann
    // je nach Zweig einen System-Zusatz VORNE davor ("07:30 - 17:00 (30m
    // Pause)", "Manuell (7.50h)", "Berufsschule - Mittwoch (…)", "Urlaubstag").
    // Nachtraege ("↪ Zusatzzeit") haengen hinten dran.
    // Die Karte hat diesen ganzen String frueher ZWEIMAL gezeigt — einmal als
    // Ueberschrift, einmal als Zitat darunter. Hier bleibt nur der Teil, den
    // der Nutzer selbst getippt hat: alles nach dem ersten Segment.
    function activityUserNote(e) {
        if (e.isPeriod) return String(e.info || '').trim();
        const parts = String(e.info || '').split('|').map(s => s.trim()).filter(Boolean);
        while (parts.length && parts[parts.length - 1].startsWith('↪')) parts.pop();
        return parts.length > 1 ? parts.slice(1).join(' · ') : '';
    }

    // Stunden im Zahlformat der Seite (8,75 auf /de/, 8.75 auf /en/) und mit
    // der Rundung aus den Einstellungen — nicht mit einem festen toFixed(2).
    function activityNum(h, digits) {
        const d = typeof digits === 'number' ? digits : 2;
        const v = (typeof roundHours === 'function') ? roundHours(h || 0, d) : (h || 0);
        return v.toLocaleString(mwlLocale(), { minimumFractionDigits: d, maximumFractionDigits: d });
    }

    function createActivityCard(e) {
        const icon  = (typeof getTypeIconTile === 'function') ? getTypeIconTile(e.type, 17, 'activity-icon') : '';
        const label = (typeof getTypeLabel === 'function') ? getTypeLabel(e.type) : e.type;
        const rgb   = (typeof getTypeRgb === 'function') ? getTypeRgb(e.type) : '148,163,184';
        const note  = activityUserNote(e);

        const dayIndex = new Date(e.date).getDay();
        const expected = e.expected !== undefined ? e.expected : (data.settings?.hours?.[dayIndex] || 8);
        const diffHours = e.diff !== undefined ? e.diff : ((e.worked || 0) - expected);
        const counts = activityCountsAsWork(e.type);
        const sign = !counts ? 'none' : (diffHours > 0.004 ? 'pos' : (diffHours < -0.004 ? 'neg' : 'zero'));
        // Vorzeichen traegt die Farbe (--role-pos/--role-neg via data-sign),
        // nicht ein Hex im style-Attribut.
        const diffHtml = counts
            ? `<span class="activity-diff" data-sign="${sign}">${diffHours >= 0 ? '+' : '−'}${activityNum(Math.abs(diffHours), 2)}<small> h</small></span>`
            : `<span class="activity-diff" data-sign="none" title="Zählt nicht in die Arbeitszeit-Bilanz">—</span>`;

        // Zeitraum aus den strukturierten Feldern, nicht aus dem info-String
        // geparst. Fehlt er (Urlaub, Krank, Korrektur), tritt die relative
        // Angabe an seine Stelle — beide sind sprachneutral bzw. haben eine
        // Regel in i18n-runtime.js.
        const span = (e.start && e.end) ? `${e.start} – ${e.end}` : activityRelativeTime(e.date);
        const metaBits = [`<span class="activity-time">${esc(span)}</span>`];
        if (e.project) metaBits.push(`<span class="activity-project">${esc(e.project)}</span>`);

        return `
            <div class="activity-item type-${e.type}" data-entry-id="${e.id}"
                 style="--type-rgb:${rgb}; cursor:pointer;" role="button" tabindex="0">
                ${icon}
                <span class="activity-type-label">${esc(label)}</span>
                <span class="activity-hours">${activityNum(e.worked, 2)}<small>h</small></span>
                <span class="activity-meta">${metaBits.join('<span class="activity-meta__sep" aria-hidden="true">·</span>')}</span>
                ${diffHtml}
                ${note ? `<div class="activity-note">${esc(note)}</div>` : ''}
            </div>
        `;
    }

    // Summe des angezeigten Tages in die Kopfzeile. Nur die Zahl wird
    // gesetzt — die Einheit steht als eigener <small>-Knoten im HTML und
    // wuerde von einem textContent auf dem Elternknoten verschluckt.
    function renderActivityDaySum(entries) {
        const box = document.getElementById('activitiesDaySum');
        const val = document.getElementById('activitiesDaySumValue');
        if (!box || !val) return;
        if (!entries || !entries.length) { box.style.display = 'none'; return; }
        const sum = entries.reduce((acc, e) => acc + (Number(e.worked) || 0), 0);
        val.textContent = activityNum(sum, 2);
        box.style.display = 'flex';
    }

    function renderLists() {
        const trackEl = document.getElementById('entryListShort');
        const emptyEl = document.getElementById('activitiesEmpty');
        const dayTabsEl = document.getElementById('dayTabsList');

        if (!trackEl || !dayTabsEl) return console.warn('renderLists: required elements not found');

        // Limit to last 14 days AND max 10 entries
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const allEntries = Array.isArray(data.entries)
            ? data.entries.filter(e => new Date(e.date + 'T00:00:00') >= twoWeeksAgo)
            : [];
        const entries = allEntries.slice(0, 10);

        if (!entries.length) {
            trackEl.style.display = 'none';
            if (emptyEl) emptyEl.style.display = 'flex';
            dayTabsEl.innerHTML = '';
            renderActivityDaySum(null);
            return;
        }

        // Group entries by date
        const entriesByDate = {};
        const uniqueDates = [];
        entries.forEach(e => {
            if (!entriesByDate[e.date]) {
                entriesByDate[e.date] = [];
                uniqueDates.push(e.date);
            }
            entriesByDate[e.date].push(e);
        });

        window.activityDayTabs.allDates = uniqueDates;
        window.activityDayTabs.entriesByDate = entriesByDate;
        window.activityDayTabs.selectedDate = uniqueDates[0] || null;

        if (emptyEl) emptyEl.style.display = 'none';
        trackEl.style.display = 'flex';

        // Render day tabs — als <button>, damit sie per Tab erreichbar sind
        // und Enter/Leertaste ohne eigenen Handler funktionieren.
        const dayTabsHtml = uniqueDates.map((date, idx) => {
            const dateObj = new Date(date + 'T00:00:00');
            const dayName = dateObj.toLocaleDateString(mwlLocale(), {weekday:'short'}).toUpperCase();
            const dayNum = dateObj.getDate();
            const isActive = idx === 0;
            return `
                <button type="button" class="day-tab${isActive ? ' active' : ''}" data-date="${date}"
                        aria-pressed="${isActive}" onclick="switchActivityDay('${date}')">
                    <span class="day-tab-label">${dayName}</span>
                    <span class="day-tab-date">${dayNum}</span>
                </button>
            `;
        }).join('');
        dayTabsEl.innerHTML = dayTabsHtml;

        // Render activities for first date
        const firstDateActivities = entriesByDate[uniqueDates[0]] || [];
        trackEl.innerHTML = firstDateActivities.map(createActivityCard).join('');
        renderActivityDaySum(firstDateActivities);

        setTimeout(() => { initActivityScrollListeners(); }, 50);
    }

    function switchActivityDay(date) {
        window.activityDayTabs.selectedDate = date;
        const trackEl = document.getElementById('entryListShort');
        const dayTabsEl = document.getElementById('dayTabsList');

        if (!trackEl || !dayTabsEl) return;

        // Der aktive Tab wird ueber data-date gefunden. Vorher wurde die
        // Tages-ZAHL aus dem Text verglichen — das haelt nur, solange sich
        // im Fenster keine Zahl wiederholt, und bricht still, sobald der
        // Zeitraum groesser wird als ein Monat.
        dayTabsEl.querySelectorAll('.day-tab').forEach(tab => {
            const on = tab.getAttribute('data-date') === date;
            tab.classList.toggle('active', on);
            tab.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        const activities = window.activityDayTabs.entriesByDate[date] || [];
        trackEl.innerHTML = activities.map(createActivityCard).join('');
        renderActivityDaySum(activities);
    }

    // ═══ SWIPE & WHEEL SUPPORT ═══
    window.activitySwipeState = {
        touchStartY: 0,
        touchStartX: 0,
        isSwiping: false
    };
    window._activityScrollListenersInit = false;

    function initActivityScrollListeners() {
        if (window._activityScrollListenersInit) return;
        window._activityScrollListenersInit = true;

        const trackEl = document.getElementById('entryListShort');
        const dayTabsEl = document.getElementById('dayTabsList');
        if (!trackEl || !dayTabsEl) return;

        // Wheel scroll support - smooth mouse wheel scrolling
        trackEl.addEventListener('wheel', (e) => {
            if (trackEl.scrollHeight > trackEl.clientHeight) {
                e.preventDefault();
                trackEl.scrollBy({
                    top: e.deltaY * 0.8,
                    behavior: 'smooth'
                });
            }
        }, { passive: false });

        // Day tabs wheel scroll
        dayTabsEl.addEventListener('wheel', (e) => {
            if (dayTabsEl.scrollWidth > dayTabsEl.clientWidth) {
                e.preventDefault();
                dayTabsEl.scrollBy({
                    left: e.deltaY * 0.6,
                    behavior: 'smooth'
                });
            }
        }, { passive: false });

        // Touch swipe support for day tabs (horizontal)
        dayTabsEl.addEventListener('touchstart', (e) => {
            window.activitySwipeState.touchStartX = e.touches[0].clientX;
            window.activitySwipeState.touchStartY = e.touches[0].clientY;
            window.activitySwipeState.isSwiping = true;
            dayTabsEl.classList.add('grabbing');
        }, { passive: true });

        dayTabsEl.addEventListener('touchmove', (e) => {
            if (!window.activitySwipeState.isSwiping) return;
            const diffX = window.activitySwipeState.touchStartX - e.touches[0].clientX;
            if (Math.abs(diffX) > 5) {
                dayTabsEl.scrollBy({
                    left: diffX * 0.3,
                    behavior: 'auto'
                });
            }
        }, { passive: true });

        dayTabsEl.addEventListener('touchend', () => {
            window.activitySwipeState.isSwiping = false;
            dayTabsEl.classList.remove('grabbing');
        }, { passive: true });

        // Touch swipe support for activities (vertical scroll)
        trackEl.addEventListener('touchstart', (e) => {
            window.activitySwipeState.touchStartY = e.touches[0].clientY;
            window.activitySwipeState.touchStartX = e.touches[0].clientX;
            trackEl.classList.add('grabbing');
        }, { passive: true });

        trackEl.addEventListener('touchmove', (e) => {
            const diffY = window.activitySwipeState.touchStartY - e.touches[0].clientY;
            const diffX = window.activitySwipeState.touchStartX - e.touches[0].clientX;
            if (Math.abs(diffY) > Math.abs(diffX)) {
                trackEl.scrollBy({
                    top: diffY * 0.5,
                    behavior: 'auto'
                });
            }
        }, { passive: true });

        trackEl.addEventListener('touchend', () => {
            trackEl.classList.remove('grabbing');
        }, { passive: true });
    }

    // --- GLOBAL TREND STATE ---
    window._trendPeriod = 30;
    window._trendDataFull = [];
    // ═══ Saldo-Trend Chart: zentrale Defaults (Backward-Compat + neue Optionen) ═══
    var TREND_CHART_DEFAULTS = {
        type: 'area-smooth',
        color: 'var(--primary)',
        animation: true,
        animSpeed: 2000,      // ms – Dauer der Line-Draw/Bar-Grow-Animation
        gradient: true,       // Flächen-Füllung bei area-Typen
        glow: true,
        glowIntensity: 6,     // px – Stärke des Glow/Neon-Scheins
        rainbow: false,       // animierter Regenbogen-Verlauf auf der Linie
        blur: false,          // weichgezeichnete („dreamy") Flächenfüllung
        dots: false,          // sichtbare Datenpunkte
        marker: true,         // pulsierender Punkt am aktuellen Wert
        grid: true,           // horizontales Gitternetz
        zeroLine: true,       // Nulllinie
        lineWidth: 2.5,       // Linienstärke
        lineStyle: 'solid'    // solid | dashed | dotted
    };

    function renderTrend(dataPoints, elementId, areaFill = true, chartStyle = null, allEntries = null) {
        const c = document.getElementById(elementId);
        if(!c) return;
        const w = c.clientWidth || 400; // read before any DOM writes to avoid forced reflow
        
        // Support legacy numeric arrays (from chart preview etc.)
        const isRichData = dataPoints.length > 0 && typeof dataPoints[0] === 'object';
        
        if (isRichData) {
            window._trendDataFull = dataPoints;
        }
        
        // ─── LEERER ZUSTAND ──────────────────────────────────────────
        // Vorher stand hier ein grauer Satz in der Mitte einer 300 px
        // hohen Leerflaeche. Ein leeres Diagramm ist die Stelle, an der
        // am meisten Platz und die geringste Ablenkung herrscht — es
        // sagt jetzt, was es zeigen WIRD und wie man dahin kommt.
        // Die Kennzahlenleiste zeigt sonst drei Gedankenstriche ueber
        // einem leeren Diagramm — eine Tabelle ohne Inhalt, die den
        // leeren Zustand nur unruhiger macht.
        const statsBar = document.getElementById('trendStatsBar');
        if (statsBar) statsBar.style.display = dataPoints.length < 2 ? 'none' : '';

        if (dataPoints.length < 2) {
            const en = document.documentElement.lang === 'en';
            const braucht = dataPoints.length === 1;
            c.innerHTML =
                '<div class="chart-empty">' +
                  '<svg class="chart-empty__art" viewBox="0 0 120 48" fill="none" aria-hidden="true">' +
                    '<path d="M2 40 L26 30 L50 34 L74 18 L98 22 L118 8" stroke="currentColor" stroke-width="2" ' +
                      'stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 6" opacity="0.45"/>' +
                    '<circle cx="118" cy="8" r="3.5" fill="currentColor" opacity="0.6"/>' +
                  '</svg>' +
                  '<p class="chart-empty__title">' +
                    (braucht
                      ? (en ? 'One more entry and the curve starts' : 'Noch ein Eintrag, dann beginnt die Kurve')
                      : (en ? 'Your flexitime balance over time' : 'Dein Gleitzeit-Saldo im Verlauf')) +
                  '</p>' +
                  '<p class="chart-empty__text">' +
                    (en ? 'Two booked days are enough to draw the first line.'
                        : 'Zwei erfasste Tage genügen für die erste Linie.') +
                  '</p>' +
                  '<button type="button" class="chart-empty__btn" onclick="focusEntryForm()">' +
                    (en ? 'Record a day' : 'Tag erfassen') +
                  '</button>' +
                '</div>';
            return;
        }
        
        // Lade oder nutze Default-Style
        if (!chartStyle) {
            const saved = localStorage.getItem('mwl_chart_style');
            chartStyle = saved ? JSON.parse(saved) : {};
        }
        // Fehlende Keys mit Defaults auffüllen (alte gespeicherte Styles + neue Optionen)
        chartStyle = Object.assign({}, TREND_CHART_DEFAULTS, chartStyle);
        
        // Slice by period for rich data, else last 30
        let subset;
        if (isRichData) {
            const period = (window._trendPeriod !== undefined && window._trendPeriod !== null) ? window._trendPeriod : 30;
            if (period === 0) {
                // "Alle" — use all data points, but thin out if too many for readability
                if (dataPoints.length > 120) {
                    // Aggregate: keep every Nth point + always first & last
                    const step = Math.ceil(dataPoints.length / 120);
                    subset = dataPoints.filter((_, i) => i === 0 || i === dataPoints.length - 1 || i % step === 0);
                } else {
                    subset = dataPoints;
                }
            } else {
                subset = dataPoints.slice(-period);
            }
        } else {
            subset = dataPoints.slice(-30);
        }
        
        const vals = isRichData ? subset.map(d => d.total) : subset;
        const diffs = isRichData ? subset.map(d => d.diff) : [];
        const max = Math.max(...vals);
        const min = Math.min(...vals);
        const range = max - min || 1;
        
        // ============ STATS BAR ============
        if (isRichData && elementId === 'trendChart') {
            const highest = max;
            const lowest = min;
            
            // Icon-Helper: Lucide-Style SVG statt Emoji (farbcodiert)
            const TREND_C = { up:'#10b981', down:'#ef4444', flat:'#94a3b8', low:'#10b981', mid:'#f59e0b', high:'#ef4444' };
            const svgIcon = (d, color) => '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:5px;flex-shrink:0">' + d + '</svg>';
            const ICON_UP = '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>';
            const ICON_DOWN = '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>';
            const ICON_FLAT = '<line x1="2" y1="12" x2="22" y2="12"/><polyline points="18 8 22 12 18 16"/><polyline points="6 8 2 12 6 16"/>';
            const ICON_PULSE = '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>';

            // Trend direction: compare last 7 vs previous 7
            let dirIcon = '', dirLabel = '—';
            if (vals.length >= 14) {
                const recent7 = vals.slice(-7);
                const prev7 = vals.slice(-14, -7);
                const recentAvg = recent7.reduce((s,v)=>s+v,0)/7;
                const prevAvg = prev7.reduce((s,v)=>s+v,0)/7;
                const delta = recentAvg - prevAvg;
                if (delta > 1) { dirIcon = svgIcon(ICON_UP, TREND_C.up); dirLabel = 'Steigend'; }
                else if (delta > 0.2) { dirIcon = svgIcon(ICON_UP, TREND_C.up); dirLabel = 'Leicht ↑'; }
                else if (delta < -1) { dirIcon = svgIcon(ICON_DOWN, TREND_C.down); dirLabel = 'Fallend'; }
                else if (delta < -0.2) { dirIcon = svgIcon(ICON_DOWN, TREND_C.down); dirLabel = 'Leicht ↓'; }
                else { dirIcon = svgIcon(ICON_FLAT, TREND_C.flat); dirLabel = 'Stabil'; }
            } else if (vals.length >= 2) {
                if (vals[vals.length-1] > vals[0]) { dirIcon = svgIcon(ICON_UP, TREND_C.up); dirLabel = 'Positiv'; }
                else { dirIcon = svgIcon(ICON_DOWN, TREND_C.down); dirLabel = 'Negativ'; }
            }

            // Volatilitaet und "Ø Täglich" sind entfallen: die Leiste hatte
            // sechs gleichrangige Spalten, von denen "Aktuell" den Gleitzeit-
            // Wert der KPI-Zeile wiederholte und die Standardabweichung der
            // Tagesdifferenzen fuer einen Azubi keine Entscheidung stuetzt.
            // Geblieben ist, was den Verlauf DANEBEN einordnet: Spanne
            // (Hoch/Tief) und Richtung.

            const statEl = (id, text, colorClass) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = text;
                    el.className = 'trend-stat-value' + (colorClass ? ' ' + colorClass : '');
                }
            };
            const statElHTML = (id, html) => {
                const el = document.getElementById(id);
                if (el) {
                    el.innerHTML = html; // nur interne Literale (SVG + fixe Labels), kein User-Input
                    el.className = 'trend-stat-value';
                }
            };
            statEl('trendStatHigh', '+' + highest.toFixed(1) + 'h', 'trend-stat-positive');
            statEl('trendStatLow', (lowest >= 0 ? '+' : '') + lowest.toFixed(1) + 'h', lowest < 0 ? 'trend-stat-negative' : '');
            statElHTML('trendStatDirection', dirIcon + dirLabel);
        }
        
        const h = 220;
        const padTop = 15, padBot = 15, padLeft = 0, padRight = 0;
        const chartH = h - padTop - padBot;
        const chartW = w - padLeft - padRight;
        
        // ============ Y-AXIS LABELS ============
        if (elementId === 'trendChart') {
            const yAxis = document.getElementById('trendYAxis');
            if (yAxis) {
                const steps = 5;
                let yHtml = '';
                for (let i = 0; i <= steps; i++) {
                    const val = max - (i / steps) * range;
                    const color = val >= 0 ? 'var(--success)' : 'var(--danger)';
                    yHtml += `<span style="color:${color}; white-space:nowrap;">${val >= 0 ? '+' : ''}${val.toFixed(1)}</span>`;
                }
                yAxis.innerHTML = yHtml;
                yAxis.style.height = h + 'px';
            }
        }
        
        // ============ X-AXIS LABELS ============
        if (isRichData && elementId === 'trendChart') {
            const xAxis = document.getElementById('trendXAxis');
            if (xAxis) {
                const firstDate = new Date(subset[0].date);
                const lastDate = new Date(subset[subset.length - 1].date);
                const spanDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
                
                // Adaptive format based on time span
                let dateFormat;
                if (spanDays > 365) {
                    dateFormat = { month: 'short', year: '2-digit' }; // "Jan 25"
                } else if (spanDays > 90) {
                    dateFormat = { day: '2-digit', month: 'short' }; // "14. Jan"
                } else {
                    dateFormat = { day: '2-digit', month: '2-digit' }; // "14.01"
                }
                
                const maxLabels = Math.min(subset.length, spanDays > 180 ? 6 : 8);
                const step = Math.max(1, Math.floor(subset.length / maxLabels));
                let xHtml = '';
                let lastLabel = '';
                for (let i = 0; i < subset.length; i += step) {
                    const d = new Date(subset[i].date);
                    const label = d.toLocaleDateString(mwlLocale(), dateFormat);
                    if (label !== lastLabel) {
                        xHtml += `<span>${label}</span>`;
                        lastLabel = label;
                    }
                }
                // Always show last date
                const lastLabel2 = lastDate.toLocaleDateString(mwlLocale(), dateFormat);
                if (lastLabel !== lastLabel2) {
                    xHtml += `<span>${lastLabel2}</span>`;
                }
                xAxis.innerHTML = xHtml;
            }
        }
        
        // ============ BUILD SVG ============
        const getX = (i) => padLeft + (i / (vals.length - 1)) * chartW;
        const getY = (val) => padTop + (1 - (val - min) / range) * chartH;
        
        // Zero line (zeroLineY wird für Gradient-Clipping IMMER berechnet,
        // aber nur gezeichnet wenn der Toggle an ist)
        let zeroLineY = null;
        let zeroLineHtml = '';
        if (min < 0 && max > 0) {
            zeroLineY = getY(0);
            if (chartStyle.zeroLine !== false) {
                zeroLineHtml = `<line x1="0" y1="${zeroLineY}" x2="${w}" y2="${zeroLineY}" class="trend-zero-line" />
                    <text x="${w - 4}" y="${zeroLineY - 4}" fill="rgba(255,255,255,0.25)" font-size="9" text-anchor="end" font-family="var(--font-mono)">0h</text>`;
            }
        }

        // Grid lines (horizontal)
        let gridHtml = '';
        if (chartStyle.grid !== false) {
            const gridSteps = 5;
            for (let i = 0; i <= gridSteps; i++) {
                const gy = padTop + (i / gridSteps) * chartH;
                gridHtml += `<line x1="0" y1="${gy}" x2="${w}" y2="${gy}" stroke="rgba(255,255,255,0.04)" stroke-width="1" />`;
            }
        }
        
        // Build path
        let path = '';
        vals.forEach((val, i) => {
            const x = getX(i);
            const y = getY(val);
            path += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
        });
        
        // Smooth path (bezier curves)
        let smoothPath = '';
        const isSmooth = chartStyle.type.includes('smooth');
        if (isSmooth) {
            for (let i = 0; i < vals.length; i++) {
                const x = getX(i);
                const y = getY(vals[i]);
                if (i === 0) {
                    smoothPath += `M ${x.toFixed(1)} ${y.toFixed(1)} `;
                } else {
                    const x0 = getX(i - 1);
                    const y0 = getY(vals[i - 1]);
                    const cp1x = (x0 + x) / 2;
                    const cp1y = y0;
                    const cp2x = (x0 + x) / 2;
                    const cp2y = y;
                    smoothPath += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)} `;
                }
            }
        }
        
        const linePath = smoothPath || path;
        // Resolve actual hex color (read computed --primary if using theme color)
        let colorHex;
        if (chartStyle.color.includes('var')) {
            const computedPrimary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#a855f7';
            const hex = computedPrimary.startsWith('#') ? computedPrimary : '#a855f7';
            const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
            colorHex = `rgb(${r}, ${g}, ${b})`;
        } else {
            colorHex = chartStyle.color;
        }
        const strokeColor = chartStyle.color.includes('var') ? 'var(--primary)' : chartStyle.color;
        
        // ============ DEFS (Filter + Gradienten) zentral aufbauen ============
        const isAreaType = chartStyle.type.includes('area');
        const showArea = isAreaType && chartStyle.gradient !== false;
        let defsInner = '';

        // Weichzeichner für „dreamy" Flächenfüllung
        if (chartStyle.blur) {
            defsInner += `<filter id="softblur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5" /></filter>`;
        }
        // Animierter Regenbogen-Verlauf für die Linie
        if (chartStyle.rainbow) {
            defsInner += `<linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ef4444"/><stop offset="25%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#10b981"/><stop offset="75%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#a855f7"/></linearGradient>`;
        }

        // ============ FLÄCHEN-FÜLLUNG ============
        let areaHtml = '';
        const blurAttr = chartStyle.blur ? ' filter="url(#softblur)"' : '';
        if (showArea) {
            const closedPath = linePath + `L ${getX(vals.length - 1).toFixed(1)} ${h} L ${getX(0).toFixed(1)} ${h} Z`;
            if (zeroLineY !== null && isRichData) {
                // Dual-Gradient: grün über Null, rot darunter
                defsInner += `<linearGradient id="gradPos" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#10b981;stop-opacity:0.25" /><stop offset="100%" style="stop-color:#10b981;stop-opacity:0.02" /></linearGradient>`
                    + `<linearGradient id="gradNeg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#ef4444;stop-opacity:0.02" /><stop offset="100%" style="stop-color:#ef4444;stop-opacity:0.25" /></linearGradient>`
                    + `<clipPath id="clipAbove"><rect x="0" y="0" width="${w}" height="${zeroLineY}" /></clipPath>`
                    + `<clipPath id="clipBelow"><rect x="0" y="${zeroLineY}" width="${w}" height="${h - zeroLineY}" /></clipPath>`;
                areaHtml = `<path d="${closedPath}" fill="url(#gradPos)" clip-path="url(#clipAbove)"${blurAttr} />`
                    + `<path d="${closedPath}" fill="url(#gradNeg)" clip-path="url(#clipBelow)"${blurAttr} />`;
            } else {
                defsInner += `<linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:${colorHex};stop-opacity:0.3" /><stop offset="100%" style="stop-color:${colorHex};stop-opacity:0" /></linearGradient>`;
                areaHtml = `<path d="${closedPath}" fill="url(#grad)"${blurAttr} />`;
            }
        }

        const defs = defsInner ? `<defs>${defsInner}</defs>` : '';
        
        // ============ Gemeinsame Linien-/Effekt-Parameter ============
        const animSpeed = chartStyle.animSpeed || 2000;
        const glowRad = chartStyle.glowIntensity || 6;
        const lineWidthVal = (typeof chartStyle.lineWidth === 'number' ? chartStyle.lineWidth : (chartStyle.type === 'line' ? 3 : 2.5));
        const dashMap = { solid: '', dashed: '8 6', dotted: '1 7' };
        const dashArr = dashMap[chartStyle.lineStyle] || '';
        const isSolidLine = !dashArr;

        // Datenpunkte – nur wenn aktiviert (dots-Toggle)
        let dotsHtml = '';
        if (chartStyle.dots && chartStyle.type !== 'bar') {
            const dotColor = chartStyle.rainbow ? 'url(#rainbowGrad)' : strokeColor;
            vals.forEach((val, i) => {
                dotsHtml += `<circle cx="${getX(i).toFixed(1)}" cy="${getY(val).toFixed(1)}" r="3" fill="${dotColor}" opacity="0.85" class="trend-dot-hover" data-idx="${i}" style="transition: all 0.15s ease;" />`;
            });
        }

        // Linien-Stroke, Glow, Animationen + Strich-Stil
        const lineStroke = chartStyle.rainbow ? 'url(#rainbowGrad)' : strokeColor;
        const glowFilter = (chartStyle.glow && !chartStyle.rainbow) ? `filter: drop-shadow(0 0 ${glowRad}px ${colorHex}) drop-shadow(0 0 ${(glowRad / 2).toFixed(1)}px ${colorHex});` : '';
        const lineAnims = [];
        if (chartStyle.animation) lineAnims.push(isSolidLine ? `drawLine ${animSpeed}ms ease-in-out forwards` : `fadeIn ${animSpeed}ms ease forwards`);
        if (chartStyle.rainbow) lineAnims.push('rainbowShift 3s linear infinite');
        const lineAnimCss = lineAnims.length ? `animation: ${lineAnims.join(', ')};` : '';
        const dashAttr = dashArr ? ` stroke-dasharray="${dashArr}"` : '';

        // ============ BAR CHART MODE ============
        let barHtml = '';
        if (chartStyle.type === 'bar') {
            const barGap = 2;
            const barWidth = Math.max(2, (chartW / vals.length) - barGap);
            const baseY = zeroLineY !== null ? zeroLineY : (padTop + chartH);
            const barAnimDur = chartStyle.animation ? Math.max(200, (animSpeed / 4) | 0) : 0;
            vals.forEach((val, i) => {
                const x = padLeft + (i / vals.length) * chartW + barGap / 2;
                const y = getY(val);
                const barColor = chartStyle.rainbow ? 'url(#rainbowGrad)' : colorHex;
                const barTop = Math.min(y, baseY);
                const barH = Math.max(1, Math.abs(y - baseY));
                const glowStyle = (chartStyle.glow && !chartStyle.rainbow) ? `filter: drop-shadow(0 0 ${(glowRad / 2).toFixed(1)}px ${colorHex});` : '';
                const barAnim = barAnimDur ? `transform-origin: ${x.toFixed(1)}px ${baseY.toFixed(1)}px; animation: barGrow ${barAnimDur}ms ease-out both; animation-delay: ${i * 12}ms;` : '';
                barHtml += `<rect x="${x.toFixed(1)}" y="${barTop.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" fill="${barColor}" opacity="0.85" rx="2" style="${glowStyle} ${barAnim}" data-idx="${i}" />`;
            });
        }

        // ============ HAUPTLINIE ============
        const mainLine = chartStyle.type === 'bar' ? '' : `<path d="${linePath}" class="trend-line" stroke="${lineStroke}" stroke-width="${lineWidthVal}" fill="none" stroke-linecap="round" stroke-linejoin="round"${dashAttr} style="${lineAnimCss} ${glowFilter}" />`;

        // Crosshair elements (updated on hover via JS)
        const crosshairHtml = `<line id="trendCrossV" class="trend-crosshair" x1="0" y1="0" x2="0" y2="${h}" style="display:none;" />
            <line id="trendCrossH" class="trend-crosshair" x1="0" y1="0" x2="${w}" y2="0" style="display:none;" />`;

        // Aktueller-Wert-Marker (pulsierend) – nur wenn aktiviert (marker-Toggle)
        const lastX = getX(vals.length - 1);
        const lastY = getY(vals[vals.length - 1]);
        const lastColor = vals[vals.length - 1] >= 0 ? '#10b981' : '#ef4444';
        // Moderner „Live"-Marker: ruhiger Solid-Dot mit weichem Glow + ein einzelner,
        // sanft auslaufender Radar-Ping (statt des unruhigen Doppel-Pulses).
        const currentMarker = (chartStyle.type === 'bar' || chartStyle.marker === false) ? '' : `
            <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="4" fill="none" stroke="${lastColor}" stroke-width="1.5" class="trend-marker-ping" />
            <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" fill="${lastColor}" style="filter: drop-shadow(0 0 4px ${lastColor});" />
            <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="1.4" fill="#fff" opacity="0.9" />`;
        
        // Disconnect stale ResizeObserver before overwriting innerHTML
        if (c._trendResizeObserver) { c._trendResizeObserver.disconnect(); c._trendResizeObserver = null; }

        const svgOverflow = chartStyle.type === 'bar' ? 'overflow:hidden;' : '';
        c.innerHTML = `
            <svg class="trend-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%; height:100%; ${svgOverflow}" id="trendSvgMain">
                ${defs}
                ${gridHtml}
                ${zeroLineHtml}
                ${chartStyle.type === 'bar' ? '' : areaHtml}
                ${barHtml}
                ${mainLine}
                ${chartStyle.type === 'bar' ? '' : dotsHtml}
                ${crosshairHtml}
                ${currentMarker}
            </svg>
        `;
        
        // ============ HOVER TOOLTIP INTERACTION ============
        if (isRichData && elementId === 'trendChart') {
            const svg = document.getElementById('trendSvgMain');
            const tooltip = document.getElementById('trendTooltip');
            const crossV = document.getElementById('trendCrossV');
            const crossH = document.getElementById('trendCrossH');
            
            if (svg && tooltip) {
                const showTooltip = (idx) => {
                    if (idx < 0 || idx >= subset.length) return;
                    const dp = subset[idx];
                    const val = vals[idx];
                    const x = getX(idx);
                    const y = getY(val);
                    
                    const d = new Date(dp.date);
                    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                    const dateStr = dayNames[d.getDay()] + ', ' + d.toLocaleDateString(mwlLocale(), { day: '2-digit', month: 'long', year: 'numeric' });
                    const typeIcon  = (typeof getTypeIconHTML === 'function') ? getTypeIconHTML(dp.type, 13) : '';
                    const typeName  = (typeof getTypeLabel === 'function') ? getTypeLabel(dp.type) : dp.type;

                    // Streak info
                    let streak = 0;
                    const isPos = dp.diff >= 0;
                    for (let j = idx; j >= 0; j--) {
                        if ((subset[j].diff >= 0) === isPos) streak++;
                        else break;
                    }
                    
                    tooltip.innerHTML = `
                        <div class="tt-date">${dateStr}</div>
                        <div class="tt-row"><span class="tt-label">Saldo</span><span class="tt-val ${val >= 0 ? 'tt-positive' : 'tt-negative'}">${val >= 0 ? '+' : ''}${val.toFixed(2)}h</span></div>
                        <div class="tt-row"><span class="tt-label">Tages-Diff</span><span class="tt-val ${dp.diff >= 0 ? 'tt-positive' : 'tt-negative'}">${dp.diff >= 0 ? '+' : ''}${dp.diff.toFixed(2)}h</span></div>
                        <div class="tt-row"><span class="tt-label">Gearbeitet</span><span class="tt-val">${dp.worked.toFixed(1)}h</span></div>
                        <div class="tt-row"><span class="tt-label">Streak</span><span class="tt-val">${streak}× ${isPos ? TT_ICON_OK : TT_ICON_WARN}</span></div>
                        <div style="margin-top:4px;"><span class="tt-type-badge" style="--type-rgb:${(typeof getTypeRgb === 'function') ? getTypeRgb(dp.type) : 'var(--primary-rgb)'}">${typeIcon} ${esc(typeName)}</span></div>
                    `;
                    
                    // Position tooltip
                    const chartRect = c.getBoundingClientRect();
                    const tooltipW = 200;
                    let left = (x / w) * chartRect.width;
                    if (left + tooltipW > chartRect.width) left = left - tooltipW - 10;
                    else left += 15;
                    let top = (y / h) * chartRect.height - 80;
                    if (top < 0) top = 10;
                    
                    tooltip.style.display = 'block';
                    tooltip.style.transform = `translate(${left}px, ${top}px)`;
                    
                    // Crosshair
                    if (crossV) { crossV.style.display = 'block'; crossV.setAttribute('x1', x); crossV.setAttribute('x2', x); }
                    if (crossH) { crossH.style.display = 'block'; crossH.setAttribute('y1', y); crossH.setAttribute('y2', y); }
                    
                    // Highlight dot
                    svg.querySelectorAll('.trend-dot-hover').forEach(dot => {
                        if (parseInt(dot.dataset.idx) === idx) {
                            dot.setAttribute('r', '6');
                            dot.setAttribute('opacity', '1');
                        } else {
                            dot.setAttribute('r', '3');
                            dot.setAttribute('opacity', '0.7');
                        }
                    });
                };
                
                const hideTooltip = () => {
                    tooltip.style.display = 'none';
                    if (crossV) crossV.style.display = 'none';
                    if (crossH) crossH.style.display = 'none';
                    svg.querySelectorAll('.trend-dot-hover').forEach(dot => {
                        dot.setAttribute('r', '3');
                        dot.setAttribute('opacity', '0.7');
                    });
                };
                
                svg.addEventListener('mousemove', (e) => {
                    const rect = svg.getBoundingClientRect();
                    const mouseX = (e.clientX - rect.left) / rect.width * w;
                    // find nearest data point
                    let nearest = 0;
                    let nearestDist = Infinity;
                    for (let i = 0; i < vals.length; i++) {
                        const dist = Math.abs(getX(i) - mouseX);
                        if (dist < nearestDist) { nearestDist = dist; nearest = i; }
                    }
                    showTooltip(nearest);
                });
                
                svg.addEventListener('mouseleave', hideTooltip);
                
                // Touch support
                svg.addEventListener('touchstart', (e) => {
                    const touch = e.touches[0];
                    const rect = svg.getBoundingClientRect();
                    const mouseX = (touch.clientX - rect.left) / rect.width * w;
                    let nearest = 0;
                    let nearestDist = Infinity;
                    for (let i = 0; i < vals.length; i++) {
                        const dist = Math.abs(getX(i) - mouseX);
                        if (dist < nearestDist) { nearestDist = dist; nearest = i; }
                    }
                    showTooltip(nearest);
                }, { passive: true });
                svg.addEventListener('touchend', () => setTimeout(hideTooltip, 2000), { passive: true });
            }
        }

        // Re-render when container resizes (fullscreen toggle, sidebar collapse, etc.)
        if (typeof ResizeObserver !== 'undefined') {
            let _lastW = w;
            let _renderTimeout = null;
            const _ro = new ResizeObserver(() => {
                const newW = c.clientWidth;
                if (Math.abs(newW - _lastW) > 2) {
                    _lastW = newW;
                    // Debounce to prevent infinite loop
                    clearTimeout(_renderTimeout);
                    _renderTimeout = setTimeout(() => {
                        renderTrend(
                            window._trendDataFull && window._trendDataFull.length ? window._trendDataFull : dataPoints,
                            elementId, areaFill, chartStyle
                        );
                    }, 100);
                }
            });
            _ro.observe(c);
            c._trendResizeObserver = _ro;
        }
    }

    function generateSmoothPath(dataPoints, subset, min, range, w, h) {
        let path = '';
        for (let i = 0; i < subset.length; i++) {
            const x = (i / (subset.length - 1)) * w;
            const y = h - ((subset[i] - min) / range * (h - 40)) - 20;
            
            if (i === 0) {
                path += `M ${x} ${y} `;
            } else {
                const x0 = ((i - 1) / (subset.length - 1)) * w;
                const y0 = h - ((subset[i - 1] - min) / range * (h - 40)) - 20;
                const cp1x = (x0 + x) / 2;
                const cp1y = y0;
                const cp2x = (x0 + x) / 2;
                const cp2y = y;
                path += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y} `;
            }
        }
        return path;
    }
    
    function generateBarChart(subset, min, range, w, h, color) {
        const barWidth = Math.max(2, w / subset.length - 1);
        let bars = '';
        subset.forEach((val, i) => {
            const x = (i / subset.length) * w;
            const barHeight = ((val - min) / range * (h - 40));
            const y = h - barHeight - 20;
            bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" opacity="0.8" style="animation: barGrow 0.6s ease-out both; animation-delay: ${i * 20}ms;" rx="2" />`;
        });
        return bars;
    }
    function setupChartModalButtons(currentStyle) {
        const chartTypes = [
            {id: 'line', label: 'Linie', icon: '📈'},
            {id: 'area', label: 'Fläche', icon: '📊'},
            {id: 'area-smooth', label: 'Smooth', icon: '🌊'},
            {id: 'bar', label: 'Balken', icon: '📦'}
        ];
        
        // Get current website accent color hex
        const computedPrimary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#a855f7';
        
        const colors = [
            {value: 'var(--primary)', hex: computedPrimary, label: 'Website-Farbe (' + computedPrimary + ')', isTheme: true},
            {value: '#a78bfa', hex: '#a78bfa', label: 'Lila-Hell'},
            {value: '#a855f7', hex: '#a855f7', label: 'Lila'},
            {value: '#8b5cf6', hex: '#8b5cf6', label: 'Indigo'},
            {value: '#7c3aed', hex: '#7c3aed', label: 'Violett'},
            {value: '#6366f1', hex: '#6366f1', label: 'Indigo-Hell'},
            {value: '#4f46e5', hex: '#4f46e5', label: 'Deep Indigo'},
            {value: '#0ea5e9', hex: '#0ea5e9', label: 'Sky Blue'},
            {value: '#00b4d8', hex: '#00b4d8', label: 'Steel Blue'},
            {value: '#60a5fa', hex: '#60a5fa', label: 'Blau-Hell'},
            {value: '#3b82f6', hex: '#3b82f6', label: 'Blau'},
            {value: '#06b6d4', hex: '#06b6d4', label: 'Cyan'},
            {value: '#22d3ee', hex: '#22d3ee', label: 'Cyan-Hell'},
            {value: '#00d9ff', hex: '#00d9ff', label: 'Aqua'},
            {value: '#10b981', hex: '#10b981', label: 'Grün'},
            {value: '#34d399', hex: '#34d399', label: 'Grün-Hell'},
            {value: '#06d6a0', hex: '#06d6a0', label: 'Mint'},
            {value: '#84cc16', hex: '#84cc16', label: 'Limette'},
            {value: '#fbbf24', hex: '#fbbf24', label: 'Gelb'},
            {value: '#eab308', hex: '#eab308', label: 'Gelb-Hell'},
            {value: '#f59e0b', hex: '#f59e0b', label: 'Gelb-Orange'},
            {value: '#fb923c', hex: '#fb923c', label: 'Orange'},
            {value: '#f97316', hex: '#f97316', label: 'Orange-Hell'},
            {value: '#ef4444', hex: '#ef4444', label: 'Rot'},
            {value: '#f43f5e', hex: '#f43f5e', label: 'Rose'},
            {value: '#ec4899', hex: '#ec4899', label: 'Pink'},
            {value: '#d946ef', hex: '#d946ef', label: 'Fuchsia'},
            {value: '#db2777', hex: '#db2777', label: 'Crimson'},
            {value: '#be185d', hex: '#be185d', label: 'Magenta-Dunkel'},
            {value: '#94a3b8', hex: '#94a3b8', label: 'Grau'},
            {value: '#cbd5e1', hex: '#cbd5e1', label: 'Grau-Hell'},
            {value: '#64748b', hex: '#64748b', label: 'Grau-Dunkel'},
            {value: '#475569', hex: '#475569', label: 'Slate'},
            {value: '#ffffff', hex: '#ffffff', label: 'Weiß'},
        ];
        
        const chartTypeContainer = document.getElementById('chartTypeButtons');
        if (!chartTypeContainer) return;
        
        chartTypeContainer.innerHTML = chartTypes.map(type => {
            const isActive = currentStyle.type === type.id;
            return `<button class="chart-type-btn" data-type="${type.id}" style="display:flex; flex-direction:column; align-items:center; gap:4px; padding:12px 8px; border:1px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}; background:${isActive ? 'rgba(var(--primary-rgb),0.1)' : 'rgba(255,255,255,0.03)'}; border-radius:10px; cursor:pointer; color:${isActive ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:${isActive ? '600' : '500'}; transition:all 0.2s; font-size:0.78rem;" onmouseover="if(!this.classList.contains('active-type'))this.style.background='rgba(255,255,255,0.06)'" onmouseout="if(!this.classList.contains('active-type'))this.style.background='rgba(255,255,255,0.03)'">
                <span style="font-size:1.3rem; line-height:1;">${type.icon}</span>
                <span>${type.label}</span>
            </button>`;
        }).join('');
        
        const colorContainer = document.getElementById('colorButtons');
        if (!colorContainer) return;
        
        // Render theme color button first, then grid of all colors
        const themeColor = colors[0];
        const isThemeActive = currentStyle.color === 'var(--primary)';
        const otherColors = colors.slice(1);
        
        colorContainer.innerHTML = `
            <button style="display:flex; align-items:center; gap:8px; padding:8px 14px; background:${isThemeActive ? 'rgba(var(--primary-rgb),0.12)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${isThemeActive ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}; border-radius:10px; cursor:pointer; transition:all 0.2s; margin-bottom:10px; width:100%;" title="${themeColor.label}" onclick="updateChartStyleFromModal('color', 'var(--primary)'); setupChartModalButtons(window.modalChartStyle);" onmouseover="this.style.background='${isThemeActive ? 'rgba(var(--primary-rgb),0.15)' : 'rgba(255,255,255,0.06)'}'" onmouseout="this.style.background='${isThemeActive ? 'rgba(var(--primary-rgb),0.12)' : 'rgba(255,255,255,0.03)'}'">
                <span style="width:28px; height:28px; border-radius:8px; background:${themeColor.hex}; border:2px solid ${isThemeActive ? '#fff' : 'transparent'}; flex-shrink:0;"></span>
                <span style="font-size:0.8rem; font-weight:${isThemeActive ? '600' : '500'}; color:${isThemeActive ? 'var(--text-main)' : 'var(--text-muted)'};">🎨 Website-Farbe verwenden</span>
                ${isThemeActive ? '<span style="margin-left:auto; font-size:0.7rem; color:var(--primary); font-weight:600;">✓ Aktiv</span>' : ''}
            </button>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); gap:6px;">
                ${otherColors.map(color => {
                    const isActive = currentStyle.color === color.value;
                    return `<button style="width:32px; height:32px; background:${color.hex}; border:2px solid ${isActive ? '#fff' : 'transparent'}; border-radius:8px; cursor:pointer; transition:all 0.2s; opacity:${isActive ? '1' : '0.7'}; outline:${isActive ? '2px solid ' + color.hex : 'none'}; outline-offset:2px;" title="${color.label}" onclick="updateChartStyleFromModal('color', '${color.value}'); setupChartModalButtons(window.modalChartStyle);" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)'" onmouseout="this.style.opacity='${isActive ? '1' : '0.7'}'; this.style.transform='scale(1)'"></button>`;
                }).join('')}
            </div>
        `;
        
        // Chart type click handlers
        const modal = document.getElementById('chartStyleModal');
        if (!modal) return;
        modal.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                updateChartStyleFromModal('type', type);
                setupChartModalButtons(window.modalChartStyle);
            });
        });
    }
    
    function saveChartStyle() {
        if (window.modalChartStyle) {
            localStorage.setItem('mwl_chart_style', JSON.stringify(window.modalChartStyle));
        }
    }
    
    function updateChartStyleFromModal(prop, value) {
        window.modalChartStyle[prop] = value;
        updateChartStylePreview(window.modalChartStyle);
    }
    
    function updateChartStylePreview(style) {
        const preview = document.getElementById('chartPreview');
        if (!preview) return;
        
        // Generiere Beispieldaten
        const exampleData = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 2.9, 2.8, 2.7, 2.6];
        
        // Store globally for saving
        window.modalChartStyle = style;
        renderTrend(exampleData, 'chartPreview', style.type.includes('area'), style);
    }
    function updateDonutStylePreview(style) {
        const preview = document.getElementById('donutPreview');
        if (!preview) return;
        
        // Render a demo donut with 40% work, 30% school, 20% vac, 10% sick
        renderDonutPreview(40, 30, 20, 10, 0, style);
    }
    
    function renderDonutPreview(work, school, vac, sick, holiday, donutStyle = null) {
        if (!donutStyle) {
            const saved = localStorage.getItem('mwl_donut_style');
            donutStyle = saved ? JSON.parse(saved) : {
                strokeWidth: 12,
                glow: true,
                gradient: false,
                rainbow: false,
                animated: true
            };
        }
        
        const total = work + school + vac + sick + holiday || 1;
        const c = 251;
        
        const makeCircle = (val, color) => {
            const dash = (val / total) * c;
            return `<circle cx="50" cy="50" r="40" fill="transparent" stroke="${color}" stroke-width="${donutStyle.strokeWidth}" stroke-dasharray="${dash} ${c}" style="${donutStyle.animated ? 'animation: expandPulse 1.2s ease-out' : ''};${donutStyle.glow ? 'filter: drop-shadow(0 0 6px ' + color + ')' : ''};${donutStyle.rainbow ? 'animation: rainbowShift 3s linear infinite' : ''}"></circle>`;
        };
        
        const previewHtml = `
            <svg width="120" height="120" viewBox="0 0 100 100" style="transform: rotate(-90deg);${donutStyle.rainbow ? 'animation: rainbowShift 3s linear infinite' : ''}">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="${donutStyle.strokeWidth}"></circle>
                ${makeCircle(sick, 'var(--danger)')}
                ${makeCircle(vac, 'var(--success)')}
                ${makeCircle(school, 'var(--school)')}
                ${makeCircle(holiday, 'var(--holiday)')}
                ${makeCircle(work, 'var(--primary)')}
            </svg>
        `;
        
        const previewContainer = document.getElementById('donutPreview');
        if (previewContainer) previewContainer.innerHTML = previewHtml;
    }
    
    function saveDonutStyle() {
        if (window.modalDonutStyle) {
            localStorage.setItem('mwl_donut_style', JSON.stringify(window.modalDonutStyle));
            console.log('✅ Donut style saved!', window.modalDonutStyle);
        }
    }
    
    function renderDonut(work, vac, sick, school, holiday) {
        // Load donut style from localStorage
        const saved = localStorage.getItem('mwl_donut_style');
        const donutStyle = saved ? JSON.parse(saved) : {
            strokeWidth: 12,
            glow: true,
            gradient: false,
            rainbow: false,
            animated: true
        };
        
        const total = work + vac + sick + school + holiday || 1;
        const c = 251;
        
        // Order for clockwise fill: Work -> School -> Vac -> Sick -> Holiday
        const circles = [
            { id: 'donutWork', val: work, color: 'var(--primary)' },
            { id: 'donutSchool', val: school, color: 'var(--school)' },
            { id: 'donutVac', val: vac, color: 'var(--success)' },
            { id: 'donutSick', val: sick, color: 'var(--danger)' },
            { id: 'donutHoliday', val: holiday, color: 'var(--holiday)' }
        ];
        
        let offset = 0;
        circles.forEach((circle, index) => {
            const el = document.getElementById(circle.id);
            if (!el) return;
            
            const dash = (circle.val / total) * c;
            const delay = donutStyle.animated ? (index * 150) : 0;
            
            // Set stroke width immediately
            el.setAttribute('stroke-width', donutStyle.strokeWidth);
            el.setAttribute('stroke-dashoffset', -offset);
            
            // Set glow effect
            if (donutStyle.glow) {
                const colorValue = circle.color.includes('var') ? 'rgb(var(--primary-rgb))' : circle.color;
                el.style.filter = `drop-shadow(0 0 6px ${colorValue})`;
            } else {
                el.style.filter = 'none';
            }
            
            // Set rainbow or normal animation
            if (donutStyle.rainbow) {
                el.style.animation = 'rainbowShift 3s linear infinite';
            } else {
                el.style.animation = 'none';
            }
            
            // Animation: start empty, then fill
            if (donutStyle.animated && !donutStyle.rainbow) {
                el.style.transition = 'none';
                el.setAttribute('stroke-dasharray', `0 ${c}`);
                
                // After a tiny delay, apply transition and animate to final value
                setTimeout(() => {
                    el.style.transition = `stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)`;
                    el.setAttribute('stroke-dasharray', `${dash} ${c}`);
                }, 10 + delay);
            } else {
                // No animation - just set the final value
                el.style.transition = 'none';
                el.setAttribute('stroke-dasharray', `${dash} ${c}`);
            }
            
            offset += dash;
        });
        
        // Apply rainbow to SVG container if enabled
        const svg = document.getElementById('donutSvg');
        if (svg) {
            if (donutStyle.rainbow) {
                svg.style.animation = 'rainbowShift 3s linear infinite';
            } else {
                svg.style.animation = 'none';
            }
        }
    }

    // ═══ MODERN STACKED BAR CHART ═══
    function renderDonutModern(work, vac, sick, school, holiday) {
        // Bar-Chart-Einstellungen laden (Höhe/Radius/Gap/Glow werden via applyBarChartSettings
        // gesetzt; hier interessiert nur Animation an/aus + Tempo)
        var barSettings;
        try {
            barSettings = JSON.parse(localStorage.getItem('mwl_bar_chart_settings') || '{}');
        } catch (e) { barSettings = {}; }
        const animate = barSettings.showAnimation !== false; // Default: an
        const animSpeed = typeof barSettings.animSpeed === 'number' ? barSettings.animSpeed : 800;
        // Hover-Transitions (filter/transform/opacity) bleiben immer erhalten – nur die
        // flex-Fill-Animation wird über den Toggle gesteuert.
        const hoverTrans = 'filter .3s ease, transform .3s ease, opacity .3s ease';
        const transitionCss = 'flex ' + animSpeed + 'ms cubic-bezier(0.34,1.56,0.64,1), ' + hoverTrans;

        // Einheit: Stunden (Default) oder distinkte Tage — steuert nur die ANZEIGE-Formatierung
        const useDays = (typeof data !== 'undefined' && data.settings && data.settings.distributionUnit === 'days');
        const isEN = document.documentElement.lang === 'en';
        // Zahlformat aus der Seitensprache, nicht aus toFixed(): auf der
        // deutschen Seite standen "2077.7" und "65.4%" mit englischem
        // Dezimalpunkt zwischen lauter Komma-Werten.
        const loc  = (typeof mwlLocale === 'function') ? mwlLocale() : (isEN ? 'en-GB' : 'de-DE');
        const nf1  = new Intl.NumberFormat(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        const nf0  = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
        const fmtVal = (v) => useDays ? (nf0.format(v) + (isEN ? ' d' : ' T.')) : (nf1.format(v) + ' h');

        const categories = [
            { id: 'donutWork', val: work, type: 'work' },
            { id: 'donutSchool', val: school, type: 'school' },
            { id: 'donutVac', val: vac, type: 'vacation' },
            { id: 'donutSick', val: sick, type: 'sick' },
            { id: 'donutHoliday', val: holiday, type: 'holiday' }
        ];

        const total = work + vac + sick + school + holiday || 1;

        // Untertitel spiegelt die gewählte Einheit
        const subEl = document.getElementById('donutSubtitle');
        if (subEl) subEl.textContent = useDays ? (isEN ? 'Split by days' : 'Aufteilung in Tagen') : (isEN ? 'Split by hours' : 'Aufteilung in Stunden');

        // ─── KOPFZAHL: GESAMTSUMME ───────────────────────────────────
        // Vorher stand hier der Wert der GROESSTEN Kategorie, beschriftet
        // mit deren Namen. Zwei Probleme:
        //   1. Diese Zahl steht identisch nochmal in der Legende darunter
        //      — dieselbe Information zweimal, an zwei Stellen gepflegt.
        //   2. Bei lauter Nullen liefert das reduce() den LETZTEN Eintrag
        //      (a.val > b.val ist nie wahr), also stand auf einem leeren
        //      Dashboard "0.0 FEIERTAG".
        // Die Summe ist die einzige Groesse, die sonst nirgends auftaucht.
        const sumAll = work + vac + sick + school + holiday;
        const centerEl = document.getElementById('donutCenterValue');
        const centerLabel = document.getElementById('donutCenterLabel');
        if (centerEl) centerEl.textContent = useDays ? nf0.format(sumAll) : nf1.format(sumAll);
        if (centerLabel) centerLabel.textContent = isEN ? 'Total' : 'Gesamt';

        // Animate stacked bar segments
        categories.forEach((cat, index) => {
            const el = document.getElementById(cat.id);
            if (!el) return;

            const percentage = (cat.val / total) * 100;
            const delay = animate ? index * 80 : 0;

            // Keine Prozent-Beschriftung IM Balken mehr: derselbe Wert
            // steht 30 px darunter in der Legende. In einem 32-px-Band
            // mit fuenf Segmenten war er ohnehin nur bei den groessten
            // zwei lesbar — der Balken zeigt jetzt die Verhaeltnisse,
            // die Legende die Zahlen.

            if (animate) {
                // Fill-Animation: sauber von 0 auf Zielwert (kein Rückwärts-Flackern
                // bei Refresh) – Transition erst nach dem Reset aktivieren.
                el.style.transition = 'none';
                el.style.flex = '0 0 0%';
                void el.offsetWidth; // Reflow erzwingen
                setTimeout(() => {
                    el.style.transition = transitionCss;
                    el.style.flex = `0 0 ${percentage}%`;
                }, delay);
            } else {
                // Animation aus: flex-Fill sofort (nur Hover-Transitions aktiv)
                el.style.transition = hoverTrans;
                el.style.flex = `0 0 ${percentage}%`;
            }

            el.dataset.value = cat.val.toFixed(1);
            el.dataset.percent = percentage.toFixed(1);
            el.dataset.type = cat.type;
        });

        // Update legend cards
        categories.forEach(cat => {
            const valEl = document.getElementById(`val-${cat.type}`);
            const pctEl = document.getElementById(`pct-${cat.type}`);
            if (valEl) valEl.textContent = fmtVal(cat.val);
            if (pctEl) pctEl.textContent = nf1.format((cat.val / total) * 100) + ' %';
        });
    }

    // ─── SEGMENT HERVORHEBEN ─────────────────────────────────────────
    // Frueher wurde das aktive Segment mit scaleY(1.3), brightness(1.5)
    // und einem Schlagschatten aufgeblasen. In einem Flaechendiagramm
    // ist das die falsche Richtung: die Flaeche IST die Aussage, und wer
    // sie beim Hovern vergroessert, verfaelscht genau den Vergleich, den
    // der Nutzer gerade anstellt (das Wachsen wurde vom overflow:hidden
    // des Balkens ohnehin abgeschnitten).
    // Jetzt treten die uebrigen Segmente zurueck, das aktive bleibt, wie
    // es ist — Zustand ueber Klassen statt ueber Inline-Styles.
    function highlightDonutSegment(type) {
        var aliasMap = { 'vac': 'vacation' };
        var normalizedType = aliasMap[type] || type;
        var idFallback = { 'work': 'donutWork', 'school': 'donutSchool', 'vacation': 'donutVac', 'sick': 'donutSick', 'holiday': 'donutHoliday' };
        var targetId = idFallback[normalizedType];

        var bar = document.getElementById('donutChartContainer');
        if (bar) bar.classList.add('is-dimmed');

        document.querySelectorAll('.donut-segment').forEach(function (seg) {
            var isMatch = seg.dataset.cat === normalizedType
                       || seg.dataset.type === normalizedType
                       || (targetId && seg.id === targetId);
            seg.classList.toggle('is-active', isMatch);
        });
        document.querySelectorAll('.dist-legend__row').forEach(function (row) {
            row.classList.toggle('is-active', row.dataset.type === normalizedType);
        });
    }

    function clearDonutHighlight() {
        var bar = document.getElementById('donutChartContainer');
        if (bar) bar.classList.remove('is-dimmed');
        document.querySelectorAll('.donut-segment').forEach(function (seg) {
            seg.classList.remove('is-active');
        });
        document.querySelectorAll('.dist-legend__row').forEach(function (row) {
            row.classList.remove('is-active');
        });
    }

    // ========== MEGA ADVANCED EFFECTS ENGINE ==========
    
    function createParticleEffect(x, y, color = 'var(--primary)', count = 8) {
        const container = document.createElement('div');
        container.className = 'particle-container';
        container.style.left = x + 'px';
        container.style.top = y + 'px';
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const angle = (i / count) * Math.PI * 2;
            const tx = Math.cos(angle) * 50;
            const delay = i * 30;
            
            particle.style.cssText = `
                position: absolute;
                width: 8px;
                height: 8px;
                background: ${color.includes('var') ? 'var(--primary)' : color};
                border-radius: 50%;
                left: 0;
                top: 0;
                --tx: ${tx}px;
                animation: particleFloat 0.8s ease-out ${delay}ms forwards;
                box-shadow: 0 0 8px ${color.includes('var') ? 'var(--primary)' : color};
            `;
            container.appendChild(particle);
        }
        
        document.body.appendChild(container);
        setTimeout(() => container.remove(), 1200);
    }
    
    function createExplosion(x, y, color = 'var(--primary)') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('width', '100');
        svg.setAttribute('height', '100');
        svg.style.cssText = `
            position: fixed;
            left: ${x - 50}px;
            top: ${y - 50}px;
            pointer-events: none;
            z-index: 9999;
        `;
        
        const actualColor = color.includes('var') ? 'rgb(var(--primary-rgb))' : color;
        
        for (let i = 0; i < 12; i++) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '50');
            circle.setAttribute('cy', '50');
            circle.setAttribute('r', '3');
            circle.setAttribute('fill', actualColor);
            circle.style.animation = `expandPulse 0.8s ease-out ${i * 30}ms forwards`;
            svg.appendChild(circle);
        }
        
        document.body.appendChild(svg);
        setTimeout(() => svg.remove(), 1000);
    }
    
    function createConfetti(x, y, count = 15) {
        const colors = ['var(--primary)', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
        for (let i = 0; i < count; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const confetti = document.createElement('div');
            const rotation = Math.random() * 360;
            const delay = i * 20;
            
            confetti.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: 10px;
                height: 10px;
                background: ${color.includes('var') ? 'var(--primary)' : color};
                pointer-events: none;
                z-index: 9999;
                transform: rotate(${rotation}deg);
                animation: floatUp 1s ease-out ${delay}ms forwards;
            `;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 1500);
        }
    }
    
    function addShakeEffect(element, duration = 400) {
        element.classList.add('effect-shake');
        setTimeout(() => element.classList.remove('effect-shake'), duration);
    }
    
    function addBounceEffect(element, duration = 600) {
        element.classList.add('effect-bounce');
        setTimeout(() => element.classList.remove('effect-bounce'), duration);
    }
    
    function addGlowEffect(element, color = 'var(--primary)', duration = 800) {
        const originalStyle = element.style.filter;
        const actualColor = color.includes('var') ? 'rgb(var(--primary-rgb))' : color;
        element.style.filter = `drop-shadow(0 0 8px ${actualColor}) drop-shadow(0 0 16px rgba(var(--primary-rgb), 0.6))`;
        setTimeout(() => {
            element.style.filter = originalStyle || '';
        }, duration);
    }
    
    function addRainbowEffect(element, duration = 3000) {
        element.style.animation = `rainbowShift ${duration}ms linear`;
        setTimeout(() => {
            element.style.animation = '';
        }, duration);
    }
    
    function attachChartEffects(elementId, effectConfig = {}) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Click effects removed (no explosion animation)
        // Hover effects removed (no purple glow)
    }
    
    function enhanceChartsWithEffects(config = {}) {
        const charts = ['trendChart', 'chartMonthlyTrend', 'chartWeeklyPerformance', 'chartProductivityByDay'];
        charts.forEach(id => {
            attachChartEffects(id, config);
        });
    }
    
    // ========== END ADVANCED EFFECTS ENGINE ==========

    // NEU: Berechnung der Deep Performance Metriken
    function calculateDeepPerformanceMetrics(entries) {
        const workEntries = entries.filter(e => e.type === 'work' && e.worked > 0);
        let totalFocusHours = 0;
        let focusCount = 0;

        // 1. Ø Arbeitsbeginn — nur der FRÜHESTE Start je Arbeitstag (pro Job) zählt.
        // Sonst verfälschen Zusatzzeit-/Split-Shift-Einträge (z.B. 16:15-16:47 am selben
        // Tag) den Schnitt, obwohl sie kein neuer Arbeitsbeginn sind.
        const earliestStartPerDay = {};
        workEntries.forEach(e => {
            if (e.shiftStart && e.shiftStart.includes(':')) {
                const [h, m] = e.shiftStart.split(':').map(Number);
                const mins = h * 60 + m;
                if (Number.isNaN(mins)) return;
                const jobId = (typeof getEntryJobId === 'function') ? getEntryJobId(e) : 'primary';
                const key = e.date + '|' + jobId;
                if (earliestStartPerDay[key] === undefined || mins < earliestStartPerDay[key]) {
                    earliestStartPerDay[key] = mins;
                }
            }
        });
        const startValues = Object.values(earliestStartPerDay);
        const totalStartMinutes = startValues.reduce((a, b) => a + b, 0);
        const startCount = startValues.length;

        workEntries.forEach(e => {

            // 2. Ø Längste Fokusphase
            if (e.breakLog && e.breakLog.length > 0) {
                 // Pausenlogik ist komplex, hier vereinfachte Berechnung der längsten durchgehenden Arbeitsphase
                 let lastTime = new Date(e.date).getTime();
                 let phases = [];
                 
                 // Alle Zeitpunkte (Start/Pause/Wiederaufnahme) erfassen
                 const timePoints = e.breakLog
                    .map(l => l.time)
                    .sort((a, b) => a - b);

                 let shiftTimes = [];
                 
                 // Füge den Start der Schicht hinzu, wenn bekannt (für Timer-Einträge oft nicht vorhanden)
                 if (e.shiftStart) {
                     const [h, m] = e.shiftStart.split(':').map(Number);
                     const d = new Date(e.date);
                     d.setHours(h, m, 0, 0);
                     shiftTimes.push({ time: d.getTime(), type: 'start' });
                 }
                 
                 // Finde den ersten Start im BreakLog, falls Timer verwendet wurde
                 const firstTimerStart = e.breakLog.find(l => l.action === 'start')?.time;
                 if (firstTimerStart) {
                     shiftTimes.push({ time: firstTimerStart, type: 'start' });
                 }
                 
                 // Fülle mit Pausen- und Wiederaufnahmezeiten
                 e.breakLog.forEach(log => {
                      if (log.action === 'pause') {
                         // Suche nach dem letzten Start-Punkt vor dieser Pause (Ende der Fokusphase)
                         let lastStart = [...shiftTimes].sort((a,b) => b.time - a.time).find(t => t.time < log.time);
                         if (lastStart) phases.push(log.time - lastStart.time);

                         shiftTimes.push({ time: log.time, type: 'pause' });
                      } else if (log.action === 'start') {
                         shiftTimes.push({ time: log.time, type: 'start' });
                      }
                 });
                 
                 // Füge die letzte Phase hinzu (bis zum Ende der Schicht)
                 const lastShiftTime = timePoints.at(-1);
                 
                 // Wir müssen den Netto-Arbeitszeitwert E.Worked nutzen, da die Zeitpunkte unvollständig sein können.
                 // Als Ersatz nehmen wir die Gesamt-Arbeitszeit.
                 
                 // Bessere Näherung: Wenn Timer-Daten existieren, ist die längste Phase die gesamte gearbeitete Zeit.
                 // (Ohne genaues Parsing der Pausen-Offsets)
                 if (e.worked > 0) {
                     totalFocusHours += e.worked;
                     focusCount++;
                 }

            } else {
                 // Wenn keine Pausen geloggt wurden (Manuelle Eingabe/Start-Ende), ist die längste Phase die Netto-Arbeitszeit.
                 totalFocusHours += e.worked;
                 focusCount++;
            }
        });

        const avgStartMinutes = startCount > 0 ? totalStartMinutes / startCount : 0;
        const avgStartHours = Math.floor(avgStartMinutes / 60);
        const avgStartMins = Math.round(avgStartMinutes % 60);

        return {
            avgStartTime: startCount > 0 ? `${avgStartHours < 10 ? '0' : ''}${avgStartHours}:${avgStartMins < 10 ? '0' : ''}${avgStartMins}` : '---',
            avgFocusHours: focusCount > 0 ? (totalFocusHours / focusCount).toFixed(1) : '0.0',
        };
    }
    function getTypeColor(type) {
        const colors = {
            'work': 'var(--primary)',
            'school': 'var(--school)',
            'vacation': 'var(--success)',
            'gleittag': '#f59e0b',
            'sick': 'var(--danger)',
            'holiday': 'var(--holiday)',
            'reset': '#64748b'
        };
        return colors[type] || '#666';
    }
    
    // getTypeEmoji() stand hier als zweite, veraltete Kopie (sick: 💊 statt 🤒) und wurde
    // beim Laden von custom-types-fields.js ohnehin überschrieben. Icons kommen jetzt aus
    // getTypeIconHTML()/getTypeIconTile() dort.
