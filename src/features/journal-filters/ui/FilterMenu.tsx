import React from 'react';
import {
    ArrowLeftRight, Calendar, Globe, CalendarDays, Timer,
    LogIn, LogOut, Hash, BarChart3, AlertTriangle, CalendarCheck, Banknote
} from 'lucide-react';

const filterOptions = [
    { id: 'ticker', label: 'Pair', icon: ArrowLeftRight },
    { id: 'date', label: 'Open Date', icon: Calendar },
    { id: 'session', label: 'Session', icon: Globe },
    { id: 'weekday', label: 'Weekday', icon: CalendarDays },
    { id: 'holdtime', label: 'Holdtime', icon: Timer },
    { id: 'entry', label: 'Entry', icon: LogIn },
    { id: 'exit', label: 'Exit', icon: LogOut },
    { id: 'size', label: 'Size', icon: Hash },
    { id: 'volume', label: 'Volume', icon: BarChart3 },
    { id: 'risk', label: 'Risk', icon: AlertTriangle },
    { id: 'exitDate', label: 'Close Date', icon: CalendarCheck },
    { id: 'pnl', label: 'PnL', icon: Banknote },
];

export interface FilterMenuProps {
    /** Callback when a filter is selected */
    onSelectFilter?: (filterId: string) => void;
}

/**
 * Menu for adding filters to the trade journal.
 * Displays available filter options with icons.
 */
export const FilterMenu: React.FC<FilterMenuProps> = ({ onSelectFilter }) => {
    return (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl z-50 p-2 animate-fade-in origin-top-right">
            <div className="px-3 py-2 flex items-center justify-between border-b border-slate-50 mb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add Filter</span>
            </div>
            <div className="space-y-0.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                {filterOptions.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => onSelectFilter?.(opt.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-slate-50 text-left group"
                    >
                        <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
                            <opt.icon className="w-4 h-4 stroke-[1.5]" />
                        </div>
                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">
                            {opt.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

FilterMenu.displayName = 'FilterMenu';
