// Trade Entity Types
// FSD: entities/trade/types

export interface TdaItem {
    label?: string;
    condition?: 'met' | 'not-met' | 'partial';
    note?: string;
    tf?: string;
    image?: string;
}

export interface Trade {
    id: number;
    date: string;
    entryDate: string;
    exitDate?: string;
    ticker: string;
    direction: 'Long' | 'Short';
    style?: 'Scalping' | 'Intraday' | 'Intraweek' | 'Swing';
    risk: number;
    pnl: number;
    tda?: TdaItem[];
    entryImg?: string;
    exitImg?: string;
    conclusions?: string;
}

export interface Stat {
    id?: string;
    label: string;
    value: string | number;
    change?: number;
    description?: string;
    icon?: string;
    desc?: string;
}

// Extended RiskStats for statistics.ts return
export interface RiskStats {
    totalTrades?: number;
    winRate?: number;
    profitFactor?: number;
    averageWin?: number;
    averageLoss?: number;
    largestWin?: number;
    largestLoss?: number;
    averageRiskReward?: number;
    dd?: string;
    maxWinStreak?: number;
    maxWinStreakVal?: string;
    maxLossStreak?: number;
    maxLossStreakVal?: string;
}

export interface Plan {
    id: number;
    ticker: string;
    image?: string;
    desc?: string;
    createdAt: string;
}

export interface Trader {
    id: string;
    name: string;
    avatar?: string;
}

// Chart timeframes (for charting)
export type ChartTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W';

// Filter timeframes (for filtering trades)
export type Timeframe = 'all' | 'week' | 'month' | 'custom' | '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W';

export type ChartType = 'line' | 'candlestick' | 'bar';
export type ChartStyle = 'line' | 'bar' | 'classic' | 'hollow' | 'ohlc';
export type ChartColor = 'default' | 'blue' | 'purple' | 'custom' | 'green-red' | 'blue-orange' | 'monochrome';
