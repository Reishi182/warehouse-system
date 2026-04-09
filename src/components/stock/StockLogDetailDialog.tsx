import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    RefreshCw,
    Package,
    Calendar,
    User,
    MapPin,
    FileText,
    Hash,
    Clock,
    TrendingUp,
    TrendingDown,
    Activity,
    Link2,
    X,
    ClipboardCheck,
    ShoppingCart,
} from 'lucide-react';
import { StockLog, Location } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface StockLogDetailDialogProps {
    log: StockLog | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const locationLabels: Record<Location, string> = {
    gudang: 'Gudang',
    toko: 'Toko',
    lainnya: 'Lainnya',
};

const typeConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
    in: {
        label: 'Stok Masuk',
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        icon: ArrowDownToLine
    },
    out: {
        label: 'Stok Keluar',
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        icon: ArrowUpFromLine
    },
    adjustment: {
        label: 'Penyesuaian',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        icon: RefreshCw
    },
};

const referenceTypeLabels: Record<string, string> = {
    stock_request: 'Permintaan Stok',
    purchase_order: 'Purchase Order',
    sale: 'Penjualan',
    return: 'Retur',
    adjustment: 'Penyesuaian Manual',
    transfer: 'Transfer Stok',
    initial: 'Stok Awal',
    stock_opname: 'Stok Opname',
};

// Parse "X → Y" pattern from note for stock before/after fallback
function parseStockFromNote(note?: string | null): { before: number | null; after: number | null } {
    if (!note) return { before: null, after: null };

    // Patterns: "1 → 80", "1 → 80", ": 1 → 80"
    const match = note.match(/:\s*(\d+(?:\.\d+)?)\s*[→\->]+\s*(\d+(?:\.\d+)?)/);
    if (match) {
        return { before: parseFloat(match[1]), after: parseFloat(match[2]) };
    }
    return { before: null, after: null };
}

// Parse approver name from note — format: "Stok Opname OP-xxx | Disetujui: NamaUser"
function parseApproverFromNote(note?: string | null): string | null {
    if (!note) return null;
    const match = note.match(/Disetujui:\s*(.+?)(?:\s*\||$)/);
    return match ? match[1].trim() : null;
}

// Determine dual actor labels based on reference type
function getActorLabels(referenceType: string | null | undefined): {
    primary: string;
    secondary: string | null;
    primaryIcon: React.ElementType;
    secondaryIcon: React.ElementType | null;
} {
    switch (referenceType) {
        case 'purchase_order':
            return {
                primary: 'Diterima Oleh',
                secondary: 'Dibuat Oleh',
                primaryIcon: ArrowDownToLine,
                secondaryIcon: ShoppingCart,
            };
        case 'stock_opname':
            return {
                primary: 'Disesuaikan Oleh',
                secondary: 'Disetujui Oleh',
                primaryIcon: RefreshCw,
                secondaryIcon: ClipboardCheck,
            };
        case 'stock_request':
            return {
                primary: 'Diterima Oleh',
                secondary: 'Diminta Oleh',
                primaryIcon: ArrowDownToLine,
                secondaryIcon: ShoppingCart,
            };
        case 'sale':
            return {
                primary: 'Dilayani Oleh',
                secondary: null,
                primaryIcon: User,
                secondaryIcon: null,
            };
        default:
            return {
                primary: 'Dilakukan Oleh',
                secondary: null,
                primaryIcon: User,
                secondaryIcon: null,
            };
    }
}

export function StockLogDetailDialog({ log, open, onOpenChange }: StockLogDetailDialogProps) {
    if (!log) return null;

    const typeInfo = typeConfig[log.type] || typeConfig.adjustment;
    const TypeIcon = typeInfo.icon;

    const formattedDate = format(parseISO(log.timestamp), 'EEEE, dd MMMM yyyy', { locale: id });
    const formattedTime = format(parseISO(log.timestamp), 'HH:mm:ss', { locale: id });
    const relativeTime = format(parseISO(log.timestamp), 'dd MMM yyyy, HH:mm', { locale: id });

    const noteStocks = parseStockFromNote(log.note);
    const stockBeforeRaw = log.stock_before ?? noteStocks.before;
    const stockAfterRaw = log.stock_after ?? noteStocks.after;
    const hasStockData = stockBeforeRaw !== null || stockAfterRaw !== null;

    // Multi-unit formatter helper
    const formatQty = (qty: number | null) => {
        if (qty === null) return '—';
        const isMultiUnit = log.product?.has_multi_unit && log.product?.pcs_per_box;
        let displayQty = Math.abs(qty).toString();
        
        if (isMultiUnit && log.product) {
            const pcsPerBox = log.product.pcs_per_box!;
            const mainUnit = (log.product.main_unit || 'box').toUpperCase();
            const subUnit = (log.product.sell_unit || 'pcs').toUpperCase();
            const qtyAbs = Math.abs(qty);
            const mainCount = Math.floor(qtyAbs / pcsPerBox);
            const remainder = parseFloat((qtyAbs % pcsPerBox).toFixed(2));
            if (mainCount === 0) displayQty = `${remainder} ${subUnit}`;
            else if (remainder === 0) displayQty = `${mainCount} ${mainUnit}`;
            else displayQty = `${mainCount} ${mainUnit} ${remainder} ${subUnit}`;
        } else if (log.product?.sell_unit) {
            displayQty = `${Math.abs(qty)} ${log.product.sell_unit.toUpperCase()}`;
        } else {
            displayQty = `${Math.abs(qty)} Unit`;
        }
        
        return displayQty;
    };

    const stockChange = log.type === 'in' ? `+${formatQty(log.quantity)}` :
        log.type === 'out' ? `-${formatQty(log.quantity)}` :
            `±${formatQty(log.quantity)}`;
    
    const stockBefore = hasStockData ? formatQty(stockBeforeRaw) : '—';
    const stockAfter = hasStockData ? formatQty(stockAfterRaw) : '—';

    // Get contextual actor labels
    const actorLabels = getActorLabels(log.reference_type);
    const PrimaryIcon = actorLabels.primaryIcon;
    const SecondaryIcon = actorLabels.secondaryIcon;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 overflow-hidden">
                {/* Header with gradient */}
                <div className={cn("p-6 pb-4", typeInfo.bgColor)}>
                    <div className="flex items-start gap-4">
                        {/* Type Icon */}
                        <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                            log.type === 'in' ? 'bg-green-500' :
                                log.type === 'out' ? 'bg-red-500' :
                                    'bg-blue-500'
                        )}>
                            <TypeIcon className="w-7 h-7 text-white" />
                        </div>

                        <div className="flex-1">
                            <DialogTitle className="text-xl font-bold mb-1">
                                {typeInfo.label}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {log.id.slice(0, 8)}...
                            </p>
                        </div>

                        {/* Quantity Badge */}
                        <div className={cn("text-3xl font-bold", typeInfo.color)}>
                            {stockChange}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Product Info */}
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                        {log.product?.image_url ? (
                            <img
                                src={log.product.image_url}
                                alt={log.product.name}
                                className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-white shadow">
                                <Package className="w-8 h-8 text-primary" />
                            </div>
                        )}
                        <div className="flex-1">
                            <h3 className="font-bold text-lg">{log.product?.name || 'Produk Tidak Diketahui'}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <span className="font-mono bg-muted px-2 py-0.5 rounded">
                                    {log.product?.barcode || '-'}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                <Calendar className="w-3.5 h-3.5" />
                                Tanggal
                            </div>
                            <p className="font-semibold">{formattedDate}</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                <Clock className="w-3.5 h-3.5" />
                                Waktu
                            </div>
                            <p className="font-semibold">{formattedTime}</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                <MapPin className="w-3.5 h-3.5" />
                                Lokasi
                            </div>
                            <Badge variant="outline" className="font-semibold">
                                {locationLabels[log.location] || log.location}
                            </Badge>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                <Activity className="w-3.5 h-3.5" />
                                Jumlah
                            </div>
                            <p className={cn("font-bold text-lg", typeInfo.color)}>
                                {stockChange}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    {/* Stock Before / After */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Perubahan Stok
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl">
                            <div className="text-center flex-1">
                                <p className="text-xs text-muted-foreground uppercase mb-1">Stok Sebelum</p>
                                <p className={cn(
                                    "text-xl font-bold",
                                    stockBeforeRaw !== null ? "text-foreground" : "text-muted-foreground/40"
                                )}>
                                    {stockBefore}
                                </p>
                            </div>
                            <div className="px-4">
                                {log.type === 'in' ? (
                                    <TrendingUp className="w-6 h-6 text-green-500" />
                                ) : log.type === 'out' ? (
                                    <TrendingDown className="w-6 h-6 text-red-500" />
                                ) : (
                                    <RefreshCw className="w-6 h-6 text-blue-500" />
                                )}
                            </div>
                            <div className="text-center flex-1">
                                <p className="text-xs text-muted-foreground uppercase mb-1">Stok Sesudah</p>
                                <p className={cn(
                                    "text-xl font-bold",
                                    stockAfterRaw !== null ? "text-foreground" : "text-muted-foreground/40"
                                )}>
                                    {stockAfter}
                                </p>
                            </div>
                        </div>
                        {!hasStockData && (
                            <p className="text-[11px] text-muted-foreground text-center">
                                Data stok sebelum/sesudah tidak tersedia untuk transaksi lama
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Actor(s) section — context-aware */}
                    <div className="space-y-3">
                        {/* Primary actor */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                <PrimaryIcon className="w-3.5 h-3.5" />
                                {actorLabels.primary}
                            </div>
                            {log.actor_name ? (
                                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <PrimaryIcon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{log.actor_name}</p>
                                        <p className="text-xs text-muted-foreground">Otomatisasi Sistem Audit</p>
                                    </div>
                                </div>
                            ) : log.user ? (
                                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={log.user.avatar || ''} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                            {log.user.name?.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{log.user.name}</p>
                                        <p className="text-xs text-muted-foreground">{log.user.email}</p>
                                    </div>
                                </div>
                            ) : (() => {
                                // Try to extract name from note (e.g. stock opname with "Disetujui: NamaUser")
                                const nameFromNote = parseApproverFromNote(log.note);
                                return nameFromNote ? (
                                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <PrimaryIcon className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{nameFromNote}</p>
                                            <p className="text-xs text-muted-foreground">Data dari catatan transaksi</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm italic text-muted-foreground">Tidak diketahui / System</p>
                                );
                            })()}
                        </div>

                        {/* Secondary actor — only shown for dual-actor types */}
                        {actorLabels.secondary && SecondaryIcon && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                    <SecondaryIcon className="w-3.5 h-3.5" />
                                    {actorLabels.secondary}
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-dashed">
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                        <SecondaryIcon className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground italic">
                                            Lihat dokumen referensi untuk detail
                                        </p>
                                        {log.reference_id && (
                                            <p className="text-xs font-mono text-muted-foreground">
                                                Ref: {log.reference_id.slice(0, 12)}...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reference */}
                    {log.reference_type && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                    <Link2 className="w-3.5 h-3.5" />
                                    Referensi
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="rounded-full">
                                        {referenceTypeLabels[log.reference_type] || log.reference_type}
                                    </Badge>
                                    {log.reference_id && (
                                        <span className="text-sm font-mono text-muted-foreground">
                                            #{log.reference_id.slice(0, 8)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Note */}
                    {log.note && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                    <FileText className="w-3.5 h-3.5" />
                                    Catatan
                                </div>
                                <p className="text-sm p-3 bg-muted/30 rounded-xl">
                                    {log.note}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-t">
                    <p className="text-xs text-muted-foreground">
                        Tercatat pada {relativeTime}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl"
                    >
                        Tutup
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
