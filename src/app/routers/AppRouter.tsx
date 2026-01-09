import React, { useState, useCallback, Suspense, useRef, useEffect, useLayoutEffect } from 'react';

// Layers
import { MainLayout } from '../../widgets/layouts';
import { NavigationDock } from '../../widgets/navigation-dock';
import { TradeModal, PreferencesModal } from '../../widgets/modals';
import { DashboardPage } from '../../pages/dashboard';
import { JournalPage, TradeDetail as TradeDetailPage } from '../../pages/journal';

// Shared
import { usePageTransition, usePreload, useWindowSize, useLayoutConfig } from '../../shared';

// Entities
import type { Trade } from '../../entities/trade';
import { useTrades, DEFAULT_TRADE } from '../../entities/trade';

// Lazy Components
const StatsPage = React.lazy(() =>
    import('../../pages/stats').then(module => ({ default: module.StatsPage }))
);
const PlanningBoard = React.lazy(() =>
    import('../../features/whiteboard').then(module => ({ default: module.PlanningBoard }))
);
const TradeDetail = React.lazy(() =>
    import('../../pages/journal').then(module => ({ default: module.TradeDetail }))
);

// Preload functions
const preloadStats = () => import('../../pages/stats');
const preloadPlanningBoard = () => import('../../features/whiteboard');
const preloadTradeDetail = () => import('../../pages/journal');

export const AppRouter: React.FC = () => {
    const [currentTab, setCurrentTab] = useState('dashboard');
    const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['dashboard']));
    const [navPosition, setNavPosition] = useState<'bottom' | 'top' | 'left' | 'right'>('bottom');
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [isUIHidden, setIsUIHidden] = useState<boolean>(false);
    const [journalKey, setJournalKey] = useState(0);
    const prevTabRef = useRef<string>('dashboard');
    const [skipContainerTransition, setSkipContainerTransition] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Layout Config
    // Layout Config
    const { menuScale, edgeOffset } = useLayoutConfig();


    // Hooks
    const { addTrade: addTradeHook, updateTrade } = useTrades();
    const { preloadComponent } = usePreload();

    const { transitionState, startTransition, isBlurActive } = usePageTransition({
        duration: 200,
        onTransitionEnd: () => { }
    });

    // Modal State
    const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
    const [newTrade, setNewTrade] = useState<Partial<Trade>>(DEFAULT_TRADE);
    const [activeTrade, setActiveTrade] = useState<Trade | null>(null);

    const changeTab = useCallback((tab: string) => {
        if (tab === currentTab) return;
        startTransition();
        requestAnimationFrame(() => {
            setCurrentTab(tab);
            setVisitedTabs(prev => {
                const newSet = new Set(prev);
                newSet.add(tab);
                return newSet;
            });
        });
    }, [currentTab, startTransition]);

    const handleNavHover = useCallback((tab: string) => {
        switch (tab) {
            case 'stats': preloadComponent(preloadStats); break;
            case 'journal': break;
            default: break;
        }
    }, [preloadComponent]);

    const addTrade = useCallback(() => {
        if (!newTrade.ticker || newTrade.pnl === undefined) return;
        const trade = addTradeHook(newTrade);
        if (trade) {
            setNewTrade(DEFAULT_TRADE);
            setIsTradeModalOpen(false);
        }
    }, [newTrade, addTradeHook]);

    const openTradeDetail = useCallback((trade: Trade) => {
        if (!trade.tda || trade.tda.length === 0) {
            trade.tda = Array(4).fill({ tf: '', image: '', note: '' });
        }
        setActiveTrade(trade);
        changeTab('trade-detail');
    }, [changeTab]);

    const saveTradeDetail = useCallback((updatedTrade: Trade) => {
        updateTrade(updatedTrade);
        changeTab('journal');
    }, [updateTrade, changeTab]);

    useLayoutEffect(() => {
        if (containerRef.current) containerRef.current.style.transition = 'none';
        setSkipContainerTransition(true);
        const timeoutId = setTimeout(() => {
            if (containerRef.current) containerRef.current.style.transition = '';
            setSkipContainerTransition(false);
        }, 50);
        return () => clearTimeout(timeoutId);
    }, [currentTab]);

    useEffect(() => { prevTabRef.current = currentTab; }, [currentTab]);

    useEffect(() => {
        const checkUIHidden = () => {
            if (currentTab === 'traders') {
                const planningHidden = localStorage.getItem('whiteboard-ui-hidden');
                const tradersHidden = localStorage.getItem('traders-whiteboard-ui-hidden');
                const hidden = planningHidden ? JSON.parse(planningHidden) : (tradersHidden ? JSON.parse(tradersHidden) : false);
                setIsUIHidden(hidden);
            } else {
                setIsUIHidden(false);
            }
        };
        checkUIHidden();
        window.addEventListener('storage', checkUIHidden);
        const handleUIHiddenChanged = (e: Event) => {
            if (currentTab === 'traders') {
                const customEvent = e as CustomEvent<{ isUIHidden: boolean }>;
                setIsUIHidden(customEvent.detail.isUIHidden);
            }
        };
        window.addEventListener('ui-hidden-changed', handleUIHiddenChanged);
        return () => {
            window.removeEventListener('storage', checkUIHidden);
            window.removeEventListener('ui-hidden-changed', handleUIHiddenChanged);
        };
    }, [currentTab]);

    // We need to import useLayoutConfig to inject props into JournalPage
    // However, MainLayout already renders the container.
    // JournalPage props: controlsScale, dateToggleConfig, etc.
    // We can just import useLayoutConfig here.

    return (
        <MainLayout
            currentTab={currentTab}
            navPosition={navPosition}
            containerRef={containerRef}
            sidebar={
                <NavigationDock
                    currentTab={currentTab}
                    changeTab={changeTab}
                    onNavHover={handleNavHover}
                    position={navPosition}
                    scale={menuScale}
                    edgeOffset={edgeOffset}
                    onOpenSettings={() => setIsPreferencesOpen(true)}
                    isUIHidden={isUIHidden}
                />
            }
        >
            <div className={`page-transition-container ${transitionState === 'exiting' ? 'page-exiting' : transitionState === 'entering' ? 'page-entering' : 'page-idle'}`}>
                {/* Dashboard */}
                <div
                    className={`page-content ${currentTab === 'dashboard' ? 'page-active' : 'page-inactive'} ${isBlurActive && currentTab === 'dashboard' ? 'page-content-blur' : ''}`}
                    style={{ display: currentTab === 'dashboard' ? 'block' : 'none' }}
                >
                    <DashboardPage
                        openTradeModal={() => setIsTradeModalOpen(true)}
                        changeTab={changeTab}
                    />
                </div>

                {/* Stats */}
                {(visitedTabs.has('stats') || currentTab === 'stats') && (
                    <div
                        className={`page-content ${currentTab === 'stats' ? 'page-active' : 'page-inactive'} ${isBlurActive && currentTab === 'stats' ? 'page-content-blur' : ''}`}
                        style={{ display: currentTab === 'stats' ? 'block' : 'none' }}
                    >
                        <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400">Loading Stats...</div>}>
                            <StatsPage changeTab={changeTab} />
                        </Suspense>
                    </div>
                )}

                {/* Whiteboard */}
                {(visitedTabs.has('traders') || currentTab === 'traders') && (
                    <div
                        className={`${currentTab === 'traders' ? '' : ''}`}
                        style={{ display: currentTab === 'traders' ? 'block' : 'none' }}
                    >
                        <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400">Loading Whiteboard...</div>}>
                            <PlanningBoard />
                        </Suspense>
                    </div>
                )}

                {/* Journal */}
                {(visitedTabs.has('journal') || currentTab === 'journal') && (
                    <div
                        className={`page-content ${currentTab === 'journal' ? 'page-active' : 'page-inactive'} ${isBlurActive && currentTab === 'journal' ? 'page-content-blur' : ''}`}
                        style={{ display: currentTab === 'journal' ? 'block' : 'none' }}
                    >
                        <JournalWrapper
                            journalKey={journalKey}
                            setIsTradeModalOpen={setIsTradeModalOpen}
                            openTradeDetail={openTradeDetail}
                        />
                    </div>
                )}

                {/* Trade Detail */}
                {currentTab === 'trade-detail' && activeTrade && (
                    <div className={`page-content page-active ${isBlurActive ? 'page-content-blur' : ''}`}>
                        <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400">Loading Trade...</div>}>
                            <TradeDetail
                                trade={activeTrade}
                                goBack={() => changeTab('journal')}
                                onSave={saveTradeDetail}
                            />
                        </Suspense>
                    </div>
                )}
            </div>

            <TradeModal
                isOpen={isTradeModalOpen}
                onClose={() => setIsTradeModalOpen(false)}
                newTrade={newTrade}
                setNewTrade={setNewTrade}
                onSave={addTrade}
            />

            <PreferencesModal
                isOpen={isPreferencesOpen}
                onClose={() => setIsPreferencesOpen(false)}
                position={navPosition}
                setPosition={setNavPosition}
            />
        </MainLayout>
    );
};

// Internal wrapper to handle useLayoutConfig for Journal
// Because we didn't export useLayoutConfig in this file scope yet

const JournalWrapper: React.FC<{
    journalKey: number,
    setIsTradeModalOpen: (v: boolean) => void,
    openTradeDetail: (t: Trade) => void
}> = ({ journalKey, setIsTradeModalOpen, openTradeDetail }) => {
    const layoutConfig = useLayoutConfig();
    return (
        <JournalPage
            key={journalKey}
            openTradeModal={() => setIsTradeModalOpen(true)}
            openTradeDetail={openTradeDetail}
            controlsScale={layoutConfig.controlsScale}
            dateToggleConfig={layoutConfig.dateToggleConfig}
            positionsConfig={layoutConfig.positionsConfig}
            metricsConfig={layoutConfig.metricsConfig}
            rightGutter={layoutConfig.rightGutter}
            leftGutter={layoutConfig.leftGutter}
            filterBarSpacing={layoutConfig.filterBarSpacing}
            skipAnimation={true}
        />
    );
};
