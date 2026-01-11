// Trade Entity Configuration
// FSD: entities/trade/config

import type { Trade, Trader } from '../types';

export const STORAGE_KEYS = {
    TRADES: 'aether_trades',
    PLANS: 'aether_plans',
    SETTINGS: 'aether_settings',
} as const;

export const DEFAULT_TRADE: Partial<Trade> = {
    direction: 'Long',
    style: 'Intraday',
    risk: 1.0,
};

export const DEFAULT_TRADERS: Trader[] = [
    { id: 'default', name: 'Default Trader' },
];
