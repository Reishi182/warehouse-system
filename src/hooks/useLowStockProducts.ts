import { useMemo } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { Product } from '@/types';

interface LowStockProduct extends Product {
    totalStock: number;
    stockStatus: 'out_of_stock' | 'critical' | 'low' | 'normal';
    percentageRemaining: number;
}

interface UseLowStockProductsOptions {
    lowThreshold?: number;      // Default: 10
    criticalThreshold?: number; // Default: 5
    maxCapacity?: number;       // Default: 100 (untuk perhitungan persentase)
}

/**
 * Hook to get products with low stock levels
 */
export function useLowStockProducts(options: UseLowStockProductsOptions = {}) {
    const products = useDataStore(s => s.products);
    const {
        lowThreshold = 10,
        criticalThreshold = 5,
        maxCapacity = 100,
    } = options;

    const lowStockProducts = useMemo<LowStockProduct[]>(() => {
        return products
            .map(product => {
                const totalStock = product.stock.gudang + product.stock.toko;
                let stockStatus: LowStockProduct['stockStatus'] = 'normal';

                if (totalStock === 0) {
                    stockStatus = 'out_of_stock';
                } else if (totalStock <= criticalThreshold) {
                    stockStatus = 'critical';
                } else if (totalStock <= lowThreshold) {
                    stockStatus = 'low';
                }

                return {
                    ...product,
                    totalStock,
                    stockStatus,
                    percentageRemaining: Math.min(100, (totalStock / maxCapacity) * 100),
                };
            })
            .filter(p => p.stockStatus !== 'normal')
            .sort((a, b) => a.totalStock - b.totalStock);
    }, [products, lowThreshold, criticalThreshold, maxCapacity]);

    const stats = useMemo(() => ({
        outOfStock: lowStockProducts.filter(p => p.stockStatus === 'out_of_stock').length,
        critical: lowStockProducts.filter(p => p.stockStatus === 'critical').length,
        low: lowStockProducts.filter(p => p.stockStatus === 'low').length,
        total: lowStockProducts.length,
    }), [lowStockProducts]);

    return {
        lowStockProducts,
        stats,
        hasAlerts: lowStockProducts.length > 0,
    };
}

export default useLowStockProducts;
