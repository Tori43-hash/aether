import { useMemo } from 'react';
import type { Trade } from '../../../entities/trade';

export interface JournalMetricsData {
    totalPnL: number;
    winrate: number;
    pf: string;
    avgR: string;
    avgRisk: string;
}

export function calculateMetrics(trades: Trade[]): JournalMetricsData {
    const defaults: JournalMetricsData = {
        totalPnL: 0,
        winrate: 0,
        pf: '0.00',
        avgR: '0.0R',
        avgRisk: '0.0%'
    };

    if (trades.length === 0) return defaults;

    const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
    const winCount = trades.filter(t => t.pnl > 0).length;
    const winrate = Math.round((winCount / trades.length) * 100);

    const grossWin = trades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
    const pf = grossLoss === 0 ? (grossWin === 0 ? 0 : 100) : grossWin / grossLoss;

    const totalR = trades.reduce((acc, t) => acc + (t.risk ? t.pnl / t.risk : 0), 0);
    const avgR = totalR / trades.length;

    const totalRisk = trades.reduce((acc, t) => acc + t.risk, 0);
    const avgRisk = totalRisk / trades.length;

    return {
        totalPnL,
        winrate,
        pf: pf === 100 ? '∞' : pf.toFixed(2),
        avgR: (avgR > 0 ? '+' : '') + avgR.toFixed(1) + 'R',
        avgRisk: avgRisk.toFixed(1) + '%'
    };
}

export function useJournalMetrics(trades: Trade[]): JournalMetricsData {
    return useMemo(() => calculateMetrics(trades), [trades]);
}
