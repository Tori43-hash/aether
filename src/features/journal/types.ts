/**
 * Feature: journal-controls
 * Types for journal filtering, sorting, and selection.
 */

export type SortField = 'date' | 'ticker' | 'direction' | 'style' | 'risk' | 'pnl';

export type StyleOption = 'All' | 'Scalping' | 'Intraday' | 'Intraweek' | 'Swing';

export type OutcomeOption = 'All' | 'Win' | 'BE' | 'Loss';

export type DirectionOption = 'All' | 'Long' | 'Short';

export type DateFilterMode = 'All' | 'Q' | 'M' | 'W' | 'Custom';

export interface FilterState {
    startDate: string;
    endDate: string;
    direction: DirectionOption;
    status: 'All' | 'Open' | 'Closed';
    style: StyleOption[];
    outcome: OutcomeOption[];
}

export const METRIC_LABELS: Record<string, string> = {
    totalPnL: 'Total PnL',
    winrate: 'Winrate',
    avgR: 'Avg. R',
    pf: 'Profit Factor',
    avgRisk: 'Avg. Risk'
};

export const PROPERTY_LABELS: Record<string, string> = {
    ticker: 'Pair',
    date: 'Open Date',
    session: 'Session',
    weekday: 'Weekday',
    holdtime: 'Holdtime',
    entry: 'Entry',
    exit: 'Exit',
    size: 'Size',
    volume: 'Volume',
    risk: 'Risk',
    exitDate: 'Close Date',
    pnl: 'PnL'
};

export const DATE_OPTIONS = ['All', 'Q', 'M', 'W', 'Custom'] as const;

export const DEFAULT_FILTER_STATE: FilterState = {
    startDate: '',
    endDate: '',
    direction: 'All',
    status: 'All',
    style: ['All'],
    outcome: ['All']
};

export const DEFAULT_COLUMNS_ORDER = [
    'ticker', 'date', 'session', 'weekday', 'holdtime',
    'entry', 'exit', 'size', 'volume', 'risk', 'exitDate', 'pnl'
];

export const DEFAULT_METRICS_ORDER = ['totalPnL', 'winrate', 'avgR', 'pf', 'avgRisk'];

export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
    ticker: 120, date: 140, session: 100, weekday: 100, holdtime: 100,
    entry: 100, exit: 100, size: 80, volume: 80, risk: 100, exitDate: 140, pnl: 100
};
