// Trade Entity - Trade Context
// FSD: entities/trade/model

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Trade } from './types';
import { tradesApi, type CreateTradeDto, type UpdateTradeDto } from '../api';
import { tokenStorage } from '../../../shared/api';

// Context state type
interface TradeContextValue {
    trades: Trade[];
    isLoading: boolean;
    error: string | null;
    addTrade: (trade: Omit<Trade, 'id'>) => Promise<Trade | null>;
    updateTrade: (id: number, updates: Partial<Trade>) => Promise<Trade | null>;
    deleteTrade: (id: number) => Promise<boolean>;
    refreshTrades: () => Promise<void>;
}

// Create context
const TradeContext = createContext<TradeContextValue | undefined>(undefined);

// Provider props
interface TradeProviderProps {
    children: ReactNode;
}

// Convert Trade to CreateTradeDto
const toCreateDto = (trade: Omit<Trade, 'id'>): CreateTradeDto => ({
    date: trade.date,
    entryDate: trade.entryDate,
    exitDate: trade.exitDate,
    ticker: trade.ticker,
    direction: trade.direction,
    style: trade.style,
    risk: trade.risk,
    pnl: trade.pnl,
    tda: trade.tda?.map(item => ({
        label: item.label,
        condition: item.condition === 'not-met' ? 'not-met' : item.condition,
        note: item.note,
    })),
});

// Convert Trade to UpdateTradeDto
const toUpdateDto = (updates: Partial<Trade>): UpdateTradeDto => {
    const dto: UpdateTradeDto = {};
    if (updates.date !== undefined) dto.date = updates.date;
    if (updates.entryDate !== undefined) dto.entryDate = updates.entryDate;
    if (updates.exitDate !== undefined) dto.exitDate = updates.exitDate;
    if (updates.ticker !== undefined) dto.ticker = updates.ticker;
    if (updates.direction !== undefined) dto.direction = updates.direction;
    if (updates.style !== undefined) dto.style = updates.style;
    if (updates.risk !== undefined) dto.risk = updates.risk;
    if (updates.pnl !== undefined) dto.pnl = updates.pnl;
    if (updates.tda !== undefined) {
        dto.tda = updates.tda.map(item => ({
            label: item.label,
            condition: item.condition === 'not-met' ? 'not-met' : item.condition,
            note: item.note,
        }));
    }
    return dto;
};

// Provider component
export const TradeProvider: React.FC<TradeProviderProps> = ({ children }) => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load trades from API
    const refreshTrades = useCallback(async () => {
        // Check for auth token
        if (!tokenStorage.hasToken()) {
            setTrades([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await tradesApi.getAll();
            setTrades(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load trades';
            setError(message);
            console.error('Failed to load trades:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        refreshTrades();
    }, [refreshTrades]);

    // Refresh trades when auth state changes (login/logout)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'accessToken') {
                refreshTrades();
            }
        };

        // Custom event for auth changes within the same tab
        const handleAuthChange = () => {
            refreshTrades();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('auth-state-changed', handleAuthChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth-state-changed', handleAuthChange);
        };
    }, [refreshTrades]);

    // Add trade
    const addTrade = useCallback(async (trade: Omit<Trade, 'id'>): Promise<Trade | null> => {
        try {
            const dto = toCreateDto(trade);
            const newTrade = await tradesApi.create(dto);
            setTrades(prev => [...prev, newTrade]);
            return newTrade;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add trade';
            setError(message);
            console.error('Failed to add trade:', err);
            return null;
        }
    }, []);

    // Update trade
    const updateTrade = useCallback(async (id: number, updates: Partial<Trade>): Promise<Trade | null> => {
        try {
            const dto = toUpdateDto(updates);
            const updatedTrade = await tradesApi.update(id, dto);
            setTrades(prev => prev.map(t => t.id === id ? updatedTrade : t));
            return updatedTrade;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update trade';
            setError(message);
            console.error('Failed to update trade:', err);
            return null;
        }
    }, []);

    // Delete trade
    const deleteTrade = useCallback(async (id: number): Promise<boolean> => {
        try {
            await tradesApi.delete(id);
            setTrades(prev => prev.filter(t => t.id !== id));
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete trade';
            setError(message);
            console.error('Failed to delete trade:', err);
            return false;
        }
    }, []);

    const value: TradeContextValue = {
        trades,
        isLoading,
        error,
        addTrade,
        updateTrade,
        deleteTrade,
        refreshTrades,
    };

    return (
        <TradeContext.Provider value={value}>
            {children}
        </TradeContext.Provider>
    );
};

// Hook
export const useTrades = (): TradeContextValue => {
    const context = useContext(TradeContext);
    if (!context) {
        throw new Error('useTrades must be used within a TradeProvider');
    }
    return context;
};
