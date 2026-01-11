import { useState, useMemo, useCallback, useEffect } from 'react';
import { DEFAULT_COLUMNS_ORDER, DEFAULT_COLUMN_WIDTHS } from '../types';

export interface UseColumnConfigReturn {
    columnsOrder: string[];
    setColumnsOrder: React.Dispatch<React.SetStateAction<string[]>>;
    hiddenColumns: string[];
    toggleColumnVisibility: (id: string) => void;
    visibleColumns: string[];
    columnWidths: Record<string, number>;
    startResize: (col: string, e: React.MouseEvent) => void;
}

export function useColumnConfig(): UseColumnConfigReturn {
    const [columnsOrder, setColumnsOrder] = useState(DEFAULT_COLUMNS_ORDER);
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);
    const [resizeState, setResizeState] = useState<{ col: string; startX: number; startW: number } | null>(null);

    const visibleColumns = useMemo(
        () => columnsOrder.filter(id => !hiddenColumns.includes(id)),
        [columnsOrder, hiddenColumns]
    );

    const toggleColumnVisibility = useCallback((id: string) => {
        setHiddenColumns(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    }, []);

    const startResize = useCallback((col: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setResizeState({ col, startX: e.clientX, startW: columnWidths[col] });
    }, [columnWidths]);

    useEffect(() => {
        if (!resizeState) return;

        const onMove = (e: MouseEvent) => {
            const diff = e.clientX - resizeState.startX;
            const newWidth = Math.max(50, resizeState.startW + diff);
            setColumnWidths(prev => ({ ...prev, [resizeState.col]: newWidth }));
        };

        const onUp = () => setResizeState(null);

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [resizeState]);

    return {
        columnsOrder,
        setColumnsOrder,
        hiddenColumns,
        toggleColumnVisibility,
        visibleColumns,
        columnWidths,
        startResize
    };
}
