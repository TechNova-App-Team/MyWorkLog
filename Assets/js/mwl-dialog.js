// ═══ MWL-DIALOG ═══
// Rueckfrage und Hinweis als Dialog der Seite — Ersatz fuer window.confirm
// und window.alert auf den Standalone-Seiten.
//
// Warum eigenstaendig statt Klassen der jeweiligen Seite: die Seiten unter
// pages/ teilen sich weder Knopf-Klassen noch alle Farb-Tokens (die App kennt
// `--bg-card` nicht, das Berichtsheft kein `--bg-elevated`). Der Dialog bringt
// deshalb seine eigenen Regeln mit und liest Tokens NUR mit Rueckfallwert —
// ein undefiniertes var() ohne Fallback ergibt `transparent`, und ein
// durchsichtiger Dialog ueber Text ist unlesbar, ohne dass ein Fehler faellt.
//
// Die App (index.html) benutzt das hier NICHT: dort gibt es showCustomConfirm
// mit eigenem Markup in modals.html.

(function () {
    'use strict';

    const STIL_ID = 'mwlDialogStyle';

    function stilEinbauen() {
        if (document.getElementById(STIL_ID)) return;
        const s = document.createElement('style');
        s.id = STIL_ID;
        s.textContent = `
        .mwlc-overlay {
            position: fixed; inset: 0; z-index: 100000;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            padding: 24px 20px; overflow-y: auto;
            opacity: 0; pointer-events: none; transition: opacity 0.2s ease;
        }
        .mwlc-overlay.is-open { opacity: 1; pointer-events: all; }
        .mwlc-box {
            width: 100%; max-width: 460px;
            /* 🔴 Zwei Ebenen, und die untere ist der einzige deckende Anteil.
               Die Flaechen-Tokens der Seiten sind teils DURCHSICHTIG gedacht
               (--bg-card ist im Vertrags-Manager rgba(255,255,255,0.024)) — sie
               sitzen dort auf dem Seitenhintergrund. Als alleinige Flaeche
               eines Dialogs ueber abgedunkeltem Inhalt waeren sie unsichtbar. */
            background: var(--bg-deep, var(--bg-0, #0a0a12));
            background:
                linear-gradient(var(--bg-surface, var(--bg-2, var(--bg-card, transparent))),
                                var(--bg-surface, var(--bg-2, var(--bg-card, transparent)))),
                var(--bg-deep, var(--bg-0, #0a0a12));
            border: 1px solid var(--border, rgba(255,255,255,0.10));
            border-radius: 16px; padding: 24px;
            box-shadow: 0 24px 60px rgba(0,0,0,0.45);
            color: var(--text-main, var(--text-0, #e8e8ea));
            font-family: var(--font-main, var(--font-body, system-ui, -apple-system, sans-serif));
            transform: translateY(8px) scale(0.99);
            transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .mwlc-overlay.is-open .mwlc-box { transform: none; }
        .mwlc-head { display: flex; align-items: flex-start; gap: 14px; }
        .mwlc-icon {
            flex-shrink: 0; width: 38px; height: 38px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            background: rgba(var(--primary-rgb, 139,92,246), 0.12);
            color: var(--primary, #8b5cf6);
        }
        .mwlc-box.is-danger .mwlc-icon {
            background: rgba(var(--danger-rgb, 248,113,113), 0.12);
            color: var(--danger, #f87171);
        }
        .mwlc-icon svg { width: 19px; height: 19px; }
        .mwlc-title {
            margin: 0 0 6px; font-size: 1.02rem; font-weight: 700; line-height: 1.35;
            font-family: var(--font-display, inherit);
            color: var(--text-main, var(--text-0, #e8e8ea));
        }
        .mwlc-text {
            margin: 0; font-size: 0.86rem; line-height: 1.6;
            color: var(--text-secondary, var(--text-1, var(--text-muted, #a1a1aa)));
        }
        .mwlc-code {
            margin-top: 8px; font-family: var(--font-mono, ui-monospace, Menlo, monospace);
            letter-spacing: 0.04em; color: var(--text-main, var(--text-0, #e8e8ea));
        }
        .mwlc-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 22px; }
        .mwlc-btn {
            padding: 9px 16px; border-radius: 8px; font-size: 0.82rem; font-weight: 600;
            font-family: inherit; line-height: 1.4; cursor: pointer;
            border: 1px solid transparent; transition: background 0.15s ease, border-color 0.15s ease;
        }
        .mwlc-btn--ghost {
            background: transparent; color: var(--text-secondary, var(--text-1, #a1a1aa));
            border-color: var(--border, rgba(255,255,255,0.12));
        }
        .mwlc-btn--ghost:hover {
            background: var(--bg-hover, rgba(255,255,255,0.06));
            color: var(--text-main, var(--text-0, #e8e8ea));
        }
        .mwlc-btn--primary { background: var(--primary, #8b5cf6); color: #fff; }
        .mwlc-btn--primary:hover { filter: brightness(1.08); }
        .mwlc-btn--danger {
            background: rgba(var(--danger-rgb, 248,113,113), 0.12);
            color: var(--danger, #f87171);
            border-color: rgba(var(--danger-rgb, 248,113,113), 0.28);
        }
        .mwlc-btn--danger:hover { background: rgba(var(--danger-rgb, 248,113,113), 0.20); }
        @media (max-width: 480px) {
            .mwlc-actions { flex-direction: column-reverse; }
            .mwlc-btn { width: 100%; }
        }`;
        document.head.appendChild(s);
    }

    const WARN_SVG = '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>'
        + '<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
    const INFO_SVG = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>';

    // opts: {title, text, code, confirmText, cancelText, danger, alert}
    // Rueckgabe: Promise<boolean>. `alert: true` zeigt nur einen Knopf.
    function mwlConfirm(opts) {
        const o = typeof opts === 'string' ? { text: opts } : (opts || {});
        const en = document.documentElement.lang === 'en';
        const gefahr = o.alert ? false : o.danger !== false;
        const titel = o.title || (en ? 'Are you sure?' : 'Sicher?');
        const jaText = o.confirmText
            || (o.alert ? (en ? 'Got it' : 'Verstanden') : (en ? 'Confirm' : 'Bestätigen'));
        const neinText = o.cancelText || (en ? 'Cancel' : 'Abbrechen');

        stilEinbauen();

        return new Promise(resolve => {
            const vorherFokus = document.activeElement;

            const overlay = document.createElement('div');
            overlay.className = 'mwlc-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');

            const box = document.createElement('div');
            box.className = 'mwlc-box' + (gefahr ? ' is-danger' : '');

            const head = document.createElement('div');
            head.className = 'mwlc-head';
            head.innerHTML = '<div class="mwlc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                + 'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
                + (gefahr ? WARN_SVG : INFO_SVG) + '</svg></div>';

            const textBox = document.createElement('div');
            const h = document.createElement('h3');
            h.className = 'mwlc-title';
            h.textContent = titel;
            const p = document.createElement('p');
            p.className = 'mwlc-text';
            // Ueber textContent, damit ein Name oder Code aus den Daten nichts aufmachen kann.
            p.textContent = o.text || '';
            textBox.appendChild(h);
            textBox.appendChild(p);
            if (o.code) {
                const c = document.createElement('p');
                c.className = 'mwlc-text mwlc-code';
                c.textContent = o.code;
                textBox.appendChild(c);
            }
            head.appendChild(textBox);

            const actions = document.createElement('div');
            actions.className = 'mwlc-actions';
            const nein = document.createElement('button');
            nein.type = 'button';
            nein.className = 'mwlc-btn mwlc-btn--ghost';
            nein.textContent = neinText;
            // Beim Hinweis gibt es nichts zu entscheiden — ein zweiter Knopf
            // waere eine Scheinwahl.
            if (o.alert) nein.hidden = true;
            const ja = document.createElement('button');
            ja.type = 'button';
            ja.className = 'mwlc-btn ' + (gefahr ? 'mwlc-btn--danger' : 'mwlc-btn--primary');
            ja.textContent = jaText;
            actions.appendChild(nein);
            actions.appendChild(ja);

            box.appendChild(head);
            box.appendChild(actions);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            // Erst im naechsten Frame, sonst gibt es keinen Zustandswechsel
            // und damit keine Einblendung.
            requestAnimationFrame(() => overlay.classList.add('is-open'));
            const vorherOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            ja.focus();

            function schliessen(antwort) {
                document.removeEventListener('keydown', taste, true);
                overlay.remove();
                // Nur freigeben, wenn kein anderer Dialog mehr offen ist — diese
                // Rueckfrage wird oft AUS einem heraus gestellt.
                if (!document.querySelector('.mwlc-overlay, .modal.active')) {
                    document.body.style.overflow = vorherOverflow;
                }
                if (vorherFokus && typeof vorherFokus.focus === 'function') {
                    try { vorherFokus.focus(); } catch (e) { /* Element ist weg */ }
                }
                resolve(antwort);
            }

            // 🔴 JEDE Taste wird in der Capture-Phase gestoppt, nicht nur die
            // drei, die der Dialog selbst braucht. Grund: die Seiten hier haben
            // Buchstaben-Kuerzel (N/E/T im Berichtsheft), und deren Torwaechter
            // fragt nur nach Eingabefeldern und nach ".modal.active" — der Fokus
            // liegt im Dialog aber auf einem BUTTON, und diese Klasse traegt er
            // nicht. Ohne den Riegel legt ein Tastendruck waehrend der Rueckfrage
            // einen zweiten Dialog dahinter, den niemand sieht.
            function taste(e) {
                e.stopPropagation();
                if (e.key === 'Escape') { e.preventDefault(); schliessen(false); }
                else if (e.key === 'Enter' || e.key === ' ') {
                    // Leertaste nur, wenn kein Knopf den Fokus hat — sonst
                    // loest sie den Knopf ohnehin selbst aus (und zweimal waere
                    // einmal zu viel).
                    if (e.key === ' ' && (document.activeElement === ja || document.activeElement === nein)) return;
                    e.preventDefault();
                    schliessen(true);
                }
                else if (e.key === 'Tab') {
                    e.preventDefault();
                    if (o.alert) ja.focus();
                    else (document.activeElement === ja ? nein : ja).focus();
                }
            }

            document.addEventListener('keydown', taste, true);
            nein.onclick = () => schliessen(false);
            ja.onclick = () => schliessen(true);
            overlay.onclick = (e) => { if (e.target === overlay) schliessen(o.alert ? true : false); };
        });
    }

    function mwlAlert(title, text) {
        return mwlConfirm({ title: title, text: text, alert: true });
    }

    window.mwlConfirm = mwlConfirm;
    window.mwlAlert = mwlAlert;
})();
