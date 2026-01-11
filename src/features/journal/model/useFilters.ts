import { useState, useMemo, useCallback } from 'react';
import type { Trade } from '../../../entities/trade';
import type { FilterState, StyleOption, DateFilterMode } from '../types';
import { DEFAULT_FILTER_STATE } from '../types';

export interface UseJournalFiltersReturn {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    dateFilterMode: DateFilterMode;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredTrades: Trade[];
    applyDateFilter: (mode: DateFilterMode) => void;
    isCustomPickerOpen: boolean;
    setIsCustomPickerOpen: (open: boolean) => void;
}

export function useJournalFilters(trades: Trade[]): UseJournalFiltersReturn {
    const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
    const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);

    const applyDateFilter = useCallback((mode: DateFilterMode) => {
        setDateFilterMode(mode);

        if (mode === 'Custom') {
            setIsCustomPickerOpen(prev => !prev);
            return;
        }

        setIsCustomPickerOpen(false);

        const now = new Date();
        const fmt = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        let start = '';
        let end = '';

        if (mode === 'W') {
            const day = now.getDay() || 7;
            const d = new Date(now);
            if (day !== 1) d.setDate(d.getDate() - (day - 1));
            start = fmt(d);
            end = fmt(now);
        } else if (mode === 'M') {
            start = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
            end = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        } else if (mode === 'Q') {
            const q = Math.floor(now.getMonth() / 3);
            start = fmt(new Date(now.getFullYear(), q * 3, 1));
            end = fmt(new Date(now.getFullYear(), q * 3 + 3, 0));
        }

        setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
    }, []);

    const filteredTrades = useMemo(() => {
        return trades.filter(trade => {
            if (searchQuery && !trade.ticker.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            if (filters.startDate && trade.date < filters.startDate) return false;
            if (filters.endDate && trade.date > filters.endDate) return false;
            if (filters.direction !== 'All' && trade.direction !== filters.direction) return false;
            if (filters.status === 'Open' && trade.exitDate) return false;
            if (filters.status === 'Closed' && !trade.exitDate) return false;
            if (!filters.style.includes('All') && !filters.style.includes((trade.style || 'Intraday') as StyleOption)) {
                return false;
            }
            if (!filters.outcome.includes('All')) {
                let match = false;
                if (filters.outcome.includes('Win') && trade.pnl > 0) match = true;
                if (filters.outcome.includes('Loss') && trade.pnl < 0) match = true;
                if (filters.outcome.includes('BE') && trade.pnl === 0) match = true;
                if (!match) return false;
            }
            return true;
        });
    }, [trades, filters, searchQuery]);

    return {
        filters,
        setFilters,
        dateFilterMode,
        searchQuery,
        setSearchQuery,
        filteredTrades,
        applyDateFilter,
        isCustomPickerOpen,
        setIsCustomPickerOpen
    };
}
