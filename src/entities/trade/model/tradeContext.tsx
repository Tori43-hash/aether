import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Trade } from '../types';
import { STORAGE_KEYS } from '../config';

const DEFAULT_TRADES: Trade[] = [
    { id: 7, date: '2025-12-02', entryDate: '2025-12-02T09:30', exitDate: '2025-12-02T16:00', ticker: 'SOL', direction: 'Long', style: 'Intraday', risk: 1.0, pnl: 15.0 },
    { id: 6, date: '2025-12-01', entryDate: '2025-12-01T14:00', exitDate: '2025-12-03T10:00', ticker: 'XRP', direction: 'Short', style: 'Swing', risk: 2.0, pnl: -5.5 },
    { id: 5, date: '2025-11-26', entryDate: '2025-11-26T10:00', exitDate: '2025-11-26T12:00', ticker: 'ETH', direction: 'Long', style: 'Intraday', risk: 0.5, pnl: -2.0 },
    { id: 4, date: '2025-11-25', entryDate: '2025-11-25T18:00', exitDate: '2025-11-26T08:00', ticker: 'BTC', direction: 'Short', style: 'Swing', risk: 1.5, pnl: 8.0 },
    { id: 3, date: '2025-11-24', entryDate: '2025-11-24T15:00', exitDate: '2025-11-28T16:00', ticker: 'AAPL', direction: 'Long', style: 'Swing', risk: 1.0, pnl: 4.5 },
    { id: 2, date: '2025-11-22', entryDate: '2025-11-22T09:45', exitDate: '2025-11-22T10:30', ticker: 'TSLA', direction: 'Short', style: 'Intraday', risk: 1.0, pnl: -3.2 },
    { id: 1, date: '2025-11-20', entryDate: '2025-11-20T11:00', exitDate: '2025-11-20T14:45', ticker: 'NVDA', direction: 'Long', style: 'Intraday', risk: 1.0, pnl: 12.5 },
];

interface TradeContextType {
    trades: Trade[];
    saveTrades: (trades: Trade[]) => void;
    addTrade: (newTrade: Partial<Trade>) => Trade | null;
    updateTrade: (updatedTrade: Trade) => void;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export const TradeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [trades, setTrades] = useState<Trade[]>([]);

    useEffect(() => {
        try {
            const savedTrades = localStorage.getItem(STORAGE_KEYS.TRADES);

            if (savedTrades && savedTrades.trim() !== '') {
                try {
                    const parsed = JSON.parse(savedTrades);
                    if (Array.isArray(parsed)) {
                        setTrades(parsed);
                        return;
                    }
                } catch (parseError) {
                    console.warn('Failed to parse trades from localStorage:', parseError);
                }
            }

            setTrades(DEFAULT_TRADES);
        } catch (error) {
            console.error('Error loading trades from localStorage:', error);
            setTrades(DEFAULT_TRADES); // Fallback to default
        }
    }, []);

    const saveTrades = useCallback((updatedTrades: Trade[]) => {
        setTrades(updatedTrades);
        try {
            localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(updatedTrades));
        } catch (error) {
            console.error('Error saving trades to localStorage:', error);
        }
    }, []);

    const addTrade = useCallback((newTrade: Partial<Trade>): Trade | null => {
        if (!newTrade.ticker || newTrade.pnl === undefined) return null;

        let entry = newTrade.entryDate;
        let exit = newTrade.exitDate;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (!entry) {
            entry = todayStr + 'T00:00';
        }
        if (!exit) {
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            exit = todayStr + 'T' + h + ':' + m;
        }

        const trade: Trade = {
            id: Date.now(),
            date: entry.split('T')[0],
            entryDate: entry,
            exitDate: exit,
            ticker: newTrade.ticker.toUpperCase(),
            direction: newTrade.direction as 'Long' | 'Short',
            style: newTrade.style as 'Intraday' | 'Swing',
            risk: newTrade.risk || 1.0,
            pnl: Number(newTrade.pnl),
            tda: newTrade.tda // Preserve TDA analysis if present
        };

        setTrades(prevTrades => {
            const updatedTrades = [trade, ...prevTrades];
            try {
                localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(updatedTrades));
            } catch (error) {
                console.error('Error saving trade to localStorage:', error);
            }
            return updatedTrades;
        });
        return trade;
    }, []);

    const updateTrade = useCallback((updatedTrade: Trade) => {
        setTrades(prevTrades => {
            const index = prevTrades.findIndex(t => t.id === updatedTrade.id);
            if (index !== -1) {
                const newTrades = [...prevTrades];
                newTrades[index] = updatedTrade;
                try {
                    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(newTrades));
                } catch (error) {
                    console.error('Error updating trade in localStorage:', error);
                }
                return newTrades;
            }
            return prevTrades;
        });
    }, []);

    return (
        <TradeContext.Provider value={{ trades, saveTrades, addTrade, updateTrade }}>
            {children}
        </TradeContext.Provider>
    );
};

export const useTrades = () => {
    const context = useContext(TradeContext);
    if (context === undefined) {
        throw new Error('useTrades must be used within a TradeProvider');
    }
    return context;
};
