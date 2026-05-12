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
import ProductImage from '@/components/common/ProductImage';

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
    stock_return: 'Retur Stok',
    purchase_order: 'Purchase Order',
    sale: 'Penjualan',
    return: 'Retur',
    adjustment: 'Penyesuaian Manual',
    transfer: 'Transfer Stok',
    initial: 'Stok Awal',
    stock_opname: 'Stok Opname',
    marketplace_order: 'Marketplace',
    tokopedia_order: 'Tokopedia',
    po_claim: 'Klaim PO',
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
        case 'stock_return':
            return {
                primary: 'Diproses Oleh',
                secondary: 'Diajukan Oleh',
                primaryIcon: ArrowUpFromLine,
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
            <DialogContent className="max-w-xl bg-slate-50 dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden rounded-2xl max-h-[90vh] flex flex-col">
                {/* Header Section */}
                <div className={cn(
                    "p-6 text-white relative shrink-0",
                    log.type === 'in' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
                        log.type === 'out' ? 'bg-gradient-to-r from-rose-500 to-red-600' :
                            'bg-gradient-to-r from-blue-500 to-indigo-600'
                )}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Package className="w-40 h-40" />
                    </div>
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-4">
                            {/* Type Icon */}
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
                                <TypeIcon className="w-7 h-7 text-white" />
                            </div>

                            <div>
                                <DialogTitle className="text-2xl font-bold mb-1">
                                    {typeInfo.label}
                                </DialogTitle>
                                <p className="text-white/80 flex items-center gap-1.5 text-sm font-medium font-mono">
                                    <Hash className="w-4 h-4" />
                                    {log.reference_id ? `${referenceTypeLabels[log.reference_type] || log.reference_type} #${log.reference_id.slice(0, 8)}` : log.id.slice(0, 12)}
                                </p>
                            </div>
                        </div>

                        {/* Quantity Badge */}
                        <div className="text-right">
                            <div className="text-3xl font-extrabold tracking-tight drop-shadow-md">
                                {stockChange}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Product Info Target */}
                    <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <ProductImage
                            src={log.product?.image_url}
                            size="medium"
                            className="w-16 h-16 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm"
                            placeholderClassName="w-16 h-16 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm shrink-0"
                            lazy={false}
                        />
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-tight mb-1">{log.product?.name || 'Produk Tidak Diketahui'}</h3>
                            <p className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-mono text-gray-600 dark:text-gray-300">
                                {log.product?.barcode || '-'}
                            </p>
                        </div>
                    </div>

                    {/* Four Details Grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                                <Calendar className="w-3.5 h-3.5" /> Tanggal
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white pl-5">{formattedDate}</p>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                                <Clock className="w-3.5 h-3.5" /> Waktu
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white pl-5">{formattedTime}</p>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                                <MapPin className="w-3.5 h-3.5" /> Lokasi
                            </div>
                            <div className="pl-5">
                                <span className="inline-flex px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                                    {locationLabels[log.location] || log.location}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                                <Activity className="w-3.5 h-3.5" /> Jumlah Mutasi
                            </div>
                            <p className={cn(
                                "font-bold text-lg pl-5",
                                log.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' :
                                    log.type === 'out' ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'
                            )}>
                                {stockChange}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    {/* Stock Before / After */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                            <TrendingUp className="w-3.5 h-3.5" /> Perubahan Total Stok
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
                            {/* Decorative background element */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-50/50 to-transparent dark:via-slate-700/20 pointer-events-none" />
                            
                            <div className="text-center flex-1 relative z-10">
                                <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1.5">Stok Sebelum</p>
                                <p className={cn(
                                    "text-lg sm:text-xl font-extrabold",
                                    stockBeforeRaw !== null ? "text-gray-900 dark:text-gray-100" : "text-gray-400"
                                )}>
                                    {stockBefore}
                                </p>
                            </div>
                            
                            <div className="px-4 shrink-0 relative z-10">
                                {log.type === 'in' ? (
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                                    </div>
                                ) : log.type === 'out' ? (
                                    <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                                        <TrendingDown className="w-5 h-5 text-rose-500" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                        <RefreshCw className="w-5 h-5 text-blue-500" />
                                    </div>
                                )}
                            </div>
                            
                            <div className="text-center flex-1 relative z-10">
                                <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1.5">Stok Sesudah</p>
                                <p className={cn(
                                    "text-lg sm:text-xl font-extrabold",
                                    stockAfterRaw !== null ? "text-gray-900 dark:text-gray-100" : "text-gray-400"
                                )}>
                                    {stockAfter}
                                </p>
                            </div>
                        </div>
                        {!hasStockData && (
                            <p className="text-[11px] text-orange-500/80 bg-orange-50 dark:bg-orange-950/30 px-3 py-1.5 rounded text-center border border-orange-100 dark:border-orange-900/30 font-medium">
                                Data mutasi saldo stok lama tidak direkam per transaksinya sebelum update v2.
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Actor(s) section — context-aware */}
                    <div className="space-y-3">
                        {/* Primary actor */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                                <PrimaryIcon className="w-3.5 h-3.5" /> {actorLabels.primary}
                            </div>
                            {log.actor_name ? (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <PrimaryIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-gray-100">{log.actor_name}</p>
                                        <p className="text-xs text-gray-500">Otomatisasi Sistem / Integrasi Biasa</p>
                                    </div>
                                </div>
                            ) : log.user ? (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                                    <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-700 shadow-sm">
                                        <AvatarImage src={log.user.avatar || ''} />
                                        <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-500/30 dark:text-indigo-300">
                                            {log.user.name?.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-gray-100">{log.user.name}</p>
                                        <p className="text-xs text-gray-500">{log.user.email}</p>
                                    </div>
                                </div>
                            ) : (() => {
                                const nameFromNote = parseApproverFromNote(log.note);
                                return nameFromNote ? (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                                        <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shrink-0">
                                            <PrimaryIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-gray-100">{nameFromNote}</p>
                                            <p className="text-xs text-gray-500">Tertulis dari catatan manual</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm italic text-gray-400">Kasir / Admin Tidak Terdeteksi</p>
                                );
                            })()}
                        </div>

                        {/* Secondary actor */}
                        {actorLabels.secondary && SecondaryIcon && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase mt-4">
                                    <SecondaryIcon className="w-3.5 h-3.5" /> {actorLabels.secondary}
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 opacity-80">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                        <SecondaryIcon className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 italic">
                                            Lihat di dokumen referensi terkait
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Note */}
                    {log.note && (
                        <>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide uppercase">
                                    <FileText className="w-3.5 h-3.5" /> Catatan
                                </div>
                                <p className="text-sm p-4 bg-yellow-50 dark:bg-yellow-500/5 text-yellow-900 dark:text-yellow-100 border border-yellow-100 dark:border-yellow-500/20 rounded-xl leading-relaxed">
                                    {log.note}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 shrink-0">
                    <p className="text-xs text-gray-500 font-medium">
                        Disimpan {relativeTime}
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl shadow-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                        Tutup Detail
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
