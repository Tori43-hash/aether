import type { Trade } from '../model/types';

export const formatTradeDate = (trade: Trade, isFull = false) => {
    if (!trade.entryDate) return { __html: trade.date };
    const d1 = new Date(trade.entryDate);
    const d2 = trade.exitDate ? new Date(trade.exitDate) : d1;

    const optionsDate: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const optionsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

    const date1Str = d1.toLocaleDateString('en-US', optionsDate);
    const time1Str = d1.toLocaleTimeString('en-US', optionsTime);
    const date2Str = d2.toLocaleDateString('en-US', optionsDate);
    const time2Str = d2.toLocaleTimeString('en-US', optionsTime);

    if (isFull) {
        if (date1Str === date2Str) return { __html: `${date1Str}, ${time1Str} - ${time2Str}` };
        return { __html: `${date1Str} ${time1Str} - ${date2Str} ${time2Str}` };
    }

    if (date1Str === date2Str) {
        return {
            __html: `<span class="block text-slate-700 font-semibold">${date1Str}</span><span class="text-xs text-slate-400">${time1Str} - ${time2Str}</span>`
        };
    } else {
        return {
            __html: `<span class="block text-slate-700 font-semibold">${date1Str}</span><span class="text-xs text-slate-400">to ${date2Str}</span>`
        };
    }
};
