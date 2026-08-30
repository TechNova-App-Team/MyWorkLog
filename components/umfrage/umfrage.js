// ═══ UMFRAGE MODULE ═══
// Preis-/Feature-Abstimmung. Stimmen gehen an den Worker (/umfrage) und
// landen dort in KV. Kein PostHog-Event: Adblocker wuerden ausgerechnet die
// datenschutzbewussten Nutzer wegfiltern — also genau die Gruppe, die am
// ehesten "soll kostenlos bleiben" waehlt. Das waere keine Streuung, sondern
// eine Verzerrung in die Richtung, die hier gemessen werden soll.

    // Eigener Pfad am bestehenden Worker. NICHT /vote, /stats o.ae. nennen —
    // Adblocker matchen den Pfad, nicht die Absicht (siehe CLAUDE.md).
    const UMFRAGE_ENDPOINT = 'https://ai-proxy.myworklog.de/umfrage';

    const UMF_LS_VOTED     = 'mwl_umfrage_voted';
    const UMF_LS_DISMISSED = 'mwl_umfrage_dismissed';

    function umfHasVoted()    { try { return !!localStorage.getItem(UMF_LS_VOTED); }     catch (e) { return false; } }
    function umfDismissed()   { try { return !!localStorage.getItem(UMF_LS_DISMISSED); } catch (e) { return false; } }

    // Der Banner fragt nach Zahlungsbereitschaft. Wer die App noch nie benutzt hat,
    // kann die Frage nicht beantworten - und bei einem Erstbesucher waere sie die
    // allererste Interaktion ueberhaupt. Also erst, wenn wirklich etwas erfasst ist.
    //
    // Bewusst ueber localStorage und ueber BEIDE Bestaende: diese Datei laeuft auf
    // vier Seiten (App, Berichtsheft, archflow/graph, repo-report). Das `data`-Global
    // gibt es nur in der App und landet nie auf `window` - ein `window.data`-Guard
    // waere hier immer falsch.
    //
    // Laesst sich der Bestand nicht lesen (kaputtes JSON), gilt "nicht gezeigt".
    // Bei einer Umfrage ist Stillschweigen der harmlosere Fehlschluss.
    function umfHatGenutzt() {
        try {
            const bh = JSON.parse(localStorage.getItem('berichtsheft_reports') || '[]');
            if (Array.isArray(bh) && bh.length > 0) return true;
        } catch (e) {}
        try {
            const d = JSON.parse(localStorage.getItem('tg_pro_data') || 'null');
            if (d && Array.isArray(d.entries) && d.entries.length > 0) return true;
        } catch (e) {}
        return false;
    }

    function openUmfrage() {
        const modal = document.getElementById('umfrageModal');
        if (!modal) return;
        // Zustand zuruecksetzen, damit ein zweiter Aufruf nicht im Fehler-Screen landet
        const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
        show('umfForm', !umfHasVoted());
        show('umfDone', umfHasVoted());
        show('umfFail', false);
        modal.classList.add('active');
        if (typeof mwlEvent === 'function') mwlEvent('umfrage_geoeffnet');
    }

    function closeUmfrage() {
        const modal = document.getElementById('umfrageModal');
        if (modal) modal.classList.remove('active');
    }

    // "Nicht teilnehmen" — Banner endgueltig weg, keine Stimme
    function dismissUmfrage() {
        try { localStorage.setItem(UMF_LS_DISMISSED, new Date().toISOString()); } catch (e) {}
        umfApplyBanner();
        closeUmfrage();
        if (typeof mwlEvent === 'function') mwlEvent('umfrage_abgelehnt');
    }

    function umfReadAnswers() {
        const features = [...document.querySelectorAll('#umfFeatures input[type="checkbox"]:checked')]
            .map(c => c.value);
        const pick = (sel) => { const el = document.querySelector(sel); return el ? el.value : null; };
        return {
            features:     features,
            price:        pick('#umfPrice input[name="umfPreis"]:checked'),
            // Zweimal dieselbe Skala: der Vergleich jetzt/dann ist die Aussage,
            // nicht der Einzelwert.
            nutzungJetzt: pick('#umfNutzungJetzt input[name="umfJetzt"]:checked'),
            nutzungDann:  pick('#umfNutzungDann input[name="umfDann"]:checked')
        };
    }

    async function submitUmfrage() {
        const btn = document.getElementById('umfSubmit');
        const ans = umfReadAnswers();

        if (!ans.features.length && !ans.price && !ans.nutzungJetzt && !ans.nutzungDann) {
            umfShowFail('Bitte wähle mindestens eine Antwort aus.');
            return;
        }

        const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
        show('umfFail', false);
        if (btn) { btn.disabled = true; btn.textContent = 'Wird gesendet …'; }

        // Eine Stimme pro Geraet: die ID liegt lokal, der Worker lehnt Duplikate ab.
        let voteId;
        try { voteId = localStorage.getItem('mwl_umfrage_id'); } catch (e) {}
        if (!voteId) {
            voteId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
            try { localStorage.setItem('mwl_umfrage_id', voteId); } catch (e) {}
        }

        try {
            const res = await fetch(UMFRAGE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    v: 1, id: voteId,
                    features: ans.features, price: ans.price,
                    nutzungJetzt: ans.nutzungJetzt, nutzungDann: ans.nutzungDann
                })
            });

            if (!res.ok) {
                // 429 kommt am Edge vorbei und traegt dann KEINE CORS-Header — das
                // landet im catch. Hier greift nur, was der Worker selbst schickt.
                let detail = '';
                try { detail = (await res.json()).error || ''; } catch (e) {}
                throw new Error(res.status === 429
                    ? 'Zu viele Anfragen. Bitte in ein paar Minuten nochmal.'
                    : (detail || ('Server antwortete mit ' + res.status)));
            }

            try { localStorage.setItem(UMF_LS_VOTED, new Date().toISOString()); } catch (e) {}
            show('umfForm', false);
            show('umfDone', true);
            umfApplyBanner();
            if (typeof mwlEvent === 'function') mwlEvent('umfrage_gesendet');

        } catch (err) {
            // TypeError = Netzwerk/CORS/Edge-Block. Der Status ist von hier aus
            // nicht lesbar, deshalb bewusst vage statt falsch konkret.
            const netz = (err instanceof TypeError);
            umfShowFail(netz
                ? 'Keine Verbindung zum Server. Entweder bist du offline, ein Blocker ist dazwischen, oder es kamen gerade zu viele Anfragen.'
                : err.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Antwort senden'; }
        }
    }

    function umfShowFail(msg) {
        const t = document.getElementById('umfFailText');
        if (t) t.textContent = msg;                     // textContent: kein HTML aus Fehlertexten
        const el = document.getElementById('umfFail');
        if (el) el.style.display = '';
    }

    // ── Banner (Dashboard + Berichtsheft) ─────────────────────────
    // Sichtbarkeit hat EINE Funktion, die nach jeder Aenderung laeuft —
    // nicht darauf verlassen, dass ein anderer Pfad das nachholt.
    //
    // Die Schwelle (umfHatGenutzt) kam dazu, als die Seite auf TikTok beworben
    // wurde: vorher lief der Banner bewusst ohne sie, was fuer Bestandsnutzer
    // richtig war, einem Erstbesucher aber als erstes eine Preisfrage vorlegte.
    function umfApplyBanner() {
        const banner = document.getElementById('umfrageBanner');
        if (!banner) return;
        const zeigen = umfHatGenutzt() && !umfHasVoted() && !umfDismissed();
        banner.style.display = zeigen ? 'flex' : 'none';
    }

    window.openUmfrage     = openUmfrage;
    window.closeUmfrage    = closeUmfrage;
    window.dismissUmfrage  = dismissUmfrage;
    window.submitUmfrage   = submitUmfrage;
    window.umfApplyBanner  = umfApplyBanner;

    // Script laedt per `defer`, DOM ist beim Ausfuehren bereits geparst —
    // direkt aufrufen statt auf ein Event zu warten, das laengst passiert ist.
    umfApplyBanner();
