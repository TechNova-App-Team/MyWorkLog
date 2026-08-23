// ═══ CORE: SCHOOL-RULES ═══
    function copyConnectionCode() { p2pCopyOffer(); }

    // Load last sync time on startup
    (() => {
        const lastSync = localStorage.getItem('p2p_lastSync');
        if (lastSync) {
            p2pSync.lastSyncTime = parseInt(lastSync);
            p2pUpdateConnectionUI(false);
        }
    })();
    function addBiweeklyRule() {
        const container = document.getElementById('biweeklyRulesList');
        const el = document.createElement('div');
        el.className = 'bi-rule';
        const todayISO = new Date().toISOString().slice(0,10);
        el.innerHTML = `
            <select class="glass-select bi-weekday">
                <option value="0">So</option>
                <option value="1">Mo</option>
                <option value="2">Di</option>
                <option value="3">Mi</option>
                <option value="4">Do</option>
                <option value="5">Fr</option>
                <option value="6">Sa</option>
            </select>
            <input class="glass-input bi-interval" type="number" min="1" value="2" title="Intervall (Wochen)">
            <input class="glass-input bi-start" type="date" value="${todayISO}">
            <button class="btn btn-ghost" onclick="this.parentElement.remove();">✕</button>
        `;
        container.appendChild(el);
    }

    function saveSchoolSettingsToData() {
        if(!data.settings.schoolRules) data.settings.schoolRules = { weeklyDays: [], biweekly: [] };
        const weekly = [];
        for(let i=0;i<7;i++) {
            const cb = document.getElementById('sch_week_'+i);
            if(cb && cb.checked) weekly.push(i);
        }
        const rules = [];
        const container = document.getElementById('biweeklyRulesList');
        if(container) {
            const rows = Array.from(container.querySelectorAll('.bi-rule'));
            rows.forEach(rEl => {
                const weekday = parseInt(rEl.querySelector('.bi-weekday').value);
                const interval = parseInt(rEl.querySelector('.bi-interval').value) || 2;
                const startDate = rEl.querySelector('.bi-start').value || '';
                if(!isNaN(weekday)) rules.push({ weekday, interval, startDate });
            });
        }
        data.settings.schoolRules.weeklyDays = weekly;
        data.settings.schoolRules.biweekly = rules;
    }

    function _showSchoolCheckResult(modifier, icon, text) {
        const el = document.getElementById('schoolCheckResult');
        if (!el) return;
        clearTimeout(el._hideTimer);
        // Force animation restart by toggling display off first
        el.style.display = 'none';
        el.className = `school-inline-result school-inline-result--${modifier}`;
        el.innerHTML = `<span class="school-inline-result__icon">${mwlIconFromEmoji(icon, 15)}</span><span>${text}</span>`;
        // Reflow trigger so browser registers the display:none before showing again
        void el.offsetHeight;
        el.style.display = 'flex';
        el._hideTimer = setTimeout(() => { el.style.display = 'none'; }, 5000);
    }

    function checkDateVocFromInput() {
        const d = document.getElementById('checkVocDate').value;
        if(!d) {
            _showSchoolCheckResult('warn', '⚠️', 'Bitte ein Datum auswählen.');
            return;
        }
        try { saveSchoolSettingsToData(); } catch(e) {}
        const [yr, mo, dy] = d.split('-').map(Number);
        const res = isVocSchoolForDate(new Date(yr, mo - 1, dy));
        if(res.isVocSchool) _showSchoolCheckResult('ok', '✅', `${d} ist ein Berufsschultag.`);
        else _showSchoolCheckResult('no', 'ℹ️', `${d} ist kein Berufsschultag.`);
    }

    function saveSchoolRulesAndNotify() {
        try { saveSchoolSettingsToData(); } catch(e) {}
        save();
        const btn = document.getElementById('schoolSaveBtn');
        if (!btn) return;
        btn.classList.add('school-save-btn--success');
        btn.textContent = '✓ Gespeichert';
        clearTimeout(btn._resetTimer);
        btn._resetTimer = setTimeout(() => {
            btn.classList.remove('school-save-btn--success');
            btn.textContent = 'Speichern';
        }, 2000);
    }

    function isVocSchoolForDate(date) {
        // Ensure rules exist
        const rules = (data.settings.schoolRules && data.settings.schoolRules) || { weeklyDays: [], biweekly: [] };
        // Build ISO from local date parts — toISOString() is UTC and can mismatch getDay() in UTC+ zones
        const dateISO = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        const dayIndex = date.getDay();

        // 1) Check booked vacations (explicit entries)
        if(data.entries.some(e => e.date === dateISO && e.type === 'vacation')) return { isVocSchool:false, reason:'vacation' };

        // 2) Check public holidays via existing function getGermanHolidays
        const year = date.getFullYear();
        const holidays = getGermanHolidays(year).concat(getGermanHolidays(year+1));
        if(holidays.find(h => h.date === dateISO)) return { isVocSchool:false, reason:'public-holiday' };

        // 3) First check Biweekly / multi-week rules (they take priority!)
        for(const r of (rules.biweekly||[])) {
            const wd = parseInt(r.weekday);
            if(wd !== dayIndex) continue;
            
            const interval = parseInt(r.interval) || 2;
            if(!r.startDate) continue;
            
            // Parse startDate as local time (not UTC)
            const [year, month, day] = r.startDate.split('-').map(Number);
            const start = new Date(year, month - 1, day);
            // normalize both dates to midnight
            const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const daysDiff = Math.floor((dateNorm - start) / 86400000);
            
            if(daysDiff < 0) continue; // before start date
            
            const weeks = Math.floor(daysDiff / 7);
            if((weeks % interval) === 0) {
                const expected = data.settings.hours[dayIndex] || 0;
                if(expected > 0) return { isVocSchool:true, reason:'biweekly', matchedRule: r };
            } else {
                // This day matches the weekday but NOT the week pattern
                // So even if it's in weeklyDays, we should skip it
                return { isVocSchool:false, reason:'not-in-biweekly-cycle' };
            }
        }

        // 4) Only check weekly rules if there are no biweekly rules for this weekday
        const hasBiweeklyForDay = rules.biweekly && rules.biweekly.some(r => parseInt(r.weekday) === dayIndex);
        if(!hasBiweeklyForDay && Array.isArray(rules.weeklyDays) && rules.weeklyDays.includes(dayIndex)) {
            // Only consider weekdays with expected hours > 0
            const expected = data.settings.hours[dayIndex] || 0;
            if(expected > 0) return { isVocSchool:true, reason:'weekly' };
        }

        return { isVocSchool:false, reason:'none' };
    }

    function checkTodayVocSchool() {
        try {
            const today = new Date();
            const iso = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
            const res = isVocSchoolForDate(today);
            if(res.isVocSchool) {
                const exists = data.entries.some(e => e.date === iso && e.type === 'school');
                // Check if user already dismissed this date
                const dismissed = JSON.parse(localStorage.getItem('tg_school_dismissed') || '[]');
                if(!exists && !dismissed.includes(iso)) {
                    showCustomConfirm('🏫 Berufsschule heute?', `Heute (${iso}) sieht nach Berufsschule aus (${res.reason}). Soll ein Eintrag für heute angelegt werden?`, () => {
                        createSchoolEntryForDate(today);
                    }, () => {
                        // Store dismissed date so it won't be suggested again
                        const list = JSON.parse(localStorage.getItem('tg_school_dismissed') || '[]');
                        list.push(iso);
                        // Keep only last 90 days of dismissed dates to avoid unbounded growth
                        const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0,10);
                        const pruned = list.filter(d => d >= cutoff);
                        localStorage.setItem('tg_school_dismissed', JSON.stringify(pruned));
                    });
                }
            }
        } catch(e) { console.warn('checkTodayVocSchool error', e); }
    }

    function createSchoolEntryForDate(d) {
        const dateISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const dayIndex = d.getDay();
        const SCHOOL_HOURS = 6.75; // default used elsewhere
        const expected = data.settings.hours[dayIndex] || 0;
        const worked = SCHOOL_HOURS > 0 ? SCHOOL_HOURS : expected;

        const entry = {
            id: Date.now() + Math.random(),
            date: dateISO,
            type: 'school',
            worked: worked,
            expected: expected,
            diff: 0,
            info: 'Berufsschule (automatisch vorgeschlagen)',
            isPeriod: false,
            breakMins: 0, shiftEnd: '', shiftWarning: false
        };
        data.entries.push(entry);
        data.entries.sort((a,b) => new Date(b.date) - new Date(a.date));
        save();
        showSuccessToast(`Berufsschule ${dateISO} eingetragen`, { icon: '🏫' });
    }
