import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { DateInput } from '@/components/common/DatePicker';
import LocationBadge from '@/components/common/LocationBadge';
import { useData } from '@/contexts/DataContext';
import { Product, StockLog } from '@/types';
import { format, parseISO, isToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Package, TrendingUp, TrendingDown, Boxes, Calendar, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function DailyStockReport() {
    const { products, stockLogs, loading } = useData();
    const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));

    // Filter stock logs by date and toko location
    const dailyStockLogs = useMemo(() => {
        return stockLogs.filter(log => {
            const logDate = log.timestamp.slice(0, 10);
            return logDate === selectedDate && log.location === 'toko';
        });
    }, [stockLogs, selectedDate]);

    // Stats calculations
    const stats = useMemo(() => {
        const totalProducts = products.length;
        const totalStockToko = products.reduce((sum, p) => sum + p.stock.toko, 0);
        const stockIn = dailyStockLogs.filter(l => l.type === 'in').reduce((sum, l) => sum + l.quantity, 0);
        const stockOut = dailyStockLogs.filter(l => l.type === 'out').reduce((sum, l) => sum + l.quantity, 0);
        const lowStock = products.filter(p => p.stock.toko < 10).length;

        return { totalProducts, totalStockToko, stockIn, stockOut, lowStock };
    }, [products, dailyStockLogs]);

    // Product columns
    const productColumns: Column<Product>[] = [
        {
            header: 'Produk',
            sortKey: 'name',
            cell: (item) => (
                <div className="flex items-center gap-3">
                    {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-indigo-500" />
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.barcode}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Stok Toko',
            accessorKey: 'stock',
            cell: (item) => (
                <span className={`font-bold text-lg ${item.stock.toko < 10 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {item.stock.toko}
                </span>
            )
        },
        {
            header: 'Stok Gudang',
            cell: (item) => (
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                    {item.stock.gudang}
                </span>
            )
        },
        {
            header: 'Total Stok',
            cell: (item) => (
                <span className="font-medium">
                    {item.stock.toko + item.stock.gudang}
                </span>
            )
        }
    ];

    // Stock movement columns
    const movementColumns: Column<StockLog>[] = [
        {
            header: 'Waktu',
            accessorKey: 'timestamp',
            cell: (item) => (
                <span className="text-sm text-muted-foreground">
                    {format(parseISO(item.timestamp), 'HH:mm', { locale: idLocale })}
                </span>
            )
        },
        {
            header: 'Produk',
            sortKey: 'product.name',
            cell: (item) => (
                <div>
                    <p className="font-medium">{item.product?.name || 'Produk'}</p>
                    <p className="text-xs text-muted-foreground">{item.product?.barcode}</p>
                </div>
            )
        },
        {
            header: 'Tipe',
            accessorKey: 'type',
            cell: (item) => (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${item.type === 'in'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    {item.type === 'in' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                    {item.type === 'in' ? 'Masuk' : 'Keluar'}
                </span>
            )
        },
        {
            header: 'Jumlah',
            accessorKey: 'quantity',
            cell: (item) => (
                <span className={`font-bold ${item.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.type === 'in' ? '+' : '-'}{item.quantity}
                </span>
            )
        },
        {
            header: 'Catatan',
            accessorKey: 'note',
            cell: (item) => (
                <span className="text-sm text-muted-foreground line-clamp-1">{item.note || '-'}</span>
            )
        }
    ];

    if (loading) {
        return (
            <MainLayout title="Laporan Stok Harian" subtitle="Laporan stok toko harian">
                <PageSkeleton variant="dashboard" />
            </MainLayout>
        );
    }

    const isSelectedToday = selectedDate === toISODate(new Date());

    return (
        <MainLayout
            title="Laporan Stok Harian"
            subtitle={`Laporan stok toko - ${format(parseISO(selectedDate), 'EEEE, dd MMMM yyyy', { locale: idLocale })}`}
        >
            <div className="space-y-6">
                {/* Date Filter */}
                <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">Tanggal Laporan:</span>
                    <DateInput
                        value={selectedDate}
                        onChange={setSelectedDate}
                        placeholder="Pilih tanggal"
                        className="w-[200px]"
                    />
                    {isSelectedToday && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold rounded-full">
                            Hari Ini
                        </span>
                    )}
                </div>

                {/* Stats */}
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total Produk"
                        value={stats.totalProducts}
                        icon={<Package className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Total Stok Toko"
                        value={stats.totalStockToko}
                        icon={<Boxes className="w-5 h-5" />}
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Stok Masuk"
                        value={`+${stats.stockIn}`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Stok Keluar"
                        value={`-${stats.stockOut}`}
                        icon={<TrendingDown className="w-5 h-5" />}
                        subtitleType="error"
                    />
                </StatsGrid>

                {/* Low Stock Warning */}
                {stats.lowStock > 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <p className="text-amber-700 dark:text-amber-400 font-medium">
                            ⚠️ {stats.lowStock} produk memiliki stok toko kurang dari 10 unit
                        </p>
                    </div>
                )}

                {/* Tabs */}
                <Tabs defaultValue="stock">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="stock">Stok Saat Ini</TabsTrigger>
                        <TabsTrigger value="movement">Pergerakan Hari Ini</TabsTrigger>
                    </TabsList>

                    <TabsContent value="stock" className="mt-6">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-indigo-500" />
                                    Daftar Stok Produk
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BeautifulTable
                                    data={products}
                                    columns={productColumns}
                                    title=""
                                    hideSelection
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="movement" className="mt-6">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                                    Pergerakan Stok Toko ({format(parseISO(selectedDate), 'dd MMM yyyy', { locale: idLocale })})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {dailyStockLogs.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Boxes className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                        <p>Tidak ada pergerakan stok pada tanggal ini</p>
                                    </div>
                                ) : (
                                    <BeautifulTable
                                        data={dailyStockLogs}
                                        columns={movementColumns}
                                        title=""
                                        hideSelection
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
}
