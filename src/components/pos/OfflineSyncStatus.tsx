/**
 * Component to show offline sync status in POS
 */

import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

export function OfflineSyncStatus() {
    const { online, syncStatus, isSyncing, syncNow } = useOfflineSync();

    // If online and no pending sync, show subtle indicator
    if (online && syncStatus.pending === 0) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 text-green-600">
                            <Cloud className="w-4 h-4" />
                            <span className="text-xs font-medium hidden sm:inline">Online</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Terhubung ke server</p>
                        {syncStatus.lastSync && (
                            <p className="text-xs text-muted-foreground">
                                Sync terakhir: {new Date(syncStatus.lastSync).toLocaleTimeString('id-ID')}
                            </p>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Offline mode
    if (!online) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <CloudOff className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Mode Offline</span>
                {syncStatus.pending > 0 && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                        {syncStatus.pending} pending
                    </Badge>
                )}
            </div>
        );
    }

    // Online but has pending sync
    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10">
                {isSyncing ? (
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                ) : syncStatus.failed > 0 ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                    <Cloud className="w-4 h-4 text-blue-600" />
                )}

                <span className="text-xs font-medium text-blue-700">
                    {isSyncing ? 'Syncing...' : `${syncStatus.pending} pending`}
                </span>
            </div>

            {!isSyncing && syncStatus.pending > 0 && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={syncNow}
                                className="h-7 px-2 text-xs"
                            >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Sync
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Sinkronkan transaksi offline ke server</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {syncStatus.failed > 0 && (
                <Badge variant="destructive" className="text-xs">
                    {syncStatus.failed} gagal
                </Badge>
            )}
        </div>
    );
}
