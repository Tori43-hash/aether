import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DualCalendarProps {
    startDate: string;
    endDate: string;
    onChange: (start: string, end: string) => void;
    onClose?: () => void;
}

/**
 * A dual-month calendar component for selecting date ranges.
 * Displays two consecutive months side by side with range selection support.
 */
export const DualCalendar: React.FC<DualCalendarProps> = ({ startDate, endDate, onChange, onClose }) => {
    const [viewDate, setViewDate] = useState(() => {
        if (startDate) return new Date(startDate);
        return new Date();
    });

    const parseDate = (str: string) => {
        if (!str) return null;
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const startObj = useMemo(() => parseDate(startDate), [startDate]);
    const endObj = useMemo(() => parseDate(endDate), [endDate]);

    const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    const handleDateClick = (clickedDate: Date) => {
        const dateStr = fmt(clickedDate);

        if (!startDate || (startDate && endDate)) {
            onChange(dateStr, '');
        } else if (startDate && !endDate) {
            if (clickedDate < (startObj || new Date())) {
                onChange(dateStr, '');
            } else {
                onChange(startDate, dateStr);
                if (onClose) onClose();
            }
        }
    };

    const isSelected = (d: Date) => {
        const t = d.getTime();
        if (startObj && t === startObj.getTime()) return 'start';
        if (endObj && t === endObj.getTime()) return 'end';
        if (startObj && endObj && t > startObj.getTime() && t < endObj.getTime()) return 'range';
        return null;
    };

    const renderMonth = (offset: number) => {
        const currentMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Monday start
        const firstDay = new Date(year, month, 1).getDay();
        const paddingDays = firstDay === 0 ? 6 : firstDay - 1;

        const days = [];
        for (let i = 0; i < paddingDays; i++) {
            days.push(<div key={`empty-${offset}-${i}`} className="h-9 w-9"></div>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const status = isSelected(date);
            const isToday = date.toDateString() === new Date().toDateString();

            let btnClass = "relative w-9 h-9 flex items-center justify-center text-sm rounded-full transition z-10 ";

            if (status === 'start' || status === 'end') {
                btnClass += "bg-slate-800 text-white font-bold ";
            } else if (status === 'range') {
                btnClass += "text-slate-700 bg-slate-100 rounded-none w-full ";
            } else {
                btnClass += "text-slate-600 hover:bg-slate-100 ";
                if (isToday) btnClass += "font-bold text-slate-900 ring-1 ring-slate-200 ";
            }

            const rangeBg = status === 'range' ? <div className="absolute inset-0 bg-slate-100 -z-0"></div> : null;
            const startConnector = (status === 'start' && endObj) ? <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-slate-100 -z-0"></div> : null;
            const endConnector = (status === 'end' && startObj) ? <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-slate-100 -z-0"></div> : null;

            days.push(
                <div key={`day-${offset}-${i}`} className="relative p-0 flex items-center justify-center">
                    {rangeBg}
                    {startConnector}
                    {endConnector}
                    <button onClick={() => handleDateClick(date)} className={btnClass}>
                        {i}
                    </button>
                </div>
            );
        }

        return (
            <div className="w-64">
                <div className="text-center font-bold text-slate-800 mb-4">
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <div className="grid grid-cols-7 mb-2 text-center">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                        <div key={d} className="text-xs font-bold text-slate-400 h-8 flex items-center justify-center">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 row-auto gap-y-1">
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="flex items-start gap-8 relative p-6 bg-white rounded-2xl shadow-xl border border-slate-200 animate-fade-in" onClick={e => e.stopPropagation()}>
            <button
                onClick={() => changeMonth(-1)}
                className="absolute left-4 top-6 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
                title="Previous Month"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={() => changeMonth(1)}
                className="absolute right-4 top-6 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
                title="Next Month"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {renderMonth(0)}
            {renderMonth(1)}
        </div>
    );
};

DualCalendar.displayName = 'DualCalendar';
