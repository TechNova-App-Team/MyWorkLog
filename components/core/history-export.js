// ═══ CORE: HISTORY-EXPORT ═══
    // --- DATEN EXPORT LOGIC (Unverändert) ---
    // (filterHistoryData, renderHistoryView, exportHistoryData, convertToCSV sind unverändert)
    
    function filterHistoryData() {
        const startStr = document.getElementById('historyFilterStart').value;
        const endStr = document.getElementById('historyFilterEnd').value;
        const type = document.getElementById('historyFilterType').value;
        const minHours = parseFloat(document.getElementById('historyFilterMinHours').value) || 0;
        const searchText = document.getElementById('historyFilterSearch').value.toLowerCase();

        let filtered = data.entries;

        if (startStr) {
            filtered = filtered.filter(e => new Date(e.date) >= new Date(startStr));
        }
        if (endStr) {
            const endDate = new Date(endStr);
            endDate.setDate(endDate.getDate() + 1); 
            filtered = filtered.filter(e => new Date(e.date) < endDate);
        }
        if (type !== 'all') {
            filtered = filtered.filter(e => e.type === type);
        }
        if (minHours > 0) {
            filtered = filtered.filter(e => e.worked >= minHours);
        }
        if (searchText) {
            filtered = filtered.filter(e => 
                 (e.info && e.info.toLowerCase().includes(searchText)) || 
                 (e.project && e.project.toLowerCase().includes(searchText))
            );
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
    