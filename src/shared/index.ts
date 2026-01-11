// Shared Layer - Public API
// FSD: This is the shared layer containing reusable code without business logic
// Domain types and config have been moved to entities/trade

// Lib - Utilities and Hooks
export {
    formatPercent,
    useWindowSize,
    useProgressiveLoad,
    usePreload,
    useLayoutConfig,
    usePageTransition,
} from './lib';

export type {
    WindowSize,
    DateToggleConfig,
    PositionsConfig,
    MetricsConfig,
    LayoutConfig,
    TextConfig,
    FilterBarSpacing,
    TransitionState,
} from './lib';

// UI Components
export {
    DebouncedColorInput,
    DualCalendar,
    DraggableMenu,
    ViewSettingsMenu,
    SortableHeader,
} from './ui';

export type {
    DualCalendarProps,
    DraggableMenuProps,
    ViewSettingsMenuProps,
    SortableHeaderProps,
    SortConfig,
    SortDirection,
} from './ui';

// API Layer
export {
    httpClient,
    tokenStorage,
    ApiError,
    authApi,
    tradesApi,
} from './api';

export type {
    User,
    Tokens,
    LoginDto,
    RegisterDto,
    TradeQueryParams,
    CreateTradeDto,
    UpdateTradeDto,
} from './api';

