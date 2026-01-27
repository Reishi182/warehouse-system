import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import { createMockProduct } from '@/test/testUtils';

describe('ProductCard', () => {
    it('should render product information', () => {
        const mockProduct = createMockProduct({
            name: 'Test Product',
            price: 15000,
            stock: { gudang: 100, toko: 50 },
        });
        const mockOnAddToCart = vi.fn();

        render(
            <ProductCard
                product={mockProduct}
                stockLocation="toko"
                onAddToCart={mockOnAddToCart}
            />
        );

        expect(screen.getByText('Test Product')).toBeInTheDocument();
        expect(screen.getByText(/15\.000/)).toBeInTheDocument();
    });

    it('should show stock count for selected location', () => {
        const mockProduct = createMockProduct({
            name: 'Test Product',
            stock: { gudang: 100, toko: 25 },
        });
        const mockOnAddToCart = vi.fn();

        render(
            <ProductCard
                product={mockProduct}
                stockLocation="toko"
                onAddToCart={mockOnAddToCart}
            />
        );

        expect(screen.getByText(/25/)).toBeInTheDocument();
    });

    it('should call onAddToCart when clicked', () => {
        const mockProduct = createMockProduct({
            name: 'Test Product',
            stock: { gudang: 100, toko: 50 },
        });
        const mockOnAddToCart = vi.fn();

        render(
            <ProductCard
                product={mockProduct}
                stockLocation="toko"
                onAddToCart={mockOnAddToCart}
            />
        );

        const card = screen.getByRole('button');
        fireEvent.click(card);

        expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct);
    });

    it('should show out of stock indicator when stock is 0', () => {
        const mockProduct = createMockProduct({
            name: 'Test Product',
            stock: { gudang: 0, toko: 0 },
        });
        const mockOnAddToCart = vi.fn();

        render(
            <ProductCard
                product={mockProduct}
                stockLocation="toko"
                onAddToCart={mockOnAddToCart}
            />
        );

        expect(screen.getByText(/habis/i)).toBeInTheDocument();
    });

    it('should be disabled when out of stock', () => {
        const mockProduct = createMockProduct({
            name: 'Test Product',
            stock: { gudang: 0, toko: 0 },
        });
        const mockOnAddToCart = vi.fn();

        render(
            <ProductCard
                product={mockProduct}
                stockLocation="toko"
                onAddToCart={mockOnAddToCart}
            />
        );

        const card = screen.getByRole('button');
        fireEvent.click(card);

        expect(mockOnAddToCart).not.toHaveBeenCalled();
    });
});
