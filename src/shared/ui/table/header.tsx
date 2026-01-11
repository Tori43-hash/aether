import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T extends string = string> {
    field: T;
    direction: SortDirection;
}

export interface SortableHeaderProps<T extends string = string> {
    /** Display label for the header */
    label: string;
    /** Field identifier for sorting */
    field: T;
    /** Current sort configuration */
    currentSort: SortConfig<T>;
    /** Callback when header is clicked for sorting */
    onSort: (field: T) => void;
    /** Additional inline styles */
    style?: React.CSSProperties;
    /** Additional CSS classes */
    className?: string;
    /** Text alignment */
    align?: 'left' | 'center' | 'right';
    /** Optional children (e.g., resizer element) */
    children?: React.ReactNode;
}

/**
 * A reusable sortable table header component with sort direction indicators.
 */
export function SortableHeader<T extends string = string>({
    label,
    field,
    currentSort,
    onSort,
    style,
    className,
    align = 'left',
    children
}: SortableHeaderProps<T>) {
    return (
        <th
            style={style}
            className={`border-y border-slate-200 p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider relative group text-${align} align-middle break-words cursor-pointer select-none hover:bg-slate-50 transition-colors ${className || ''}`}
            onClick={() => onSort(field)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                {label}
                {currentSort.field === field && (
                    currentSort.direction === 'asc'
                        ? <ArrowUp className="w-3 h-3 text-slate-600" />
                        : <ArrowDown className="w-3 h-3 text-slate-600" />
                )}
            </div>
            {children}
        </th>
    );
}

SortableHeader.displayName = 'SortableHeader';
