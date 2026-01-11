import React, { useCallback } from 'react';
import { formatPercent } from '../../../shared';
import type { JournalMetricsData } from '../lib/calculateMetrics';

interface MetricDisplayItem {
    label: string;
    val: string;
    className: string;
}

export interface JournalMetricsProps {
    metrics: JournalMetricsData;
    metricsOrder: string[];
    hiddenMetrics: string[];
    scale?: number;
    fontWeight?: number;
}

export const JournalMetrics: React.FC<JournalMetricsProps> = ({
    metrics,
    metricsOrder,
    hiddenMetrics,
    scale = 1,
    fontWeight = 500
}) => {
    const getMetricDisplay = useCallback((id: string): MetricDisplayItem | null => {
        switch (id) {
            case 'totalPnL':
                return {
                    label: 'Total PnL',
                    val: formatPercent(metrics.totalPnL),
                    className: metrics.totalPnL >= 0
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-rose-50 border-rose-100 text-rose-700'
                };
            case 'winrate':
                return {
                    label: 'Winrate',
                    val: `${metrics.winrate}%`,
                    className: 'bg-white border-slate-200 text-slate-900'
                };
            case 'avgR':
                return {
                    label: 'Avg. R',
                    val: metrics.avgR,
                    className: 'bg-white border-slate-200 text-slate-900'
                };
            case 'pf':
                return {
                    label: 'Profit Factor',
                    val: metrics.pf,
                    className: 'bg-white border-slate-200 text-slate-900'
                };
            case 'avgRisk':
                return {
                    label: 'Avg. Risk',
                    val: metrics.avgRisk,
                    className: 'bg-white border-slate-200 text-slate-900'
                };
            default:
                return null;
        }
    }, [metrics]);

    return (
        <section
            id="performance-metrics"
            className="journal-view__metrics flex flex-wrap gap-2 items-center origin-left transition-transform duration-200 blur-loading animate-blur-in"
            style={{ transform: `scale(${scale})`, animationDelay: '0.1s' }}
        >
            {metricsOrder.map(id => {
                if (hiddenMetrics.includes(id)) return null;
                const item = getMetricDisplay(id);
                if (!item) return null;

                return (
                    <div
                        key={id}
                        className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${item.className}`}
                        style={{ fontWeight }}
                    >
                        <span className={id === 'totalPnL' ? 'opacity-70' : 'text-slate-900'}>
                            {item.label}:
                        </span>
                        <span>{item.val}</span>
                    </div>
                );
            })}
        </section>
    );
};

JournalMetrics.displayName = 'JournalMetrics';
