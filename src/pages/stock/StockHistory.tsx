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
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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

export default function StockHistory() {
    // Use stockLogs from DataContext for consistency with StockMovementTab and realtime updates
    const { stockLogs, loading } = useData();

    // Detail dialog state
    const [selectedLog, setSelectedLog] = useState<StockLog | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    // Stats
    const stats = useMemo(() => {
        const totalIn = stockLogs.filter(l => l.type === 'in').reduce((sum, l) => sum + l.quantity, 0);
        const totalOut = stockLogs.filter(l => l.type === 'out').reduce((sum, l) => sum + l.quantity, 0);
        const totalAdjustment = stockLogs.filter(l => l.type === 'adjustment').length;
        return { totalIn, totalOut, totalAdjustment, total: stockLogs.length };
    }, [stockLogs]);

    const handleViewDetail = (log: StockLog) => {
        setSelectedLog(log);
        setDetailDialogOpen(true);
    };

    // Define columns for BeautifulTable
    const columns: Column<StockLog>[] = [
        {
            header: 'Waktu',
            accessorKey: 'timestamp',
            cell: (log: StockLog) => (
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                        <p className="font-medium">
                            {format(parseISO(log.timestamp), 'dd MMM yyyy', { locale: id })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {format(parseISO(log.timestamp), 'HH:mm', { locale: id })}
                        </p>
                    </div>
                </div>
            )
        },
        {
            header: 'Produk',
            sortKey: 'product.name',
            cell: (log: StockLog) => (
                <div className="flex items-center gap-3">
                    {log.product?.image_url ? (
                        <img
                            src={log.product.image_url}
                            alt={log.product.name}
                            className="w-10 h-10 rounded-lg object-cover"
                        />
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
            cell: (log: StockLog) => {
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
            cell: (log: StockLog) => {
                const isMultiUnit = log.product?.has_multi_unit && log.product?.pcs_per_box;
                let displayQty = log.quantity.toString();
                
                if (isMultiUnit && log.product) {
                    const pcsPerBox = log.product.pcs_per_box!;
                    const mainUnit = (log.product.main_unit || 'box').toUpperCase();
                    const subUnit = (log.product.sell_unit || 'pcs').toUpperCase();
                    
                    const qtyAbs = Math.abs(log.quantity);
                    const mainCount = Math.floor(qtyAbs / pcsPerBox);
                    const remainder = parseFloat((qtyAbs % pcsPerBox).toFixed(2));
                    
                    if (mainCount === 0) {
                        displayQty = `${remainder} ${subUnit}`;
                    } else if (remainder === 0) {
                        displayQty = `${mainCount} ${mainUnit}`;
                    } else {
                        displayQty = `${mainCount} ${mainUnit} ${remainder} ${subUnit}`;
                    }
                } else if (log.product && log.product.sell_unit) {
                    displayQty = `${Math.abs(log.quantity)} ${log.product.sell_unit.toUpperCase()}`;
                }

                return (
                    <span className={cn(
                        "font-bold",
                        log.type === 'in' ? 'text-green-600' :
                            log.type === 'out' ? 'text-red-600' :
                                'text-blue-600'
                    )}>
                        {log.type === 'in' ? '+' : log.type === 'out' ? '-' : '±'}
                        {displayQty}
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
            cell: (log: StockLog) => (
                <Badge variant="outline">
                    {locationLabels[log.location] || log.location}
                </Badge>
            )
        },
        {
            header: 'User',
            cell: (log: StockLog) => log.user ? (
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={log.user.avatar || ''} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {log.user.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate max-w-[100px]">
                        {log.user.name}
                    </span>
                </div>
            ) : (
                <span className="text-muted-foreground text-sm">-</span>
            )
        },
        {
            header: 'Catatan',
            accessorKey: 'note',
            cell: (log: StockLog) => (
                <span className="text-muted-foreground text-sm max-w-xs truncate block">
                    {log.note || '-'}
                </span>
            )
        },
        {
            header: '',
            cell: (log: StockLog) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetail(log);
                    }}
                >
                    <Eye className="w-4 h-4" />
                </Button>
            )
        }
    ];

    // Show skeleton while loading
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

                {/* Table using BeautifulTable */}
                <BeautifulTable
                    data={stockLogs}
                    columns={columns}
                    title="Riwayat Pergerakan Stok"
                    isLoading={loading}
                    hideSelection
                    exportFilename="stock-history"
                    exportTitle="Riwayat Stok"
                    emptyState={{
                        icon: <Package className="w-7 h-7" />,
                        title: 'Tidak ada data',
                        description: 'Belum ada pergerakan stok yang tercatat.',
                    }}
                />
            </div>

            {/* Detail Dialog */}
            <StockLogDetailDialog
                log={selectedLog}
                open={detailDialogOpen}
                onOpenChange={setDetailDialogOpen}
            />
        </MainLayout>
    );
}
