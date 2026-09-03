// ═══ BH-TAGESMODUS ═══
// Umschaltung Tages-/Wochenmodus samt Tagesfeldern und Stundensumme.
// Herausgeloest aus pages/berichtsheft/index.html.

// ═══════════════════════════════════════
// DAILY / WEEKLY MODE
// ═══════════════════════════════════════

const DAYS = [
    { key: 'monday', name: 'Montag', short: 'Mo' },
    { key: 'tuesday', name: 'Dienstag', short: 'Di' },
    { key: 'wednesday', name: 'Mittwoch', short: 'Mi' },
    { key: 'thursday', name: 'Donnerstag', short: 'Do' },
    { key: 'friday', name: 'Freitag', short: 'Fr' }
];

// Legt den Schieber exakt unter den aktiven Reiter. Bei Breite 0 (Dialog noch
// zu) wird nichts gesetzt — der ResizeObserver holt es nach, sobald er sichtbar ist.
function syncModeSliders() {
    document.querySelectorAll('.mode-toggle').forEach(toggle => {
        const slider = toggle.querySelector('.mode-toggle-slider');
        const active = toggle.querySelector('.mode-toggle-btn.active');
        if (!slider || !active || !active.offsetWidth) return;
        slider.style.width = active.offsetWidth + 'px';
        slider.style.transform = `translateX(${active.offsetLeft}px)`;
    });
}

if (window.ResizeObserver) {
    const _modeRO = new ResizeObserver(syncModeSliders);
    document.querySelectorAll('.mode-toggle').forEach(t => _modeRO.observe(t));
}
window.addEventListener('resize', syncModeSliders);

function setMode(mode) {
    currentMode = mode;
    localStorage.setItem(MODE_KEY, mode);

    // Main page toggle
    const btnWeekly = document.getElementById('btnWeekly');
    const btnDaily = document.getElementById('btnDaily');
    const slider = document.getElementById('modeSlider');
    // Modal toggle
    const btnWeeklyM = document.getElementById('btnWeeklyModal');
    const btnDailyM = document.getElementById('btnDailyModal');
    const sliderM = document.getElementById('modeSliderModal');

    const weeklyGroup = document.getElementById('weeklyFieldGroup');
    const dailyGroup = document.getElementById('dailyFieldsGroup');

    const schoolGroup = document.getElementById('schoolFieldGroup');

    if (mode === 'daily') {
        if (btnDaily) btnDaily.classList.add('active');
        if (btnWeekly) btnWeekly.classList.remove('active');
        if (btnDailyM) btnDailyM.classList.add('active');
        if (btnWeeklyM) btnWeeklyM.classList.remove('active');
        if (weeklyGroup) weeklyGroup.style.display = 'none';
        if (schoolGroup) schoolGroup.style.display = 'none'; // Hide in daily
        if (dailyGroup) dailyGroup.classList.add('active');
        // Remove required from weekly textarea so form can submit
        const weeklyTA = document.getElementById('reportActivities');
        if (weeklyTA) weeklyTA.removeAttribute('required');
        renderDailyFields();
        renderAISuggestions('daily');
    } else {
        if (btnWeekly) btnWeekly.classList.add('active');
        if (btnDaily) btnDaily.classList.remove('active');
        if (btnWeeklyM) btnWeeklyM.classList.add('active');
        if (btnDailyM) btnDailyM.classList.remove('active');
        if (weeklyGroup) weeklyGroup.style.display = '';
        if (schoolGroup) schoolGroup.style.display = ''; // Show in weekly
        if (dailyGroup) dailyGroup.classList.remove('active');
        // Restore required
        const weeklyTA = document.getElementById('reportActivities');
        if (weeklyTA) weeklyTA.setAttribute('required', '');
        renderAISuggestions('weekly');
    }

    syncModeSliders();
}

function renderDailyFields() {
    const container = document.getElementById('dailyFieldsContainer');
    if (!container) return;

    // Get the week dates
    const weekNum = parseInt(document.getElementById('reportWeek')?.value) || getWeekNumber(new Date());
    const { monday } = getWeekDates(weekNum);
    const monDate = new Date(monday);

    container.innerHTML = DAYS.map((day, i) => {
        const dayDate = new Date(monDate);
        dayDate.setDate(monDate.getDate() + i);
        const dateStr = dayDate.toLocaleDateString((window.mwlLocale ? window.mwlLocale() : document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE'), { day: '2-digit', month: '2-digit' });

        return `
                    <div class="daily-day-block">
                        <div class="daily-day-header">
                            <span class="day-name">${day.name}</span>
                            <span class="day-date">${dateStr}</span>
                            <label class="daily-school-toggle">
                                Schultag
                                <input type="checkbox" id="daily_school_${i}" class="daily-school-input" data-day="${day.key}" onchange="toggleSchoolDay(this)">
                                <span class="toggle-track"></span>
                            </label>
                            <div class="day-hours">
                                <input type="number" step="0.5" min="0" max="12" value="8" 
                                       id="daily_hours_${i}" class="daily-hours-input" data-day="${day.key}" 
                                       oninput="updateDailyTotalHours()">
                                <span>Std.</span>
                            </div>
                        </div>
                        <textarea class="daily-textarea" id="daily_${i}" data-day="${day.key}" rows="2"
                                  placeholder="${day.name}: Tätigkeiten beschreiben..."
                                  onfocus="activeDailyField = this"
                                  oninput="onDailyInput()"></textarea>
                    </div>
                `;
    }).join('');

    updateDailyTotalHours();
}

function updateDailyTotalHours() {
    const inputs = document.querySelectorAll('.daily-hours-input');
    let total = 0;
    inputs.forEach(inp => total += parseFloat(inp.value) || 0);
    const el = document.getElementById('dailyTotalHours');
    if (el) el.textContent = total.toFixed(1);

    // Also sync to the main hours field
    const hoursField = document.getElementById('reportHours');
    if (hoursField && currentMode === 'daily') {
        hoursField.value = total.toFixed(1);
    }
}

function onDailyInput() {
    // Debounced AI refresh
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        renderAISuggestions('daily');
        saveDraft();
    }, 1500);
}

function getDailyActivitiesFromForm() {
    const result = {};
    DAYS.forEach(day => {
        const ta = document.querySelector(`.daily-textarea[data-day="${day.key}"]`);
        result[day.key] = ta ? ta.value : '';
    });
    return result;
}

function getDailyHoursFromForm() {
    const result = {};
    DAYS.forEach(day => {
        const inp = document.querySelector(`.daily-hours-input[data-day="${day.key}"]`);
        result[day.key] = inp ? (parseFloat(inp.value) || 0) : 0;
    });
    return result;
}

function getDailySchoolFromForm() {
    const result = {};
    DAYS.forEach(day => {
        const cb = document.querySelector(`.daily-school-input[data-day="${day.key}"]`);
        result[day.key] = cb ? cb.checked : false;
    });
    return result;
}

function toggleSchoolDay(checkbox) {
    const block = checkbox.closest('.daily-day-block');
    if (block) {
        if (checkbox.checked) {
            block.classList.add('is-school-day');
        } else {
            block.classList.remove('is-school-day');
        }
    }
}

function setDailyFieldsFromData(dailyActivities, dailyHours, dailySchool) {
    if (!dailyActivities) return;
    DAYS.forEach(day => {
        const ta = document.querySelector(`.daily-textarea[data-day="${day.key}"]`);
        if (ta && dailyActivities[day.key]) ta.value = dailyActivities[day.key];

        const inp = document.querySelector(`.daily-hours-input[data-day="${day.key}"]`);
        if (inp && dailyHours && dailyHours[day.key] !== undefined) inp.value = dailyHours[day.key];

        const cb = document.querySelector(`.daily-school-input[data-day="${day.key}"]`);
        if (cb && dailySchool) {
            cb.checked = !!dailySchool[day.key];
            toggleSchoolDay(cb); // Update UI class
        }
    });
    updateDailyTotalHours();
}

function combineDailyToWeeklyText(dailyActivities) {
    if (!dailyActivities) return '';
    return DAYS.map(day => {
        const text = dailyActivities[day.key];
        return text ? `${day.name}:\n${text}` : null;
    }).filter(Boolean).join('\n\n');
}

