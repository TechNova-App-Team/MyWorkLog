// ═══ CORE: MODAL-DIALOGS ═══
    let customModalResolve = null;

    function showCustomMessage(title, message, type = 'info') {
        const modal = document.getElementById('customMessageModal');
        const titleEl = document.getElementById('customMessageTitle');
        const contentEl = document.getElementById('customMessageContent');
        const confirmBtn = document.getElementById('customMessageBtnConfirm');
        const cancelBtn = document.getElementById('customMessageBtnCancel');

        titleEl.innerText = title;
        contentEl.innerText = message;
        
        if (type === 'error') {
            titleEl.style.color = 'var(--danger)';
            confirmBtn.style.background = 'var(--danger)';
        } else if (type === 'success') {
            titleEl.style.color = 'var(--success)';
            confirmBtn.style.background = 'var(--success)';
        } else {
            titleEl.style.color = 'var(--primary)';
            confirmBtn.style.background = 'var(--primary)';
        }
        
        cancelBtn.style.display = 'none';
        modal.classList.add('active');
        customModalResolve = null;
    }

    function showCustomConfirm(title, message, onConfirm, onCancel) {
        const modal = document.getElementById('customMessageModal');
        const titleEl = document.getElementById('customMessageTitle');
        const contentEl = document.getElementById('customMessageContent');
        const confirmBtn = document.getElementById('customMessageBtnConfirm');
        const cancelBtn = document.getElementById('customMessageBtnCancel');

        titleEl.innerText = title;
        contentEl.innerText = message;
        titleEl.style.color = 'var(--primary)';
        confirmBtn.style.background = 'var(--primary)';
        
        customModalCallback = { onConfirm, onCancel };
        
        cancelBtn.style.display = 'block';
        modal.classList.add('active');
    }

    function closeCustomModal(confirmed) {
        const modal = document.getElementById('customMessageModal');
        modal.classList.remove('active');

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
            <span class="st-icon">${icon}</span>
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