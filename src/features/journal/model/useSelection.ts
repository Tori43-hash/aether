import { useState, useCallback } from 'react';
import type { Trade } from '../../../entities/trades';

export interface UseJournalSelectionReturn {
    selectedIds: number[];
    toggleSelection: (id: number, e: React.MouseEvent) => void;
    toggleSelectAll: () => void;
    clearSelection: () => void;
}

export function useJournalSelection(trades: Trade[]): UseJournalSelectionReturn {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleSelection = useCallback((id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const toggleSelectAll = useCallback(() => {
        setSelectedIds(prev => {
            if (prev.length === trades.length && trades.length > 0) {
                return [];
            }
            return trades.map(t => t.id);
        });
    }, [trades]);

    const clearSelection = useCallback(() => {
        setSelectedIds([]);
    }, []);

    return {
        selectedIds,
        toggleSelection,
        toggleSelectAll,
        clearSelection
    };
}
