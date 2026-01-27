/**
 * Format number as Indonesian Rupiah currency
 */
export function formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format number with thousand separators (Indonesian format)
 */
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format percentage with one decimal place
 */
export function formatPercent(num: number, decimals: number = 1): string {
    return `${num.toFixed(decimals)}%`;
}

/**
 * Format compact number (e.g., 1.5K, 2.3M)
 */
export function formatCompact(num: number): string {
    return new Intl.NumberFormat('id-ID', {
        notation: 'compact',
        compactDisplay: 'short',
    }).format(num);
}
