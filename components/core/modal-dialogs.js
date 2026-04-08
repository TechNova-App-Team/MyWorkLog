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