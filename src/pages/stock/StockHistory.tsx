import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { useData } from '@/contexts/DataContext';
import { StockLogDetailDialog } from '@/components/stock/StockLogDetailDialog';
import { StockLog, Location } from '@/types';
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
    sale: 'Penjualan',
    adjustment: 'Penyesuaian Manual',
    stock_opname: 'Stok Opname',
};

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
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            group.type === 'in' ? 'bg-green-100 text-green-700' :
                                group.type === 'out' ? 'bg-red-100 text-red-700' :
                                    'bg-blue-100 text-blue-700'
                        )}>
                            <TypeIcon className="w-4 h-4" />
                        </div>
                        Detail Pergerakan — <span className="font-mono">{group.reference_label}</span>
                    </DialogTitle>
                </DialogHeader>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground border-b pb-3">
                    <Badge className={typeInfo.color}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {typeInfo.label}
                    </Badge>
                    <Badge variant="outline" className="uppercase">
                        {locationLabels[group.location] || group.location}
                    </Badge>
                    <span>
                        {format(parseISO(group.timestamp), 'dd MMM yyyy HH:mm', { locale: id })}
                    </span>
                    <span className="ml-auto font-semibold text-foreground">
                        {group.logs.length} Produk
                    </span>
                </div>

                {/* Products table */}
                <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/60 border-b text-xs uppercase tracking-wider text-muted-foreground">
                                <th className="text-left px-4 py-3 font-semibold">Produk</th>
                                <th className="text-center px-3 py-3 font-semibold">Qty</th>
                                <th className="text-left px-3 py-3 font-semibold">Catatan</th>
                                <th className="px-3 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {group.logs.map((log, idx) => {
                                const isMultiUnit = log.product?.has_multi_unit && log.product?.pcs_per_box;
                                let displayQty = log.quantity.toString();
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
                                    <tr key={log.id} className={cn(
                                        "transition-colors hover:bg-muted/30",
                                        idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                                    )}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {log.product?.image_url ? (
                                                    <img src={log.product.image_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                        <Package className="w-4 h-4 text-primary" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium line-clamp-1">{log.product?.name || 'Unknown'}</p>
                                                    <p className="text-[10px] font-mono text-muted-foreground">{log.product?.barcode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <span className={cn(
                                                "font-bold",
                                                log.type === 'in' ? 'text-green-600' :
                                                    log.type === 'out' ? 'text-red-600' : 'text-blue-600'
                                            )}>
                                                {log.type === 'in' ? '+' : log.type === 'out' ? '-' : '±'}{displayQty}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-muted-foreground max-w-[160px] truncate">
                                            {log.note || '—'}
                                        </td>
                                        <td className="px-3 py-3">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => {
                                                    onClose();
                                                    onViewSingleLog(log);
                                                }}
                                                title="Lihat detail lengkap"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function StockHistory() {
    const { stockLogs, loading } = useData();

    const [selectedLog, setSelectedLog] = useState<StockLog | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [groupDetailOpen, setGroupDetailOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<GroupedLog | null>(null);

    // View mode: 'grouped' (per PO/ref) or 'flat' (per product)
    const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

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
            // Extract PO/OP label from note to use as group key when reference_id is missing
            const poMatch = log.note?.match(/PO-[\w\d-]+/i);
            const opMatch = log.note?.match(/OP-[\w\d-]+/i);
            const extractedRef = poMatch?.[0] || opMatch?.[0] || null;

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
                let displayQty = log.quantity.toString();
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
                    <span className={cn("font-bold", log.type === 'in' ? 'text-green-600' : log.type === 'out' ? 'text-red-600' : 'text-blue-600')}>
                        {log.type === 'in' ? '+' : log.type === 'out' ? '-' : '±'}{displayQty}
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
            cell: (log) => log.actor_name ? (
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm truncate max-w-[130px] font-medium">{log.actor_name}</span>
                </div>
            ) : log.user ? (
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={log.user.avatar || ''} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {log.user.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate max-w-[130px]">{log.user.name}</span>
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
            cell: (g) => g.actor_name ? (
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm truncate max-w-[130px] font-medium">{g.actor_name}</span>
                </div>
            ) : g.user ? (
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={g.user.avatar || ''} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {g.user.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate max-w-[130px]">{g.user.name}</span>
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
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="overflow-hidden">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="p-3 rounded-xl bg-primary/10">
                                <Activity className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Masuk</p>
                                <p className="text-2xl font-bold text-green-600">+{stats.totalIn}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                                <TrendingDown className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Keluar</p>
                                <p className="text-2xl font-bold text-red-600">-{stats.totalOut}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                <RefreshCw className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Penyesuaian</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.totalAdjustment}</p>
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
                            // First check top-level group fields
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
                            
                            // Then check if any log in this group matches the product name/barcode
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
            </div>

            {/* Group Detail Dialog */}
            <GroupDetailDialog
                group={selectedGroup}
                open={groupDetailOpen}
                onClose={() => { setGroupDetailOpen(false); setSelectedGroup(null); }}
                onViewSingleLog={handleViewDetail}
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
