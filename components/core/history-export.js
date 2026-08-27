// ═══ CORE: HISTORY-EXPORT ═══
    // Filterlauf + Export. Die Bedienelemente stehen im Verlauf-View, der Zustand
    // in genau vier Feldern: historyFilterStart/End (schreibt das Zeitband),
    // historyFilterType (schreiben die Typ-Chips), historyFilterSearch,
    // hlJobFilter. Es gibt bewusst KEINE zweite Ablage daneben — zwei Regler auf
    // denselben Zustand driften garantiert auseinander.
    //
    // opts.ignoreType    → Typ weglassen (die Chips brauchen die Anzahl je Typ
    //                      auf dem Satz, den alle anderen Filter uebrig lassen).
    // opts.query         → vorgeparste Suche aus hlParseQuery(); fehlt sie,
    //                      parst der Lauf selbst (Export ruft ohne Argumente).
    function filterHistoryData(opts) {
        opts = opts || {};
        const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
        const startStr = val('historyFilterStart');
        const endStr = val('historyFilterEnd');
        const type = val('historyFilterType') || 'all';
        const jobEl = document.getElementById('hlJobFilter');
        const job = (jobEl && !jobEl.hidden) ? (jobEl.value || 'all') : 'all';
        const q = opts.query || ((typeof hlParseQuery === 'function')
            ? hlParseQuery(val('historyFilterSearch'))
            : { text: val('historyFilterSearch').toLowerCase(), project: '', min: null, max: null });

        let filtered = Array.isArray(data.entries) ? data.entries : [];

        // Datumsvergleich als ISO-String: `new Date(e.date)` legt Mitternacht UTC
        // an, `new Date(startStr)` ebenso — aber sobald irgendwo eine lokale
        // Zeitzone dazwischenkommt, kippt der Randtag. Strings sortieren hier
        // exakt wie Daten und kosten nichts.
        if (startStr) filtered = filtered.filter(e => e.date >= startStr);
        if (endStr)   filtered = filtered.filter(e => e.date <= endStr);

        if (!opts.ignoreType && type !== 'all') filtered = filtered.filter(e => e.type === type);

        if (job !== 'all') {
            filtered = filtered.filter(e => {
                const jid = (typeof getEntryJobId === 'function') ? getEntryJobId(e) : (e.jobId || 'primary');
                return jid === job;
            });
        }

        if (q.min !== null && q.min !== undefined) {
            filtered = filtered.filter(e => q.minIncl ? (e.worked || 0) >= q.min : (e.worked || 0) > q.min);
        }
        if (q.max !== null && q.max !== undefined) {
            filtered = filtered.filter(e => q.maxIncl ? (e.worked || 0) <= q.max : (e.worked || 0) < q.max);
        }
        if (q.project) {
            filtered = filtered.filter(e => (e.project || '').toLowerCase().includes(q.project));
        }
        if (q.text) {
            // Der Typ-Name gehoert mit in die Volltextsuche: „urlaub" zu tippen
            // und nichts zu finden, obwohl die Chips daneben Urlaub anbieten,
            // wirkt wie ein kaputter Filter.
            const needle = q.text;
            filtered = filtered.filter(e => {
                const label = (typeof getTypeLabel === 'function') ? getTypeLabel(e.type) : e.type;
                return (e.info && e.info.toLowerCase().includes(needle))
                    || (e.project && e.project.toLowerCase().includes(needle))
                    || String(label).toLowerCase().includes(needle);
            });
        }

        return filtered;
    }
    function exportHistoryData(format) {
        const filtered = filterHistoryData(); 

        if (filtered.length === 0) {
            return showCustomMessage('❌ Fehler', 'Keine Daten für den Export gefunden. Bitte überprüfe deine Filter.', 'error');
        }

        let fileContent;
        let fileName;
        let mimeType;

        if (format === 'json') {
            fileContent = JSON.stringify(filtered, null, 2);
            fileName = 'time_pro_export_filtered.json';
            mimeType = 'application/json';
        } else if (format === 'csv') {
            fileContent = convertToCSV(filtered);
            fileName = 'time_pro_export_filtered.csv';
            mimeType = 'text/csv';
        } else {
            return;
        }

        const blob = new Blob([fileContent], { type: mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        
        showCustomMessage('✅ Export gestartet', `Export von ${filtered.length} gefilterten Einträgen als ${format.toUpperCase()} wird vorbereitet...`, 'success');
    }

    function convertToCSV(dataArray) {
        if (dataArray.length === 0) return '';
        
        // NEU: 'Projekt' & 'Notiz' Spalten hinzugefügt
        const headers = ['Datum', 'Typ', 'Arbeitszeit_h', 'Sollzeit_h', 'Differenz_h', 'Projekt', 'Notiz', 'Break_Min', 'Shift_Warning'];
        
        const csvRows = [headers.join(';')]; 

        for (const entry of dataArray) {
            const row = [
                entry.date,
                entry.type,
                entry.worked.toFixed(2).replace('.', ','),
                entry.expected.toFixed(2).replace('.', ','),
                entry.diff.toFixed(2).replace('.', ','),
                (entry.project || '').replace(/,/g, ''), // Projekt
                (entry.info || '').replace(/,/g, ''),    // Notiz
                entry.breakMins,
                entry.shiftWarning ? 'JA' : 'NEIN'
            ];
            csvRows.push(row.join(';'));
        }

        return csvRows.join('\n');
    }
    