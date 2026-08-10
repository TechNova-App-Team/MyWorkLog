// ═══ SCHATTEN-BERICHTSHEFT: GOOGLE-DRIVE-SICHERUNG ═══
//
// Ein Klick legt den KOMPLETTEN Tresor in Google Drive ab: Eintraege,
// eigene Kategorien und saemtliche Beweismittel-Dateien.
//
// Was Google dabei zu sehen bekommt: NICHTS ausser einem Klumpen Zufall.
// Hochgeladen wird exakt derselbe Blob wie beim Backup-Download, und der ist
// bereits mit dem Tresor-Passwort verschluesselt (AES-256-GCM, Schluessel nur
// aus deinem Passwort abgeleitet). Das ist bei diesem Werkzeug keine
// Feinheit, sondern der Kern: Wer Vorfaelle im eigenen Betrieb dokumentiert,
// darf sie nicht im Klartext bei einem Dritten liegen haben. Ohne dein
// Passwort ist die Datei in Drive wertlos — auch fuer Google, auch fuer uns.
//
// Umfang der Berechtigung: `drive.file`. Das ist die engste Drive-Freigabe,
// die es gibt — die App sieht ausschliesslich Dateien, die sie selbst
// angelegt hat. Deine uebrigen Drive-Inhalte bleiben unsichtbar; es gibt
// keine technische Moeglichkeit, sie zu lesen.

(function (global) {
    'use strict';

    function L(de, en) { return document.documentElement.lang === 'en' ? en : de; }

    // ── Konfiguration ─────────────────────────────────────────────────
    // Die OAuth-Client-ID gehoert zum Google-Cloud-Projekt des Betreibers.
    // Sie ist KEIN Geheimnis (sie steht in jedem OAuth-Request im Klartext),
    // darf also im Quelltext stehen. Ohne sie bleibt die Funktion sichtbar,
    // aber deaktiviert — mit einer Anleitung statt einer Fehlermeldung.
    const CLIENT_ID = '';

    // Zum Ausprobieren vor dem Deploy: eigene ID im Browser hinterlegen.
    const CLIENT_ID_KEY = 'schatten_gdrive_client_id';
    const LAST_BACKUP_KEY = 'schatten_gdrive_last';
    const FOLDER_ID_KEY = 'schatten_gdrive_folder';

    const SCOPE = 'https://www.googleapis.com/auth/drive.file';
    const GIS_SRC = 'https://accounts.google.com/gsi/client';
    const FOLDER_NAME = 'MyWorkLog Schatten-Berichtsheft';
    // Ab dieser Groesse lohnt der mehrstufige Upload. Darunter ist ein
    // einzelner Request schneller.
    const RESUMABLE_THRESHOLD = 4 * 1024 * 1024;
    const CHUNK_SIZE = 8 * 1024 * 1024;   // Vielfaches von 256 KB, wie von Drive verlangt

    function clientId() {
        try { return localStorage.getItem(CLIENT_ID_KEY) || CLIENT_ID; }
        catch (e) { return CLIENT_ID; }
    }
    function isConfigured() { return !!clientId(); }

    // ── Zugriffstoken ─────────────────────────────────────────────────
    // Das Token bleibt AUSSCHLIESSLICH im Arbeitsspeicher. Es in
    // localStorage zu legen waere bequem und falsch: ein Token ist ein
    // Schluessel zum Drive-Ordner, und dieses Geraet gehoert vielleicht dem
    // Arbeitgeber. Nach dem Neuladen wird neu autorisiert — bei bereits
    // erteilter Zustimmung ohne Rueckfrage.
    let accessToken = null;
    let tokenExpiry = 0;
    let tokenClient = null;
    let gisLoading = null;

    function hasValidToken() { return !!accessToken && Date.now() < tokenExpiry - 60000; }

    function loadGis() {
        if (global.google && global.google.accounts && global.google.accounts.oauth2) return Promise.resolve();
        if (gisLoading) return gisLoading;
        gisLoading = new Promise(function (resolve, reject) {
            const s = document.createElement('script');
            s.src = GIS_SRC;
            s.async = true;
            s.defer = true;
            s.onload = function () { resolve(); };
            s.onerror = function () {
                gisLoading = null;
                reject(new Error('gis-load-failed'));
            };
            document.head.appendChild(s);
        });
        return gisLoading;
    }

    // interactive=false versucht die stille Verlaengerung; scheitert sie,
    // fragt der Aufrufer mit interactive=true nach.
    async function requestToken(interactive) {
        if (hasValidToken()) return accessToken;
        if (!isConfigured()) throw new Error('not-configured');
        await loadGis();

        return new Promise(function (resolve, reject) {
            if (!tokenClient) {
                tokenClient = global.google.accounts.oauth2.initTokenClient({
                    client_id: clientId(),
                    scope: SCOPE,
                    callback: function () {}   // pro Aufruf gesetzt
                });
            }
            tokenClient.callback = function (resp) {
                if (resp && resp.access_token) {
                    accessToken = resp.access_token;
                    tokenExpiry = Date.now() + (parseInt(resp.expires_in, 10) || 3600) * 1000;
                    resolve(accessToken);
                } else {
                    reject(new Error((resp && resp.error) || 'no-token'));
                }
            };
            tokenClient.error_callback = function (err) {
                reject(new Error((err && err.type) || 'popup-failed'));
            };
            try {
                tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
            } catch (e) { reject(e); }
        });
    }

    function forgetToken() {
        accessToken = null;
        tokenExpiry = 0;
    }

    async function api(path, options) {
        options = options || {};
        const headers = Object.assign({ Authorization: 'Bearer ' + accessToken }, options.headers || {});
        const res = await fetch(path, Object.assign({}, options, { headers: headers }));
        if (res.status === 401) {
            // Token abgelaufen oder zurueckgezogen — einmal still erneuern.
            forgetToken();
            await requestToken(false);
            const retryHeaders = Object.assign({ Authorization: 'Bearer ' + accessToken }, options.headers || {});
            return fetch(path, Object.assign({}, options, { headers: retryHeaders }));
        }
        return res;
    }

    // ── Ordner ────────────────────────────────────────────────────────
    // Die gemerkte Ordner-ID wird verifiziert, nicht geglaubt: Nutzer
    // loeschen Ordner. Ist sie tot, wird neu gesucht bzw. angelegt.
    async function ensureFolder() {
        let cached = null;
        try { cached = localStorage.getItem(FOLDER_ID_KEY); } catch (e) {}
        if (cached) {
            const check = await api('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(cached) + '?fields=id,trashed');
            if (check.ok) {
                const f = await check.json();
                if (f && f.id && !f.trashed) return f.id;
            }
        }
        const q = encodeURIComponent(
            "mimeType='application/vnd.google-apps.folder' and name='" + FOLDER_NAME.replace(/'/g, "\\'") + "' and trashed=false");
        const found = await api('https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id)&pageSize=1');
        if (found.ok) {
            const data = await found.json();
            if (data.files && data.files.length) {
                try { localStorage.setItem(FOLDER_ID_KEY, data.files[0].id); } catch (e) {}
                return data.files[0].id;
            }
        }
        const made = await api('https://www.googleapis.com/drive/v3/files?fields=id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
        });
        if (!made.ok) throw new Error('folder-failed');
        const folder = await made.json();
        try { localStorage.setItem(FOLDER_ID_KEY, folder.id); } catch (e) {}
        return folder.id;
    }

    // ── Upload ────────────────────────────────────────────────────────
    // Mehrstufig ab RESUMABLE_THRESHOLD: Ein Tresor mit Videos und Scans
    // kann hunderte MB gross sein, und ein einzelner Request darueber ist bei
    // Mobilfunk eine Wette. Der mehrstufige Weg liefert ausserdem echten
    // Fortschritt statt eines geschaetzten Balkens.
    async function uploadResumable(folderId, name, blob, onProgress) {
        const init = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,createdTime', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': 'application/json',
                'X-Upload-Content-Length': String(blob.size)
            },
            body: JSON.stringify({ name: name, parents: [folderId], mimeType: 'application/json' })
        });
        if (!init.ok) throw new Error('upload-init-failed');
        const session = init.headers.get('Location');
        if (!session) throw new Error('no-session');

        let offset = 0;
        while (offset < blob.size) {
            const end = Math.min(offset + CHUNK_SIZE, blob.size);
            const chunk = blob.slice(offset, end);
            const res = await fetch(session, {
                method: 'PUT',
                headers: { 'Content-Range': 'bytes ' + offset + '-' + (end - 1) + '/' + blob.size },
                body: chunk
            });
            if (res.status === 200 || res.status === 201) {
                if (onProgress) onProgress(blob.size, blob.size);
                return await res.json();
            }
            if (res.status !== 308) throw new Error('upload-chunk-failed');
            // Drive sagt selbst, wie weit es gekommen ist — dieser Zahl
            // folgen statt der eigenen Annahme.
            const range = res.headers.get('Range');
            offset = range ? parseInt(range.split('-')[1], 10) + 1 : end;
            if (onProgress) onProgress(offset, blob.size);
        }
        throw new Error('upload-incomplete');
    }

    async function uploadSimple(folderId, name, blob, onProgress) {
        const meta = { name: name, parents: [folderId], mimeType: 'application/json' };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
        form.append('file', blob);
        const res = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime', {
            method: 'POST',
            body: form
        });
        if (!res.ok) throw new Error('upload-failed');
        if (onProgress) onProgress(blob.size, blob.size);
        return await res.json();
    }

    async function uploadBlob(name, blob, onProgress) {
        const folderId = await ensureFolder();
        return blob.size >= RESUMABLE_THRESHOLD
            ? uploadResumable(folderId, name, blob, onProgress)
            : uploadSimple(folderId, name, blob, onProgress);
    }

    async function listBackups() {
        const folderId = await ensureFolder();
        const q = encodeURIComponent("'" + folderId + "' in parents and trashed=false");
        const res = await api('https://www.googleapis.com/drive/v3/files?q=' + q +
            '&fields=files(id,name,size,createdTime)&orderBy=createdTime desc&pageSize=100');
        if (!res.ok) throw new Error('list-failed');
        const data = await res.json();
        return data.files || [];
    }

    async function downloadBackup(fileId) {
        const res = await api('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media');
        if (!res.ok) throw new Error('download-failed');
        return await res.text();
    }

    async function deleteBackup(fileId) {
        const res = await api('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId), { method: 'DELETE' });
        if (!res.ok && res.status !== 404) throw new Error('delete-failed');
        return true;
    }

    async function usage() {
        const res = await api('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user(emailAddress)');
        if (!res.ok) return null;
        return await res.json();
    }

    function lastBackupAt() {
        try { return localStorage.getItem(LAST_BACKUP_KEY) || null; } catch (e) { return null; }
    }
    function noteBackup(iso) {
        try { localStorage.setItem(LAST_BACKUP_KEY, iso); } catch (e) {}
    }

    // Trennt die Verbindung wirklich, statt nur lokal zu vergessen: Der
    // Widerruf beim Anbieter ist der einzige Weg, der auch dann greift, wenn
    // jemand anderes an diesem Browser sitzt.
    async function disconnect() {
        const token = accessToken;
        forgetToken();
        try { localStorage.removeItem(FOLDER_ID_KEY); } catch (e) {}
        if (token && global.google && global.google.accounts && global.google.accounts.oauth2) {
            return new Promise(function (resolve) {
                try { global.google.accounts.oauth2.revoke(token, function () { resolve(true); }); }
                catch (e) { resolve(false); }
            });
        }
        return false;
    }

    global.SchattenDrive = {
        isConfigured: isConfigured,
        clientId: clientId,
        setClientId: function (id) {
            try {
                if (id) localStorage.setItem(CLIENT_ID_KEY, id.trim());
                else localStorage.removeItem(CLIENT_ID_KEY);
            } catch (e) {}
            tokenClient = null;
            forgetToken();
        },
        connect: function (interactive) { return requestToken(interactive !== false); },
        isConnected: hasValidToken,
        disconnect: disconnect,
        uploadBlob: uploadBlob,
        listBackups: listBackups,
        downloadBackup: downloadBackup,
        deleteBackup: deleteBackup,
        usage: usage,
        lastBackupAt: lastBackupAt,
        noteBackup: noteBackup,
        folderName: FOLDER_NAME,
        L: L
    };
})(window);
