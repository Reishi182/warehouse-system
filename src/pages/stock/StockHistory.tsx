import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { useDataStore } from '@/store/useDataStore';
import { StockLogDetailDialog } from '@/components/stock/StockLogDetailDialog';
import { StockLog, Location, ProductAuditLog } from '@/types';
import { useStockLogs } from '@/hooks/useStockLogs';
import { useProductAuditLogs } from '@/hooks/useProductAuditLogs';
import { useRole } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    RefreshCw,
    Package,
    Calendar,
    TrendingUp,
    TrendingDown,
    Activity,
    Eye,
    Layers,
    List,
    User,
    MapPin,
    FileText,
    Pencil,
    Trash2,
    ArrowRightLeft,
    Shield,
    History,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

const locationLabels: Record<Location, string> = {
    gudang: 'Gudang',
    toko: 'Toko',
    lainnya: 'Lainnya',
};

const typeLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    in: { label: 'Masuk', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: ArrowDownToLine },
    out: { label: 'Keluar', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: ArrowUpFromLine },
    adjustment: { label: 'Penyesuaian', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: RefreshCw },
};

const referenceTypeLabels: Record<string, string> = {
    purchase_order: 'Purchase Order',
    stock_request: 'Permintaan Stok',
    stock_return: 'Retur Stok',
    sale: 'Penjualan',
    adjustment: 'Penyesuaian Manual',
    stock_opname: 'Stok Opname',
    marketplace_order: 'Marketplace',
    tokopedia_order: 'Tokopedia',
    po_claim: 'Klaim PO',
};

// ─── Grouped audit log type ──────────────────────────────────
interface GroupedAuditLog {
    product_id: string | null;
    product_name: string;
    logs: ProductAuditLog[];
    latest_at: string;
    unique_users: string[];
}

// ─── Audit Detail Dialog ───────────────────────────────────────
function AuditDetailDialog({
    group,
    open,
    onClose,
    fieldLabels,
    actionConfig,
    roleLabels,
}: {
    group: GroupedAuditLog | null;
    open: boolean;
    onClose: () => void;
    fieldLabels: Record<string, string>;
    actionConfig: Record<string, { label: string; color: string; icon: React.ElementType }>;
    roleLabels: Record<string, string>;
}) {
    if (!group) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden rounded-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-6 text-white grid gap-4 relative shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <History className="w-32 h-32" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <span className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                <History className="w-6 h-6 text-white" />
                            </span>
                            Riwayat Perubahan Produk
                        </h2>
                        <p className="text-white/80 mt-2 text-sm font-semibold">{group.product_name}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-white/70" />
                            <span className="font-semibold">{group.logs.length} Perubahan</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-white/70" />
                            <span className="font-semibold">
                                {format(parseISO(group.latest_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Log list */}
                <div className="p-6 overflow-y-auto flex-1 space-y-3">
                    {group.logs.map((log) => {
                        const cfg = actionConfig[log.action] || actionConfig.update_field;
                        const Icon = cfg.icon;
                        const label = fieldLabels[log.field_name || ''] || log.field_name || '-';
                        const isImageField = log.field_name === 'image_url';

                        const renderVal = (val: string | null, field: string | null) => {
                            if (!val || val === 'null') return '-';
                            if (field === 'price' || field === 'box_price' || field === 'bulk_price') {
                                const num = parseInt(val);
                                return isNaN(num) ? val : `Rp ${num.toLocaleString('id-ID')}`;
                            }
                            if (field === 'has_multi_unit') return val === 'true' ? 'Aktif' : 'Nonaktif';
                            if (val.length > 60) return val.substring(0, 60) + '…';
                            return val;
                        };

                        return (
                            <div key={log.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${cfg.color}`}>
                                            <Icon className="w-3 h-3" />
                                            {cfg.label}
                                        </span>
                                        {log.action !== 'delete' && (
                                            <span className="text-xs text-muted-foreground font-medium">{label}</span>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{log.user_name}</p>
                                        <p className="text-[10px] text-muted-foreground">{roleLabels[log.user_role] || log.user_role}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {format(parseISO(log.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                                        </p>
                                    </div>
                                </div>
                                {log.action === 'delete' ? (
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">Produk dihapus dari sistem.</p>
                                ) : isImageField ? (
                                    /* ── Foto: tampilkan gambar sebelum → sesudah ── */
                                    <div className="flex items-center gap-5 mt-1">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-red-500">Sebelum</span>
                                            {log.old_value && log.old_value !== 'null' ? (
                                                <img
                                                    src={log.old_value}
                                                    alt="Foto sebelum"
                                                    className="w-24 h-24 object-cover rounded-xl border-2 border-red-200 dark:border-red-800 shadow"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).replaceWith(
                                                            Object.assign(document.createElement('div'), { className: 'w-24 h-24 rounded-xl border-2 border-dashed border-red-200 dark:border-red-800 flex items-center justify-center bg-red-50 text-red-300 text-xs text-center p-2', textContent: 'Gagal muat' })
                                                        );
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-red-200 dark:border-red-800 flex items-center justify-center bg-red-50 dark:bg-red-500/10">
                                                    <Package className="w-8 h-8 text-red-300" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-muted-foreground text-2xl self-center">→</span>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-green-600">Sesudah</span>
                                            {log.new_value && log.new_value !== 'null' ? (
                                                <img
                                                    src={log.new_value}
                                                    alt="Foto sesudah"
                                                    className="w-24 h-24 object-cover rounded-xl border-2 border-green-200 dark:border-green-800 shadow"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).replaceWith(
                                                            Object.assign(document.createElement('div'), { className: 'w-24 h-24 rounded-xl border-2 border-dashed border-green-200 dark:border-green-800 flex items-center justify-center bg-green-50 text-green-300 text-xs text-center p-2', textContent: 'Gagal muat' })
                                                        );
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-green-200 dark:border-green-800 flex items-center justify-center bg-green-50 dark:bg-green-500/10">
                                                    <Package className="w-8 h-8 text-green-300" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 px-2 py-1 rounded-lg text-xs font-mono line-through">
                                            {renderVal(log.old_value, log.field_name)}
                                        </span>
                                        <span className="text-muted-foreground text-sm">→</span>
                                        <span className="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg text-xs font-mono font-semibold">
                                            {renderVal(log.new_value, log.field_name)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="py-4 px-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end shrink-0">
                    <Button variant="outline" className="rounded-xl shadow-sm" onClick={onClose}>Tutup</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Grouped row type ─────────────────────────────────────────
interface GroupedLog {
    id: string; // reference_id or first log id
    reference_id: string | null;
    reference_type: string | null;
    reference_label: string; // e.g. "PO-005"
    type: string;
    location: Location;
    timestamp: string;
    note: string;
    user: StockLog['user'];
    actor_name: string | null;
    logs: StockLog[]; // all logs in this group
    totalQty: number;
}

// ─── Products detail dialog for a grouped entry ───────────────
function GroupDetailDialog({
    group,
    open,
    onClose,
    onViewSingleLog,
}: {
    group: GroupedLog | null;
    open: boolean;
    onClose: () => void;
    onViewSingleLog: (log: StockLog) => void;
}) {
    if (!group) return null;

    const typeInfo = typeLabels[group.type] || typeLabels.adjustment;
    const TypeIcon = typeInfo.icon;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden rounded-2xl max-h-[85vh] flex flex-col">
                {/* Header Section */}
                <div className={cn(
                    "p-6 text-white grid gap-4 relative shrink-0",
                    group.type === 'in' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' :
                        group.type === 'out' ? 'bg-gradient-to-r from-rose-600 to-red-600' :
                            'bg-gradient-to-r from-blue-600 to-indigo-600'
                )}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Package className="w-32 h-32" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <span className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                <TypeIcon className="w-6 h-6 text-white" />
                            </span>
                            Detail Pergerakan Stok
                        </h2>
                        <p className="text-white/80 flex items-center gap-1.5 mt-2 text-sm font-medium font-mono">
                            <FileText className="w-4 h-4" />
                            {group.reference_label}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-2">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 flex items-center gap-2">
                            <TypeIcon className="w-4 h-4 text-white/70" />
                            <span className="font-semibold">{typeInfo.label}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-white/70" />
                            <span className="font-semibold uppercase">{locationLabels[group.location] || group.location}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-white/70" />
                            <span className="font-semibold">
                                {format(parseISO(group.timestamp), 'dd MMM yyyy, HH:mm', { locale: id })}
                            </span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 flex items-center gap-2 ml-auto">
                            <Package className="w-4 h-4 text-white/70" />
                            <span className="font-bold">{group.logs.length} Produk</span>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 dark:bg-slate-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    <th className="text-left px-4 py-3.5 font-semibold">Produk</th>
                                    <th className="text-center px-4 py-3.5 font-semibold">Qty</th>
                                    <th className="text-left px-4 py-3.5 font-semibold">Catatan</th>
                                    <th className="px-4 py-3.5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {group.logs.map((log, idx) => {
                                    const isMultiUnit = log.product?.has_multi_unit && log.product?.pcs_per_box;
                                    let displayQty = Math.abs(log.quantity).toString();
                                    if (isMultiUnit && log.product) {
                                        const pcsPerBox = log.product.pcs_per_box!;
                                        const mainUnit = (log.product.main_unit || 'box').toUpperCase();
                                        const subUnit = (log.product.sell_unit || 'pcs').toUpperCase();
                                        const qtyAbs = Math.abs(log.quantity);
                                        const mainCount = Math.floor(qtyAbs / pcsPerBox);
                                        const remainder = parseFloat((qtyAbs % pcsPerBox).toFixed(2));
                                        if (mainCount === 0) displayQty = `${remainder} ${subUnit}`;
                                        else if (remainder === 0) displayQty = `${mainCount} ${mainUnit}`;
                                        else displayQty = `${mainCount} ${mainUnit} ${remainder} ${subUnit}`;
                                } else if (log.product?.sell_unit) {
                                    displayQty = `${Math.abs(log.quantity)} ${log.product.sell_unit.toUpperCase()}`;
                                }

                                return (
                                    <tr key={log.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                        <td className="px-4 py-3.5 min-w-[240px]">
                                            <div className="flex items-center gap-3">
                                                {log.product?.image_url ? (
                                                    <img src={log.product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100 dark:border-gray-700" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                        <Package className="w-5 h-5 text-indigo-500" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">{log.product?.name || 'Unknown'}</p>
                                                    <p className="text-[11px] font-mono text-gray-500 mt-0.5">{log.product?.barcode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {(() => {
                                                const isPositive = log.type === 'in' || (log.type === 'adjustment' && log.quantity > 0);
                                                const isNegative = log.type === 'out' || (log.type === 'adjustment' && log.quantity < 0);
                                                
                                                const bgColor = isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                                                                isNegative ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' : 
                                                                             'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
                                                
                                                const sign = isPositive ? '+' : isNegative ? '-' : '';
                                                
                                                return (
                                                    <span className={cn("inline-flex whitespace-nowrap font-bold px-2.5 py-1 rounded-lg text-sm", bgColor)}>
                                                        {sign}{displayQty}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400 italic">
                                            {log.note || '—'}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                                                onClick={() => {
                                                    onClose();
                                                    onViewSingleLog(log);
                                                }}
                                                title="Lihat detail lengkap"
                                            >
                                                <Eye className="w-4 h-4 text-slate-500" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                </div>

                <div className="py-4 px-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end shrink-0">
                    <Button variant="outline" className="rounded-xl shadow-sm" onClick={onClose}>Tutup Detail</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function StockHistory() {
    const products = useDataStore(s => s.products);
    const { data: fullStockLogs, isLoading: isLogsLoading } = useStockLogs(products);
    const stockLogs = fullStockLogs || [];

    const loading = useDataStore(s => s.loading) || isLogsLoading;

    const [selectedLog, setSelectedLog] = useState<StockLog | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [groupDetailOpen, setGroupDetailOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<GroupedLog | null>(null);

    // Audit detail dialog
    const [auditDetailOpen, setAuditDetailOpen] = useState(false);
    const [selectedAuditGroup, setSelectedAuditGroup] = useState<GroupedAuditLog | null>(null);

    // View mode: 'grouped' (per PO/ref) or 'flat' (per product)
    const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

    // Role check — audit tab only visible for main_office
    const role = useRole();
    const showAuditTab = role === 'main_office';

    // Audit logs
    const { data: auditLogsData, isLoading: isAuditLoading } = useProductAuditLogs();
    const auditLogs = auditLogsData || [];

    // ─── Group audit logs by product ────────────────────────────
    const groupedAuditLogs = useMemo<GroupedAuditLog[]>(() => {
        const map = new Map<string, GroupedAuditLog>();
        auditLogs.forEach(log => {
            const key = log.product_id || log.product_name;
            if (map.has(key)) {
                const g = map.get(key)!;
                g.logs.push(log);
                if (log.created_at > g.latest_at) g.latest_at = log.created_at;
                if (!g.unique_users.includes(log.user_name)) g.unique_users.push(log.user_name);
            } else {
                map.set(key, {
                    product_id: log.product_id,
                    product_name: log.product_name,
                    logs: [log],
                    latest_at: log.created_at,
                    unique_users: [log.user_name],
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => b.latest_at.localeCompare(a.latest_at));
    }, [auditLogs]);

    // ─── Audit log field labels ─────────────────────────────────
    const fieldLabels: Record<string, string> = {
        name: 'Nama Produk',
        barcode: 'Barcode',
        price: 'Harga Jual',
        image_url: 'Foto Produk',
        sell_unit: 'Sub-Unit',
        has_multi_unit: 'Multi-Unit',
        main_unit: 'Unit Besar',
        pcs_per_box: 'Isi per Unit Besar',
        box_price: 'Harga per Unit Besar',
        bulk_quantity: 'Minimal Grosir',
        bulk_price: 'Harga Grosir',
        stock_gudang: 'Stok Gudang',
        stock_toko: 'Stok Toko',
    };

    const actionConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
        update_field: { label: 'Edit', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300', icon: Pencil },
        update_stock: { label: 'Edit Stok', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: ArrowRightLeft },
        delete: { label: 'Hapus', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: Trash2 },
    };

    const roleLabels: Record<string, string> = {
        admin: 'Admin',
        warehouse: 'Gudang',
        cashier: 'Kasir',
        main_office: 'Kantor Pusat',
        auditor: 'Auditor',
    };

    // ─── Grouped Audit log columns ──────────────────────────────
    const auditColumns: Column<GroupedAuditLog>[] = [
        {
            header: 'Terakhir Diubah',
            accessorKey: 'latest_at' as any,
            cell: (g) => (
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                        <p className="font-medium">{format(parseISO(g.latest_at), 'dd MMM yyyy', { locale: id })}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(g.latest_at), 'HH:mm', { locale: id })}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Produk',
            accessorKey: 'product_name' as any,
            cell: (g) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="font-semibold">{g.product_name}</span>
                </div>
            )
        },
        {
            header: 'Jumlah Perubahan',
            filterable: false,
            cell: (g) => (
                <Badge variant="secondary" className="gap-1">
                    <History className="w-3 h-3" />
                    {g.logs.length} perubahan
                </Badge>
            )
        },
        {
            header: 'Diubah Oleh',
            filterable: false,
            cell: (g) => (
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{g.unique_users.join(', ')}</span>
                </div>
            )
        },
        {
            header: 'Detail',
            filterable: false,
            cell: (g) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); setSelectedAuditGroup(g); setAuditDetailOpen(true); }}
                >
                    <Eye className="w-3.5 h-3.5" />
                    Lihat Detail
                </Button>
            )
        },
    ];

    // Stats
    const stats = useMemo(() => {
        const totalIn = stockLogs.filter(l => l.type === 'in').reduce((sum, l) => sum + l.quantity, 0);
        const totalOut = stockLogs.filter(l => l.type === 'out').reduce((sum, l) => sum + l.quantity, 0);
        const totalAdjustment = stockLogs.filter(l => l.type === 'adjustment').length;
        return { totalIn, totalOut, totalAdjustment, total: stockLogs.length };
    }, [stockLogs]);

    // Group logs by reference_id, or by extracted PO/OP number from note, or individual id
    const groupedLogs = useMemo<GroupedLog[]>(() => {
        const groups = new Map<string, GroupedLog>();

        stockLogs.forEach(log => {
            // Extract reference labels from note to use as group key when reference_id is missing
            const poMatch = log.note?.match(/PO-[\w\d-]+/i);
            const opMatch = log.note?.match(/OP-[\w\d-]+/i);
            const invMatch = log.note?.match(/INV\/[\w\d/-]+/i);
            const sjMatch = log.note?.match(/SJ\/[\w\d/-]+/i) || log.note?.match(/SJ-[\w\d-]+/i);
            const retMatch = log.note?.match(/RET\/[\w\d/-]+/i) || log.note?.match(/RET-[\w\d-]+/i);
            
            const extractedRef = poMatch?.[0] || opMatch?.[0] || sjMatch?.[0] || retMatch?.[0] || invMatch?.[0] || null;

            // Priority: reference_id > extracted note label > individual log.id
            const groupKey = log.reference_id || extractedRef || log.id;

            // Determine display label
            let refLabel = extractedRef || log.reference_type || 'Transaksi';
            if (log.reference_type && referenceTypeLabels[log.reference_type] && !extractedRef) {
                refLabel = referenceTypeLabels[log.reference_type];
            }

            if (groups.has(groupKey)) {
                const g = groups.get(groupKey)!;
                g.logs.push(log);
                g.totalQty += log.quantity;
                // Use earliest timestamp
                if (log.timestamp < g.timestamp) g.timestamp = log.timestamp;
            } else {
                groups.set(groupKey, {
                    id: groupKey,
                    reference_id: log.reference_id || null,
                    reference_type: log.reference_type || null,
                    reference_label: refLabel,
                    type: log.type,
                    location: log.location,
                    timestamp: log.timestamp,
                    note: log.note || '',
                    user: log.user,
                    actor_name: log.actor_name || null,
                    logs: [log],
                    totalQty: log.quantity,
                });
            }
        });

        // Sort by timestamp descending
        return Array.from(groups.values()).sort((a, b) =>
            b.timestamp.localeCompare(a.timestamp)
        );
    }, [stockLogs]);

    // Generate hierarchical time filter options (Month -> Days) based on startsWith matching
    const timeFilterOptions = useMemo(() => {
        const groups = new Map<string, Set<string>>(); // "YYYY-MM" -> Set of "YYYY-MM-DD"
        
        stockLogs.forEach(log => {
            if (!log.timestamp) return;
            const prefixMonth = log.timestamp.substring(0, 7); // "YYYY-MM"
            const prefixDay = log.timestamp.substring(0, 10);  // "YYYY-MM-DD"
            
            if (!groups.has(prefixMonth)) {
                groups.set(prefixMonth, new Set());
            }
            groups.get(prefixMonth)!.add(prefixDay);
        });

        return Array.from(groups.entries())
            .sort((a, b) => b[0].localeCompare(a[0])) // sort months descending
            .map(([monthPrefix, daysSet]) => {
                const monthDate = parseISO(`${monthPrefix}-01`);
                return {
                    label: format(monthDate, 'MMMM yyyy', { locale: id }),
                    value: monthPrefix, // will match all timestamps starting with this
                    children: Array.from(daysSet)
                        .sort((a, b) => b.localeCompare(a)) // sort days descending
                        .map(dayPrefix => ({
                            label: format(parseISO(dayPrefix), 'dd MMM yyyy', { locale: id }),
                            value: dayPrefix // matches specific day
                        }))
                };
            });
    }, [stockLogs]);

    const handleViewDetail = (log: StockLog) => {
        setSelectedLog(log);
        setDetailDialogOpen(true);
    };

    // ─── FLAT columns (per-product, existing behavior) ─────────
    const flatColumns: Column<StockLog>[] = [
        {
            header: 'Waktu',
            accessorKey: 'timestamp',
            filterable: true,
            filterOptions: timeFilterOptions,
            cell: (log) => (
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                        <p className="font-medium">{format(parseISO(log.timestamp), 'dd MMM yyyy', { locale: id })}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(log.timestamp), 'HH:mm', { locale: id })}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Produk',
            cell: (log) => (
                <div className="flex items-center gap-3">
                    {log.product?.image_url ? (
                        <img src={log.product.image_url} alt={log.product.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                    )}
                    <div>
                        <p className="font-medium">{log.product?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{log.product?.barcode}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Tipe',
            accessorKey: 'type',
            filterable: true,
            filterOptions: [
                { label: 'Masuk', value: 'in' },
                { label: 'Keluar', value: 'out' },
                { label: 'Penyesuaian', value: 'adjustment' },
            ],
            cell: (log) => {
                const typeInfo = typeLabels[log.type] || typeLabels.adjustment;
                const TypeIcon = typeInfo.icon;
                return (
                    <Badge className={typeInfo.color}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {typeInfo.label}
                    </Badge>
                );
            }
        },
        {
            header: 'Qty',
            accessorKey: 'quantity',
            cell: (log) => {
                const isMultiUnit = log.product?.has_multi_unit && log.product?.pcs_per_box;
                let displayQty = Math.abs(log.quantity).toString();
                if (isMultiUnit && log.product) {
                    const pcsPerBox = log.product.pcs_per_box!;
                    const mainUnit = (log.product.main_unit || 'box').toUpperCase();
                    const subUnit = (log.product.sell_unit || 'pcs').toUpperCase();
                    const qtyAbs = Math.abs(log.quantity);
                    const mainCount = Math.floor(qtyAbs / pcsPerBox);
                    const remainder = parseFloat((qtyAbs % pcsPerBox).toFixed(2));
                    if (mainCount === 0) displayQty = `${remainder} ${subUnit}`;
                    else if (remainder === 0) displayQty = `${mainCount} ${mainUnit}`;
                    else displayQty = `${mainCount} ${mainUnit} ${remainder} ${subUnit}`;
                } else if (log.product?.sell_unit) {
                    displayQty = `${Math.abs(log.quantity)} ${log.product.sell_unit.toUpperCase()}`;
                }
                const isPositive = log.type === 'in' || (log.type === 'adjustment' && log.quantity > 0);
                const isNegative = log.type === 'out' || (log.type === 'adjustment' && log.quantity < 0);
                const colorClass = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600';
                const sign = isPositive ? '+' : isNegative ? '-' : '';
                return (
                    <span className={cn("font-bold", colorClass)}>
                        {sign}{displayQty}
                    </span>
                );
            }
        },
        {
            header: 'Lokasi',
            accessorKey: 'location',
            filterable: true,
            filterOptions: [
                { label: 'Gudang', value: 'gudang' },
                { label: 'Toko', value: 'toko' },
                { label: 'Lainnya', value: 'lainnya' },
            ],
            cell: (log) => <Badge variant="outline">{locationLabels[log.location] || log.location}</Badge>
        },
        {
            header: 'User / Aktor',
            cell: (log) => log.user ? (
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={log.user.avatar || ''} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {log.user.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate max-w-[130px] font-medium">{log.user.name}</span>
                </div>
            ) : log.actor_name ? (
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm truncate max-w-[130px]">{log.actor_name}</span>
                </div>
            ) : <span className="text-muted-foreground text-sm">-</span>
        },
        {
            header: 'Catatan',
            accessorKey: 'note',
            cell: (log) => <span className="text-muted-foreground text-sm max-w-xs truncate block">{log.note || '-'}</span>
        },
        {
            header: '',
            filterable: false,
            cell: (log) => (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewDetail(log); }}>
                    <Eye className="w-4 h-4" />
                </Button>
            )
        },
    ];

    // ─── GROUPED columns (per reference/PO) ───────────────────
    const groupedColumns: Column<GroupedLog>[] = [
        {
            header: 'Waktu',
            accessorKey: 'timestamp',
            filterable: true,
            filterOptions: timeFilterOptions,
            cell: (g) => (
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                        <p className="font-medium">{format(parseISO(g.timestamp), 'dd MMM yyyy', { locale: id })}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(g.timestamp), 'HH:mm', { locale: id })}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Referensi',
            accessorKey: 'reference_label',
            cell: (g) => (
                <div>
                    <p className="font-bold font-mono text-sm">{g.reference_label}</p>
                    {g.reference_type && (
                        <p className="text-xs text-muted-foreground">{referenceTypeLabels[g.reference_type] || g.reference_type}</p>
                    )}
                </div>
            )
        },
        {
            header: 'Tipe',
            accessorKey: 'type',
            filterable: true,
            filterOptions: [
                { label: 'Masuk', value: 'in' },
                { label: 'Keluar', value: 'out' },
                { label: 'Penyesuaian', value: 'adjustment' },
            ],
            cell: (g) => {
                const typeInfo = typeLabels[g.type] || typeLabels.adjustment;
                const TypeIcon = typeInfo.icon;
                return (
                    <Badge className={typeInfo.color}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {typeInfo.label}
                    </Badge>
                );
            }
        },
        {
            header: 'Jumlah Produk',
            filterable: false,
            cell: (g) => (
                <Badge variant="secondary" className="gap-1">
                    <Package className="w-3 h-3" />
                    {g.logs.length} produk
                </Badge>
            )
        },
        {
            header: 'Lokasi',
            accessorKey: 'location',
            filterable: true,
            filterOptions: [
                { label: 'Gudang', value: 'gudang' },
                { label: 'Toko', value: 'toko' },
                { label: 'Lainnya', value: 'lainnya' },
            ],
            cell: (g) => <Badge variant="outline">{locationLabels[g.location] || g.location}</Badge>
        },
        {
            header: 'User / Aktor',
            cell: (g) => g.user ? (
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={g.user.avatar || ''} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {g.user.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate max-w-[130px] font-medium">{g.user.name}</span>
                </div>
            ) : g.actor_name ? (
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm truncate max-w-[130px]">{g.actor_name}</span>
                </div>
            ) : <span className="text-muted-foreground text-sm">-</span>
        },
        {
            header: 'Aksi',
            filterable: false,
            cell: (g) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); setSelectedGroup(g); setGroupDetailOpen(true); }}
                >
                    <Eye className="w-3.5 h-3.5" />
                    Detail
                </Button>
            )
        },
    ];

    if (loading) {
        return (
            <MainLayout title="History Stok" subtitle="Riwayat pergerakan stok">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout title="History Stok" subtitle="Riwayat pergerakan stok">
            <Tabs defaultValue="stock" className="space-y-6">
                {/* Tab List — only show if audit tab is available */}
                {showAuditTab && (
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="stock" className="gap-1.5">
                            <Activity className="w-4 h-4" />
                            Pergerakan Stok
                        </TabsTrigger>
                        <TabsTrigger value="audit" className="gap-1.5">
                            <History className="w-4 h-4" />
                            Riwayat Edit Produk
                        </TabsTrigger>
                    </TabsList>
                )}

                {/* ─── Tab 1: Stock Movement (existing content) ─── */}
                <TabsContent value="stock" className="space-y-6 mt-0">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Card: Total Transaksi */}
                        <Card className="overflow-hidden relative group hover:shadow-md hover:border-amber-500/30 dark:hover:border-amber-400/30 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <CardContent className="flex items-center gap-5 p-5 relative z-10">
                                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 shadow-sm border border-amber-100 dark:border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                                    <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Transaksi</p>
                                    <p className="text-3xl font-bold tracking-tight">{stats.total.toLocaleString('id-ID')}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card: Total Masuk */}
                        <Card className="overflow-hidden relative group hover:shadow-md hover:border-emerald-500/30 dark:hover:border-emerald-400/30 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <CardContent className="flex items-center gap-5 p-5 relative z-10">
                                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 shadow-sm border border-emerald-100 dark:border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                                    <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Masuk</p>
                                    <p className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">+{stats.totalIn.toLocaleString('id-ID')}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card: Total Keluar */}
                        <Card className="overflow-hidden relative group hover:shadow-md hover:border-rose-500/30 dark:hover:border-rose-400/30 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <CardContent className="flex items-center gap-5 p-5 relative z-10">
                                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 shadow-sm border border-rose-100 dark:border-rose-500/20 group-hover:scale-110 transition-transform duration-300">
                                    <TrendingDown className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Keluar</p>
                                    <p className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">-{stats.totalOut.toLocaleString('id-ID')}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card: Penyesuaian */}
                        <Card className="overflow-hidden relative group hover:shadow-md hover:border-blue-500/30 dark:hover:border-blue-400/30 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <CardContent className="flex items-center gap-5 p-5 relative z-10">
                                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 shadow-sm border border-blue-100 dark:border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                                    <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Penyesuaian</p>
                                    <p className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{stats.totalAdjustment.toLocaleString('id-ID')}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Tampilan:</span>
                        <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                            <button
                                onClick={() => setViewMode('grouped')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                    viewMode === 'grouped' ? "bg-background shadow-sm" : "hover:bg-background/50"
                                )}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                Per Transaksi (PO)
                            </button>
                            <button
                                onClick={() => setViewMode('flat')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                    viewMode === 'flat' ? "bg-background shadow-sm" : "hover:bg-background/50"
                                )}
                            >
                                <List className="w-3.5 h-3.5" />
                                Per Produk
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    {viewMode === 'grouped' ? (
                        <BeautifulTable<GroupedLog>
                            data={groupedLogs}
                            columns={groupedColumns}
                            title="Riwayat Pergerakan Stok"
                            subtitle="Dikelompokkan per transaksi/PO — klik Detail untuk melihat produk di dalamnya"
                            isLoading={loading}
                            hideSelection
                            hideExport
                            emptyState={{
                                icon: <Package className="w-7 h-7" />,
                                title: 'Tidak ada data',
                                description: 'Belum ada pergerakan stok yang tercatat.',
                            }}
                            globalFilterFn={(g, query) => {
                                const q = query.toLowerCase();
                                if (
                                    (g.reference_label?.toLowerCase().includes(q) ?? false) ||
                                    (g.actor_name?.toLowerCase().includes(q) ?? false) ||
                                    (g.user?.name?.toLowerCase().includes(q) ?? false) ||
                                    (g.note?.toLowerCase().includes(q) ?? false) ||
                                    g.type.toLowerCase().includes(q) ||
                                    g.location.toLowerCase().includes(q)
                                ) {
                                    return true;
                                }
                                return g.logs.some(log =>
                                    (log.product?.name?.toLowerCase().includes(q) ?? false) ||
                                    (log.product?.barcode?.toLowerCase().includes(q) ?? false) ||
                                    (log.note?.toLowerCase().includes(q) ?? false)
                                );
                            }}
                        />
                    ) : (
                        <BeautifulTable<StockLog>
                            data={stockLogs}
                            columns={flatColumns}
                            title="Riwayat Pergerakan Stok"
                            subtitle="Detail per produk"
                            isLoading={loading}
                            hideSelection
                            exportFilename="stock-history"
                            exportTitle="Riwayat Stok"
                            emptyState={{
                                icon: <Package className="w-7 h-7" />,
                                title: 'Tidak ada data',
                                description: 'Belum ada pergerakan stok yang tercatat.',
                            }}
                            globalFilterFn={(log, query) => {
                                const q = query.toLowerCase();
                                return (
                                    (log.product?.name?.toLowerCase().includes(q) ?? false) ||
                                    (log.product?.barcode?.toLowerCase().includes(q) ?? false) ||
                                    (log.note?.toLowerCase().includes(q) ?? false) ||
                                    (log.actor_name?.toLowerCase().includes(q) ?? false) ||
                                    (log.user?.name?.toLowerCase().includes(q) ?? false) ||
                                    log.type.toLowerCase().includes(q) ||
                                    log.location.toLowerCase().includes(q)
                                );
                            }}
                        />
                    )}
                </TabsContent>

                {/* ─── Tab 2: Product Audit Log (main_office only) ─── */}
                {showAuditTab && (
                    <TabsContent value="audit" className="space-y-6 mt-0">
                        <BeautifulTable<GroupedAuditLog>
                            data={groupedAuditLogs}
                            columns={auditColumns}
                            title="Riwayat Edit Produk"
                            subtitle="Dikelompokkan per produk — klik Lihat Detail untuk melihat semua perubahan"
                            isLoading={isAuditLoading}
                            hideSelection
                            hideExport
                            emptyState={{
                                icon: <History className="w-7 h-7" />,
                                title: 'Belum ada riwayat',
                                description: 'Belum ada perubahan produk yang tercatat. Log akan muncul setelah ada edit produk.',
                            }}
                            globalFilterFn={(g, query) => {
                                const q = query.toLowerCase();
                                return (
                                    g.product_name.toLowerCase().includes(q) ||
                                    g.unique_users.some(u => u.toLowerCase().includes(q)) ||
                                    g.logs.some(l =>
                                        l.action.toLowerCase().includes(q) ||
                                        (l.field_name?.toLowerCase().includes(q) ?? false) ||
                                        (l.old_value?.toLowerCase().includes(q) ?? false) ||
                                        (l.new_value?.toLowerCase().includes(q) ?? false)
                                    )
                                );
                            }}
                        />
                    </TabsContent>
                )}
            </Tabs>

            {/* Group Detail Dialog */}
            <GroupDetailDialog
                group={selectedGroup}
                open={groupDetailOpen}
                onClose={() => { setGroupDetailOpen(false); setSelectedGroup(null); }}
                onViewSingleLog={handleViewDetail}
            />

            {/* Audit Detail Dialog */}
            <AuditDetailDialog
                group={selectedAuditGroup}
                open={auditDetailOpen}
                onClose={() => { setAuditDetailOpen(false); setSelectedAuditGroup(null); }}
                fieldLabels={fieldLabels}
                actionConfig={actionConfig}
                roleLabels={roleLabels}
            />

            {/* Single Log Detail Dialog */}
            <StockLogDetailDialog
                log={selectedLog}
                open={detailDialogOpen}
                onOpenChange={setDetailDialogOpen}
            />
        </MainLayout>
    );
}
