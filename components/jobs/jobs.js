// ═══ JOBS MODULE ═══
// Mehrere Jobs mit je eigenem Soll/Pause & getrenntem Gleitzeit-Saldo.
// Job 0 = "primary" → nutzt die bestehenden data.settings.hours / data.settings.break
// (Legacy bleibt Quelle der Wahrheit, alter Code läuft unverändert weiter).
// Weitere Jobs speichern ihr eigenes hours[]/break in data.settings.jobs[i].
// Jeder Eintrag trägt e.jobId (fehlt = 'primary').

    var PRIMARY_JOB_ID = 'primary';
    var JOB_WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']; // Index = Date.getDay()

    // Sprachbewusst: JS-generierte Texte auf /en/ englisch (statische Pipeline erfasst JS nicht)
    function L(de, en) { return document.documentElement.lang === 'en' ? en : de; }

    // ── Datenmodell / Migration ──────────────────────────────────────────
    function migrateJobs() {
        if (!data.settings) data.settings = {};
        if (!Array.isArray(data.settings.jobs) || data.settings.jobs.length === 0) {
            data.settings.jobs = [{
                id: PRIMARY_JOB_ID,
                primary: true,
                name: (data.settings.job && String(data.settings.job).trim()) || 'Hauptjob',
                color: data.settings.theme || '#a855f7',
                window: { start: '', end: '' }
            }];
        }
        // Sicherstellen: genau ein primary, Felder vorhanden
        var seenPrimary = false;
        data.settings.jobs.forEach(function (j) {
            if (!j.id) j.id = 'job-' + Date.now() + '-' + Math.floor(Math.random() * 1e4);
            if (typeof j.name !== 'string' || !j.name) j.name = j.primary ? 'Hauptjob' : 'Job';
            if (typeof j.color !== 'string') j.color = '#a855f7';
            if (!j.window || typeof j.window !== 'object') j.window = { start: '', end: '' };
            if (j.primary) {
                if (seenPrimary) j.primary = false; else seenPrimary = true;
            }
            if (!j.primary) {
                if (!Array.isArray(j.hours)) j.hours = [0, 0, 0, 0, 0, 0, 0];
                if (!j.break || typeof j.break !== 'object') j.break = { thresh: 6, min: [0, 0, 0, 0, 0, 0, 0] };
                if (!Array.isArray(j.break.min)) j.break.min = [0, 0, 0, 0, 0, 0, 0];
                if (typeof j.break.thresh !== 'number') j.break.thresh = 6;
            }
        });
        if (!seenPrimary && data.settings.jobs[0]) data.settings.jobs[0].primary = true;
    }

    // ── Zugriffs-Helpers ─────────────────────────────────────────────────
    function getJobs() {
        if (!data.settings || !Array.isArray(data.settings.jobs) || !data.settings.jobs.length) migrateJobs();
        return data.settings.jobs;
    }
    function hasMultipleJobs() { return getJobs().length > 1; }
    function getPrimaryJob() {
        var jobs = getJobs();
        for (var i = 0; i < jobs.length; i++) if (jobs[i].primary) return jobs[i];
        return jobs[0];
    }
    function getJobById(id) {
        var jobs = getJobs();
        for (var i = 0; i < jobs.length; i++) if (jobs[i].id === id) return jobs[i];
        return getPrimaryJob();
    }
    function getEntryJobId(e) {
        if (e && e.jobId && getJobs().some(function (j) { return j.id === e.jobId; })) return e.jobId;
        return PRIMARY_JOB_ID;
    }
    function getJobName(id) { return getJobById(id).name; }
    function getJobColor(id) { return getJobById(id).color || '#a855f7'; }

    // Soll-Stunden für Job an einem Wochentag. Primary → Legacy-Feld.
    function getJobHours(jobId, dayIndex) {
        var job = getJobById(jobId);
        if (job.primary) return (data.settings.hours && data.settings.hours[dayIndex]) || 0;
        return (Array.isArray(job.hours) ? job.hours[dayIndex] : 0) || 0;
    }
    // Pausen-Config {thresh, min[]} für Job. Primary → Legacy-Feld.
    function getJobBreak(jobId) {
        var job = getJobById(jobId);
        if (job.primary) return data.settings.break || { thresh: 6, min: [0, 30, 30, 30, 30, 30, 0] };
        return job.break || { thresh: 6, min: [0, 0, 0, 0, 0, 0, 0] };
    }
    function getJobBreakForDay(jobId, dayIndex) {
        var b = getJobBreak(jobId);
        return (Array.isArray(b.min) ? b.min[dayIndex] : b.min) || 0;
    }

    // Auto-Zuordnung nach Startzeit ("HH:MM"): passendes Job-Zeitfenster, sonst primary.
    function resolveJobByStart(startTime) {
        if (!startTime) return PRIMARY_JOB_ID;
        var jobs = getJobs();
        for (var i = 0; i < jobs.length; i++) {
            var w = jobs[i].window || {};
            if (w.start && w.end && startTime >= w.start && startTime < w.end) return jobs[i].id;
        }
        return PRIMARY_JOB_ID;
    }

    // ── Entry-Formular: Job-Auswahl ──────────────────────────────────────
    var _jobManualOverride = false; // User hat Job im Formular selbst gewählt

    function populateJobSelect() {
        var sel = document.getElementById('inpJob');
        var row = document.getElementById('jobSelectRow');
        if (!sel) return;
        var jobs = getJobs();
        var prev = sel.value;
        sel.innerHTML = jobs.map(function (j) {
            return '<option value="' + j.id + '">' + (typeof esc === 'function' ? esc(j.name) : j.name) + '</option>';
        }).join('');
        if (prev && jobs.some(function (j) { return j.id === prev; })) sel.value = prev;
        // Zeile nur zeigen, wenn es mehr als einen Job gibt
        if (row) row.style.display = jobs.length > 1 ? '' : 'none';
    }

    // Bei Startzeit-Änderung Job automatisch vorwählen (außer User hat manuell gewählt)
    function autoSelectJobByStart() {
        if (_jobManualOverride) return;
        var sel = document.getElementById('inpJob');
        if (!sel || !hasMultipleJobs()) return;
        var start = (document.getElementById('inpStart') || {}).value || '';
        var resolved = resolveJobByStart(start);
        if (resolved && sel.value !== resolved) sel.value = resolved;
    }
    function onJobManualChange() { _jobManualOverride = true; }
    function resetJobSelection() {
        _jobManualOverride = false;
        var sel = document.getElementById('inpJob');
        if (sel) sel.value = PRIMARY_JOB_ID;
    }
    // Aktuell im Formular gewählter Job (für handleEntry)
    function getFormJobId() {
        var sel = document.getElementById('inpJob');
        if (sel && sel.value && getJobs().some(function (j) { return j.id === sel.value; })) return sel.value;
        return PRIMARY_JOB_ID;
    }

    // ── Settings: Job-Manager ────────────────────────────────────────────
    function jobDayGrid(job, kind) {
        // kind: 'hours' | 'break'  — kompaktes 7-Tage-Raster für Sekundär-Jobs
        var arr = kind === 'hours' ? (job.hours || []) : ((job.break && job.break.min) || []);
        var cells = '';
        for (var i = 0; i < 7; i++) {
            var v = (arr[i] != null ? arr[i] : (kind === 'hours' ? 0 : 0));
            cells += '<div class="jm-cell"><input type="number" min="0" step="' + (kind === 'hours' ? '0.25' : '5') +
                '" class="glass-input jm-input" data-job="' + job.id + '" data-kind="' + kind + '" data-day="' + i + '" value="' + v + '">' +
                '<small>' + JOB_WEEKDAYS[i] + '</small></div>';
        }
        return cells;
    }

    function renderJobManager() {
        var host = document.getElementById('jobManagerContainer');
        if (!host) return;
        var jobs = getJobs();
        var html = '';
        jobs.forEach(function (job) {
            var isPrimary = !!job.primary;
            html += '<div class="jm-card" data-job-card="' + job.id + '">';
            html += '<div class="jm-head">';
            html += '<input type="color" class="jm-color" data-job="' + job.id + '" value="' + (job.color || '#a855f7') + '" title="Farbe">';
            html += '<input type="text" class="glass-input jm-name" data-job="' + job.id + '" value="' + (typeof esc === 'function' ? esc(job.name) : job.name) + '" placeholder="' + L('Job-Name', 'Job name') + '">';
            if (isPrimary) html += '<span class="jm-badge">' + L('Hauptjob', 'Main job') + '</span>';
            else html += '<button type="button" class="jm-del" data-job="' + job.id + '" title="' + L('Job löschen', 'Delete job') + '" onclick="removeJob(\'' + job.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
            html += '</div>';
            // Zeitfenster (für Auto-Zuordnung)
            html += '<div class="jm-window"><span class="jm-lbl">' + L('Zeitfenster (Auto-Zuordnung)', 'Time window (auto-assign)') + '</span>' +
                '<div class="jm-window-inputs">' +
                '<input type="time" class="glass-input jm-win-start" data-job="' + job.id + '" value="' + ((job.window && job.window.start) || '') + '">' +
                '<span>–</span>' +
                '<input type="time" class="glass-input jm-win-end" data-job="' + job.id + '" value="' + ((job.window && job.window.end) || '') + '">' +
                '</div></div>';
            if (isPrimary) {
                html += '<p class="jm-hint">' + L('Soll-Stunden &amp; Pausen des Hauptjobs stellst du unten in „Soll-Stunden pro Tag" &amp; „Pausenzeiten pro Wochentag" ein.', 'Set the main job\'s target hours &amp; breaks below under “Target hours per day” &amp; “Break times per weekday”.') + '</p>';
            } else {
                html += '<div class="jm-grid-block"><span class="jm-lbl">' + L('Soll-Stunden pro Tag', 'Target hours per day') + '</span><div class="jm-grid">' + jobDayGrid(job, 'hours') + '</div></div>';
                html += '<div class="jm-grid-block"><span class="jm-lbl">' + L('Pause ab (Std)', 'Break from (hrs)') + '</span>' +
                    '<input type="number" min="0" step="0.25" class="glass-input jm-thresh" data-job="' + job.id + '" value="' + ((job.break && job.break.thresh) != null ? job.break.thresh : 6) + '" style="max-width:120px;"></div>';
                html += '<div class="jm-grid-block"><span class="jm-lbl">' + L('Pausenzeiten pro Wochentag (Min)', 'Break times per weekday (min)') + '</span><div class="jm-grid">' + jobDayGrid(job, 'break') + '</div></div>';
            }
            html += '</div>';
        });
        html += '<button type="button" class="btn btn-ghost jm-add" onclick="addJob()">+ ' + L('Job hinzufügen', 'Add job') + '</button>';
        host.innerHTML = html;
    }

    function collectJobManager() {
        var host = document.getElementById('jobManagerContainer');
        if (!host) return;
        var jobs = getJobs();
        jobs.forEach(function (job) {
            var nameEl = host.querySelector('.jm-name[data-job="' + job.id + '"]');
            var colEl = host.querySelector('.jm-color[data-job="' + job.id + '"]');
            var wsEl = host.querySelector('.jm-win-start[data-job="' + job.id + '"]');
            var weEl = host.querySelector('.jm-win-end[data-job="' + job.id + '"]');
            if (nameEl) job.name = nameEl.value.trim() || job.name;
            if (colEl) job.color = colEl.value;
            if (!job.window) job.window = {};
            if (wsEl) job.window.start = wsEl.value || '';
            if (weEl) job.window.end = weEl.value || '';
            if (!job.primary) {
                if (!Array.isArray(job.hours)) job.hours = [0, 0, 0, 0, 0, 0, 0];
                if (!job.break) job.break = { thresh: 6, min: [0, 0, 0, 0, 0, 0, 0] };
                var threshEl = host.querySelector('.jm-thresh[data-job="' + job.id + '"]');
                if (threshEl) job.break.thresh = parseFloat(threshEl.value) || 0;
                host.querySelectorAll('.jm-input[data-job="' + job.id + '"]').forEach(function (inp) {
                    var day = parseInt(inp.getAttribute('data-day'), 10);
                    var val = parseFloat(inp.value) || 0;
                    if (inp.getAttribute('data-kind') === 'hours') job.hours[day] = val;
                    else job.break.min[day] = val;
                });
            }
        });
        // Primary-Name in Legacy-Feld spiegeln (für Konsistenz mit „Job / Beruf")
    }

    function addJob() {
        collectJobManager(); // aktuelle Eingaben nicht verlieren
        var jobs = getJobs();
        jobs.push({
            id: 'job-' + Date.now() + '-' + Math.floor(Math.random() * 1e4),
            primary: false,
            name: L('Nebenjob ', 'Side job ') + jobs.length,
            color: '#06b6d4',
            window: { start: '18:00', end: '20:00' },
            hours: [0, 0, 0, 0, 0, 0, 0],
            break: { thresh: 6, min: [0, 0, 0, 0, 0, 0, 0] }
        });
        renderJobManager();
        try { populateJobSelect(); } catch (e) {}
    }

    function removeJob(id) {
        collectJobManager();
        var job = getJobById(id);
        if (job.primary) { if (typeof showCustomMessage === 'function') showCustomMessage(L('ℹ️ Hinweis', 'ℹ️ Note'), L('Der Hauptjob kann nicht gelöscht werden.', 'The main job cannot be deleted.'), 'info'); return; }
        var affected = (data.entries || []).filter(function (e) { return getEntryJobId(e) === id; }).length;
        var doRemove = function () {
            data.settings.jobs = getJobs().filter(function (j) { return j.id !== id; });
            // Betroffene Einträge zurück auf Hauptjob (Soll/Diff neu rechnen)
            (data.entries || []).forEach(function (e) {
                if (e.jobId === id) {
                    e.jobId = PRIMARY_JOB_ID;
                    if (typeof recomputeEntryForJob === 'function') recomputeEntryForJob(e);
                }
            });
            try { if (typeof dedupeDayExpected === 'function') dedupeDayExpected(); } catch (e) {}
            renderJobManager();
            try { populateJobSelect(); } catch (e) {}
            if (typeof save === 'function') save();
            if (typeof updateUI === 'function') try { updateUI(); } catch (e) {}
        };
        if (affected > 0 && typeof showCustomConfirm === 'function') {
            showCustomConfirm(
                L('Job löschen?', 'Delete job?'),
                L(affected + ' Eintrag/Einträge dieses Jobs werden dem Hauptjob zugeordnet und neu berechnet.', affected + ' entry/entries of this job will be reassigned to the main job and recalculated.'),
                doRemove
            );
        } else {
            doRemove();
        }
    }

    // Einen Eintrag anhand seines Jobs neu berechnen (expected/diff) — für Job-Wechsel/Löschen.
    function recomputeEntryForJob(e) {
        if (!e) return;
        var jobId = getEntryJobId(e);
        var dayIndex = new Date(e.date + 'T00:00:00').getDay();
        // Nur arbeits-artige Einträge tragen Soll
        var isWork = (e.type === 'work') || (typeof getEntryTypeInfo === 'function' && String(e.type).indexOf('custom-') === 0 && (getEntryTypeInfo(e.type) || {}).countsAsWork === true);
        if (!isWork) return;
        e.expected = getJobHours(jobId, dayIndex);
        e.diff = (parseFloat(e.worked) || 0) - (parseFloat(e.expected) || 0);
    }

    // ── Performance: Statistik pro Job ───────────────────────────────────
    function renderJobBreakdown() {
        var host = document.getElementById('jobStatsContainer');
        if (!host) return;
        var jobs = getJobs();
        if (jobs.length < 2) { host.style.display = 'none'; host.innerHTML = ''; return; }
        host.style.display = '';
        var agg = {};
        jobs.forEach(function (j) { agg[j.id] = { worked: 0, expected: 0, diff: 0, days: {} }; });
        (data.entries || []).forEach(function (e) {
            var jid = getEntryJobId(e);
            if (!agg[jid]) return;
            var isWorkRel = (e.type === 'work') || (typeof getEntryTypeInfo === 'function' && String(e.type).indexOf('custom-') === 0 && (getEntryTypeInfo(e.type) || {}).countsAsWork === true);
            agg[jid].worked += (parseFloat(e.worked) || 0);
            if (isWorkRel) {
                agg[jid].expected += (parseFloat(e.expected) || 0);
                agg[jid].diff += (parseFloat(e.diff) || 0);
            }
            agg[jid].days[e.date] = true;
        });
        var isEN = document.documentElement.lang === 'en';
        var t = {
            title: isEN ? 'Per job' : 'Pro Job',
            worked: isEN ? 'Worked' : 'Gearbeitet',
            balance: isEN ? 'Balance' : 'Saldo',
            days: isEN ? 'Days' : 'Tage'
        };
        var cards = jobs.map(function (j) {
            var a = agg[j.id];
            var dayCount = Object.keys(a.days).length;
            var pos = a.diff >= 0;
            var col = pos ? 'var(--success)' : 'var(--danger)';
            return '<div class="js-card" style="border-color:' + j.color + '33">' +
                '<div class="js-card__head"><span class="js-dot" style="background:' + j.color + '"></span>' +
                '<span class="js-name">' + (typeof esc === 'function' ? esc(j.name) : j.name) + '</span></div>' +
                '<div class="js-row"><span>' + t.worked + '</span><b>' + a.worked.toFixed(1) + 'h</b></div>' +
                '<div class="js-row"><span>' + t.balance + '</span><b style="color:' + col + '">' + (pos ? '+' : '') + a.diff.toFixed(1) + 'h</b></div>' +
                '<div class="js-row"><span>' + t.days + '</span><b>' + dayCount + '</b></div>' +
                '</div>';
        }).join('');
        host.innerHTML = '<h3 class="js-title">' + t.title + '</h3><div class="js-grid">' + cards + '</div>';
    }

    // ── CSS injizieren (kein eigenes CSS-File nötig) ─────────────────────
    (function injectJobsCSS() {
        if (document.getElementById('jobsModuleStyle')) return;
        var s = document.createElement('style');
        s.id = 'jobsModuleStyle';
        s.textContent = [
            '#jobSelectRow{margin:0 0 2px;}',
            '.jm-card{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:14px;margin-bottom:12px;background:rgba(255,255,255,.02);}',
            '.jm-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}',
            '.jm-color{width:38px;height:38px;padding:0;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:10px;background:none;cursor:pointer;flex-shrink:0;}',
            '.jm-name{flex:1;min-width:0;}',
            '.jm-badge{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:4px 10px;border-radius:20px;background:rgba(var(--primary-rgb),.15);color:var(--primary);white-space:nowrap;}',
            '.jm-del{width:32px;height:32px;border-radius:8px;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.1);color:#ef4444;cursor:pointer;font-size:.9rem;flex-shrink:0;transition:all .2s;}',
            '.jm-del:hover{background:rgba(239,68,68,.2);}',
            '.jm-lbl{display:block;font-size:.72rem;font-weight:600;color:var(--text-muted);margin-bottom:8px;}',
            '.jm-window{margin-bottom:12px;}',
            '.jm-window-inputs{display:flex;align-items:center;gap:8px;}',
            '.jm-window-inputs input{max-width:130px;}',
            '.jm-grid-block{margin-bottom:12px;}',
            '.jm-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;}',
            '.jm-cell{text-align:center;}',
            '.jm-cell input{padding:8px 4px;text-align:center;margin-bottom:3px;}',
            '.jm-cell small{color:var(--text-muted);font-size:.7rem;}',
            '.jm-hint{font-size:.75rem;color:var(--text-muted);margin:4px 0 0;line-height:1.5;}',
            '.jm-add{width:100%;margin-top:4px;}',
            '.js-title{font-size:.95rem;font-weight:700;margin:0 0 12px;color:var(--text-main);}',
            '#jobStatsContainer{margin-top:22px;}',
            '.js-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;}',
            '.js-card{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:14px;background:rgba(255,255,255,.02);}',
            '.js-card__head{display:flex;align-items:center;gap:8px;margin-bottom:12px;}',
            '.js-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}',
            '.js-name{font-weight:700;font-size:.9rem;color:var(--text-main);}',
            '.js-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:.82rem;color:var(--text-muted);}',
            '.js-row b{color:var(--text-main);font-variant-numeric:tabular-nums;}'
        ].join('');
        document.head.appendChild(s);
    })();
