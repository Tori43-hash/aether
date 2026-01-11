import React, { useState, useLayoutEffect, useRef } from 'react';

// Entities layer imports
import type { Trade } from '../../../entities/trade';
import { useTrades } from '../../../entities/trade';

// Features layer imports
import {
    useJournalFilters,
    useJournalSort,
    useJournalSelection,
    useColumnConfig,
    useMetricsConfig
} from '../../../features/journal-controls';

// Widgets layer imports
import { TradeTable } from '../../../widgets/trade-table';
import { JournalHeader } from '../../../widgets/journal-header';
import { JournalMetrics, useJournalMetrics } from '../../../widgets/journal-metrics';

// --- Types ---

export interface JournalProps {
    openTradeModal: () => void;
    openTradeDetail: (trade: Trade) => void;
    controlsScale: number;
    dateToggleConfig: { fontSize: number; fontWeight: number; height: number; paddingX: number };
    positionsConfig: { fontSize: number; fontWeight: number; height: number; paddingX: number; borderRadius: number };
    metricsConfig: { scale: number; marginTop: number; marginBottom: number; fontWeight: number };
    rightGutter: number;
    leftGutter: number;
    filterBarSpacing: { left: number; right: number };
    skipAnimation?: boolean;
}

// --- Main Component ---

export const Journal: React.FC<JournalProps> = ({
    openTradeModal,
    openTradeDetail,
    controlsScale,
    dateToggleConfig,
    positionsConfig,
    metricsConfig,
    skipAnimation,
}) => {
    const { trades } = useTrades();
    const journalViewRef = useRef<HTMLElement>(null);

    // Feature hooks
    const {
        filters,
        setFilters,
        dateFilterMode,
        searchQuery,
        setSearchQuery,
        filteredTrades,
        applyDateFilter,
        isCustomPickerOpen
    } = useJournalFilters(trades);

    const { sortConfig, handleSort, sortedTrades } = useJournalSort(filteredTrades);
    const { selectedIds, toggleSelection, toggleSelectAll } = useJournalSelection(sortedTrades);

    const {
        columnsOrder,
        setColumnsOrder,
        hiddenColumns,
        toggleColumnVisibility,
        visibleColumns,
        columnWidths,
        startResize
    } = useColumnConfig();

    const {
        metricsOrder,
        setMetricsOrder,
        hiddenMetrics,
        toggleMetricVisibility
    } = useMetricsConfig();

    // View settings
    const [isTextWrapEnabled, setIsTextWrapEnabled] = useState(true);

    // Metrics calculation
    const metrics = useJournalMetrics(sortedTrades);

    // Ensure immediate visibility
    useLayoutEffect(() => {
        if (journalViewRef.current) {
            const element = journalViewRef.current;
            element.style.opacity = '1';
            element.style.transform = 'none';
            element.style.animation = 'none';
            element.classList.remove('animate-fade-in');
        }
    }, []);

    return (
        <section
            ref={journalViewRef}
            id="journal-view"
            className="journal-view flex flex-col h-full bg-white relative"
            style={{ opacity: 1, transform: 'none', animation: 'none' }}
        >
            <header
                id="journal-header"
                className="journal-view__header w-full bg-white z-40 pt-6"
                style={{
                    marginBottom: `${metricsConfig.marginBottom}px`,
                    paddingLeft: '48px'
                }}
            >
                <JournalHeader
                    filters={filters}
                    setFilters={setFilters}
                    dateFilterMode={dateFilterMode}
                    applyDateFilter={applyDateFilter}
                    isCustomPickerOpen={isCustomPickerOpen}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    metricsOrder={metricsOrder}
                    setMetricsOrder={setMetricsOrder}
                    hiddenMetrics={hiddenMetrics}
                    toggleMetricVisibility={toggleMetricVisibility}
                    columnsOrder={columnsOrder}
                    setColumnsOrder={setColumnsOrder}
                    hiddenColumns={hiddenColumns}
                    toggleColumnVisibility={toggleColumnVisibility}
                    isTextWrapEnabled={isTextWrapEnabled}
                    setIsTextWrapEnabled={setIsTextWrapEnabled}
                    openTradeModal={openTradeModal}
                    controlsScale={controlsScale}
                    dateToggleConfig={dateToggleConfig}
                    positionsConfig={positionsConfig}
                />

                <JournalMetrics
                    metrics={metrics}
                    metricsOrder={metricsOrder}
                    hiddenMetrics={hiddenMetrics}
                    scale={metricsConfig.scale}
                    fontWeight={metricsConfig.fontWeight}
                />
            </header>

            <TradeTable
                trades={sortedTrades}
                sortConfig={sortConfig}
                onSort={handleSort}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                onToggleSelectAll={toggleSelectAll}
                visibleColumns={visibleColumns}
                columnWidths={columnWidths}
                onResize={startResize}
                onRowClick={openTradeDetail}
                isTextWrapEnabled={isTextWrapEnabled}
            />

            <footer id="journal-footer" className="journal-view__footer text-xs text-slate-400 text-center py-4">
                Showing {sortedTrades.length} of {trades.length} trades
            </footer>
        </section>
    );
};

Journal.displayName = 'Journal';
