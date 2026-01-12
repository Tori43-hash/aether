import { useState, useCallback } from 'react';
import { DEFAULT_METRICS_ORDER } from './types';

export interface UseMetricsConfigReturn {
    metricsOrder: string[];
    setMetricsOrder: React.Dispatch<React.SetStateAction<string[]>>;
    hiddenMetrics: string[];
    toggleMetricVisibility: (id: string) => void;
}

export function useMetricsConfig(): UseMetricsConfigReturn {
    const [metricsOrder, setMetricsOrder] = useState(DEFAULT_METRICS_ORDER);
    const [hiddenMetrics, setHiddenMetrics] = useState<string[]>([]);

    const toggleMetricVisibility = useCallback((id: string) => {
        setHiddenMetrics(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    }, []);

    return {
        metricsOrder,
        setMetricsOrder,
        hiddenMetrics,
        toggleMetricVisibility
    };
}
