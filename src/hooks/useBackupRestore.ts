/**
 * useBackupRestore Hook
 * 
 * React hook for backup and restore operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
    BackupSnapshot,
    BackupProgress,
    RestoreResult,
    createSnapshot,
    createAutoSnapshot,
    getLocalSnapshots,
    deleteLocalSnapshot,
    getServerSnapshots,
    saveSnapshotToServer,
    deleteServerSnapshot,
    restoreFromSnapshot,
    downloadSnapshotAsFile,
    parseSnapshotFromFile,
    startAutoBackup,
    stopAutoBackup,
    getLastAutoBackupTime,
    formatBytes,
} from '@/lib/backupManager';

export interface UseBackupRestoreReturn {
    // State
    localSnapshots: BackupSnapshot[];
    serverSnapshots: BackupSnapshot[];
    isLoading: boolean;
    isBackingUp: boolean;
    isRestoring: boolean;
    progress: BackupProgress | null;
    lastAutoBackup: Date | null;

    // Actions
    createBackup: (name: string, saveToServer?: boolean) => Promise<BackupSnapshot | null>;
    restoreBackup: (snapshot: BackupSnapshot) => Promise<RestoreResult>;
    deleteSnapshot: (snapshot: BackupSnapshot) => Promise<boolean>;
    downloadSnapshot: (snapshot: BackupSnapshot) => void;
    importSnapshot: (file: File) => Promise<BackupSnapshot | null>;
    refreshSnapshots: () => Promise<void>;

    // Utilities
    formatBytes: typeof formatBytes;
}

export function useBackupRestore(): UseBackupRestoreReturn {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [localSnapshots, setLocalSnapshots] = useState<BackupSnapshot[]>([]);
    const [serverSnapshots, setServerSnapshots] = useState<BackupSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [progress, setProgress] = useState<BackupProgress | null>(null);
    const [lastAutoBackup, setLastAutoBackup] = useState<Date | null>(null);

    // Load snapshots on mount
    const refreshSnapshots = useCallback(async () => {
        try {
            setIsLoading(true);

            // Get local snapshots
            const local = getLocalSnapshots();
            setLocalSnapshots(local);

            // Get server snapshots
            const server = await getServerSnapshots();
            setServerSnapshots(server);

            // Get last auto backup time
            setLastAutoBackup(getLastAutoBackupTime());
        } catch (e) {
            console.error('[useBackupRestore] Failed to load snapshots:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshSnapshots();

        // Start auto backup scheduler
        startAutoBackup();

        return () => {
            stopAutoBackup();
        };
    }, [refreshSnapshots]);

    // Create a new backup
    const createBackup = useCallback(async (
        name: string,
        saveToServer = false
    ): Promise<BackupSnapshot | null> => {
        try {
            setIsBackingUp(true);
            setProgress(null);

            const snapshot = await createSnapshot(name, setProgress);

            if (saveToServer && user?.id) {
                setProgress({
                    stage: 'saving',
                    tablesCompleted: 0,
                    totalTables: 1,
                    message: 'Menyimpan ke server...',
                });

                await saveSnapshotToServer(snapshot, user.id);
            }

            await refreshSnapshots();

            toast({
                title: 'Backup berhasil',
                description: `Snapshot "${name}" berhasil dibuat (${formatBytes(snapshot.sizeBytes)})`,
            });

            return snapshot;
        } catch (e) {
            console.error('[useBackupRestore] Backup failed:', e);
            toast({
                title: 'Backup gagal',
                description: e instanceof Error ? e.message : 'Terjadi kesalahan',
                variant: 'destructive',
            });
            return null;
        } finally {
            setIsBackingUp(false);
            setProgress(null);
        }
    }, [user?.id, refreshSnapshots, toast]);

    // Restore from snapshot
    const restoreBackup = useCallback(async (
        snapshot: BackupSnapshot
    ): Promise<RestoreResult> => {
        try {
            setIsRestoring(true);
            setProgress(null);

            const result = await restoreFromSnapshot(snapshot, setProgress);

            if (result.success) {
                // Invalidate all queries to refresh data
                queryClient.invalidateQueries();

                toast({
                    title: 'Restore berhasil',
                    description: `${result.recordsRestored} records dipulihkan dari ${result.tablesRestored.length} tabel`,
                });
            } else {
                toast({
                    title: 'Restore selesai dengan error',
                    description: `${result.errors.length} error terjadi. Cek console untuk detail.`,
                    variant: 'destructive',
                });
            }

            return result;
        } catch (e) {
            console.error('[useBackupRestore] Restore failed:', e);
            toast({
                title: 'Restore gagal',
                description: e instanceof Error ? e.message : 'Terjadi kesalahan',
                variant: 'destructive',
            });
            return {
                success: false,
                tablesRestored: [],
                recordsRestored: 0,
                errors: [e instanceof Error ? e.message : 'Unknown error'],
            };
        } finally {
            setIsRestoring(false);
            setProgress(null);
        }
    }, [queryClient, toast]);

    // Delete snapshot
    const deleteSnapshot = useCallback(async (snapshot: BackupSnapshot): Promise<boolean> => {
        try {
            if (snapshot.source === 'server') {
                await deleteServerSnapshot(snapshot.id);
            } else {
                deleteLocalSnapshot(snapshot.id);
            }

            await refreshSnapshots();

            toast({
                title: 'Snapshot dihapus',
                description: `"${snapshot.name}" berhasil dihapus`,
            });

            return true;
        } catch (e) {
            console.error('[useBackupRestore] Delete failed:', e);
            toast({
                title: 'Gagal menghapus',
                description: e instanceof Error ? e.message : 'Terjadi kesalahan',
                variant: 'destructive',
            });
            return false;
        }
    }, [refreshSnapshots, toast]);

    // Download snapshot as JSON file
    const downloadSnapshot = useCallback((snapshot: BackupSnapshot) => {
        downloadSnapshotAsFile(snapshot);

        toast({
            title: 'Download dimulai',
            description: `File backup "${snapshot.name}" sedang diunduh`,
        });
    }, [toast]);

    // Import snapshot from file
    const importSnapshot = useCallback(async (file: File): Promise<BackupSnapshot | null> => {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const content = e.target?.result as string;
                    const snapshot = parseSnapshotFromFile(content);

                    if (!snapshot) {
                        toast({
                            title: 'Format tidak valid',
                            description: 'File bukan backup snapshot yang valid',
                            variant: 'destructive',
                        });
                        resolve(null);
                        return;
                    }

                    toast({
                        title: 'File berhasil dibaca',
                        description: `Snapshot "${snapshot.name}" siap untuk di-restore`,
                    });

                    resolve(snapshot);
                } catch (err) {
                    toast({
                        title: 'Gagal membaca file',
                        description: 'File tidak dapat diproses',
                        variant: 'destructive',
                    });
                    resolve(null);
                }
            };

            reader.onerror = () => {
                toast({
                    title: 'Gagal membaca file',
                    description: 'Terjadi kesalahan saat membaca file',
                    variant: 'destructive',
                });
                resolve(null);
            };

            reader.readAsText(file);
        });
    }, [toast]);

    return {
        localSnapshots,
        serverSnapshots,
        isLoading,
        isBackingUp,
        isRestoring,
        progress,
        lastAutoBackup,
        createBackup,
        restoreBackup,
        deleteSnapshot,
        downloadSnapshot,
        importSnapshot,
        refreshSnapshots,
        formatBytes,
    };
}
