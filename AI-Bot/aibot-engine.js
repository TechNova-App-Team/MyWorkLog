/**
 * AI-Bot Engine
 * Intelligente Conversation mit Machine Learning Vibes
 */

class AIBotEngine {
    constructor() {
        this.conversationHistory = [];
        this.analyzer = aiAnalyzer;
        this.loadHistory();
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('aiBotHistory');
            this.conversationHistory = saved ? JSON.parse(saved) : [];
        } catch (e) {
            this.conversationHistory = [];
        }
    }

    saveHistory() {
        localStorage.setItem('aiBotHistory', JSON.stringify(this.conversationHistory));
    }

    // ===== PATTERN RECOGNITION =====
    recognizeIntent(message) {
        const msg = message.toLowerCase();
        
        // Woche/Wöchentlich
        if (msg.includes('woche') || msg.includes('wöch')) {
            return 'WEEKLY';
        }
        
        // Monat/Monatlich
        if (msg.includes('monat') || msg.includes('monatlich')) {
            return 'MONTHLY';
        }
        
        // Analyse/Analysieren
        if (msg.includes('analysi') || msg.includes('trend') || msg.includes('muster')) {
            return 'ANALYSIS';
        }
        
        // Produktivität
        if (msg.includes('produktiv') || msg.includes('effizienz') || msg.includes('durchschnitt')) {
            return 'PRODUCTIVITY';
        }
        
        // Prognose/Vorhersage
        if (msg.includes('prognose') || msg.includes('vorhersag') || msg.includes('ende') || msg.includes('forecast')) {
            return 'FORECAST';
        }
        
        // Tipps/Empfehlung
        if (msg.includes('tipp') || msg.includes('empfehlung') || msg.includes('rat') || msg.includes('helfen')) {
            return 'RECOMMENDATIONS';
        }
        
        // Pausen
        if (msg.includes('pause') || msg.includes('break')) {
            return 'BREAKS';
        }
        
        // Kategorien/Verteilung
        if (msg.includes('kategorie') || msg.includes('verteilung') || msg.includes('typ')) {
            return 'CATEGORIES';
        }
        
        return 'GENERAL';
    }

    // ===== RESPONSE GENERATOR =====
    generateResponse(userMessage) {
        const intent = this.recognizeIntent(userMessage);
        let response = '';

        switch (intent) {
            case 'WEEKLY':
                response = this.getWeeklyResponse();
                break;
            case 'MONTHLY':
                response = this.getMonthlyResponse();
                break;
            case 'ANALYSIS':
                response = this.getAnalysisResponse();
                break;
            case 'PRODUCTIVITY':
                response = this.getProductivityResponse();
                break;
            case 'FORECAST':
                response = this.getForecastResponse();
                break;
            case 'RECOMMENDATIONS':
                response = this.getRecommendationsResponse();
                break;
            case 'BREAKS':
                response = this.getBreaksResponse();
                break;
            case 'CATEGORIES':
                response = this.getCategoriesResponse();
                break;
            default:
                response = this.getGeneralResponse(userMessage);
        }

        // Speichere Conversation
        this.conversationHistory.push({
            timestamp: new Date().toISOString(),
            user: userMessage,
            bot: response,
            intent: intent
        });
        this.saveHistory();

        return response;
    }

    // ===== RESPONSE BUILDERS =====
    getWeeklyResponse() {
        const stats = this.analyzer.getWeeklyStats();
        return `📊 **Diese Woche:**
- Gearbeitet: ${stats.worked}h
- Erwartet: ${stats.expected}h
- Saldo: ${stats.diff}h (${stats.percentage}%)
- Arbeitstage: ${stats.days}

${parseFloat(stats.diff) >= 0 ? '✅ Du bist im Plan!' : '⚠️ Du könntest noch etwas aufholen!'}`;
    }

    getMonthlyResponse() {
        const stats = this.analyzer.getMonthlyStats();
        const prediction = this.analyzer.predictMonthEnd();
        return `📈 **Dieser Monat (so weit):**
- Gearbeitet: ${stats.worked}h
- Erwartet: ${stats.expected}h
- Saldo: ${stats.diff}h (${stats.percentage}%)

🔮 **Prognose Monatsende:**
- Erwarteter Gesamt: ${prediction.predictedTotal}h
- Noch zu arbeiten: ${prediction.daysRemaining} Tage
- Durchschnitt/Tag: ${prediction.avgPerDay}h`;
    }

    getAnalysisResponse() {
        const weekly = this.analyzer.getWeeklyStats();
        const productivity = this.analyzer.getProductivityTrends();
        const breakdown = this.analyzer.getCategoryBreakdown();

        let response = `🔍 **Detaillierte Analyse:**

**Wöchentliche Performance:**
${weekly.percentage}% der erwarteten Stunden erreicht

**Produktivitäts-Trends (letzte 30 Tage):**
- Durchschnitt: ${productivity.average}h/Tag
- Total: ${productivity.total}h
- Bester Tag: ${productivity.bestDay} (${productivity.bestHours}h)
- Schwächster Tag: ${productivity.worstDay} (${productivity.worstHours}h)

**Kategorien-Verteilung:**`;

        for (const [category, data] of Object.entries(breakdown)) {
            response += `\n- ${category}: ${data.count}x (${data.hours.toFixed(1)}h)`;
        }

        return response;
    }

    getProductivityResponse() {
        const productivity = this.analyzer.getProductivityTrends();
        const avg = parseFloat(productivity.average);

        let assessment = '';
        if (avg > 8) {
            assessment = '🚀 Du bist extrem produktiv! Das ist beeindruckend.';
        } else if (avg > 6) {
            assessment = '✅ Gute Produktivität! Du schaffst regelmäßig deine Ziele.';
        } else if (avg > 4) {
            assessment = '📊 Mittelmäßige Produktivität. Versuche, etwas konsistenter zu sein.';
        } else {
            assessment = '⚠️ Deine Produktivität ist niedrig. Vielleicht brauchst du mehr Pausen?';
        }

        return `💪 **Produktivitäts-Analyse:**

${assessment}

Durchschnitt: ${productivity.average}h/Tag
Total: ${productivity.total}h (letzte 30 Tage)
Arbeitstage: ${productivity.days}

**Tipp:** Versuche, eine konstante tägliche Routine zu etablieren!`;
    }

    getForecastResponse() {
        const prediction = this.analyzer.predictMonthEnd();
        const expected = this.analyzer.getCurrentMonth();
        
        // Grobe Schätzung der erwarteten Stunden/Tag
        const avgExpected = 8.75; // Kann angepasst werden
        const expectedTotal = (expected.end.getDate() * avgExpected).toFixed(2);

        return `🔮 **Prognose für Monatsende:**

Aktueller Stand: ${prediction.currentTotal}h
Verbleibende Tage: ${prediction.daysRemaining}
Täglicher Durchschnitt: ${prediction.avgPerDay}h

**Erwartete Gesamtstunden:** ${expectedTotal}h
**Prognostizierter Gesamt:** ${prediction.predictedTotal}h
**Saldo-Prognose:** ${(parseFloat(prediction.predictedTotal) - parseFloat(expectedTotal)).toFixed(2)}h

${parseFloat(prediction.predictedTotal) >= parseFloat(expectedTotal) ? '✅ Du wirst es schaffen!' : '⚠️ Du könntest knapp werden!'}`;
    }

    getRecommendationsResponse() {
        const recommendations = this.analyzer.getRecommendations();
        
        if (recommendations.length === 0) {
            return '✨ Alles läuft perfekt! Du brauchst keine speziellen Empfehlungen. Keep it up! 💪';
        }

        let response = '💡 **Intelligente Empfehlungen:**\n\n';
        recommendations.forEach(rec => {
            response += `${rec.text}\n→ ${rec.action}\n\n`;
        });

        return response;
    }

    getBreaksResponse() {
        const breaks = this.analyzer.getBreakAnalysis();
        const avgMin = parseFloat(breaks.averageBreakMinutes);

        let assessment = '';
        if (avgMin < 15) {
            assessment = '⚠️ Deine Pausen sind sehr kurz! Gönne dir mehr Erholung.';
        } else if (avgMin < 30) {
            assessment = '✅ Gute Pausenlänge! Das ist gesund.';
        } else {
            assessment = '📊 Deine Pausen sind länger als üblich. Das ist in Ordnung, wenn du dich besser fühlst.';
        }

        return `☕ **Pausen-Analyse (diese Woche):**

${assessment}

- Total Pausenzeit: ${breaks.totalBreakMinutes} Min
- Durchschnitt pro Tag: ${breaks.averageBreakMinutes} Min
- Arbeitstage: ${breaks.entries}

**Empfehlung:** Mache regelmäßig 15-20 Minuten Pausen!`;
    }

    getCategoriesResponse() {
        const breakdown = this.analyzer.getCategoryBreakdown();
        
        let response = '📂 **Kategorien-Verteilung (letzte 60 Tage):**\n\n';
        for (const [category, data] of Object.entries(breakdown)) {
            const percentage = data.hours > 0 ? ((data.hours / 60) * 100).toFixed(1) : 0;
            response += `🔹 ${category}: ${data.count}x (${data.hours.toFixed(1)}h - ${percentage}%)\n`;
        }

        return response;
    }

    getGeneralResponse(message) {
        const responses = [
            'Ich bin hier um dir bei Fragen zu deinen Arbeitszeiten zu helfen! 😊',
            'Versuche Fragen wie "Wie viel habe ich diese Woche gearbeitet?" zu stellen.',
            'Ich kann dir Analysen, Prognosen und Tipps geben! Was möchtest du wissen?',
            'Interessante Frage! Meine Spezialität ist aber die Analyse deiner Zeitdaten.',
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // ===== UTILS =====
    clearHistory() {
        this.conversationHistory = [];
        localStorage.removeItem('aiBotHistory');
    }

    getHistory() {
        return this.conversationHistory;
    }
}

// Export
const aiBotEngine = new AIBotEngine();
