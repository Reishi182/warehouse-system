import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
;
import {
    MoreHorizontal,
    Trash2,
    Edit,
    Eye,
    Download,
    Printer,
    CheckSquare,
    Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BulkAction<T> {
    id: string;
    label: string;
    icon: React.ReactNode;
    variant?: 'default' | 'destructive';
    handler: (selectedItems: T[]) => Promise<void> | void;
    requireConfirmation?: boolean;
    confirmationMessage?: string;
}

interface BulkActionsToolbarProps<T> {
    selectedItems: T[];
    totalItems: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    actions: BulkAction<T>[];
    itemLabel?: string; // e.g., "produk", "pesanan"
    className?: string;
}

/**
 * Bulk Actions Toolbar - Appears when items are selected in a table/list
 */
export function BulkActionsToolbar<T>({
    selectedItems,
    totalItems,
    onSelectAll,
    onDeselectAll,
    actions,
    itemLabel = 'item',
    className,
}: BulkActionsToolbarProps<T>) {
    const [isLoading, setIsLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState<BulkAction<T> | null>(null);

    const handleAction = useCallback(async (action: BulkAction<T>) => {
        if (action.requireConfirmation) {
            setConfirmAction(action);
            return;
        }

        setIsLoading(true);
        try {
            await action.handler(selectedItems);
        } finally {
            setIsLoading(false);
        }
    }, [selectedItems]);

    const handleConfirmedAction = useCallback(async () => {
        if (!confirmAction) return;

        setIsLoading(true);
        try {
            await confirmAction.handler(selectedItems);
        } finally {
            setIsLoading(false);
            setConfirmAction(null);
        }
    }, [confirmAction, selectedItems]);

    const isAllSelected = selectedItems.length === totalItems && totalItems > 0;
    const isSomeSelected = selectedItems.length > 0 && selectedItems.length < totalItems;

    if (selectedItems.length === 0) {
        return null;
    }

    return (
        <>
            <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20",
                "animate-in slide-in-from-top-2 duration-200",
                className
            )}>
                {/* Selection info */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={isAllSelected ? onDeselectAll : onSelectAll}
                        className="text-primary hover:text-primary/80 transition-colors"
                    >
                        {isAllSelected ? (
                            <CheckSquare className="w-5 h-5" />
                        ) : isSomeSelected ? (
                            <div className="relative w-5 h-5">
                                <Square className="w-5 h-5" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2.5 h-0.5 bg-primary" />
                                </div>
                            </div>
                        ) : (
                            <Square className="w-5 h-5" />
                        )}
                    </button>
                    <span className="text-sm font-medium">
                        {selectedItems.length} {itemLabel} dipilih
                    </span>
                </div>

                <div className="h-4 w-px bg-border" />

                {/* Select all / Deselect all */}
                <div className="flex items-center gap-1 text-xs">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={onSelectAll}
                        disabled={isAllSelected}
                    >
                        Pilih Semua ({totalItems})
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={onDeselectAll}
                    >
                        Batal Pilih
                    </Button>
                </div>

                <div className="flex-1" />

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                    {actions.slice(0, 3).map((action) => (
                        <Button
                            key={action.id}
                            variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => handleAction(action)}
                            disabled={isLoading}
                        >
                            {action.icon}
                            <span className="hidden sm:inline">{action.label}</span>
                        </Button>
                    ))}

                    {/* More actions dropdown */}
                    {actions.length > 3 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Aksi Lainnya</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {actions.slice(3).map((action) => (
                                    <DropdownMenuItem
                                        key={action.id}
                                        onClick={() => handleAction(action)}
                                        className={cn(
                                            "gap-2",
                                            action.variant === 'destructive' && "text-destructive focus:text-destructive"
                                        )}
                                    >
                                        {action.icon}
                                        {action.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Aksi</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction?.confirmationMessage ||
                                `Apakah Anda yakin ingin ${confirmAction?.label.toLowerCase()} ${selectedItems.length} ${itemLabel}?`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmedAction}
                            className={cn(
                                confirmAction?.variant === 'destructive' && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            )}
                        >
                            {confirmAction?.label}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// Common pre-built bulk actions
export const createDeleteAction = <T,>(
    onDelete: (items: T[]) => Promise<void>
): BulkAction<T> => ({
    id: 'delete',
    label: 'Hapus',
    icon: <Trash2 className="w-4 h-4" />,
    variant: 'destructive',
    requireConfirmation: true,
    confirmationMessage: 'Data yang dihapus tidak dapat dikembalikan. Lanjutkan?',
    handler: onDelete,
});

export const createExportAction = <T,>(
    onExport: (items: T[]) => Promise<void>
): BulkAction<T> => ({
    id: 'export',
    label: 'Export',
    icon: <Download className="w-4 h-4" />,
    handler: onExport,
});

export const createPrintAction = <T,>(
    onPrint: (items: T[]) => Promise<void>
): BulkAction<T> => ({
    id: 'print',
    label: 'Cetak',
    icon: <Printer className="w-4 h-4" />,
    handler: onPrint,
});

export default BulkActionsToolbar;
