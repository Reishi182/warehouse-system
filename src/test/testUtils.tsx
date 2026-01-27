import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Product, Location, Sale } from '@/types';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });
}

interface WrapperProps {
    children: React.ReactNode;
}

// All providers wrapper
function AllProviders({ children }: WrapperProps) {
    const queryClient = createTestQueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                {children}
            </BrowserRouter>
        </QueryClientProvider>
    );
}

// Custom render with providers
function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return render(ui, { wrapper: AllProviders, ...options });
}

// Mock product factory
export function createMockProduct(overrides: Partial<Product> = {}): Product {
    const id = overrides.id || `prod-${Math.random().toString(36).substr(2, 9)}`;
    return {
        id,
        name: `Product ${id.slice(-4)}`,
        barcode: `BAR${id.slice(-6).toUpperCase()}`,
        price: 10000,
        image_url: null,
        stock: {
            gudang: 100,
            toko: 50,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

// Mock sale factory
export function createMockSale(overrides: Partial<Sale> = {}): Sale {
    const id = overrides.id || `sale-${Math.random().toString(36).substr(2, 9)}`;
    return {
        id,
        sale_number: `INV/20260127-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        cashier_id: 'cashier-1',
        cashier_name: 'Test Cashier',
        payment_method: 'cash',
        stock_location: 'toko' as Location,
        total_amount: 50000,
        order_discount: 0,
        amount_paid: 50000,
        change_amount: 0,
        created_at: new Date().toISOString(),
        items: [],
        ...overrides,
    };
}

// Re-export testing utilities
export * from '@testing-library/react';
export { renderWithProviders };
