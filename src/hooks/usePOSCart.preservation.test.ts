/**
 * Preservation Property Tests — Task 2
 *
 * These tests verify behaviors that MUST NOT change after the bugfix.
 * They MUST PASS on UNFIXED code.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePOSCart } from './usePOSCart';
import { createMockProduct } from '@/test/testUtils';

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/contexts/DataContext', () => ({
    useData: () => ({ products: [] }),
}));

// ---------------------------------------------------------------------------
// Property 6: Preservation — Single-Unit Cart Operations
// Validates: Requirements 3.2, 3.3
// ---------------------------------------------------------------------------

describe('Property 6: Preservation — Single-Unit Cart Operations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Observe: removeItem("P1") pada keranjang dengan satu item per produk
     * menghapus item yang benar.
     *
     * Validates: Requirements 3.2, 3.3
     */
    it('removeItem("P1") removes the correct item when cart has one item per product', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const p1 = createMockProduct({ id: 'P1', price: 10000, stock: { gudang: 100, toko: 100 } });
        const p2 = createMockProduct({ id: 'P2', price: 20000, stock: { gudang: 100, toko: 100 } });

        act(() => {
            result.current.addToCart(p1);
            result.current.addToCart(p2);
        });

        expect(result.current.items).toHaveLength(2);

        act(() => {
            result.current.removeItem('P1');
        });

        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].product.id).toBe('P2');
    });

    /**
     * Observe: updateQuantity("P1", 5) pada keranjang single-unit
     * mengubah kuantitas dengan benar.
     *
     * Validates: Requirements 3.2, 3.3
     */
    it('updateQuantity("P1", 5) updates the correct item quantity in a single-unit cart', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const p1 = createMockProduct({ id: 'P1', price: 10000, stock: { gudang: 100, toko: 100 } });
        const p2 = createMockProduct({ id: 'P2', price: 20000, stock: { gudang: 100, toko: 100 } });

        act(() => {
            result.current.addToCart(p1);
            result.current.addToCart(p2);
        });

        act(() => {
            result.current.updateQuantity('P1', 5);
        });

        const p1Item = result.current.items.find(it => it.product.id === 'P1');
        const p2Item = result.current.items.find(it => it.product.id === 'P2');

        expect(p1Item?.quantity).toBe(5);
        expect(p2Item?.quantity).toBe(1); // P2 unchanged
    });

    /**
     * Property: For any cart with one item per product, removeItem without
     * sellUnit removes exactly one item and leaves the rest intact.
     *
     * Validates: Requirements 3.2, 3.3
     */
    it('property: removeItem without sellUnit always removes exactly one item from single-unit cart', () => {
        const productIds = ['A', 'B', 'C', 'D', 'E'];

        for (const targetId of productIds) {
            const { result } = renderHook(() => usePOSCart('toko'));
            const products = productIds.map(id =>
                createMockProduct({ id, price: 10000, stock: { gudang: 100, toko: 100 } })
            );

            act(() => {
                products.forEach(p => result.current.addToCart(p));
            });

            const beforeCount = result.current.items.length;

            act(() => {
                result.current.removeItem(targetId);
            });

            expect(result.current.items).toHaveLength(beforeCount - 1);
            expect(result.current.items.find(it => it.product.id === targetId)).toBeUndefined();
            // All other products remain
            productIds
                .filter(id => id !== targetId)
                .forEach(id => {
                    expect(result.current.items.find(it => it.product.id === id)).toBeDefined();
                });
        }
    });

    /**
     * Property: For any cart with one item per product, updateQuantity without
     * sellUnit updates only the target item's quantity.
     *
     * Validates: Requirements 3.2, 3.3
     */
    it('property: updateQuantity without sellUnit only changes the target item quantity', () => {
        const quantities = [1, 2, 3, 5, 10];

        for (const newQty of quantities) {
            const { result } = renderHook(() => usePOSCart('toko'));
            const p1 = createMockProduct({ id: 'P1', price: 10000, stock: { gudang: 100, toko: 100 } });
            const p2 = createMockProduct({ id: 'P2', price: 20000, stock: { gudang: 100, toko: 100 } });

            act(() => {
                result.current.addToCart(p1);
                result.current.addToCart(p2);
            });

            act(() => {
                result.current.updateQuantity('P1', newQty);
            });

            const p1Item = result.current.items.find(it => it.product.id === 'P1');
            const p2Item = result.current.items.find(it => it.product.id === 'P2');

            expect(p1Item?.quantity).toBe(newQty);
            expect(p2Item?.quantity).toBe(1); // P2 always unchanged
        }
    });

    /**
     * Property: Non-multi-unit product cart operations use product.id as key
     * and work identically regardless of fix.
     *
     * Validates: Requirements 3.2
     */
    it('property: non-multi-unit product cart operations work correctly with product.id key', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const product = createMockProduct({
            id: 'P1',
            price: 15000,
            stock: { gudang: 100, toko: 100 },
            has_multi_unit: false,
        });

        act(() => {
            result.current.addToCart(product);
        });

        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].product.id).toBe('P1');

        act(() => {
            result.current.updateQuantity('P1', 3);
        });

        expect(result.current.items[0].quantity).toBe(3);

        act(() => {
            result.current.removeItem('P1');
        });

        expect(result.current.items).toHaveLength(0);
    });
});
