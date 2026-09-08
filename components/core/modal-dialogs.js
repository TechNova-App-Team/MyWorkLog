// ═══ CORE: MODAL-DIALOGS ═══
    let customModalResolve = null;

    // Replaced: showCustomMessage öffnet KEIN Modal mehr — top-rechts Toast.
    // Vorher kollidierte das Message-Modal mit Settings (gleiche z-index 200 → versteckt).
    // Toast lebt auf z-index 99999 → immer sichtbar, egal wie viele Modals offen sind.
    function showCustomMessage(title, message, type = 'info') {
        if (!document.getElementById('appToastStyle')) {
            const style = document.createElement('style');
            style.id = 'appToastStyle';
            style.textContent = `
                #appToastContainer {
                    position: fixed;
                    top: 16px;
                    right: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    z-index: 99999;
                    pointer-events: none;
                    max-width: calc(100vw - 32px);
                }
                .app-toast {
                    pointer-events: auto;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    width: 360px;
                    max-width: 100%;
                    padding: 14px 16px;
                    background: #14141a;
                    border: 1px solid rgba(255,255,255,0.10);
                    border-radius: 12px;
                    box-shadow: 0 12px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25);
                    color: var(--text-main);
                    font-family: var(--font-main);
                    opacity: 0;
                    transform: translateY(-8px);
                    transition: opacity 0.22s ease, transform 0.22s ease;
                }
                .app-toast.app-toast-visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                .app-toast.app-toast-hiding {
                    opacity: 0;
                    transform: translateY(-8px);
                }
                .app-toast-icon {
                    flex-shrink: 0;
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .app-toast-icon svg { width: 16px; height: 16px; }
                .app-toast-body { flex: 1; min-width: 0; }
                .app-toast-title {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-main);
                    line-height: 1.3;
                    margin-bottom: 2px;
                    letter-spacing: -0.005em;
                }
                .app-toast-msg {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    line-height: 1.45;
                    word-wrap: break-word;
                }
                .app-toast-msg:empty { display: none; }
                .app-toast-close {
                    flex-shrink: 0;
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.4);
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 4px;
                    transition: color 0.15s ease, background 0.15s ease;
                }
                .app-toast-close:hover {
                    color: var(--text-main);
                    background: rgba(255,255,255,0.06);
                }
                .app-toast-close svg { width: 14px; height: 14px; display: block; }
                .app-toast-success .app-toast-icon { background: rgba(16,185,129,0.14); color: #10b981; }
                .app-toast-success { border-color: rgba(16,185,129,0.28); }
                .app-toast-error .app-toast-icon { background: rgba(239,68,68,0.14); color: #ef4444; }
                .app-toast-error { border-color: rgba(239,68,68,0.28); }
                .app-toast-info .app-toast-icon { background: rgba(var(--primary-rgb),0.14); color: var(--primary); }
                .app-toast-info { border-color: rgba(var(--primary-rgb),0.28); }
                @media (max-width: 540px) {
                    #appToastContainer {
                        top: auto;
                        bottom: 80px;
                        right: 12px;
                        left: 12px;
                        max-width: none;
                    }
                    .app-toast { width: 100%; }
                }
            `;
            document.head.appendChild(style);
        }

        let container = document.getElementById('appToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'appToastContainer';
            document.body.appendChild(container);
        }

        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
            error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        const closeSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

        const t = (type === 'success' || type === 'error') ? type : 'info';
        // Lege fest: Title-Strings wie "❌ Fehler" oder "✅ Erfolg" → Leading-Emoji weg,
        // weil die Toast-Variante bereits ein farbiges SVG-Icon vorne hat.
        const cleanTitle = String(title || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim();

        const toast = document.createElement('div');
        toast.className = `app-toast app-toast-${t}`;
        toast.innerHTML = `
            <div class="app-toast-icon">${icons[t]}</div>
            <div class="app-toast-body">
                <div class="app-toast-title"></div>
                <div class="app-toast-msg"></div>
            </div>
            <button class="app-toast-close" aria-label="Schließen">${closeSvg}</button>
        `;
        toast.querySelector('.app-toast-title').textContent = cleanTitle;
        toast.querySelector('.app-toast-msg').textContent = String(message || '');
        container.appendChild(toast);

        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('app-toast-visible')));

        let hideTimer;
        const hide = () => {
            if (toast.classList.contains('app-toast-hiding')) return;
            clearTimeout(hideTimer);
            toast.classList.add('app-toast-hiding');
            setTimeout(() => toast.remove(), 240);
        };
        toast.querySelector('.app-toast-close').onclick = hide;
        hideTimer = setTimeout(hide, t === 'error' ? 5000 : 3500);
    }

    function showCustomConfirm(title, message, onConfirm, onCancel, opts) {
        const modal = document.getElementById('customMessageModal');
        const titleEl = document.getElementById('customMessageTitle');
        const contentEl = document.getElementById('customMessageContent');
        const confirmBtn = document.getElementById('customMessageBtnConfirm');
        const cancelBtn = document.getElementById('customMessageBtnCancel');
        const inputEl = document.getElementById('customMessageInput');

        const o = opts || {};
        titleEl.innerText = title;
        contentEl.innerText = message;
        titleEl.style.color = o.danger ? 'var(--danger)' : 'var(--primary)';
        confirmBtn.style.background = o.danger ? 'var(--danger)' : 'var(--primary)';
        confirmBtn.innerText = o.confirmText || 'OK';
        cancelBtn.innerText = o.cancelText || 'Abbrechen';
        if (inputEl) inputEl.style.display = 'none';

        customModalCallback = { onConfirm, onCancel };

        cancelBtn.style.display = 'block';
        // z-index Bump damit Confirm über offenem Settings-Modal landet.
        modal.style.zIndex = '9999';
        modal.classList.add('active');
        confirmBtn.focus();
        bindCustomModalKeys();
    }

    // Escape bricht ab, Enter bestaetigt — das konnte `confirm()` von Haus aus,
    // und ohne diese zwei Tasten fuehlt sich der eigene Dialog wie ein Rueckschritt
    // an. In der Capture-Phase, damit die Tastenkuerzel der App nicht zusaetzlich
    // feuern, solange die Rueckfrage offen steht.
    let customModalKeyHandler = null;
    function bindCustomModalKeys() {
        if (customModalKeyHandler) return;
        customModalKeyHandler = function (e) {
            const inputEl = document.getElementById('customMessageInput');
            if (inputEl && inputEl.style.display !== 'none' && e.target === inputEl) return;  // das Feld regelt sich selbst
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCustomModal(false); }
            else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); closeCustomModal(true); }
        };
        document.addEventListener('keydown', customModalKeyHandler, true);
    }
    function unbindCustomModalKeys() {
        if (!customModalKeyHandler) return;
        document.removeEventListener('keydown', customModalKeyHandler, true);
        customModalKeyHandler = null;
    }

    // Dieselbe Rueckfrage als Promise. `showCustomConfirm` arbeitet mit
    // Rueckrufen; das passt nicht auf die Stellen, die frueher
    // `if (!confirm(...)) return;` mitten in einer Funktion stehen hatten —
    // dort wird der Rest sonst zur verschachtelten Fortsetzung. Mit
    // `if (!await appConfirm(...)) return;` bleibt der Ablauf, wie er war.
    function appConfirm(title, message, opts) {
        return new Promise(resolve => {
            showCustomConfirm(title, message, () => resolve(true), () => resolve(false), opts);
        });
    }

    // Ersatz fuer window.prompt: derselbe Dialog, nur mit Eingabefeld.
    // Gibt ein Promise auf den Text (oder null bei Abbruch) zurueck — die
    // Aufrufstellen lesen sich damit fast wie vorher (`await showCustomPrompt(...)`
    // statt `prompt(...)`), und der Rueckgabewert hat dieselbe Bedeutung:
    // null = abgebrochen, '' = leer bestaetigt.
    function showCustomPrompt(title, message, defaultValue, opts) {
        const modal = document.getElementById('customMessageModal');
        const titleEl = document.getElementById('customMessageTitle');
        const contentEl = document.getElementById('customMessageContent');
        const confirmBtn = document.getElementById('customMessageBtnConfirm');
        const cancelBtn = document.getElementById('customMessageBtnCancel');
        const inputEl = document.getElementById('customMessageInput');
        const o = opts || {};

        titleEl.innerText = title;
        contentEl.innerText = message || '';
        titleEl.style.color = 'var(--primary)';
        confirmBtn.style.background = 'var(--primary)';
        confirmBtn.innerText = o.confirmText || 'OK';
        cancelBtn.innerText = o.cancelText || 'Abbrechen';
        cancelBtn.style.display = 'block';

        inputEl.style.display = 'block';
        inputEl.value = defaultValue == null ? '' : String(defaultValue);
        inputEl.placeholder = o.placeholder || '';
        // Enter im Feld bestaetigt. Ohne das muss man mit der Maus zum Knopf —
        // bei window.prompt reichte die Eingabetaste, und genau das erwartet man.
        inputEl.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); closeCustomModal(true); }
            else if (e.key === 'Escape') { e.preventDefault(); closeCustomModal(false); }
        };

        modal.style.zIndex = '9999';
        modal.classList.add('active');
        setTimeout(() => { inputEl.focus(); inputEl.select(); }, 40);
        bindCustomModalKeys();

        return new Promise(resolve => { customModalResolve = resolve; });
    }

    function closeCustomModal(confirmed) {
        const modal = document.getElementById('customMessageModal');
        const inputEl = document.getElementById('customMessageInput');
        modal.classList.remove('active');
        modal.style.zIndex = '';
        unbindCustomModalKeys();

        // Erst den Wert sichern, dann das Feld raeumen: der naechste Dialog
        // erbt sonst die Eingabe des vorigen.
        const wert = inputEl && inputEl.style.display !== 'none' ? inputEl.value : null;
        if (inputEl) { inputEl.style.display = 'none'; inputEl.onkeydown = null; inputEl.value = ''; }

        if (customModalResolve) {
            const r = customModalResolve;
            customModalResolve = null;
            r(confirmed ? (wert == null ? '' : wert) : null);
        }

        if (customModalCallback) {
            if (confirmed && customModalCallback.onConfirm) {
                customModalCallback.onConfirm();
            } else if (!confirmed && customModalCallback.onCancel) {
                customModalCallback.onCancel();
            }
            customModalCallback = null;
        }
    }

    function showSuccessToast(message, { icon = '✅', duration = 3200 } = {}) {
        const existing = document.getElementById('successToastEl');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'successToastEl';
        toast.innerHTML = `
            <span class="st-icon">${mwlIconFromEmoji(icon, 18)}</span>
            <span class="st-msg">${esc(message)}</span>
            <div class="st-bar"></div>
        `;

        const style = document.createElement('style');
        style.id = 'successToastStyle';
        if (!document.getElementById('successToastStyle')) {
            style.textContent = `
                #successToastEl {
                    position: fixed;
                    bottom: 88px;
                    left: 50%;
                    transform: translateX(-50%) translateY(20px);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(16, 185, 129, 0.12);
                    border: 1.5px solid rgba(16, 185, 129, 0.45);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border-radius: 14px;
                    padding: 13px 22px 20px 18px;
                    color: #ecfdf5;
                    font-size: 0.95rem;
                    font-weight: 500;
                    white-space: nowrap;
                    z-index: 99999;
                    box-shadow: 0 8px 40px rgba(16, 185, 129, 0.18), 0 2px 12px rgba(0,0,0,0.4);
                    opacity: 0;
                    transition: opacity 0.28s ease, transform 0.32s cubic-bezier(0.34,1.56,0.64,1);
                    overflow: hidden;
                    pointer-events: none;
                    max-width: 90vw;
                }
                #successToastEl.st-visible {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                #successToastEl.st-hiding {
                    opacity: 0;
                    transform: translateX(-50%) translateY(10px);
                    transition: opacity 0.4s ease, transform 0.4s ease;
                }
                #successToastEl .st-icon {
                    font-size: 1.25rem;
                    line-height: 1;
                    flex-shrink: 0;
                    filter: drop-shadow(0 0 6px rgba(16,185,129,0.6));
                }
                #successToastEl .st-msg {
                    color: #d1fae5;
                    letter-spacing: 0.01em;
                }
                #successToastEl .st-bar {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    width: 100%;
                    background: rgba(16, 185, 129, 0.55);
                    border-radius: 0 0 14px 14px;
                    transform-origin: left;
                    animation: st-shrink var(--st-dur, 3.2s) linear forwards;
                }
                @keyframes st-shrink {
                    from { transform: scaleX(1); }
                    to   { transform: scaleX(0); }
                }
                @media (max-width: 600px) {
                    #successToastEl {
                        bottom: 76px;
                        font-size: 0.88rem;
                        padding: 11px 16px 18px 14px;
                        border-radius: 12px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        toast.style.setProperty('--st-dur', (duration / 1000) + 's');
        document.body.appendChild(toast);

        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('st-visible')));

        const hideTimer = setTimeout(() => {
            toast.classList.add('st-hiding');
            setTimeout(() => toast.remove(), 450);
        }, duration);

        return () => { clearTimeout(hideTimer); toast.remove(); };
    }
