import { useEffect, useRef, useCallback } from 'react';
import { useLowStockProducts } from './useLowStockProducts';
;
import { useToast } from '@/hooks/use-toast';

interface UseStockAlertNotificationsOptions {
    enabled?: boolean;
    checkIntervalMs?: number; // How often to check (default: 5 minutes)
    lowThreshold?: number;
    criticalThreshold?: number;
}

/**
 * Hook to monitor stock levels and send notifications when products are low
 */
export function useStockAlertNotifications(options: UseStockAlertNotificationsOptions = {}) {
    const {
        enabled = true,
        checkIntervalMs = 5 * 60 * 1000, // 5 minutes
        lowThreshold = 10,
        criticalThreshold = 5,
    } = options;

    const { lowStockProducts, stats, hasAlerts } = useLowStockProducts({
        lowThreshold,
        criticalThreshold,
    });

    const { toast } = useToast();
    const lastNotifiedRef = useRef<Set<string>>(new Set());
    const hasShownInitialRef = useRef(false);

    // Show notification for new low stock products
    const checkAndNotify = useCallback(() => {
        if (!enabled || !hasAlerts) return;

        // Only notify for products we haven't notified about yet
        const newAlerts = lowStockProducts.filter(
            p => !lastNotifiedRef.current.has(p.id)
        );

        if (newAlerts.length === 0) return;

        // Group by status
        const outOfStock = newAlerts.filter(p => p.stockStatus === 'out_of_stock');
        const critical = newAlerts.filter(p => p.stockStatus === 'critical');
        const low = newAlerts.filter(p => p.stockStatus === 'low');

        // Show toast notifications
        if (outOfStock.length > 0) {
            toast({
                title: `⚠️ ${outOfStock.length} Produk Habis!`,
                description: outOfStock.slice(0, 3).map(p => p.name).join(', ') +
                    (outOfStock.length > 3 ? ` dan ${outOfStock.length - 3} lainnya` : ''),
                variant: 'destructive',
            });
        }

        if (critical.length > 0) {
            toast({
                title: `🔴 ${critical.length} Produk Stok Kritis`,
                description: critical.slice(0, 3).map(p => `${p.name} (${p.totalStock})`).join(', ') +
                    (critical.length > 3 ? ` dan ${critical.length - 3} lainnya` : ''),
                variant: 'destructive',
            });
        }

        if (low.length > 0 && !hasShownInitialRef.current) {
            toast({
                title: `🟡 ${low.length} Produk Stok Rendah`,
                description: low.slice(0, 3).map(p => `${p.name} (${p.totalStock})`).join(', '),
            });
        }

        // Mark as notified
        newAlerts.forEach(p => lastNotifiedRef.current.add(p.id));
        hasShownInitialRef.current = true;

    }, [enabled, hasAlerts, lowStockProducts, toast]);

    // Run check on mount and when data changes
    useEffect(() => {
        checkAndNotify();
    }, [checkAndNotify]);

    // Periodic check
    useEffect(() => {
        if (!enabled) return;

        const interval = setInterval(() => {
            // Clear old notifications to allow re-notification
            lastNotifiedRef.current.clear();
            checkAndNotify();
        }, checkIntervalMs);

        return () => clearInterval(interval);
    }, [enabled, checkIntervalMs, checkAndNotify]);

    return {
        stats,
        hasAlerts,
        checkNow: checkAndNotify,
    };
}

export default useStockAlertNotifications;
