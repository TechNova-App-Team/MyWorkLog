/**
 * AI-Bot Data Analyzer
 * Intelligente Analyse der Zeitdaten für aussagekräftige Insights
 */

class DataAnalyzer {
    constructor() {
        this.data = this.loadTimeTrackerData();
    }

    loadTimeTrackerData() {
        try {
            const rawData = localStorage.getItem('tg_pro_data');
            return rawData ? JSON.parse(rawData) : { entries: [] };
        } catch (e) {
            console.error('Fehler beim Laden der Daten:', e);
            return { entries: [] };
        }
    }

    // ===== BASICS =====
    getCurrentWeek() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        
        return {
            start: startOfWeek,
            end: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000)
        };
    }

    getCurrentMonth() {
        const today = new Date();
        return {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: new Date(today.getFullYear(), today.getMonth() + 1, 0)
        };
    }

    // ===== WOCHE ANALYSE =====
    getWeeklyStats() {
        const week = this.getCurrentWeek();
        const entries = this.data.entries.filter(e => {
            const date = new Date(e.date);
            return date >= week.start && date <= week.end;
        });

        const worked = entries.reduce((sum, e) => sum + (e.worked || 0), 0);
        const expected = entries.reduce((sum, e) => sum + (e.expected || 0), 0);
        const diff = worked - expected;

        return {
            worked: worked.toFixed(2),
            expected: expected.toFixed(2),
            diff: diff.toFixed(2),
            percentage: expected > 0 ? ((worked / expected) * 100).toFixed(1) : 0,
            days: entries.length
        };
    }

    // ===== MONAT ANALYSE =====
    getMonthlyStats() {
        const month = this.getCurrentMonth();
        const entries = this.data.entries.filter(e => {
            const date = new Date(e.date);
            return date >= month.start && date <= month.end;
        });

        const worked = entries.reduce((sum, e) => sum + (e.worked || 0), 0);
        const expected = entries.reduce((sum, e) => sum + (e.expected || 0), 0);
        const diff = worked - expected;

        return {
            worked: worked.toFixed(2),
            expected: expected.toFixed(2),
            diff: diff.toFixed(2),
            percentage: expected > 0 ? ((worked / expected) * 100).toFixed(1) : 0,
            days: entries.length
        };
    }

    // ===== PRODUKTIVITÄTS-PATTERNS =====
    getProductivityTrends() {
        const entries = this.data.entries.slice(-30); // Letzte 30 Tage
        if (entries.length === 0) return null;

        const worked = entries.reduce((sum, e) => sum + (e.worked || 0), 0);
        const avg = (worked / entries.length).toFixed(2);

        // Best & Worst Day
        const best = entries.reduce((max, e) => (e.worked || 0) > (max.worked || 0) ? e : max);
        const worst = entries.reduce((min, e) => (e.worked || 0) < (min.worked || 0) ? e : min);

        return {
            average: avg,
            total: worked.toFixed(2),
            days: entries.length,
            bestDay: best.date,
            bestHours: best.worked,
            worstDay: worst.date,
            worstHours: worst.worked
        };
    }

    // ===== PAUSE-ANALYSE =====
    getBreakAnalysis() {
        const week = this.getCurrentWeek();
        const entries = this.data.entries.filter(e => {
            const date = new Date(e.date);
            return date >= week.start && date <= week.end;
        });

        const totalBreak = entries.reduce((sum, e) => sum + (e.breakMins || 0), 0);
        const avgBreak = entries.length > 0 ? (totalBreak / entries.length).toFixed(0) : 0;

        return {
            totalBreakMinutes: totalBreak,
            averageBreakMinutes: avgBreak,
            entries: entries.length
        };
    }

    // ===== VORHERSAGEN =====
    predictMonthEnd() {
        const month = this.getCurrentMonth();
        const today = new Date();
        const daysInMonth = (month.end.getDate());
        const daysPassed = today.getDate();
        const daysRemaining = daysInMonth - daysPassed;

        const entries = this.data.entries.filter(e => {
            const date = new Date(e.date);
            return date >= month.start && date <= today;
        });

        const workedSoFar = entries.reduce((sum, e) => sum + (e.worked || 0), 0);
        const expectedSoFar = entries.reduce((sum, e) => sum + (e.expected || 0), 0);

        // Durchschnitt pro Tag
        const avgPerDay = daysPassed > 0 ? workedSoFar / daysPassed : 0;
        const predictedTotal = (workedSoFar + (daysRemaining * avgPerDay)).toFixed(2);

        return {
            predictedTotal,
            currentTotal: workedSoFar.toFixed(2),
            daysRemaining,
            avgPerDay: avgPerDay.toFixed(2)
        };
    }

    // ===== KATEGORIEN ANALYSE =====
    getCategoryBreakdown() {
        const entries = this.data.entries.slice(-60); // Letzte 60 Tage
        const breakdown = {};

        entries.forEach(e => {
            const type = e.type || 'work';
            if (!breakdown[type]) {
                breakdown[type] = { count: 0, hours: 0 };
            }
            breakdown[type].count++;
            breakdown[type].hours += e.worked || 0;
        });

        return breakdown;
    }

    // ===== SMART RECOMMENDATIONS =====
    getRecommendations() {
        const weekly = this.getWeeklyStats();
        const productivity = this.getProductivityTrends();
        const recommendations = [];

        // Wenn Saldo negativ ist
        if (parseFloat(weekly.diff) < 0) {
            recommendations.push({
                type: 'warning',
                text: `⚠️ Du hast diese Woche ${Math.abs(weekly.diff)}h weniger gearbeitet als erwartet.`,
                action: 'Versuche morgen etwas länger zu arbeiten!'
            });
        }

        // Wenn Saldo sehr positiv ist
        if (parseFloat(weekly.diff) > 2) {
            recommendations.push({
                type: 'success',
                text: `✅ Großartig! Du hast diese Woche ${weekly.diff}h mehr gearbeitet.`,
                action: 'Gönne dir eine Pause - du hast dir das verdient!'
            });
        }

        // Wenn durchschnitt niedrig ist
        if (productivity && parseFloat(productivity.average) < 6) {
            recommendations.push({
                type: 'info',
                text: `📊 Dein Durchschnitt liegt bei ${productivity.average}h/Tag.`,
                action: 'Versuche, konstanter zu arbeiten!'
            });
        }

        return recommendations;
    }
}

// Export für Verwendung
const aiAnalyzer = new DataAnalyzer();
