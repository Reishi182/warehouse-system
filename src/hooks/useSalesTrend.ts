import { useMemo } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { startOfDay, subDays, format, eachDayOfInterval, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';

type TimeRange = '7d' | '14d' | '30d' | '90d';

interface DailyData {
    date: string;
    label: string;
    sales: number;
    transactions: number;
    avgTransaction: number;
}

interface TrendResult {
    data: DailyData[];
    totalSales: number;
    totalTransactions: number;
    avgDailySales: number;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
    comparisonPeriod: {
        current: number;
        previous: number;
    };
}

/**
 * Hook to calculate sales trends over time
 */
export function useSalesTrend(range: TimeRange = '7d'): TrendResult {
    const sales = useDataStore(s => s.sales);

    return useMemo(() => {
        const today = endOfDay(new Date());
        const daysCount = parseInt(range);
        const startDate = startOfDay(subDays(today, daysCount - 1));
        const previousStartDate = startOfDay(subDays(startDate, daysCount));

        // Generate all days in range
        const daysInRange = eachDayOfInterval({ start: startDate, end: today });

        // Initialize daily data
        const dailyMap = new Map<string, DailyData>();
        daysInRange.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            dailyMap.set(dateKey, {
                date: dateKey,
                label: format(day, 'd MMM', { locale: id }),
                sales: 0,
                transactions: 0,
                avgTransaction: 0,
            });
        });

        // Aggregate sales data - current period
        let currentPeriodSales = 0;
        let previousPeriodSales = 0;

        sales.forEach(sale => {
            const saleDate = startOfDay(new Date(sale.created_at));
            const dateKey = format(saleDate, 'yyyy-MM-dd');

            // Check if in current period
            if (saleDate >= startDate && saleDate <= today) {
                currentPeriodSales += sale.total_amount;
                const dayData = dailyMap.get(dateKey);
                if (dayData) {
                    dayData.sales += sale.total_amount;
                    dayData.transactions += 1;
                }
            }
            // Check if in previous period
            else if (saleDate >= previousStartDate && saleDate < startDate) {
                previousPeriodSales += sale.total_amount;
            }
        });

        // Calculate averages
        const data = Array.from(dailyMap.values());
        data.forEach(d => {
            d.avgTransaction = d.transactions > 0 ? d.sales / d.transactions : 0;
        });

        // Calculate totals and trend
        const totalSales = currentPeriodSales;
        const totalTransactions = data.reduce((sum, d) => sum + d.transactions, 0);
        const avgDailySales = totalSales / daysCount;

        // Calculate trend
        let trend: 'up' | 'down' | 'stable' = 'stable';
        let trendPercentage = 0;

        if (previousPeriodSales > 0) {
            trendPercentage = ((currentPeriodSales - previousPeriodSales) / previousPeriodSales) * 100;
            if (trendPercentage > 5) trend = 'up';
            else if (trendPercentage < -5) trend = 'down';
        } else if (currentPeriodSales > 0) {
            trend = 'up';
            trendPercentage = 100;
        }

        return {
            data,
            totalSales,
            totalTransactions,
            avgDailySales,
            trend,
            trendPercentage: Math.abs(trendPercentage),
            comparisonPeriod: {
                current: currentPeriodSales,
                previous: previousPeriodSales,
            },
        };
    }, [sales, range]);
}

export default useSalesTrend;
