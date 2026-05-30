import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
    computeStockAtDate,
    useStockAtDate,
    computeOpeningStock,
    getStockFromMap,
    stockAtDateKey,
} from './useStockAtDate';
import { Product, StockLog } from '@/types';

// Mock data
const mockProducts: Product[] = [
    {
        id: 'prod-1',
        name: 'Product 1',
        barcode: '111111',
        price: 10000,
        stock: { toko: 15, gudang: 50 },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
    {
        id: 'prod-2',
        name: 'Product 2',
        barcode: '222222',
        price: 20000,
        stock: { toko: 5, gudang: 10 },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
];

const mockLogs: StockLog[] = [
    // Logs for prod-1 toko
    {
        id: 'log-1',
        product_id: 'prod-1',
        type: 'in',
        quantity: 10,
        location: 'toko',
        stock_before: 5,
        stock_after: 15,
        timestamp: '2026-05-15T10:00:00Z',
        user_id: 'user-1',
    },
    {
        id: 'log-2',
        product_id: 'prod-1',
        type: 'out',
        quantity: 3,
        location: 'toko',
        stock_before: 15,
        stock_after: 12,
        timestamp: '2026-05-15T15:00:00Z',
        user_id: 'user-1',
    },
    {
        id: 'log-3',
        product_id: 'prod-1',
        type: 'in',
        quantity: 5,
        location: 'toko',
        stock_before: 12,
        stock_after: 17,
        timestamp: '2026-05-16T09:00:00Z',
        user_id: 'user-1',
    },
    // Log for prod-1 gudang
    {
        id: 'log-4',
        product_id: 'prod-1',
        type: 'in',
        quantity: 20,
        location: 'gudang',
        stock_before: 30,
        stock_after: 50,
        timestamp: '2026-05-15T11:00:00Z',
        user_id: 'user-1',
    },
];

describe('useStockAtDate helpers', () => {
    describe('computeStockAtDate', () => {
        it('should fallback to live stock if no logs exist before targetDate', () => {
            const result = computeStockAtDate('2026-05-14', mockLogs, mockProducts);

            expect(getStockFromMap(result, 'prod-1', 'toko')).toBe(15);
            expect(getStockFromMap(result, 'prod-1', 'gudang')).toBe(50);
            expect(getStockFromMap(result, 'prod-2', 'toko')).toBe(5);
            expect(getStockFromMap(result, 'prod-2', 'gudang')).toBe(10);
        });

        it('should get the latest log stock_after on or before targetDate', () => {
            // On 2026-05-15, prod-1 toko had log-1 (15 stock_after) and log-2 (12 stock_after)
            // So closing stock on 2026-05-15 should be 12.
            const result15 = computeStockAtDate('2026-05-15', mockLogs, mockProducts);
            expect(getStockFromMap(result15, 'prod-1', 'toko')).toBe(12);
            expect(getStockFromMap(result15, 'prod-1', 'gudang')).toBe(50);

            // On 2026-05-16, prod-1 toko had log-3 (17 stock_after)
            // So closing stock on 2026-05-16 should be 17.
            const result16 = computeStockAtDate('2026-05-16', mockLogs, mockProducts);
            expect(getStockFromMap(result16, 'prod-1', 'toko')).toBe(17);
        });
    });

    describe('computeOpeningStock', () => {
        it('should return fallback if no logs strictly before the targetDate', () => {
            const opening = computeOpeningStock('2026-05-15', mockLogs, 'prod-1', 'toko', 10);
            expect(opening).toBe(10);
        });

        it('should return the last log stock_after strictly before targetDate', () => {
            // Opening for 2026-05-16 should be the last log from 2026-05-15, which is log-2 (stock_after: 12)
            const opening = computeOpeningStock('2026-05-16', mockLogs, 'prod-1', 'toko', 10);
            expect(opening).toBe(12);
        });
    });
});

describe('useStockAtDate hook', () => {
    it('should return stockMap and hasHistoricalData = false when no logs exist on or before date', () => {
        const { result } = renderHook(() => useStockAtDate('2026-05-14', mockLogs, mockProducts));

        expect(result.current.hasHistoricalData).toBe(false);
        expect(getStockFromMap(result.current.stockMap, 'prod-1', 'toko')).toBe(15);
    });

    it('should return stockMap and hasHistoricalData = true when logs exist on or before date', () => {
        const { result } = renderHook(() => useStockAtDate('2026-05-15', mockLogs, mockProducts));

        expect(result.current.hasHistoricalData).toBe(true);
        expect(getStockFromMap(result.current.stockMap, 'prod-1', 'toko')).toBe(12);
    });
});
