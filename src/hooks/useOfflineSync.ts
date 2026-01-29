/**
 * Hook for managing offline POS sync status and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
    getOfflineSales,
    getSyncStatus,
    syncPendingSales,
    setupOnlineListener,
    isOnline,
    SyncStatus,
    OfflineSale,
} from '@/lib/offlineQueue';

export function useOfflineSync() {
    const { toast } = useToast();
    const [online, setOnline] = useState(isOnline());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);

    // Update status periodically
    const refreshStatus = useCallback(() => {
        setSyncStatus(getSyncStatus());
        setPendingSales(getOfflineSales().filter(s => !s.synced));
    }, []);

    // Handle coming back online
    const handleOnline = useCallback(async () => {
        setOnline(true);
        refreshStatus();

        const status = getSyncStatus();
        if (status.pending > 0) {
            toast({
                title: '🌐 Kembali Online',
                description: `${status.pending} transaksi menunggu sinkronisasi...`,
            });

            // Auto-sync after a short delay
            setTimeout(() => {
                syncNow();
            }, 2000);
        } else {
            toast({
                title: '🌐 Kembali Online',
                description: 'Koneksi internet pulih.',
            });
        }
    }, [toast, refreshStatus]);

    // Handle going offline
    const handleOffline = useCallback(() => {
        setOnline(false);
        toast({
            title: '📴 Mode Offline',
            description: 'Transaksi akan disimpan lokal dan sync saat online.',
            variant: 'destructive',
        });
    }, [toast]);

    // Sync pending sales now
    const syncNow = useCallback(async () => {
        if (!isOnline() || isSyncing) return;

        const status = getSyncStatus();
        if (status.pending === 0) {
            toast({
                title: 'Tidak ada transaksi pending',
                description: 'Semua transaksi sudah tersinkronisasi.',
            });
            return;
        }

        setIsSyncing(true);
        setSyncStatus(prev => ({ ...prev, isSyncing: true }));

        try {
            const result = await syncPendingSales((current, total) => {
                console.log(`[Sync] Progress: ${current}/${total}`);
            });

            if (result.success > 0 && result.failed === 0) {
                toast({
                    title: '✅ Sinkronisasi Berhasil',
                    description: `${result.success} transaksi berhasil disinkronkan.`,
                });
            } else if (result.success > 0 && result.failed > 0) {
                toast({
                    title: '⚠️ Sinkronisasi Sebagian',
                    description: `${result.success} berhasil, ${result.failed} gagal.`,
                    variant: 'destructive',
                });
            } else if (result.failed > 0) {
                toast({
                    title: '❌ Sinkronisasi Gagal',
                    description: `${result.failed} transaksi gagal disinkronkan.`,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('[Sync] Error during sync:', error);
            toast({
                title: 'Error',
                description: 'Terjadi kesalahan saat sinkronisasi.',
                variant: 'destructive',
            });
        } finally {
            setIsSyncing(false);
            refreshStatus();
        }
    }, [isSyncing, toast, refreshStatus]);

    // Setup online/offline listeners
    useEffect(() => {
        const cleanup = setupOnlineListener(handleOnline, handleOffline);
        refreshStatus();
        return cleanup;
    }, [handleOnline, handleOffline, refreshStatus]);

    // Auto-sync when coming online
    useEffect(() => {
        if (online && syncStatus.pending > 0 && !isSyncing) {
            const timer = setTimeout(syncNow, 3000);
            return () => clearTimeout(timer);
        }
    }, [online, syncStatus.pending, isSyncing, syncNow]);

    return {
        online,
        syncStatus,
        isSyncing,
        pendingSales,
        syncNow,
        refreshStatus,
    };
}
