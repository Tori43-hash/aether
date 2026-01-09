export const formatPercent = (value: number | string): string => {
    const val = parseFloat(value.toString());
    return (val >= 0 ? '+' : '') + val.toFixed(1) + '%';
};
