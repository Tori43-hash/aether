import React, { useRef, useEffect, useCallback } from 'react';
import {
    ChevronDown, ChevronLeft, ChevronRight,
    Check, LineChart, Columns3, Filter, Search, Settings, X
} from 'lucide-react';
import { DualCalendar, DraggableMenu, ViewSettingsMenu } from '../../../shared';
import { FilterMenu } from '../../../features/journal';
import type { FilterState, DateFilterMode } from '../../../features/journal';
import { DATE_OPTIONS, METRIC_LABELS, PROPERTY_LABELS } from '../../../features/journal';

// --- Types ---

export interface JournalHeaderProps {
    // Filter props
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    dateFilterMode: DateFilterMode;
    applyDateFilter: (mode: DateFilterMode) => void;
    isCustomPickerOpen: boolean;

    // Search props
    searchQuery: string;
    setSearchQuery: (query: string) => void;

    // Metrics menu props
    metricsOrder: string[];
    setMetricsOrder: React.Dispatch<React.SetStateAction<string[]>>;
    hiddenMetrics: string[];
    toggleMetricVisibility: (id: string) => void;

    // Columns menu props
    columnsOrder: string[];
    setColumnsOrder: React.Dispatch<React.SetStateAction<string[]>>;
    hiddenColumns: string[];
    toggleColumnVisibility: (id: string) => void;

    // View settings props
    isTextWrapEnabled: boolean;
    setIsTextWrapEnabled: (enabled: boolean) => void;

    // Actions
    openTradeModal: () => void;

    // Styling
    controlsScale?: number;
    dateToggleConfig?: { fontSize: number; fontWeight: number; height: number; paddingX: number };
    positionsConfig?: { fontSize: number; fontWeight: number; height: number; paddingX: number; borderRadius: number };
}

export const JournalHeader: React.FC<JournalHeaderProps> = ({
    filters,
    setFilters,
    dateFilterMode,
    applyDateFilter,
    isCustomPickerOpen,
    searchQuery,
    setSearchQuery,
    metricsOrder,
    setMetricsOrder,
    hiddenMetrics,
    toggleMetricVisibility,
    columnsOrder,
    setColumnsOrder,
    hiddenColumns,
    toggleColumnVisibility,
    isTextWrapEnabled,
    setIsTextWrapEnabled,
    openTradeModal,
    controlsScale = 1,
    dateToggleConfig = { fontSize: 12, fontWeight: 500, height: 32, paddingX: 12 },
    positionsConfig = { fontSize: 13, fontWeight: 500, height: 32, paddingX: 12, borderRadius: 8 }
}) => {
    // Local state for menu visibility
    const [showPositionMenu, setShowPositionMenu] = React.useState(false);
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [isMetricsMenuOpen, setIsMetricsMenuOpen] = React.useState(false);
    const [isPropertiesMenuOpen, setIsPropertiesMenuOpen] = React.useState(false);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = React.useState(false);
    const [isViewSettingsOpen, setIsViewSettingsOpen] = React.useState(false);

    // Refs
    const positionMenuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const customPickerRef = useRef<HTMLDivElement>(null);
    const metricsMenuRef = useRef<HTMLDivElement>(null);
    const metricsButtonRef = useRef<HTMLButtonElement>(null);
    const propertiesMenuRef = useRef<HTMLDivElement>(null);
    const propertiesButtonRef = useRef<HTMLButtonElement>(null);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    const filterButtonRef = useRef<HTMLButtonElement>(null);
    const viewSettingsMenuRef = useRef<HTMLDivElement>(null);
    const viewSettingsButtonRef = useRef<HTMLButtonElement>(null);

    // Highlight style for date toggle
    const [highlightStyle, setHighlightStyle] = React.useState({ width: 0, transform: 'translateX(0px)' });

    const updateHighlight = useCallback(() => {
        const activeIndex = DATE_OPTIONS.indexOf(dateFilterMode);
        const el = tabsRef.current[activeIndex];
        if (el) {
            setHighlightStyle({
                width: el.offsetWidth,
                transform: `translateX(${el.offsetLeft - 2}px)`
            });
        }
    }, [dateFilterMode]);

    useEffect(() => {
        updateHighlight();
        const timeoutId = setTimeout(updateHighlight, 50);
        window.addEventListener('resize', updateHighlight);
        return () => {
            window.removeEventListener('resize', updateHighlight);
            clearTimeout(timeoutId);
        };
    }, [updateHighlight, controlsScale, dateToggleConfig]);

    // Focus search input when opened
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (positionMenuRef.current && !positionMenuRef.current.contains(target)) setShowPositionMenu(false);
            if (customPickerRef.current && !customPickerRef.current.contains(target) && !tabsRef.current[4]?.contains(target)) {
                // Close custom picker handled by parent
            }
            if (metricsMenuRef.current && !metricsMenuRef.current.contains(target) && !metricsButtonRef.current?.contains(target)) setIsMetricsMenuOpen(false);
            if (propertiesMenuRef.current && !propertiesMenuRef.current.contains(target) && !propertiesButtonRef.current?.contains(target)) setIsPropertiesMenuOpen(false);
            if (filterMenuRef.current && !filterMenuRef.current.contains(target) && !filterButtonRef.current?.contains(target)) setIsFilterMenuOpen(false);
            if (viewSettingsMenuRef.current && !viewSettingsMenuRef.current.contains(target) && !viewSettingsButtonRef.current?.contains(target)) setIsViewSettingsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div id="filters-toolbar" className="journal-view__toolbar flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <nav id="filter-nav" aria-label="Filter Navigation" className="journal-view__nav flex items-center gap-3 origin-left transition-transform duration-200 flex-shrink-0" style={{ zoom: controlsScale }}>
                {/* Position Dropdown */}
                <div className="bg-white p-1 border border-slate-200 shadow-sm w-fit" style={{ borderRadius: `${positionsConfig.borderRadius + 4}px` }}>
                    <div className="relative" ref={positionMenuRef}>
                        <button
                            onClick={() => setShowPositionMenu(!showPositionMenu)}
                            className="flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition select-none min-w-[140px] justify-between leading-none outline-none focus:outline-none"
                            style={{
                                height: `${positionsConfig.height}px`,
                                paddingLeft: `${positionsConfig.paddingX}px`,
                                paddingRight: `${positionsConfig.paddingX}px`,
                                fontSize: `${positionsConfig.fontSize}px`,
                                fontWeight: positionsConfig.fontWeight,
                                borderRadius: `${positionsConfig.borderRadius}px`
                            }}
                        >
                            <span>
                                {filters.status === 'All' ? 'All Positions' :
                                    filters.status === 'Open' ? 'Open Positions' : 'Closed Positions'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        {showPositionMenu && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-30 p-1 animate-fade-in">
                                {['All', 'Open', 'Closed'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setFilters(prev => ({ ...prev, status: opt as any }));
                                            setShowPositionMenu(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg flex items-center justify-between group whitespace-nowrap"
                                    >
                                        {opt === 'All' ? 'All Positions' : `${opt} Positions`}
                                        {filters.status === opt && <Check className="w-3 h-3 text-blue-500" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>

                {/* Date Toggle */}
                <div
                    className="relative inline-flex bg-[#ededed] p-[2px] rounded-[10px] items-center box-border select-none w-fit"
                    style={{ height: `${dateToggleConfig.height}px` }}
                >
                    <div
                        className="absolute top-[2px] left-[2px] h-[calc(100%-4px)] bg-white rounded-[8px] shadow-[0_2px_4px_rgba(0,0,0,0.05)] z-10 pointer-events-none"
                        style={{
                            width: `${highlightStyle.width}px`,
                            transform: highlightStyle.transform,
                            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s ease'
                        }}
                    />
                    {DATE_OPTIONS.map((m, i) => (
                        <button
                            key={m}
                            ref={el => { tabsRef.current[i] = el; }}
                            onClick={() => applyDateFilter(m as DateFilterMode)}
                            className={`relative z-20 bg-transparent border-none h-full cursor-pointer flex items-center justify-center min-w-[32px] outline-none focus:outline-none transition-colors duration-200 leading-none whitespace-nowrap ${dateFilterMode === m ? 'text-[#1c2026]' : 'text-[#8e8e93] hover:text-[#333]'}`}
                            style={{
                                fontSize: `${dateToggleConfig.fontSize}px`,
                                fontWeight: dateToggleConfig.fontWeight,
                                padding: `0 ${dateToggleConfig.paddingX}px`
                            }}
                        >
                            {m}
                        </button>
                    ))}

                    {isCustomPickerOpen && (
                        <div ref={customPickerRef} className="absolute top-full left-0 mt-4 z-50 animate-fade-in origin-top-left">
                            <DualCalendar
                                startDate={filters.startDate}
                                endDate={filters.endDate}
                                onChange={(s, e) => setFilters(prev => ({ ...prev, startDate: s, endDate: e }))}
                            />
                        </div>
                    )}
                </div>
            </nav>

            <nav id="action-nav" aria-label="Action Menu" className="journal-view__nav flex flex-wrap gap-1.5 items-center justify-end flex-shrink-0" style={{ margin: 0, padding: 0 }}>
                <div className="flex items-center gap-0.5 mr-1 relative">
                    {/* Metrics Menu */}
                    <div className="relative" ref={metricsMenuRef}>
                        <button
                            ref={metricsButtonRef}
                            onClick={() => setIsMetricsMenuOpen(!isMetricsMenuOpen)}
                            className={`p-2 transition rounded-lg outline-none focus:outline-none ${isMetricsMenuOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <LineChart className="w-5 h-5 stroke-[1.5]" />
                        </button>
                        {isMetricsMenuOpen && (
                            <DraggableMenu
                                title="Configure Metrics"
                                initialOrder={metricsOrder}
                                hiddenIds={hiddenMetrics}
                                onCommitOrder={setMetricsOrder}
                                onToggleVisibility={toggleMetricVisibility}
                                labels={METRIC_LABELS}
                            />
                        )}
                    </div>

                    <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>

                    {/* Properties Menu */}
                    <div className="relative" ref={propertiesMenuRef}>
                        <button
                            ref={propertiesButtonRef}
                            onClick={() => setIsPropertiesMenuOpen(!isPropertiesMenuOpen)}
                            className={`p-2 transition rounded-lg outline-none focus:outline-none ${isPropertiesMenuOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Columns3 className="w-5 h-5 stroke-[1.5]" />
                        </button>
                        {isPropertiesMenuOpen && (
                            <DraggableMenu
                                title="Configure Properties"
                                initialOrder={columnsOrder}
                                hiddenIds={hiddenColumns}
                                onCommitOrder={setColumnsOrder}
                                onToggleVisibility={toggleColumnVisibility}
                                labels={PROPERTY_LABELS}
                            />
                        )}
                    </div>

                    {/* Filter Menu */}
                    <div className="relative" ref={filterMenuRef}>
                        <button
                            ref={filterButtonRef}
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            className={`p-2 transition rounded-lg outline-none focus:outline-none ${isFilterMenuOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Filter className="w-5 h-5 stroke-[1.5]" />
                        </button>
                        {isFilterMenuOpen && <FilterMenu />}
                    </div>

                    <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>

                    {/* Search */}
                    {isSearchOpen ? (
                        <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1 transition-all animate-fade-in w-48 mr-1">
                            <Search className="w-4 h-4 text-slate-400 mr-2" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search ticker..."
                                className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder-slate-400"
                                onBlur={() => !searchQuery && setIsSearchOpen(false)}
                            />
                            <button onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }} className="text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="p-2 text-slate-400 hover:text-slate-600 transition hover:bg-slate-50 rounded-lg outline-none focus:outline-none"
                        >
                            <Search className="w-5 h-5 stroke-[1.5]" />
                        </button>
                    )}

                    {/* View Settings */}
                    <div className="relative" ref={viewSettingsMenuRef}>
                        <button
                            ref={viewSettingsButtonRef}
                            onClick={() => setIsViewSettingsOpen(!isViewSettingsOpen)}
                            className={`p-2 transition rounded-lg outline-none focus:outline-none ${isViewSettingsOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Settings className="w-5 h-5 stroke-[1.5]" />
                        </button>
                        {isViewSettingsOpen && (
                            <ViewSettingsMenu
                                isTextWrapEnabled={isTextWrapEnabled}
                                setIsTextWrapEnabled={setIsTextWrapEnabled}
                            />
                        )}
                    </div>
                </div>
                <button
                    onClick={openTradeModal}
                    className="px-6 py-2 rounded-xl bg-[#007AFF] text-white text-sm font-bold shadow-md hover:bg-blue-600 transition flex items-center gap-2 transform active:scale-95 outline-none focus:outline-none"
                >
                    New
                </button>
            </nav>
        </div>
    );
};

JournalHeader.displayName = 'JournalHeader';
