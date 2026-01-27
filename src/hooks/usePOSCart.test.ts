import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePOSCart } from './usePOSCart';
import { createMockProduct } from '@/test/testUtils';

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

describe('usePOSCart', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with empty cart', () => {
        const { result } = renderHook(() => usePOSCart('toko'));

        expect(result.current.items).toHaveLength(0);
        expect(result.current.stockLocation).toBe('toko');
        expect(result.current.orderDiscount).toBe(0);
        expect(result.current.subtotal).toBe(0);
        expect(result.current.totalAmount).toBe(0);
        expect(result.current.itemCount).toBe(0);
    });

    it('should add product to cart', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const mockProduct = createMockProduct({ price: 10000 });

        act(() => {
            result.current.addToCart(mockProduct);
        });

        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].product.id).toBe(mockProduct.id);
        expect(result.current.items[0].quantity).toBe(1);
        expect(result.current.itemCount).toBe(1);
    });

    it('should increase quantity when adding same product', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const mockProduct = createMockProduct({ price: 10000 });

        act(() => {
            result.current.addToCart(mockProduct);
            result.current.addToCart(mockProduct);
        });

        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].quantity).toBe(2);
        expect(result.current.itemCount).toBe(2);
    });

    it('should calculate subtotal correctly', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const mockProduct = createMockProduct({ price: 10000 });

        act(() => {
            result.current.addToCart(mockProduct);
            result.current.addToCart(mockProduct);
        });

        expect(result.current.subtotal).toBe(20000);
    });

    it('should calculate total with order discount', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const mockProduct = createMockProduct({ price: 10000 });

        act(() => {
            result.current.addToCart(mockProduct);
            result.current.setOrderDiscount(10); // 10% discount
        });

        expect(result.current.subtotal).toBe(10000);
        expect(result.current.totalAmount).toBe(9000); // 10000 - 10%
    });

    it('should update item quantity', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const mockProduct = createMockProduct({ price: 10000 });

        act(() => {
            result.current.addToCart(mockProduct);
        });

        act(() => {
            result.current.updateQuantity(mockProduct.id, 5);
        });

        expect(result.current.items[0].quantity).toBe(5);
        expect(result.current.subtotal).toBe(50000);
    });

    it('should remove item when quantity is 0', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const mockProduct = createMockProduct({ price: 10000 });

        act(() => {
            result.current.addToCart(mockProduct);
        });

        act(() => {
            result.current.updateQuantity(mockProduct.id, 0);
        });

        expect(result.current.items).toHaveLength(0);
    });

    it('should remove item directly', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const mockProduct = createMockProduct({ price: 10000 });

        act(() => {
            result.current.addToCart(mockProduct);
        });

        act(() => {
            result.current.removeItem(mockProduct.id);
        });

        expect(result.current.items).toHaveLength(0);
    });

    it('should clear cart', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const mockProduct1 = createMockProduct({ price: 10000 });
        const mockProduct2 = createMockProduct({ price: 20000 });

        act(() => {
            result.current.addToCart(mockProduct1);
            result.current.addToCart(mockProduct2);
            result.current.setOrderDiscount(10);
        });

        act(() => {
            result.current.clearCart();
        });

        expect(result.current.items).toHaveLength(0);
        expect(result.current.orderDiscount).toBe(0);
    });

    it('should apply item discount correctly', () => {
        const { result } = renderHook(() => usePOSCart('toko'));
        const mockProduct = createMockProduct({ price: 10000 });

        act(() => {
            result.current.addToCart(mockProduct);
            result.current.updateItemDiscount(mockProduct.id, 20); // 20% discount
        });

        expect(result.current.items[0].discount).toBe(20);
        expect(result.current.subtotal).toBe(8000); // 10000 - 20%
    });

    it('should clamp order discount between 0 and 100', () => {
        const { result } = renderHook(() => usePOSCart('toko'));

        act(() => {
            result.current.setOrderDiscount(150);
        });

        expect(result.current.orderDiscount).toBe(100);

        act(() => {
            result.current.setOrderDiscount(-10);
        });

        expect(result.current.orderDiscount).toBe(0);
    });

    it('should change stock location', () => {
        const { result } = renderHook(() => usePOSCart('toko'));

        expect(result.current.stockLocation).toBe('toko');

        act(() => {
            result.current.setStockLocation('gudang');
        });

        expect(result.current.stockLocation).toBe('gudang');
    });
});
