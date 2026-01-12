// Shared UI Layer - Public API
// FSD: shared/ui contains reusable UI components without business logic

export { DebouncedColorInput } from './inputs';

// Calendar components
export { DualCalendar } from './calendar';
export type { DualCalendarProps } from './calendar';

// Menu components
export { DraggableMenu, ViewSettingsMenu } from './menu';
export type { DraggableMenuProps, ViewSettingsMenuProps } from './menu';

// Table components
export { SortableHeader } from './table';
export type { SortableHeaderProps, SortConfig, SortDirection } from './table';

// Layout components
export {
    PageGrid,
    PageSection,
    PageHeader,
    PageSectionFull
} from './layout';
export type {
    PageGridProps,
    PageSectionProps,
    PageHeaderProps,
    PageSectionFullProps,
    SectionColumns,
    SectionGap
} from './layout';
