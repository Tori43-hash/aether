import type { Trade, RiskStats, Timeframe } from '../types';

/**
 * Get trading session based on entry time (UTC).
 * Asian: 22:00-08:00, London: 08:00-14:00, New-York: 14:00-22:00
 */
export const getSession = (dateStr: string): string => {
    if (!dateStr) return '—';
    const hour = new Date(dateStr).getHours();
    if (hour >= 22 || hour < 8) return 'Asian';
    if (hour >= 8 && hour < 14) return 'London';
    return 'New-York';
};

/**
 * Get the weekday name from a date string.
 */
export const getWeekday = (dateStr: string): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Calculate hold time between entry and exit dates.
 * Returns formatted string like "5m", "2h", "3d".
 */
export const getHoldTime = (start: string, end?: string): string => {
    if (!start || !end) return '—';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
};

/**
 * Format a date string for display in the trades table.
 * Output format: "06 Jan 2026 14:32"
 */
export const formatTableDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace(',', '');
};

/**
 * Calculate risk statistics for a list of trades
 * Includes max drawdown, win/loss streaks
 */
export const calculateRiskStats = (trades: Trade[]): RiskStats => {
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let peak = -Infinity;
    let maxDD = 0;
    let runningPnL = 0;

    sortedTrades.forEach(t => {
        runningPnL += t.pnl;
        if (runningPnL > peak) peak = runningPnL;
        const dd = peak - runningPnL;
        if (dd > maxDD) maxDD = dd;
    });

    let currentWinStreak = 0;
    let currentWinSum = 0;
    let maxWinStreak = 0;
    let maxWinStreakVal = 0;

    let currentLossStreak = 0;
    let currentLossSum = 0;
    let maxLossStreak = 0;
    let maxLossStreakVal = 0;

    sortedTrades.forEach(t => {
        const pnl = t.pnl;
        if (pnl >= 0) {
            currentWinStreak++;
            currentWinSum += pnl;

            if (currentLossStreak > 0) {
                if (currentLossStreak > maxLossStreak) {
                    maxLossStreak = currentLossStreak;
                    maxLossStreakVal = currentLossSum;
                } else if (currentLossStreak === maxLossStreak) {
                    if (currentLossSum < maxLossStreakVal) maxLossStreakVal = currentLossSum;
                }
                currentLossStreak = 0;
                currentLossSum = 0;
            }

            if (currentWinStreak > maxWinStreak) {
                maxWinStreak = currentWinStreak;
                maxWinStreakVal = currentWinSum;
            } else if (currentWinStreak === maxWinStreak) {
                if (currentWinSum > maxWinStreakVal) maxWinStreakVal = currentWinSum;
            }

        } else {
            currentLossStreak++;
            currentLossSum += pnl;

            if (currentWinStreak > 0) {
                if (currentWinStreak > maxWinStreak) {
                    maxWinStreak = currentWinStreak;
                    maxWinStreakVal = currentWinSum;
                } else if (currentWinStreak === maxWinStreak) {
                    if (currentWinSum > maxWinStreakVal) maxWinStreakVal = currentWinSum;
                }
                currentWinStreak = 0;
                currentWinSum = 0;
            }

            if (currentLossStreak > maxLossStreak) {
                maxLossStreak = currentLossStreak;
                maxLossStreakVal = currentLossSum;
            } else if (currentLossStreak === maxLossStreak) {
                if (currentLossSum < maxLossStreakVal) maxLossStreakVal = currentLossSum;
            }
        }
    });

    if (currentLossStreak > maxLossStreak) {
        maxLossStreak = currentLossStreak;
        maxLossStreakVal = currentLossSum;
    }
    if (currentWinStreak > maxWinStreak) {
        maxWinStreak = currentWinStreak;
        maxWinStreakVal = currentWinSum;
    }

    return {
        dd: '-' + maxDD.toFixed(1) + '%',
        maxWinStreak,
        maxWinStreakVal: '+' + maxWinStreakVal.toFixed(1) + '%',
        maxLossStreak,
        maxLossStreakVal: maxLossStreakVal.toFixed(1) + '%'
    };
};

/**
 * Filter trades by timeframe and date range
 */
export const getFilteredTrades = (
    allTrades: Trade[],
    timeframe: Timeframe,
    customStart: string,
    customEnd: string
) => {
    const sortedTrades = [...allTrades].sort((a, b) => a.id - b.id);
    const filteredTrades: Trade[] = [];
    const initialData = { balance: 0, wins: 0, count: 0, grossWin: 0, grossLoss: 0 };

    const toLocalDateString = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    let startDateStr = '';
    let endDateStr = '9999-12-31';

    if (timeframe === 'week') {
        const d = new Date();
        const day = d.getDay() || 7;
        if (day !== 1) d.setDate(d.getDate() - (day - 1));
        startDateStr = toLocalDateString(d);
    } else if (timeframe === 'month') {
        const d = new Date();
        startDateStr = toLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1));
    } else if (timeframe === 'custom') {
        if (customStart || customEnd) {
            startDateStr = customStart || sortedTrades[0]?.date;
            endDateStr = customEnd || toLocalDateString(new Date());
        }
    }

    if (timeframe === 'all') {
        return { trades: sortedTrades, initialData };
    } else {
        sortedTrades.forEach(t => {
            const pnl = t.pnl;
            if (t.date < startDateStr) {
                initialData.balance += pnl;
                initialData.count++;
                if (pnl > 0) { initialData.wins++; initialData.grossWin += pnl; }
                else { initialData.grossLoss += Math.abs(pnl); }
            } else if (t.date >= startDateStr && t.date <= endDateStr) {
                filteredTrades.push(t);
            }
        });
        return { trades: filteredTrades, initialData };
    }
};

