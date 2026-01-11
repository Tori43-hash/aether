import React, { useState, useCallback, Suspense, useRef, useEffect, useLayoutEffect } from 'react';

// Layers
import { MainLayout } from '../../widgets/layouts';
import { NavigationDock } from '../../widgets/nav';
import { TradeModal, PreferencesModal } from '../../widgets/modals';
import { DashboardPage } from '../../pages/dashboard';
import { JournalPage, TradeDetail as TradeDetailPage } from '../../pages/journal';
import { LoginPage } from '../../pages/login';

// Shared
import { usePageTransition, usePreload, useWindowSize, useLayoutConfig } from '../../shared';

// Entities
import type { Trade } from '../../entities/trade';
import { useTrades, DEFAULT_TRADE } from '../../entities/trade';

// Features
import { useAuth } from '../../features/auth';


// Lazy Components
const AnalyticsPage = React.lazy(() =>
    import('../../pages/analytics').then(module => ({ default: module.AnalyticsPage }))
);

const TradeDetail = React.lazy(() =>
    import('../../pages/journal').then(module => ({ default: module.TradeDetail }))
);
const CanvasJournalPage = React.lazy(() =>
    import('../../pages/canvas').then(module => ({ default: module.CanvasPage }))
);

// Preload functions
const preloadAnalytics = () => import('../../pages/analytics');
const preloadTradeDetail = () => import('../../pages/journal');
const preloadCanvasJournal = () => import('../../pages/canvas');

export const AppRouter: React.FC = () => {
    // Auth check - show login page if not authenticated
    const { isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();

    const [currentTab, setCurrentTab] = useState('dashboard');
    const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['dashboard']));
    const [navPosition, setNavPosition] = useState<'bottom' | 'top' | 'left' | 'right'>('bottom');
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [journalKey, setJournalKey] = useState(0);
    const prevTabRef = useRef<string>('dashboard');
    const [skipContainerTransition, setSkipContainerTransition] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Modal State - must be before early returns
    const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
    const [newTrade, setNewTrade] = useState<Partial<Trade>>(DEFAULT_TRADE);
    const [activeTrade, setActiveTrade] = useState<Trade | null>(null);

    // Layout Config
    const { menuScale, edgeOffset } = useLayoutConfig();

    // Hooks
    const { addTrade: addTradeHook, updateTrade } = useTrades();
    const { preloadComponent } = usePreload();

    const { transitionState, startTransition, isBlurActive } = usePageTransition({
        duration: 200,
        onTransitionEnd: () => { }
    });

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
            case 'stats': preloadComponent(preloadAnalytics); break;
            case 'journal': break;
            default: break;
        }
    }, [preloadComponent]);

    const addTrade = useCallback(async () => {
        if (!newTrade.ticker || newTrade.pnl === undefined) return;
        const trade = await addTradeHook(newTrade as Omit<Trade, 'id'>);
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

    const saveTradeDetail = useCallback(async (updatedTrade: Trade) => {
        await updateTrade(updatedTrade.id, updatedTrade);
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



    // Show loading spinner while checking auth - AFTER all hooks
    if (isAuthLoading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                    <span className="text-slate-500 text-sm font-medium">Loading...</span>
                </div>
            </div>
        );
    }

    // Show login page if not authenticated - AFTER all hooks
    if (!isAuthenticated) {
        return <LoginPage />;
    }

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
                            <AnalyticsPage changeTab={changeTab} />
                        </Suspense>
                    </div>
                )}



                {/* Canvas Journal */}
                {(visitedTabs.has('canvas-journal') || currentTab === 'canvas-journal') && (
                    <div
                        className={`page-content ${currentTab === 'canvas-journal' ? 'page-active' : 'page-inactive'}`}
                        style={{ display: currentTab === 'canvas-journal' ? 'block' : 'none' }}
                    >
                        <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400">Загрузка журнала холстов...</div>}>
                            <CanvasJournalPage />
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
                onLogout={() => {
                    logout();
                    setIsPreferencesOpen(false);
                }}
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
