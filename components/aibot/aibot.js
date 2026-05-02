// === AI-BOT MODULE ===

// ===== AI-BOT FUNCTIONS =====
let aiBotConversation = [];

function initializeAIBot() {
    const chatContainer = document.getElementById('aiBotChat');
    if (!chatContainer) return;
    if (!localStorage.getItem('aiBotModalDismissed')) {
        showAIBotModal();
    }
    
    const existingMessages = chatContainer.querySelectorAll('div[data-message]');
    existingMessages.forEach(msg => msg.remove());
    
    addAIBotMessage('Willkommen! 👋 Ich helfe dir mit deinen Daten.', 'bot');
}

function showAIBotModal() {
    localStorage.removeItem('aiBotModalDismissed');
    
    const modal = document.getElementById('aiBotInfoModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
    }
}

function hideAIBotModal() {
    const modal = document.getElementById('aiBotInfoModal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
        
        const checkbox = document.getElementById('dontShowAIBotModal2');
        if (checkbox && checkbox.checked) {
            localStorage.setItem('aiBotModalDismissed', '1');
        }
    }
}

function addAIBotMessage(text, sender = 'bot') {
    const chatContainer = document.getElementById('aiBotChat');
    if (!chatContainer) return;
    
    const messageEl = document.createElement('div');
    messageEl.setAttribute('data-message', 'true');
    messageEl.style.display = 'flex';
    messageEl.style.gap = '0.75rem';
    messageEl.style.animation = 'fadeIn 0.3s ease';
    
    if (sender === 'bot') {
        messageEl.style.justifyContent = 'flex-start';
        messageEl.style.flexDirection = 'column';
        messageEl.style.alignItems = 'flex-start';
        const messageContent = document.createElement('div');
        messageContent.style.background = 'linear-gradient(135deg, rgba(var(--primary-rgb),0.12), rgba(var(--primary-rgb),0.05))';
        messageContent.style.padding = '1.2rem';
        messageContent.style.borderRadius = '0 16px 16px 16px';
        messageContent.style.maxWidth = '90%';
        messageContent.style.borderLeft = '4px solid var(--primary)';
        messageContent.style.boxShadow = '0 4px 16px rgba(var(--primary-rgb),0.1)';
        
        const textDiv = document.createElement('div');
        textDiv.style.color = 'var(--text-main)';
        textDiv.style.margin = '0';
        textDiv.style.fontSize = '0.95rem';
        textDiv.style.lineHeight = '1.6';
        textDiv.style.fontFamily = "'Courier New', monospace";
        textDiv.style.whiteSpace = 'pre-wrap';
        textDiv.style.wordWrap = 'break-word';
        
        messageContent.appendChild(textDiv);
        messageEl.appendChild(messageContent);
        chatContainer.appendChild(messageEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        typeMessage(text, textDiv, 15, () => {
            addQuickReplyButtons(messageEl);
        });
    } else {
        messageEl.style.justifyContent = 'flex-end';
        messageEl.innerHTML = `
            <div style="background:linear-gradient(135deg, var(--primary), #7c3aed); padding:1rem 1.2rem; border-radius:16px 0 16px 16px; max-width:85%; box-shadow: 0 4px 12px rgba(var(--primary-rgb),0.2);">
                <p style="color:white; margin:0; font-size:0.95rem; line-height:1.5;">${text}</p>
            </div>
        `;
        chatContainer.appendChild(messageEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    aiBotConversation.push({ sender, text });
}

function typeMessage(text, element, speed = 15, onComplete = null) {
    let index = 0;
    let displayedText = '';
    
    const parseAndDisplay = () => {
        if (index < text.length) {
            const char = text[index];
            displayedText += char;
            
            let formattedDisplay = displayedText;
            formattedDisplay = formattedDisplay.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--primary);">$1</strong>');
            formattedDisplay = formattedDisplay.replace(/• /g, '<span style="color:var(--primary);">▸ </span>');
            formattedDisplay = formattedDisplay.replace(/\n/g, '<br>');
            
            element.innerHTML = formattedDisplay;
            
            if (index === text.length - 1) {
                element.style.borderRight = 'none';
            } else {
                element.style.borderRight = '2px solid var(--primary)';
                element.style.animation = 'blink 0.7s infinite';
            }
            
            index++;
            setTimeout(parseAndDisplay, speed);
        } else {
            let finalText = text;
            finalText = finalText.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--primary);">$1</strong>');
            finalText = finalText.replace(/• /g, '<span style="color:var(--primary);">▸ </span>');
            finalText = finalText.replace(/\n/g, '<br>');
            element.innerHTML = finalText;
            element.style.borderRight = 'none';
            element.style.animation = 'none';
            
            if (onComplete) onComplete();
        }
    };
    
    parseAndDisplay();
}

function showThinkingIndicator() {
    const chatContainer = document.getElementById('aiBotChat');
    if (!chatContainer) return;
    
    const thinkingEl = document.createElement('div');
    thinkingEl.id = 'aibot-thinking';
    thinkingEl.setAttribute('data-message', 'true');
    thinkingEl.style.display = 'flex';
    thinkingEl.style.gap = '0.75rem';
    thinkingEl.style.animation = 'fadeIn 0.3s ease';
    thinkingEl.style.justifyContent = 'flex-start';
    
    thinkingEl.innerHTML = `
        <div style="background:linear-gradient(135deg, rgba(var(--primary-rgb),0.12), rgba(var(--primary-rgb),0.05)); padding:1.2rem; border-radius:0 16px 16px 16px; border-left:4px solid var(--primary); box-shadow: 0 4px 16px rgba(var(--primary-rgb),0.1); display:flex; align-items:center; gap:0.8rem;">
            <div style="display:flex; gap:0.4rem; animation: thinkingPulse 1.5s ease-in-out infinite;">
                <span style="width:8px; height:8px; border-radius:50%; background:var(--primary); animation: thinkingDots 1.4s ease-in-out infinite;" style="animation-delay:0s;"></span>
                <span style="width:8px; height:8px; border-radius:50%; background:var(--primary); animation: thinkingDots 1.4s ease-in-out infinite; animation-delay:0.2s;"></span>
                <span style="width:8px; height:8px; border-radius:50%; background:var(--primary); animation: thinkingDots 1.4s ease-in-out infinite; animation-delay:0.4s;"></span>
            </div>
            <span style="color:var(--text-main); font-size:0.95rem; font-weight:500; animation: thinkingFloat 2s ease-in-out infinite;">🧠 AI denkt nach...</span>
        </div>
    `;
    
    chatContainer.appendChild(thinkingEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeThinkingIndicator() {
    const thinkingEl = document.getElementById('aibot-thinking');
    if (thinkingEl) {
        thinkingEl.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => thinkingEl.remove(), 300);
    }
}

function addQuickReplyButtons(messageElement) {
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'quick-reply-buttons';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.gap = '0.35rem';
    buttonsContainer.style.marginTop = '0.5rem';
    buttonsContainer.style.marginLeft = '0rem';
    buttonsContainer.style.flexWrap = 'wrap';
    buttonsContainer.style.animation = 'fadeIn 0.3s ease 0.3s both';
    
    const suggestions = generateQuickReplies();
    
    suggestions.forEach((suggestion, index) => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply-btn';
        btn.style.background = 'transparent';
        btn.style.border = '1px solid rgba(var(--primary-rgb), 0.15)';
        btn.style.color = 'var(--text-muted)';
        btn.style.padding = '0.35rem 0.65rem';
        btn.style.borderRadius = '6px';
        btn.style.fontSize = '0.75rem';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.15s ease';
        btn.style.fontWeight = '400';
        btn.style.whiteSpace = 'nowrap';
        btn.textContent = suggestion;
        
        btn.onmouseover = () => {
            btn.style.background = 'rgba(var(--primary-rgb), 0.08)';
            btn.style.borderColor = 'rgba(var(--primary-rgb), 0.3)';
            btn.style.color = 'var(--text-main)';
        };
        
        btn.onmouseout = () => {
            btn.style.background = 'transparent';
            btn.style.borderColor = 'rgba(var(--primary-rgb), 0.15)';
            btn.style.color = 'var(--text-muted)';
        };
        
        btn.onclick = () => {
            document.getElementById('aiBotInput').value = suggestion;
            document.getElementById('aiBotInput').focus();
            sendAIBotMessage();
            document.querySelectorAll('.quick-reply-buttons').forEach(el => el.remove());
        };
        
        buttonsContainer.appendChild(btn);
    });
    
    messageElement.appendChild(buttonsContainer);
}

function generateQuickReplies() {
    const lastMessage = document.querySelectorAll('[data-message="true"]');
    const lastBotMessage = lastMessage.length > 1 ? lastMessage[lastMessage.length - 1].textContent : '';
    
    let suggestions = [];
    
    if (lastBotMessage.toLowerCase().includes('weekly') || lastBotMessage.toLowerCase().includes('wöchentlich')) {
        suggestions = ['📊 Mehr Details', '📈 Trend-Analyse', '💡 Tipps', '⬅️ Zurück'];
    } else if (lastBotMessage.toLowerCase().includes('monthly') || lastBotMessage.toLowerCase().includes('monatlich')) {
        suggestions = ['🎯 Ziele überprüfen', '📊 Wöchentliche Stats', '💬 Frage stellen', '⬅️ Zurück'];
    } else if (lastBotMessage.toLowerCase().includes('ziel') || lastBotMessage.toLowerCase().includes('goal')) {
        suggestions = ['🚀 Wie erreiche ich es?', '📈 Fortschritt', '🎯 Neue Ziele', '💡 Tipps'];
    } else if (lastBotMessage.toLowerCase().includes('fehler') || lastBotMessage.toLowerCase().includes('error')) {
        suggestions = ['🔧 Erneut versuchen', '❓ Hilfe', '📞 Support', '⬅️ Zurück'];
    } else {
        suggestions = ['📊 Meine Stats', '🎯 Ziele', '💡 Tipps', '❓ Hilfe'];
    }
    
    return suggestions;
}

function exportConversationTXT() {
    const conversation = aiBotConversation || [];
    if (conversation.length === 0) {
        showCustomMessage('⚠️ Keine Daten', 'Es gibt noch keine Konversation zum Exportieren!', 'warning');
        return;
    }
    
    let content = `═══════════════════════════════════════════════════════════════\n`;
    content += `AI-BOT CONVERSATION EXPORT\n`;
    content += `Datum: ${new Date().toLocaleString('de-DE')}\n`;
    content += `═══════════════════════════════════════════════════════════════\n\n`;
    
    conversation.forEach((msg, index) => {
        const timestamp = new Date(msg.timestamp).toLocaleTimeString('de-DE');
        content += `[${timestamp}] ${msg.sender === 'user' ? '👤 DU' : '🤖 AI-BOT'}:\n`;
        content += `${msg.text}\n`;
        content += `\n`;
    });
    
    content += `═══════════════════════════════════════════════════════════════\n`;
    content += `Gesamte Nachrichten: ${conversation.length}\n`;
    content += `Export erstellt: ${new Date().toLocaleString('de-DE')}\n`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `AI-Bot-Conversation-${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    showCustomMessage('✅ Exportiert', 'Conversation als TXT heruntergeladen!', 'success');
}

function exportConversationPDF() {
    const conversation = aiBotConversation || [];
    if (conversation.length === 0) {
        showCustomMessage('⚠️ Keine Daten', 'Es gibt noch keine Konversation zum Exportieren!', 'warning');
        return;
    }
    
    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = function() { exportConversationToPDF(); };
        s.onerror = function() { showCustomMessage('❌ Fehler', 'PDF-Bibliothek konnte nicht geladen werden.', 'error'); };
        document.head.appendChild(s);
        return;
    }
    
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('AI-BOT CONVERSATION EXPORT', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Erstellt: ${new Date().toLocaleString('de-DE')}`, 105, 22, { align: 'center' });
    
    doc.setDrawColor(168, 85, 247);
    doc.line(20, 25, 190, 25);
    
    let yPosition = 35;
    doc.setFontSize(10);
    doc.setTextColor(50);
    
    conversation.forEach((msg) => {
        const timestamp = new Date(msg.timestamp).toLocaleTimeString('de-DE');
        const sender = msg.sender === 'user' ? '👤 DU' : '🤖 AI-BOT';
        const label = `[${timestamp}] ${sender}:`;
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text(label, 20, yPosition);
        yPosition += 5;
        
        doc.setTextColor(50);
        doc.setFontSize(9);
        const splitText = doc.splitTextToSize(msg.text.replace(/<[^>]*>/g, ''), 170);
        const textHeight = splitText.length * 4;
        
        doc.text(splitText, 25, yPosition);
        yPosition += textHeight + 4;
        
        if (yPosition > 260) {
            doc.addPage();
            yPosition = 20;
        }
    });
    
    doc.setTextColor(150);
    doc.setFontSize(8);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Seite ${i} von ${pageCount}`, 105, 285, { align: 'center' });
    }
    
    doc.save(`AI-Bot-Conversation-${new Date().getTime()}.pdf`);
    
    showCustomMessage('✅ Exportiert', 'Conversation als PDF heruntergeladen!', 'success');
}

function clearConversation() {
    showCustomConfirm('🗑️ Chat löschen?', 'Willst du die komplette Konversation wirklich löschen? Das kann nicht rückgängig gemacht werden!', 
        () => {
            aiBotConversation = [];
            document.getElementById('aiBotChat').innerHTML = '';
            
            if (window.webLLMIntegration && typeof window.webLLMIntegration.clearConversation === 'function') {
                window.webLLMIntegration.clearConversation();
            }
            
            showCustomMessage('✅ Gelöscht', 'Chat wurde erfolgreich geleert! (Lokale AI-Bot & WebLLM Konversation)', 'success');
        }
    );
}

function sendAIBotMessage() {
    const input = document.getElementById('aiBotInput');
    if (!input || !input.value.trim()) return;
    uEvent('aibot-message');
    
    const message = input.value.trim();
    addAIBotMessage(message, 'user');
    input.value = '';
    
    showThinkingIndicator();
    
    const isWebLLMActive = window.webLLMIntegration && window.webLLMIntegration.isWebLLMActive;
    
    if (isWebLLMActive) {
        window.webLLMIntegration.generateResponse(message).then(response => {
            removeThinkingIndicator();
            addAIBotMessage(response, 'bot');
        }).catch(err => {
            console.error('[WebLLM] Error:', err);
            removeThinkingIndicator();
            addAIBotMessage('❌ Fehler bei WebLLM: ' + err.message, 'bot');
        });
    } else {
        const thinkingDelay = Math.random() * 2000 + 1500;
        setTimeout(() => {
            let response;
            try {
                if (typeof aiBotEnginePro !== 'undefined' && aiBotEnginePro && typeof aiBotEnginePro.generateResponse === 'function') {
                    response = aiBotEnginePro.generateResponse(message);
                } else {
                    response = '🤖 AI-Bot wird gerade initialisiert... Bitte warte einen Moment!';
                }
            } catch (err) {
                console.error('[AI-Bot] Error:', err);
                response = '❌ Ein Fehler ist aufgetreten. Bitte versuche es erneut oder lade die Seite neu.';
            }
            removeThinkingIndicator();
            addAIBotMessage(response, 'bot');
        }, thinkingDelay);
    }
}

function setAIBotQuestion(question) {
    const input = document.getElementById('aiBotInput');
    if (input) {
        input.value = question;
        input.focus();
    }
}

function calculateWeeklyHours() {
    if (typeof aiAnalyzerPro !== 'undefined' && aiAnalyzerPro && typeof aiAnalyzerPro.getWeeklyStats === 'function') {
        return parseFloat(aiAnalyzerPro.getWeeklyStats().worked) || 0;
    }
    return 0;
}

// ===== AI-BOT MODAL FUNCTIONS =====
