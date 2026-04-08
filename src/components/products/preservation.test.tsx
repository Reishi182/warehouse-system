/**
 * Preservation Property Tests — Task 2 (Component Tests)
 *
 * These tests verify behaviors that MUST NOT change after the bugfix.
 * They MUST PASS on UNFIXED code.
 *
 * Validates: Requirements 3.1, 3.4, 3.6
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductManageCard } from '@/components/products/ProductManageCard';
import ProductTableRow from '@/components/products/ProductTableRow';
import { ProductCard } from '@/components/pos/ProductCard';
import { ProductListItem } from '@/components/pos/ProductListItem';
import { createMockProduct } from '@/test/testUtils';

// ---------------------------------------------------------------------------
// Property 5: Preservation — Non-Multi-Unit Products
// Validates: Requirements 3.1, 3.4, 3.6
// ---------------------------------------------------------------------------

describe('Property 5: Preservation — Non-Multi-Unit Products', () => {
    /**
     * Observe: produk dengan has_multi_unit=false tidak menampilkan badge unit.
     *
     * Validates: Requirements 3.1, 3.4
     */
    describe('ProductManageCard — non-multi-unit product has no unit badge', () => {
        it('does not render unit badge when has_multi_unit=false', () => {
            const product = createMockProduct({
                has_multi_unit: false,
                main_unit: undefined,
                sell_unit: undefined,
            });

            render(
                <ProductManageCard
                    product={product}
                    onEdit={vi.fn()}
                    onDelete={vi.fn()}
                />
            );

            // Badge should not appear
            expect(screen.queryByText(/📦/)).toBeNull();
        });

        it('does not render unit badge when has_multi_unit is not set', () => {
            const product = createMockProduct({});
            // has_multi_unit defaults to undefined/falsy in createMockProduct

            render(
                <ProductManageCard
                    product={product}
                    onEdit={vi.fn()}
                    onDelete={vi.fn()}
                />
            );

            expect(screen.queryByText(/📦/)).toBeNull();
        });
    });

    describe('ProductTableRow — non-multi-unit product has no unit badge', () => {
        it('does not render unit badge when has_multi_unit=false', () => {
            const product = createMockProduct({
                has_multi_unit: false,
                main_unit: undefined,
                sell_unit: undefined,
            });

            render(
                <table>
                    <tbody>
                        <ProductTableRow
                            product={product}
                            canManage={false}
                            onEdit={vi.fn()}
                            onDelete={vi.fn()}
                        />
                    </tbody>
                </table>
            );

            expect(screen.queryByText(/📦/)).toBeNull();
        });
    });

    describe('ProductCard (POS) — non-multi-unit product has no unit badge', () => {
        it('does not render unit badge when has_multi_unit=false', () => {
            const product = createMockProduct({
                has_multi_unit: false,
                main_unit: undefined,
                sell_unit: undefined,
                stock: { gudang: 100, toko: 50 },
            });

            render(
                <ProductCard
                    product={product}
                    stockLocation="toko"
                    onAddToCart={vi.fn()}
                />
            );

            expect(screen.queryByText(/📦/)).toBeNull();
        });
    });

    describe('ProductListItem (POS) — non-multi-unit product has no unit badge', () => {
        it('does not render unit badge when has_multi_unit=false', () => {
            const product = createMockProduct({
                has_multi_unit: false,
                main_unit: undefined,
                sell_unit: undefined,
                stock: { gudang: 100, toko: 50 },
            });

            render(
                <ProductListItem
                    product={product}
                    stockLocation="toko"
                    onAddToCart={vi.fn()}
                />
            );

            expect(screen.queryByText(/📦/)).toBeNull();
        });
    });

    /**
     * Observe: produk dengan main_unit="sak", sell_unit="kg" menampilkan badge "SAK/KG".
     *
     * Validates: Requirements 3.6
     */
    describe('Valid unit labels are displayed correctly', () => {
        it('ProductManageCard shows SAK/KG badge for product with main_unit=sak, sell_unit=kg', () => {
            const product = createMockProduct({
                has_multi_unit: true,
                main_unit: 'sak',
                sell_unit: 'kg',
            });

            render(
                <ProductManageCard
                    product={product}
                    onEdit={vi.fn()}
                    onDelete={vi.fn()}
                />
            );

            expect(screen.getByText(/SAK\/KG/i)).toBeInTheDocument();
        });

        it('ProductTableRow shows SAK/KG badge for product with main_unit=sak, sell_unit=kg', () => {
            const product = createMockProduct({
                has_multi_unit: true,
                main_unit: 'sak',
                sell_unit: 'kg',
            });

            render(
                <table>
                    <tbody>
                        <ProductTableRow
                            product={product}
                            canManage={false}
                            onEdit={vi.fn()}
                            onDelete={vi.fn()}
                        />
                    </tbody>
                </table>
            );

            expect(screen.getByText(/SAK\/KG/i)).toBeInTheDocument();
        });

        it('ProductCard (POS) shows SAK/KG badge for product with main_unit=sak, sell_unit=kg', () => {
            const product = createMockProduct({
                has_multi_unit: true,
                main_unit: 'sak',
                sell_unit: 'kg',
                stock: { gudang: 100, toko: 50 },
            });

            render(
                <ProductCard
                    product={product}
                    stockLocation="toko"
                    onAddToCart={vi.fn()}
                />
            );

            expect(screen.getByText(/SAK\/KG/i)).toBeInTheDocument();
        });

        it('ProductListItem (POS) shows SAK/KG badge for product with main_unit=sak, sell_unit=kg', () => {
            const product = createMockProduct({
                has_multi_unit: true,
                main_unit: 'sak',
                sell_unit: 'kg',
                stock: { gudang: 100, toko: 50 },
            });

            render(
                <ProductListItem
                    product={product}
                    stockLocation="toko"
                    onAddToCart={vi.fn()}
                />
            );

            expect(screen.getByText(/SAK\/KG/i)).toBeInTheDocument();
        });

        /**
         * Property: For any product with has_multi_unit=true and valid main_unit/sell_unit,
         * all four components display the correct unit badge.
         *
         * Validates: Requirements 3.6
         */
        it('property: all four components show correct badge for various valid unit combinations', () => {
            const unitPairs = [
                { main_unit: 'box', sell_unit: 'pcs' },
                { main_unit: 'roll', sell_unit: 'meter' },
                { main_unit: 'sak', sell_unit: 'kg' },
                { main_unit: 'karton', sell_unit: 'botol' },
            ];

            for (const { main_unit, sell_unit } of unitPairs) {
                const expectedBadge = new RegExp(
                    `${main_unit.toUpperCase()}\\/${sell_unit.toUpperCase()}`,
                    'i'
                );

                const product = createMockProduct({
                    has_multi_unit: true,
                    main_unit,
                    sell_unit,
                    stock: { gudang: 100, toko: 50 },
                });

                // ProductManageCard
                const { unmount: u1 } = render(
                    <ProductManageCard product={product} onEdit={vi.fn()} onDelete={vi.fn()} />
                );
                expect(screen.getByText(expectedBadge)).toBeInTheDocument();
                u1();

                // ProductCard
                const { unmount: u2 } = render(
                    <ProductCard product={product} stockLocation="toko" onAddToCart={vi.fn()} />
                );
                expect(screen.getByText(expectedBadge)).toBeInTheDocument();
                u2();

                // ProductListItem
                const { unmount: u3 } = render(
                    <ProductListItem product={product} stockLocation="toko" onAddToCart={vi.fn()} />
                );
                expect(screen.getByText(expectedBadge)).toBeInTheDocument();
                u3();
            }
        });
    });
});
