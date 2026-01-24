import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Tables that need real-time updates for approval workflows
 */
const REALTIME_TABLES = [
    { table: 'purchase_orders', queryKeys: ['purchase_orders', 'purchase_order'] },
    { table: 'stock_requests', queryKeys: ['stock-requests'] },
    { table: 'stock_shipments', queryKeys: ['stock-shipments', 'goods-receipts'] },
    { table: 'stock_returns', queryKeys: ['stock-returns'] },
    { table: 'surat_jalan', queryKeys: ['surat-jalan', 'surat_jalan', 'surat-jalan-b2b'] },
    { table: 'goods_issue_notes', queryKeys: ['goods-issue-notes'] },
    { table: 'marketplace_orders', queryKeys: ['marketplace-orders', 'marketplace_orders'] },
    { table: 'direct_orders', queryKeys: ['direct-orders', 'direct_orders'] },
    { table: 'cash_transfer_requests', queryKeys: ['cash-transfer-requests'] },
    { table: 'products', queryKeys: ['products'] },
    { table: 'notifications', queryKeys: ['notifications'] },
    { table: 'sales', queryKeys: ['sales', 'sales-history'] },
    { table: 'cash_transfers', queryKeys: ['cash-transfers', 'cash-history'] },
    { table: 'backorders', queryKeys: ['backorders'] },
] as const;

/**
 * Global hook to subscribe to real-time changes on all approval-related tables.
 * Creates SEPARATE channels for each table (required by Supabase for reliable operation).
 * When any change occurs, it invalidates the corresponding React Query cache.
 * 
 * Usage: Call this once at the app level (e.g., in MainLayout or App.tsx)
 */
export function useGlobalRealtimeUpdates() {
    const queryClient = useQueryClient();
    const channelsRef = useRef<RealtimeChannel[]>([]);

    useEffect(() => {
        console.log('[Realtime] Initializing global realtime updates...');

        // Create SEPARATE channel for each table (Supabase works better this way)
        const channels: RealtimeChannel[] = REALTIME_TABLES.map(({ table, queryKeys }) => {
            const channel = supabase
                .channel(`realtime_${table}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*', // INSERT, UPDATE, DELETE
                        schema: 'public',
                        table: table,
                    },
                    (payload) => {
                        console.log(`[Realtime] ${table} changed:`, payload.eventType);

                        // Invalidate all related query keys
                        queryKeys.forEach(key => {
                            queryClient.invalidateQueries({ queryKey: [key] });
                        });
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`[Realtime] ✓ Subscribed to ${table}`);
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error(`[Realtime] ✗ Error subscribing to ${table}`);
                    }
                });

            return channel;
        });

        channelsRef.current = channels;
        console.log(`[Realtime] Created ${channels.length} channel subscriptions`);

        // Cleanup on unmount
        return () => {
            console.log('[Realtime] Cleaning up realtime subscriptions...');
            channelsRef.current.forEach(channel => {
                supabase.removeChannel(channel);
            });
            channelsRef.current = [];
        };
    }, [queryClient]);
}

/**
 * Hook to subscribe to a specific table's real-time changes.
 * Use this for page-specific subscriptions if needed.
 */
export function useTableRealtimeUpdates(
    tableName: string,
    queryKeys: string[]
) {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel(`${tableName}_realtime`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: tableName,
                },
                (payload) => {
                    console.log(`[Realtime] ${tableName} changed:`, payload.eventType);
                    queryKeys.forEach(key => {
                        queryClient.invalidateQueries({ queryKey: [key] });
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tableName, queryKeys, queryClient]);
}
