import { useState, useMemo, useCallback } from 'react';
import type { Trade } from '../../../entities/trade';
import type { SortConfig } from '../../../shared';
import type { SortField } from '../types';

export interface UseJournalSortReturn {
    sortConfig: SortConfig<SortField>;
    handleSort: (field: SortField) => void;
    sortedTrades: Trade[];
}

export function useJournalSort(trades: Trade[]): UseJournalSortReturn {
    const [sortConfig, setSortConfig] = useState<SortConfig<SortField>>({
        field: 'date',
        direction: 'desc'
    });

    const handleSort = useCallback((field: SortField) => {
        setSortConfig(current => ({
            field,
            direction: current.field === field && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    }, []);

    const sortedTrades = useMemo(() => {
        const sorted = [...trades];
        sorted.sort((a, b) => {
            let aValue: any = a[sortConfig.field];
            let bValue: any = b[sortConfig.field];

            if (sortConfig.field === 'style') {
                aValue = a.style || 'Intraday';
                bValue = b.style || 'Intraday';
            }
            if (sortConfig.field === 'risk') {
                aValue = a.risk || 0;
                bValue = b.risk || 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [trades, sortConfig]);

    return {
        sortConfig,
        handleSort,
        sortedTrades
    };
}
