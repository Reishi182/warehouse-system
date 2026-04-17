import { useEffect, useRef, useCallback } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
;
import { STOCK_THRESHOLDS } from '@/constants';

interface LowStockProduct {
    id: string;
    name: string;
    barcode: string;
    stockGudang: number;
    stockToko: number;
    thresholdGudang: number;
    thresholdToko: number;
    isLowGudang: boolean;
    isLowToko: boolean;
}

interface UseLowStockAlertOptions {
    /** Custom threshold for gudang (warehouse), defaults to STOCK_THRESHOLDS.LOW_STOCK_GUDANG */
    thresholdGudang?: number;
    /** Custom threshold for toko (store), defaults to STOCK_THRESHOLDS.LOW_STOCK_TOKO */
    thresholdToko?: number;
    /** Whether to auto-send notifications when stock is low */
    autoNotify?: boolean;
    /** Interval to check stock levels in milliseconds, defaults to 5 minutes */
    checkInterval?: number;
}

/**
 * Hook to monitor and alert on low stock products
 */
export function useLowStockAlert(options: UseLowStockAlertOptions = {}) {
    const {
        thresholdGudang = STOCK_THRESHOLDS.LOW_STOCK_GUDANG,
        thresholdToko = STOCK_THRESHOLDS.LOW_STOCK_TOKO,
        autoNotify = true,
        checkInterval = 5 * 60 * 1000, // 5 minutes
    } = options;

    const products = useDataStore(s => s.products);
    const { toast } = useToast();
    const { user } = useAuth();
    const lastNotifiedRef = useRef<Set<string>>(new Set());
    const hasShownToastRef = useRef(false);

    // Get all low stock products
    const getLowStockProducts = useCallback((): LowStockProduct[] => {
        return products
            .filter(p => {
                // Use per-product threshold if set (> 0), otherwise use global threshold
                const minGudang = (p.min_stock_gudang && p.min_stock_gudang > 0) ? p.min_stock_gudang : thresholdGudang;
                const minToko = (p.min_stock_toko && p.min_stock_toko > 0) ? p.min_stock_toko : thresholdToko;
                return p.stock.gudang < minGudang || p.stock.toko < minToko;
            })
            .map(p => {
                const minGudang = (p.min_stock_gudang && p.min_stock_gudang > 0) ? p.min_stock_gudang : thresholdGudang;
                const minToko = (p.min_stock_toko && p.min_stock_toko > 0) ? p.min_stock_toko : thresholdToko;
                return {
                    id: p.id,
                    name: p.name,
                    barcode: p.barcode,
                    stockGudang: p.stock.gudang,
                    stockToko: p.stock.toko,
                    thresholdGudang: minGudang,
                    thresholdToko: minToko,
                    isLowGudang: p.stock.gudang < minGudang,
                    isLowToko: p.stock.toko < minToko,
                };
            });
    }, [products, thresholdGudang, thresholdToko]);

    const lowStockProducts = getLowStockProducts();

    // Send notification to database
    const sendNotification = useCallback(async (product: LowStockProduct) => {
        if (!user?.id) return;

        const locations: string[] = [];
        if (product.isLowGudang) locations.push(`Gudang: ${product.stockGudang}`);
        if (product.isLowToko) locations.push(`Toko: ${product.stockToko}`);

        try {
            // Send to admin and warehouse roles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id')
                .in('role', ['admin', 'warehouse', 'auditor']);

            if (profiles && profiles.length > 0) {
                const notifications = profiles.map(profile => ({
                    user_id: profile.user_id,
                    title: '⚠️ Stok Rendah',
                    message: `${product.name} memiliki stok rendah. ${locations.join(', ')}`,
                    type: 'warning' as const,
                    link: '/products',
                }));

                await supabase.from('notifications').insert(notifications);
            }
        } catch (error) {
            console.error('Failed to send low stock notification:', error);
        }
    }, [user?.id]);

    // Check and notify for new low stock products
    const checkAndNotify = useCallback(() => {
        if (!autoNotify) return;

        lowStockProducts.forEach(product => {
            // Only notify once per product (until restocked)
            if (!lastNotifiedRef.current.has(product.id)) {
                lastNotifiedRef.current.add(product.id);
                sendNotification(product);
            }
        });

        // Remove products that are no longer low from the notified set
        const currentLowIds = new Set(lowStockProducts.map(p => p.id));
        lastNotifiedRef.current.forEach(id => {
            if (!currentLowIds.has(id)) {
                lastNotifiedRef.current.delete(id);
            }
        });
    }, [autoNotify, lowStockProducts, sendNotification]);

    // Show toast for low stock on initial load
    useEffect(() => {
        if (lowStockProducts.length > 0 && !hasShownToastRef.current) {
            hasShownToastRef.current = true;
            toast({
                title: `⚠️ ${lowStockProducts.length} Produk Stok Rendah`,
                description: 'Beberapa produk memiliki stok di bawah threshold',
                variant: 'destructive',
            });
        }
    }, [lowStockProducts.length, toast]);

    // Setup interval for periodic checking
    useEffect(() => {
        if (!autoNotify) return;

        // Initial check
        checkAndNotify();

        // Periodic check
        const intervalId = setInterval(checkAndNotify, checkInterval);

        return () => clearInterval(intervalId);
    }, [autoNotify, checkAndNotify, checkInterval]);

    return {
        /** List of products with low stock */
        lowStockProducts,
        /** Total count of low stock products */
        lowStockCount: lowStockProducts.length,
        /** Check if any product has low stock */
        hasLowStock: lowStockProducts.length > 0,
        /** Products with low gudang stock */
        lowGudangProducts: lowStockProducts.filter(p => p.isLowGudang),
        /** Products with low toko stock */
        lowTokoProducts: lowStockProducts.filter(p => p.isLowToko),
        /** Manually trigger notification check */
        checkAndNotify,
        /** Current thresholds */
        thresholds: { gudang: thresholdGudang, toko: thresholdToko },
    };
}

/**
 * Hook to get low stock products for display purposes only (no notifications)
 */
export function useLowStockProducts(thresholdGudang?: number, thresholdToko?: number) {
    return useLowStockAlert({
        thresholdGudang,
        thresholdToko,
        autoNotify: false,
    });
}
