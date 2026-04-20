import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useDataStore } from '@/store/useDataStore';

/**
 * ═══════════════════════════════════════════════════════════════════
 * GLOBAL REALTIME UPDATES — Minimal postgres_changes + Broadcast
 * ═══════════════════════════════════════════════════════════════════
 *
 * ARSITEKTUR BARU:
 * ────────────────
 * 1. Broadcast channel (`app-sync-v1`) di useBroadcastSync.ts
 *    → Menghandle SEMUA tabel via peer-to-peer WebSocket (GRATIS egress)
 *
 * 2. postgres_changes (hook ini) — HANYA untuk `products`
 *    → Karena stok produk berubah dari banyak sumber (database triggers,
 *      RPC functions, dll) yang BUKAN dari frontend
 *    → Langsung smart-patch Zustand store (tanpa re-fetch!)
 *
 * 3. Notifications di-handle oleh useRealtimeNotifications.tsx
 *    → Per-user filter (paling efisien)
 *
 * SEMUA POLLING DIHAPUS — Sekarang 100% realtime via broadcast.
 * ═══════════════════════════════════════════════════════════════════
 */

export function useGlobalRealtimeUpdates(enabled = true) {
    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        // 🛡️ Non-leader tabs skip postgres_changes entirely.
        // This prevents multiple tabs from each creating a subscription in
        // the realtime.subscription table (which is the #1 cost driver).
        // Broadcast sync handles cross-tab data propagation instead (free).
        if (!enabled) return;

        // ✅ SATU postgres_changes channel HANYA untuk products
        // Products perlu postgres_changes karena stock berubah dari:
        // - Database triggers (stock reservation)
        // - RPC functions (atomic_increment_stock, commit_stock_issue)
        // - Proses backend/admin yang bukan via frontend broadcast
        const channel = supabase
            .channel('realtime_products_only_v3')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                (payload: any) => {
                    const store = useDataStore.getState();
                    const mapProduct = (p: any) => ({
                        id: p.id,
                        name: p.name,
                        barcode: p.barcode,
                        price: p.price,
                        image_url: p.image_url,
                        stock: { gudang: p.stock_gudang, toko: p.stock_toko },
                        has_multi_unit: p.has_multi_unit ?? false,
                        main_unit: p.main_unit ?? null,
                        pcs_per_box: p.pcs_per_box ?? null,
                        box_price: p.box_price ?? null,
                        sell_by_quantity: p.sell_by_quantity ?? false,
                        sell_unit: p.sell_unit ?? 'pcs',
                        bulk_quantity: p.bulk_quantity ?? null,
                        bulk_price: p.bulk_price ?? null,
                        created_at: p.created_at,
                        updated_at: p.updated_at,
                    });

                    // Smart-patch Zustand store (NO re-fetch!)
                    if (payload.eventType === 'UPDATE' && payload.new) {
                        store.setProducts((prev: any[]) =>
                            prev.map(p => p.id === payload.new.id ? mapProduct(payload.new) : p)
                        );
                    } else if (payload.eventType === 'INSERT' && payload.new) {
                        store.setProducts((prev: any[]) => {
                            if (prev.some(p => p.id === payload.new.id)) return prev;
                            return [mapProduct(payload.new), ...prev];
                        });
                    } else if (payload.eventType === 'DELETE' && payload.old) {
                        store.setProducts((prev: any[]) =>
                            prev.filter(p => p.id !== payload.old.id)
                        );
                    }

                    // Also patch React Query cache for products
                    const existingProducts = queryClient.getQueryData<any[]>(['products']);
                    if (Array.isArray(existingProducts) && payload.new) {
                        if (payload.eventType === 'UPDATE') {
                            queryClient.setQueryData(
                                ['products'],
                                existingProducts.map((p: any) =>
                                    p.id === payload.new.id ? mapProduct(payload.new) : p
                                )
                            );
                        } else if (payload.eventType === 'INSERT') {
                            if (!existingProducts.some((p: any) => p.id === payload.new.id)) {
                                queryClient.setQueryData(
                                    ['products'],
                                    [mapProduct(payload.new), ...existingProducts]
                                );
                            }
                        }
                    } else if (payload.eventType === 'DELETE' && payload.old && Array.isArray(existingProducts)) {
                        queryClient.setQueryData(
                            ['products'],
                            existingProducts.filter((p: any) => p.id !== payload.old.id)
                        );
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[GlobalRealtime] ✅ Products postgres_changes active');
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [queryClient, enabled]);
}

/**
 * Hook ringan untuk subscribe ke update satu tabel tertentu.
 * Digunakan oleh halaman-halaman individual yang butuh refresh otomatis.
 * Contoh: useTableRealtimeUpdates('sales', ['sales-history'])
 *
 * ⚠️ DEPRECATED: Gunakan broadcastTableChange() setelah mutasi.
 * Hook ini tetap disimpan untuk backward compatibility.
 */
export function useTableRealtimeUpdates(
    table: string,
    queryKeys: string[],
    event: '*' | 'INSERT' | 'UPDATE' | 'DELETE' = '*'
) {
    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    // Keep queryKeys in a ref so the effect doesn't re-run when the array
    // identity changes (caller usually passes an inline literal).
    const queryKeysRef = useRef(queryKeys);
    queryKeysRef.current = queryKeys;

    useEffect(() => {
        // ✅ Stable name — no Date.now() — prevents orphaned subscriptions
        // when parent re-renders while this hook is still mounted.
        const channelName = `realtime_${table}_${event}`;
        channelRef.current = supabase
            .channel(channelName)
            .on('postgres_changes', { event, schema: 'public', table }, () => {
                queryKeysRef.current.forEach(key =>
                    queryClient.invalidateQueries({ queryKey: [key] })
                );
            })
            .subscribe();

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [queryClient, table, event]); // queryKeys handled via ref above
}
