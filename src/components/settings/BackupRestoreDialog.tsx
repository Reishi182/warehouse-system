/**
 * BackupRestoreDialog Component
 * 
 * UI for backup and restore operations
 */

import { useState, useCallback } from 'react';
import {
    Database,
    Download,
    Upload,
    Trash2,
    Clock,
    Server,
    HardDrive,
    RotateCcw,
    FileJson,
    AlertTriangle,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { useBackupRestore } from '@/hooks/useBackupRestore';
import { BackupSnapshot } from '@/lib/backupManager';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface BackupRestoreDialogProps {
    trigger?: React.ReactNode;
}

export function BackupRestoreDialog({ trigger }: BackupRestoreDialogProps) {
    const {
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
        formatBytes,
    } = useBackupRestore();

    const [open, setOpen] = useState(false);
    const [backupName, setBackupName] = useState('');
    const [saveToServer, setSaveToServer] = useState(false);
    const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState<BackupSnapshot | null>(null);
    const [importedSnapshot, setImportedSnapshot] = useState<BackupSnapshot | null>(null);

    const handleCreateBackup = async () => {
        if (!backupName.trim()) return;
        await createBackup(backupName, saveToServer);
        setBackupName('');
    };

    const handleRestoreClick = (snapshot: BackupSnapshot) => {
        setSelectedSnapshot(snapshot);
        setRestoreConfirmOpen(true);
    };

    const handleConfirmRestore = async () => {
        if (!selectedSnapshot) return;
        await restoreBackup(selectedSnapshot);
        setRestoreConfirmOpen(false);
        setSelectedSnapshot(null);
        setOpen(false);
    };

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const snapshot = await importSnapshot(file);
        if (snapshot) {
            setImportedSnapshot(snapshot);
        }

        // Reset input
        e.target.value = '';
    }, [importSnapshot]);

    const handleRestoreFromFile = async () => {
        if (!importedSnapshot) return;
        await restoreBackup(importedSnapshot);
        setImportedSnapshot(null);
        setOpen(false);
    };

    const allSnapshots = [...localSnapshots, ...serverSnapshots].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const progressPercent = progress
        ? Math.round((progress.tablesCompleted / progress.totalTables) * 100)
        : 0;

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button variant="outline" className="gap-2">
                            <Database className="w-4 h-4" />
                            Backup & Restore
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            Backup & Restore
                        </DialogTitle>
                        <DialogDescription>
                            Kelola snapshot data untuk backup dan pemulihan
                        </DialogDescription>
                    </DialogHeader>

                    {/* Progress Indicator */}
                    {(isBackingUp || isRestoring) && progress && (
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-sm font-medium">{progress.message}</span>
                            </div>
                            <Progress value={progressPercent} className="h-2" />
                        </div>
                    )}

                    <Tabs defaultValue="snapshots" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
                            <TabsTrigger value="create">Buat Backup</TabsTrigger>
                            <TabsTrigger value="import">Import File</TabsTrigger>
                        </TabsList>

                        {/* Snapshots Tab */}
                        <TabsContent value="snapshots" className="flex-1 overflow-hidden mt-4">
                            <Card className="h-full flex flex-col">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium">
                                            Snapshot Tersedia
                                        </CardTitle>
                                        {lastAutoBackup && (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                Auto backup: {new Date(lastAutoBackup).toLocaleString('id-ID')}
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-hidden p-0">
                                    <ScrollArea className="h-[300px] px-6">
                                        {isLoading ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : allSnapshots.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                <p>Belum ada snapshot</p>
                                                <p className="text-xs">Buat backup pertama Anda</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 pb-4">
                                                {allSnapshots.map((snapshot) => (
                                                    <div
                                                        key={snapshot.id}
                                                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            {snapshot.source === 'server' ? (
                                                                <Server className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                            ) : (
                                                                <HardDrive className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm truncate">
                                                                    {snapshot.name}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <span>{new Date(snapshot.createdAt).toLocaleString('id-ID')}</span>
                                                                    <span>•</span>
                                                                    <span>{formatBytes(snapshot.sizeBytes)}</span>
                                                                    <span>•</span>
                                                                    <span>{snapshot.tablesIncluded.length} tabel</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => downloadSnapshot(snapshot)}
                                                                className="h-8 w-8 p-0"
                                                                title="Download"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleRestoreClick(snapshot)}
                                                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                                                title="Restore"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => deleteSnapshot(snapshot)}
                                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Create Backup Tab */}
                        <TabsContent value="create" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">Buat Backup Baru</CardTitle>
                                    <CardDescription>
                                        Simpan snapshot semua data saat ini
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="backup-name">Nama Backup</Label>
                                        <Input
                                            id="backup-name"
                                            placeholder="Contoh: Backup sebelum update"
                                            value={backupName}
                                            onChange={(e) => setBackupName(e.target.value)}
                                            disabled={isBackingUp}
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="save-server"
                                            checked={saveToServer}
                                            onCheckedChange={(checked) => setSaveToServer(!!checked)}
                                            disabled={isBackingUp}
                                        />
                                        <Label htmlFor="save-server" className="text-sm font-normal cursor-pointer">
                                            Simpan juga ke server (untuk akses dari device lain)
                                        </Label>
                                    </div>

                                    <Button
                                        onClick={handleCreateBackup}
                                        disabled={!backupName.trim() || isBackingUp}
                                        className="w-full"
                                    >
                                        {isBackingUp ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Membuat Backup...
                                            </>
                                        ) : (
                                            <>
                                                <Database className="w-4 h-4 mr-2" />
                                                Buat Backup
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Import Tab */}
                        <TabsContent value="import" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">Import dari File</CardTitle>
                                    <CardDescription>
                                        Restore data dari file backup JSON
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!importedSnapshot ? (
                                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                            <FileJson className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Pilih file backup JSON untuk diimport
                                            </p>
                                            <Input
                                                type="file"
                                                accept=".json"
                                                onChange={handleFileUpload}
                                                className="max-w-xs mx-auto"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-medium text-green-800 dark:text-green-200">
                                                            File berhasil dibaca
                                                        </p>
                                                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                                            {importedSnapshot.name}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            <Badge variant="secondary" className="text-xs">
                                                                {formatBytes(importedSnapshot.sizeBytes)}
                                                            </Badge>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {importedSnapshot.tablesIncluded.length} tabel
                                                            </Badge>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {new Date(importedSnapshot.createdAt).toLocaleDateString('id-ID')}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setImportedSnapshot(null)}
                                                    className="flex-1"
                                                >
                                                    Batal
                                                </Button>
                                                <Button
                                                    onClick={handleRestoreFromFile}
                                                    disabled={isRestoring}
                                                    className="flex-1"
                                                >
                                                    {isRestoring ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Memulihkan...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RotateCcw className="w-4 h-4 mr-2" />
                                                            Restore Data
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Restore Confirmation Dialog */}
            <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Konfirmasi Restore
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>
                                Anda akan memulihkan data dari snapshot:
                            </p>
                            <p className="font-medium">
                                "{selectedSnapshot?.name}"
                            </p>
                            <p className="text-amber-600 dark:text-amber-400">
                                Data yang ada akan di-update dengan data dari snapshot.
                                Proses ini tidak dapat dibatalkan.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmRestore}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Ya, Restore Sekarang
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
