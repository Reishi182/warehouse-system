/**
 * AppModal — Universal modal component untuk seluruh aplikasi.
 *
 * Menggantikan pola berulang: Dialog + DialogContent + DialogHeader + DialogTitle + DialogFooter
 * dengan satu komponen tunggal yang sudah mengandung semua optimasi performa.
 *
 * ─── Size variants ────────────────────────────────────────────────────────────
 *  xs   → max-w-sm   (~384px)   → confirm kecil, input tunggal
 *  sm   → max-w-md   (~448px)   → form sederhana, alert
 *  md   → max-w-lg   (~512px)   → default — form standar          ← DEFAULT
 *  lg   → max-w-2xl  (~672px)   → tabel/list sedang
 *  xl   → max-w-3xl  (~768px)   → tabel/list besar
 *  2xl  → max-w-4xl  (~896px)   → form kompleks, preview dokumen
 *  full → max-w-[100vw] + h-[100dvh] → fullscreen (mobile picker)
 *
 * ─── Scroll variants ──────────────────────────────────────────────────────────
 *  scrollable (default true) → DialogContent sendiri yang scroll
 *  scrollable=false + noPadding → anak komponen yang manage scroll sendiri
 *                                  (untuk pola "flex flex-col" custom)
 *
 * ─── Visual variants ──────────────────────────────────────────────────────────
 *  variant="default"  → background card biasa
 *  variant="slate"    → bg-slate-50/slate-900, border-none, shadow-2xl (detail view)
 *  variant="danger"   → header merah, untuk confirm delete/reject
 *
 * ─── Usage examples ───────────────────────────────────────────────────────────
 *
 * // 1. Form standar
 * <AppModal open={open} onClose={onClose} title="Tambah Supplier" size="sm">
 *   <form>...</form>
 * </AppModal>
 *
 * // 2. Detail view scrollable
 * <AppModal open={open} onClose={onClose} title="Detail PO" size="2xl" scrollable
 *   footer={<Button onClick={onClose}>Tutup</Button>}>
 *   <table>...</table>
 * </AppModal>
 *
 * // 3. Picker fullscreen (mobile-first, flex layout)
 * <AppModal open={open} onClose={onClose} title="Pilih Produk" size="xl"
 *   noPadding scrollable={false}
 *   footer={<Button onClick={confirm}>Konfirmasi</Button>}>
 *   <div className="flex-1 overflow-y-auto">...</div>
 * </AppModal>
 *
 * // 4. Confirm danger
 * <AppModal open={open} onClose={onClose} title="Hapus Data" variant="danger" size="xs"
 *   description="Tindakan ini tidak dapat dibatalkan."
 *   footer={<><Button variant="outline" onClick={onClose}>Batal</Button>
 *             <Button variant="destructive" onClick={onDelete}>Hapus</Button></>}>
 * </AppModal>
 *
 * // 5. Foto / image lightbox (no padding, no header)
 * <AppModal open={open} onClose={onClose} size="xl" noPadding hideHeader>
 *   <img src={url} className="w-full" />
 * </AppModal>
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type AppModalVariant = 'default' | 'slate' | 'danger';

export interface AppModalProps {
    /** Apakah modal terbuka */
    open: boolean;
    /** Dipanggil saat modal ditutup (klik overlay, tombol X, Escape) */
    onClose: () => void;

    // ── Content ───────────────────────────────────────────────────────────────
    /** Judul di header */
    title?: React.ReactNode;
    /** Deskripsi kecil di bawah judul */
    description?: React.ReactNode;
    /** Icon di samping judul */
    icon?: React.ReactNode;
    /** Konten utama modal */
    children?: React.ReactNode;
    /** Konten footer (tombol-tombol aksi) */
    footer?: React.ReactNode;

    // ── Appearance ────────────────────────────────────────────────────────────
    /** Ukuran modal. Default: 'md' */
    size?: AppModalSize;
    /** Visual theme. Default: 'default' */
    variant?: AppModalVariant;
    /** Hapus padding dari body modal (untuk layout custom / flex) */
    noPadding?: boolean;
    /** Sembunyikan header (judul + tombol X) */
    hideHeader?: boolean;
    /** Sembunyikan tombol X */
    hideClose?: boolean;
    /** Modal bisa di-scroll (default: true) */
    scrollable?: boolean;
    /** className tambahan untuk DialogContent */
    className?: string;

    // ── Behavior ─────────────────────────────────────────────────────────────
    /** Cegah close saat klik overlay/Escape (mis: saat loading) */
    disableClose?: boolean;
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<AppModalSize, string> = {
    xs:   'max-w-sm',
    sm:   'max-w-md',
    md:   'max-w-lg',
    lg:   'max-w-2xl',
    xl:   'max-w-3xl',
    '2xl':'max-w-4xl',
    full: 'max-w-[100vw] w-[100vw] h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl !rounded-none sm:!rounded-2xl',
};

// ─── Variant map ──────────────────────────────────────────────────────────────

const VARIANT_CONTENT: Record<AppModalVariant, string> = {
    default: 'bg-background border shadow-lg',
    slate:   'bg-slate-50 dark:bg-slate-900 border-none shadow-2xl',
    danger:  'bg-background border shadow-lg',
};

const VARIANT_HEADER: Record<AppModalVariant, string> = {
    default: 'border-b bg-background',
    slate:   'border-b bg-white dark:bg-slate-800/80',
    danger:  'border-b bg-red-50 dark:bg-red-950/30',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AppModal = React.memo(function AppModal({
    open,
    onClose,
    title,
    description,
    icon,
    children,
    footer,
    size = 'md',
    variant = 'default',
    noPadding = false,
    hideHeader = false,
    hideClose = false,
    scrollable = true,
    className,
    disableClose = false,
}: AppModalProps) {
    const isFull = size === 'full';

    const handleOpenChange = React.useCallback((val: boolean) => {
        if (!val && !disableClose) onClose();
    }, [onClose, disableClose]);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
            <DialogPrimitive.Portal>
                {/* Overlay */}
                <DialogPrimitive.Overlay
                    className={cn(
                        'fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                    )}
                />

                {/* Content */}
                <DialogPrimitive.Content
                    className={cn(
                        // Base
                        'fixed z-50 w-[calc(100%-2rem)] sm:w-full rounded-2xl',
                        // Positioning
                        !isFull && 'left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]',
                        isFull  && 'left-0 top-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]',
                        // Size
                        SIZE_CLASSES[size],
                        // Scrollable
                        scrollable && !isFull  && 'max-h-[90vh] overflow-y-auto',
                        scrollable &&  isFull  && 'overflow-y-auto',
                        !scrollable && 'overflow-hidden flex flex-col',
                        // Variant
                        VARIANT_CONTENT[variant],
                        // Animations
                        'duration-200',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                        !isFull && 'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
                        !isFull && 'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
                        className,
                    )}
                    // Prevent focus on open (avoids lag from autoFocus competing with animation)
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    {/* ── Header ────────────────────────────────────────────── */}
                    {!hideHeader && (title || !hideClose) && (
                        <div className={cn(
                            'flex items-start justify-between gap-3 px-5 py-4 shrink-0',
                            VARIANT_HEADER[variant],
                        )}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                {variant === 'danger' && !icon && (
                                    <span className="shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    </span>
                                )}
                                {icon && (
                                    <span className={cn(
                                        'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center',
                                        variant === 'danger'
                                            ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                                            : 'bg-primary/10 text-primary',
                                    )}>
                                        {icon}
                                    </span>
                                )}
                                <div className="min-w-0">
                                    {title && (
                                        <DialogPrimitive.Title className={cn(
                                            'text-base font-semibold leading-tight truncate',
                                            variant === 'danger' && 'text-red-700 dark:text-red-400',
                                        )}>
                                            {title}
                                        </DialogPrimitive.Title>
                                    )}
                                    {description && (
                                        <DialogPrimitive.Description className="text-sm text-muted-foreground mt-0.5 leading-snug">
                                            {description}
                                        </DialogPrimitive.Description>
                                    )}
                                </div>
                            </div>

                            {!hideClose && (
                                <DialogPrimitive.Close asChild>
                                    <button
                                        className={cn(
                                            'shrink-0 rounded-lg p-1.5 opacity-60 transition-all',
                                            'hover:opacity-100 hover:bg-muted',
                                            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                                            'disabled:pointer-events-none',
                                        )}
                                        aria-label="Tutup"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </DialogPrimitive.Close>
                            )}
                        </div>
                    )}

                    {/* ── Body ──────────────────────────────────────────────── */}
                    {children && (
                        <div className={cn(
                            !scrollable && 'flex-1 min-h-0 overflow-y-auto',
                            !noPadding && 'p-5',
                        )}>
                            {children}
                        </div>
                    )}

                    {/* ── Footer ────────────────────────────────────────────── */}
                    {footer && (
                        <div className={cn(
                            'flex flex-col-reverse sm:flex-row sm:justify-end gap-2',
                            'px-5 py-4 border-t shrink-0',
                            variant === 'slate' && 'bg-slate-100/50 dark:bg-slate-800/50',
                        )}>
                            {footer}
                        </div>
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
});

// ─── Convenience: ConfirmModal ─────────────────────────────────────────────────
// Untuk pola confirm dialog yang sangat umum (hapus, tolak, dsb.)

export interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    isLoading?: boolean;
}

export const ConfirmModal = React.memo(function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Konfirmasi',
    cancelLabel = 'Batal',
    variant = 'danger',
    isLoading = false,
}: ConfirmModalProps) {
    return (
        <AppModal
            open={open}
            onClose={onClose}
            title={title}
            description={description}
            size="xs"
            variant={variant}
            disableClose={isLoading}
            footer={
                <>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                        className="sm:order-1"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'destructive' : 'default'}
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="sm:order-2"
                    >
                        {isLoading ? 'Memproses...' : confirmLabel}
                    </Button>
                </>
            }
        />
    );
});

// ─── Re-export untuk kemudahan import ─────────────────────────────────────────
// Sehingga file lain cukup: import { AppModal, ConfirmModal } from '@/components/ui/app-modal'
