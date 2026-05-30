import { useMemo } from 'react';
import { StockLog, Product, Location } from '@/types';

/**
 * Key format: `${productId}__${location}`
 */
export type StockAtDateMap = Map<string, number>;

export function stockAtDateKey(productId: string, location: Location): string {
    return `${productId}__${location}`;
}

/**
 * Computes a map of stock values for every (product × location) pair
 * as-of the **end of `targetDate`** (23:59:59), using the immutable ledger
 * approach: take the `stock_after` of the last stock_log entry whose
 * `timestamp` falls on or before the end of that day.
 *
 * If a product has no log on or before `targetDate` we fall back to the
 * product's current live stock so the table is never empty.
 *
 * @param targetDate  ISO date string "YYYY-MM-DD"
 * @param allLogs     All stock_logs fetched from the DB (sorted desc or any order)
 * @param products    Master product list (used for fallback values)
 */
export function computeStockAtDate(
    targetDate: string,
    allLogs: StockLog[],
    products: Product[],
): StockAtDateMap {
    // End-of-day boundary: "YYYY-MM-DDT23:59:59"
    const endOfDay = `${targetDate}T23:59:59`;

    // For each (product, location) we want the log with the LATEST timestamp
    // that is still <= endOfDay.  We collect them into a map keyed by
    // `productId__location`, keeping only the latest-timestamp candidate.
    const latestLogPerKey = new Map<string, StockLog>();

    for (const log of allLogs) {
        // Only consider logs with stock_after populated and within range
        if (log.stock_after == null) continue;
        if (!log.timestamp) continue;
        if (log.timestamp > endOfDay) continue; // strictly after the day — skip

        const key = stockAtDateKey(log.product_id, log.location);
        const existing = latestLogPerKey.get(key);

        if (!existing || log.timestamp > existing.timestamp) {
            latestLogPerKey.set(key, log);
        }
    }

    // Build the result map
    const result: StockAtDateMap = new Map();

    const locations: Location[] = ['gudang', 'toko'];

    for (const product of products) {
        for (const location of locations) {
            const key = stockAtDateKey(product.id, location);
            const log = latestLogPerKey.get(key);

            if (log != null && log.stock_after != null) {
                result.set(key, log.stock_after);
            } else {
                // Fallback: no log for this product/location before targetDate
                // Use live stock as best estimate (marks as "no historical data")
                result.set(key, product.stock[location] ?? 0);
            }
        }
    }

    return result;
}

/**
 * Hook version of computeStockAtDate — memoised.
 *
 * @returns `{ stockMap, hasHistoricalData }`
 *   - `stockMap`          Map of productId__location → stock quantity
 *   - `hasHistoricalData` true if at least one log was found for targetDate
 */
export function useStockAtDate(
    targetDate: string,
    allLogs: StockLog[],
    products: Product[],
) {
    return useMemo(() => {
        const stockMap = computeStockAtDate(targetDate, allLogs, products);

        // Check if there are any logs on or before targetDate with stock_after
        const endOfDay = `${targetDate}T23:59:59`;
        const hasHistoricalData = allLogs.some(
            l => l.stock_after != null && l.timestamp != null && l.timestamp <= endOfDay,
        );

        return { stockMap, hasHistoricalData };
    }, [targetDate, allLogs, products]);
}

/**
 * Helper: get stock for a specific product+location from the map.
 * Returns null if the product was not found (should not happen in practice).
 */
export function getStockFromMap(
    map: StockAtDateMap,
    productId: string,
    location: Location,
): number | null {
    const val = map.get(stockAtDateKey(productId, location));
    return val ?? null;
}

/**
 * Computes opening stock for a product+location at the START of `targetDate`
 * (i.e. the stock_after of the latest log strictly BEFORE the day).
 */
export function computeOpeningStock(
    targetDate: string,
    allLogs: StockLog[],
    productId: string,
    location: Location,
    fallback: number,
): number {
    // Logs strictly before the start of the day: timestamp < "YYYY-MM-DDT00:00:00"
    const startOfDay = `${targetDate}T00:00:00`;

    let best: StockLog | null = null;
    for (const log of allLogs) {
        if (log.product_id !== productId) continue;
        if (log.location !== location) continue;
        if (log.stock_after == null) continue;
        if (!log.timestamp) continue;
        if (log.timestamp >= startOfDay) continue; // must be BEFORE the day

        if (!best || log.timestamp > best.timestamp) {
            best = log;
        }
    }

    return best?.stock_after ?? fallback;
}
