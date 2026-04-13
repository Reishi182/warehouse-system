import { useMemo } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { id } from 'date-fns/locale';

interface StockMovement {
    id: string;
    productId: string;
    productName: string;
    productBarcode: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    location: 'gudang' | 'toko';
    reason?: string;
    reference?: string;
    timestamp: string;
    userName?: string;
}

interface DailyMovement {
    date: string;
    label: string;
    in: number;
    out: number;
    adjustment: number;
    net: number;
}

interface ProductMovementSummary {
    productId: string;
    productName: string;
    totalIn: number;
    totalOut: number;
    netChange: number;
    movementCount: number;
}

interface UseStockMovementReportOptions {
    productId?: string;
    startDate?: Date;
    endDate?: Date;
    location?: 'gudang' | 'toko' | 'all';
    days?: number; // Alternative to date range
}

/**
 * Hook for generating stock movement reports
 */
export function useStockMovementReport(options: UseStockMovementReportOptions = {}) {
    const stockLogs = useDataStore(s => s.stockLogs);
    const products = useDataStore(s => s.products);
    const {
        productId,
        startDate,
        endDate,
        location = 'all',
        days = 30,
    } = options;

    // Calculate date range
    const dateRange = useMemo(() => {
        const end = endDate || new Date();
        const start = startDate || subDays(end, days);
        return { start: startOfDay(start), end: endOfDay(end) };
    }, [startDate, endDate, days]);

    // Filter and transform stock logs
    const movements = useMemo<StockMovement[]>(() => {
        return stockLogs
            .filter(log => {
                const logDate = new Date(log.timestamp);
                const inDateRange = logDate >= dateRange.start && logDate <= dateRange.end;
                const matchesProduct = !productId || log.product_id === productId;
                const matchesLocation = location === 'all' || log.location === location;

                return inDateRange && matchesProduct && matchesLocation;
            })
            .map(log => {
                const product = products.find(p => p.id === log.product_id);
                return {
                    id: log.id,
                    productId: log.product_id,
                    productName: product?.name || 'Unknown',
                    productBarcode: product?.barcode || '',
                    type: log.type as 'in' | 'out' | 'adjustment',
                    quantity: log.quantity,
                    location: log.location as 'gudang' | 'toko',
                    reason: log.reason,
                    reference: log.reference,
                    timestamp: log.timestamp,
                    userName: log.user_name,
                };
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [stockLogs, products, productId, dateRange, location]);

    // Daily summary
    const dailySummary = useMemo<DailyMovement[]>(() => {
        const dailyMap = new Map<string, DailyMovement>();

        movements.forEach(m => {
            const date = format(new Date(m.timestamp), 'yyyy-MM-dd');

            if (!dailyMap.has(date)) {
                dailyMap.set(date, {
                    date,
                    label: format(new Date(m.timestamp), 'd MMM', { locale: id }),
                    in: 0,
                    out: 0,
                    adjustment: 0,
                    net: 0,
                });
            }

            const day = dailyMap.get(date)!;
            if (m.type === 'in') {
                day.in += m.quantity;
                day.net += m.quantity;
            } else if (m.type === 'out') {
                day.out += m.quantity;
                day.net -= m.quantity;
            } else {
                day.adjustment += m.quantity;
                day.net += m.quantity;
            }
        });

        return Array.from(dailyMap.values())
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [movements]);

    // Product summary
    const productSummary = useMemo<ProductMovementSummary[]>(() => {
        const productMap = new Map<string, ProductMovementSummary>();

        movements.forEach(m => {
            if (!productMap.has(m.productId)) {
                productMap.set(m.productId, {
                    productId: m.productId,
                    productName: m.productName,
                    totalIn: 0,
                    totalOut: 0,
                    netChange: 0,
                    movementCount: 0,
                });
            }

            const summary = productMap.get(m.productId)!;
            summary.movementCount += 1;

            if (m.type === 'in') {
                summary.totalIn += m.quantity;
                summary.netChange += m.quantity;
            } else if (m.type === 'out') {
                summary.totalOut += m.quantity;
                summary.netChange -= m.quantity;
            } else {
                summary.netChange += m.quantity;
            }
        });

        return Array.from(productMap.values())
            .sort((a, b) => b.movementCount - a.movementCount);
    }, [movements]);

    // Overall statistics
    const stats = useMemo(() => {
        let totalIn = 0;
        let totalOut = 0;
        let totalAdjustment = 0;

        movements.forEach(m => {
            if (m.type === 'in') totalIn += m.quantity;
            else if (m.type === 'out') totalOut += m.quantity;
            else totalAdjustment += m.quantity;
        });

        return {
            totalIn,
            totalOut,
            totalAdjustment,
            netChange: totalIn - totalOut + totalAdjustment,
            movementCount: movements.length,
            uniqueProducts: new Set(movements.map(m => m.productId)).size,
            dateRange: {
                start: format(dateRange.start, 'dd MMM yyyy', { locale: id }),
                end: format(dateRange.end, 'dd MMM yyyy', { locale: id }),
            },
        };
    }, [movements, dateRange]);

    return {
        movements,
        dailySummary,
        productSummary,
        stats,
        dateRange,
    };
}

export default useStockMovementReport;
