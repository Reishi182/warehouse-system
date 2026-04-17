import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Tabel yang BENAR-BENAR butuh realtime (kritikal, multi-user)
const REALTIME_CRITICAL = [
    { table: 'sales', queryKeys: ['sales', 'sales-history'] },
    { table: 'notifications', queryKeys: ['notifications'] },
    { table: 'store_settings', queryKeys: ['store-settings'] },
    { table: 'stock_requests', queryKeys: ['stock-requests'] },
    { table: 'cash_transfer_requests', queryKeys: ['cash-transfer-requests'] },
] as const;

// Tabel yang cukup di-polling (tidak perlu instant)
const POLLING_TABLES = [
    { table: 'purchase_orders', queryKeys: ['purchase_orders', 'purchase_order'], interval: 30000 },
    { table: 'stock_shipments', queryKeys: ['stock-shipments', 'goods-receipts'], interval: 30000 },
    { table: 'stock_returns', queryKeys: ['stock-returns'], interval: 30000 },
    { table: 'surat_jalan', queryKeys: ['surat-jalan', 'surat-jalan-b2b'], interval: 30000 },
    { table: 'goods_issue_notes', queryKeys: ['goods-issue-notes'], interval: 30000 },
    { table: 'marketplace_orders', queryKeys: ['marketplace-orders'], interval: 20000 },
    { table: 'marketplace_returns', queryKeys: ['marketplace-returns'], interval: 30000 },
    { table: 'direct_orders', queryKeys: ['direct-orders'], interval: 30000 },
    { table: 'cash_transfers', queryKeys: ['cash-transfers', 'cash-history'], interval: 30000 },
    { table: 'backorders', queryKeys: ['backorders'], interval: 30000 },
    { table: 'invoices', queryKeys: ['invoices'], interval: 30000 },
    { table: 'expenses', queryKeys: ['expenses', 'cash-flow'], interval: 30000 },
    { table: 'stock_opname', queryKeys: ['stock-opname'], interval: 60000 },
    { table: 'stock_opname_sessions', queryKeys: ['stock-opname-sessions'], interval: 60000 },
    { table: 'customers', queryKeys: ['customers'], interval: 60000 },
    { table: 'suppliers', queryKeys: ['suppliers'], interval: 60000 },
] as const;

export function useGlobalRealtimeUpdates(userId?: string) {
    const queryClient = useQueryClient();
    const channelsRef = useRef<RealtimeChannel[]>([]);
    const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

    useEffect(() => {
        // ✅ CHANNEL 1: Gabung semua tabel kritikal dalam SATU channel
        const criticalChannel = supabase
            .channel('realtime_critical')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
                queryClient.invalidateQueries({ queryKey: ['sales'] });
                queryClient.invalidateQueries({ queryKey: ['sales-history'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, () => {
                queryClient.invalidateQueries({ queryKey: ['store-settings'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_requests' }, () => {
                queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_transfer_requests' }, () => {
                queryClient.invalidateQueries({ queryKey: ['cash-transfer-requests'] });
            })
            .subscribe();

        // ✅ CHANNEL 2: Notifikasi — filter per user agar tidak terima notif orang lain
        const notifChannel = userId
            ? supabase
                .channel('realtime_notifications')
                .on('postgres_changes', {
                    event: 'INSERT',        // hanya INSERT, bukan UPDATE/DELETE
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,  // ← filter per user!
                }, () => {
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                })
                .subscribe()
            : null;

        channelsRef.current = [criticalChannel, ...(notifChannel ? [notifChannel] : [])];

        // ✅ Polling untuk tabel non-kritikal
        const intervals = POLLING_TABLES.map(({ queryKeys, interval }) => {
            return setInterval(() => {
                // Hanya invalidate kalau tab sedang aktif (hemat egress saat minimize)
                if (document.visibilityState === 'visible') {
                    queryKeys.forEach(key => {
                        queryClient.invalidateQueries({ queryKey: [key] });
                    });
                }
            }, interval);
        });

        intervalsRef.current = intervals;

        return () => {
            channelsRef.current.forEach(ch => supabase.removeChannel(ch));
            channelsRef.current = [];
            intervalsRef.current.forEach(id => clearInterval(id));
            intervalsRef.current = [];
        };
    }, [queryClient, userId]);
}
