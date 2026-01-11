import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Check, Minus } from 'lucide-react';

// Shared layer imports
import { useProgressiveLoad, formatPercent, SortableHeader } from '../../../shared';
import type { SortConfig } from '../../../shared';

// Entities layer imports
import type { Trade } from '../../../entities/trade';
import { getSession, getWeekday, getHoldTime, formatTableDate } from '../../../entities/trade';

// --- Types ---

type SortField = 'date' | 'ticker' | 'direction' | 'style' | 'risk' | 'pnl';

interface TradeTableProps {
    trades: Trade[];
    sortConfig: SortConfig<SortField>;
    onSort: (field: SortField) => void;
    selectedIds: number[];
    onToggleSelection: (id: number, e: React.MouseEvent) => void;
    onToggleSelectAll: () => void;
    visibleColumns: string[];
    columnWidths: Record<string, number>;
    onResize: (col: string, e: React.MouseEvent) => void;
    onRowClick: (trade: Trade) => void;
    isTextWrapEnabled: boolean;
}

// --- Constants ---

const SELECTION_COL_WIDTH = 48;
const VIRTUALIZATION_THRESHOLD = 100;
const MAX_VISIBLE_ROWS = 50;

// --- Component ---

export const TradeTable: React.FC<TradeTableProps> = ({
    trades,
    sortConfig,
    onSort,
    selectedIds,
    onToggleSelection,
    onToggleSelectAll,
    visibleColumns,
    columnWidths,
    onResize,
    onRowClick,
    isTextWrapEnabled,
}) => {
    // Sticky column tracking
    const stickyColumnRef = useRef<HTMLTableCellElement>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const [stickyColumnSize, setStickyColumnSize] = useState({ width: 0, height: 0 });

    // Progressive loading
    const [tableRef, isTableVisible] = useProgressiveLoad<HTMLDivElement>({
        threshold: 0.05,
        rootMargin: '200px',
        enabled: true
    });

    // Virtualization
    const shouldLimitRendering = trades.length > VIRTUALIZATION_THRESHOLD;

    // Track sticky column size
    useEffect(() => {
        const updateSize = () => {
            if (stickyColumnRef.current) {
                const rect = stickyColumnRef.current.getBoundingClientRect();
                setStickyColumnSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
            }
        };

        const timeoutId = setTimeout(updateSize, 100);

        if (stickyColumnRef.current && !resizeObserverRef.current) {
            resizeObserverRef.current = new ResizeObserver(updateSize);
            resizeObserverRef.current.observe(stickyColumnRef.current);
        }

        return () => {
            clearTimeout(timeoutId);
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
                resizeObserverRef.current = null;
            }
        };
    }, []);

    // --- Render Helpers ---

    const renderHeader = useCallback((id: string, isLast: boolean) => {
        const width = columnWidths[id];
        const borderClass = isLast ? '' : 'border-r border-slate-200';
        const commonProps = { style: { width, minWidth: width }, className: borderClass };

        const Resizer = (
            <div
                onMouseDown={(e) => onResize(id, e)}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors z-10 hover:w-1.5 hover:-right-0.5"
            />
        );

        const staticHeaderClass = `border-y border-slate-200 p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider relative group text-left align-middle break-words ${borderClass}`;

        switch (id) {
            case 'ticker': return <SortableHeader key={id} label="Pair" field="ticker" currentSort={sortConfig} onSort={onSort} {...commonProps}>{Resizer}</SortableHeader>;
            case 'date': return <SortableHeader key={id} label="Open Date" field="date" currentSort={sortConfig} onSort={onSort} {...commonProps}>{Resizer}</SortableHeader>;
            case 'session': return <th key={id} style={commonProps.style} className={staticHeaderClass}>Session {Resizer}</th>;
            case 'weekday': return <th key={id} style={commonProps.style} className={staticHeaderClass}>Weekday {Resizer}</th>;
            case 'holdtime': return <th key={id} style={commonProps.style} className={staticHeaderClass}>Holdtime {Resizer}</th>;
            case 'entry': return <th key={id} style={commonProps.style} className={staticHeaderClass}>Entry {Resizer}</th>;
            case 'exit': return <th key={id} style={commonProps.style} className={staticHeaderClass}>Exit {Resizer}</th>;
            case 'size': return <th key={id} style={commonProps.style} className={staticHeaderClass}>Size {Resizer}</th>;
            case 'volume': return <th key={id} style={commonProps.style} className={staticHeaderClass}>Volume {Resizer}</th>;
            case 'risk': return <SortableHeader key={id} label="Risk Per Trade" field="risk" currentSort={sortConfig} onSort={onSort} {...commonProps}>{Resizer}</SortableHeader>;
            case 'exitDate': return <th key={id} style={commonProps.style} className={staticHeaderClass}>Close Date {Resizer}</th>;
            case 'pnl': return <SortableHeader key={id} label="PnL" field="pnl" currentSort={sortConfig} onSort={onSort} align="left" {...commonProps}>{Resizer}</SortableHeader>;
            default: return null;
        }
    }, [columnWidths, sortConfig, onSort, onResize]);

    const renderCell = useCallback((id: string, trade: Trade, cellBorder: string, isLast: boolean) => {
        const width = columnWidths[id];
        const verticalBorder = isLast ? '' : 'border-r border-slate-100';
        const wrapClass = isTextWrapEnabled ? 'whitespace-normal break-words' : 'whitespace-nowrap overflow-hidden text-ellipsis';
        const combinedClasses = `${cellBorder} ${verticalBorder} text-left ${wrapClass}`;
        const style = { width, minWidth: width, maxWidth: width };

        switch (id) {
            case 'ticker': return <td key={id} style={style} className={`p-4 font-bold text-slate-900 ${combinedClasses}`}>{trade.ticker}/USDT</td>;
            case 'date': return <td key={id} style={style} className={`p-4 font-medium text-slate-900 ${combinedClasses}`}>{formatTableDate(trade.entryDate)}</td>;
            case 'session': return <td key={id} style={style} className={`p-4 font-medium text-slate-900 ${combinedClasses}`}>{getSession(trade.entryDate)}</td>;
            case 'weekday': return <td key={id} style={style} className={`p-4 font-medium text-slate-900 ${combinedClasses}`}>{getWeekday(trade.entryDate)}</td>;
            case 'holdtime': return (
                <td key={id} style={style} className={`p-4 ${combinedClasses}`}>
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-semibold border border-blue-100/50">
                        {getHoldTime(trade.entryDate, trade.exitDate)}
                    </span>
                </td>
            );
            case 'entry': return <td key={id} style={style} className={`p-4 font-medium text-slate-900 ${combinedClasses}`}>—</td>;
            case 'exit': return <td key={id} style={style} className={`p-4 font-medium text-slate-900 ${combinedClasses}`}>—</td>;
            case 'size': return <td key={id} style={style} className={`p-4 font-medium text-slate-900 ${combinedClasses}`}>—</td>;
            case 'volume': return <td key={id} style={style} className={`p-4 font-medium text-slate-900 ${combinedClasses}`}>—</td>;
            case 'risk': return <td key={id} style={style} className={`p-4 font-medium text-slate-900 ${combinedClasses}`}>{trade.risk ? trade.risk + '%' : '—'}</td>;
            case 'exitDate': return <td key={id} style={style} className={`p-4 font-medium text-slate-900 ${combinedClasses}`}>{formatTableDate(trade.exitDate)}</td>;
            case 'pnl': return (
                <td key={id} style={style} className={`p-4 font-bold ${trade.pnl > 0 ? 'text-green-600' : trade.pnl < 0 ? 'text-rose-500' : 'text-slate-900'} ${combinedClasses}`}>
                    {formatPercent(trade.pnl)}
                </td>
            );
            default: return null;
        }
    }, [columnWidths, isTextWrapEnabled]);

    // --- Render ---

    return (
        <section id="data-grid" className="journal-view__grid flex-1 w-full bg-white">
            <div ref={tableRef} className="overflow-x-auto blur-loading animate-blur-in" style={{ animationDelay: '0.2s' }}>
                {isTableVisible ? (
                    <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                        <thead className="bg-slate-50">
                            <tr>
                                <th
                                    ref={stickyColumnRef}
                                    className="sticky z-20 bg-white pl-6 pr-2 py-4 text-center border-r border-transparent"
                                    style={{ left: 0, width: SELECTION_COL_WIDTH, minWidth: SELECTION_COL_WIDTH, maxWidth: SELECTION_COL_WIDTH }}
                                >
                                    <div className="flex items-center justify-center">
                                        <button
                                            onClick={onToggleSelectAll}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedIds.length > 0 && selectedIds.length === trades.length ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-300 bg-white hover:border-slate-400'}`}
                                        >
                                            {selectedIds.length > 0 && selectedIds.length === trades.length && <Check className="w-3 h-3" />}
                                            {selectedIds.length > 0 && selectedIds.length < trades.length && <Minus className="w-3 h-3 text-slate-800" />}
                                        </button>
                                    </div>
                                </th>
                                {visibleColumns.map((id, index) => renderHeader(id, index === visibleColumns.length - 1))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {trades.length > 0 ? (
                                (shouldLimitRendering ? trades.slice(0, MAX_VISIBLE_ROWS) : trades).map((trade, index) => {
                                    const isSelected = selectedIds.includes(trade.id);
                                    const isLastRow = index === (shouldLimitRendering ? Math.min(MAX_VISIBLE_ROWS, trades.length) - 1 : trades.length - 1);
                                    const cellBorder = isLastRow ? 'border-b border-slate-200' : 'border-b border-slate-100';

                                    return (
                                        <tr
                                            key={trade.id}
                                            onClick={() => onRowClick(trade)}
                                            className={`hover:bg-slate-50 transition cursor-pointer group text-sm ${isSelected ? 'bg-slate-50' : ''}`}
                                        >
                                            <td
                                                className="sticky z-20 bg-white pl-6 pr-2 py-4 text-center border-r border-transparent"
                                                style={{ left: 0, width: SELECTION_COL_WIDTH, minWidth: SELECTION_COL_WIDTH, maxWidth: SELECTION_COL_WIDTH }}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <div className="flex items-center justify-center">
                                                    <button
                                                        onClick={(e) => onToggleSelection(trade.id, e)}
                                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-300 bg-white opacity-0 group-hover:opacity-100 hover:border-slate-400'}`}
                                                    >
                                                        {isSelected && <Check className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </td>
                                            {visibleColumns.map((id, colIndex) => renderCell(id, trade, cellBorder, colIndex === visibleColumns.length - 1))}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className="p-12 text-center text-slate-400">
                                        No trades found.
                                    </td>
                                </tr>
                            )}
                            {shouldLimitRendering && trades.length > MAX_VISIBLE_ROWS && (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className="p-4 text-center text-slate-400 text-sm">
                                        Showing first {MAX_VISIBLE_ROWS} of {trades.length} trades. Use filters to narrow down results.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex items-center justify-center h-64 text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                            <span className="text-xs">Loading table...</span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

TradeTable.displayName = 'TradeTable';
