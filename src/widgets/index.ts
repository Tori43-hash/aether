// Widgets Layer - Public API
// FSD: Widgets are self-contained UI blocks combining features and entities

// Navigation
export { NavigationDock } from './nav';

// Modals
export { TradeModal, PlanModal, PreferencesModal } from './modals';

// Charts
export { DashboardChart, MockChart, ProgressiveChart } from './charts';

// Layouts
export { MainLayout } from './layouts';

// Journal (TradeTable, Header, Metrics)
export { TradeTable, JournalHeader, JournalMetrics, useJournalMetrics, calculateMetrics } from './journal';
export type { JournalHeaderProps, JournalMetricsProps, JournalMetricsData } from './journal';

// Canvas
export { WhiteboardCanvas, CanvasJournalList, CanvasCard } from './canvas';
