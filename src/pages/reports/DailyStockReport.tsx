import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { DateInput } from '@/components/common/DatePicker';
import { useDataStore } from '@/store/useDataStore';
import ProductImage from '@/components/common/ProductImage';
import { useStockLogs } from '@/hooks/useStockLogs';
import { useStockAtDate, getStockFromMap } from '@/hooks/useStockAtDate';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Product, StockLog } from '@/types';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    Calendar,
    Package,
    Boxes,
    TrendingUp,
    TrendingDown,
    History,
    AlertCircle,
    ArrowRight,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const toISODate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// ─── Row type for the stock-at-date table ─────────────────────────────────────
interface StockAtDateRow {
    product: Product;
    openingToko: number;
    openingGudang: number;
    inToko: number;
    outToko: number;
    inGudang: number;
    outGudang: number;
    closingToko: number;
    closingGudang: number;
    hasData: boolean; // false = no logs found, using live fallback
}

export default function DailyStockReport() {
    const products = useDataStore(s => s.products);

    const { data: fullStockLogs, isLoading: isLogsLoading } = useStockLogs(products);
    const stockLogs = fullStockLogs || [];

    const loading = useDataStore(s => s.loading) || isLogsLoading;
    const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));

    // ─── 1. Closing stock for every product on selectedDate (end-of-day) ─────
    const { stockMap: closingStockMap, hasHistoricalData } = useStockAtDate(selectedDate, stockLogs, products);

    // ─── 2. Opening stock for every product (start-of-day) ───────────────────
    //  Opening = stock_after of last log BEFORE the day
    const openingStockMap = useMemo(() => {
        const startOfDay = `${selectedDate}T00:00:00`;
        const endOfPrevDay = `${selectedDate}T00:00:00`; // logs strictly before

        // Group logs by productId__location, keep latest before startOfDay
        const map = new Map<string, number>();
        const bestBefore = new Map<string, StockLog>();

        for (const log of stockLogs) {
            if (log.stock_after == null || !log.timestamp) continue;
            if (log.timestamp >= startOfDay) continue; // must be before today

            const key = `${log.product_id}__${log.location}`;
            const existing = bestBefore.get(key);
            if (!existing || log.timestamp > existing.timestamp) {
                bestBefore.set(key, log);
            }
        }

        for (const product of products) {
            for (const loc of ['toko', 'gudang'] as const) {
                const key = `${product.id}__${loc}`;
                const log = bestBefore.get(key);
                map.set(key, log?.stock_after ?? closingStockMap.get(key) ?? product.stock[loc] ?? 0);
            }
        }

        return map;
    }, [selectedDate, stockLogs, products, closingStockMap]);

    // ─── 3. Filter logs for the selected date only ────────────────────────────
    const dailyStockLogs = useMemo(() => {
        return stockLogs.filter(log => {
            if (!log.timestamp) return false;
            const logDate = log.timestamp.slice(0, 10);
            return logDate === selectedDate;
        });
    }, [stockLogs, selectedDate]);

    const dailyTokoLogs = useMemo(
        () => dailyStockLogs.filter(l => l.location === 'toko'),
        [dailyStockLogs],
    );
    const dailyGudangLogs = useMemo(
        () => dailyStockLogs.filter(l => l.location === 'gudang'),
        [dailyStockLogs],
    );

    // ─── 4. Build per-product rows with opening / in / out / closing ─────────
    const stockAtDateRows = useMemo<StockAtDateRow[]>(() => {
        return products.map(product => {
            const tokoKey = `${product.id}__toko`;
            const gudangKey = `${product.id}__gudang`;

            const productLogs = dailyStockLogs.filter(l => l.product_id === product.id);
            const hasData = productLogs.length > 0;

            const productTokoLogs = productLogs.filter(l => l.location === 'toko');
            const productGudangLogs = productLogs.filter(l => l.location === 'gudang');

            const inToko = productTokoLogs
                .filter(l => l.type === 'in' || (l.type === 'adjustment' && l.quantity > 0))
                .reduce((s, l) => s + Math.abs(l.quantity), 0);
            const outToko = productTokoLogs
                .filter(l => l.type === 'out' || (l.type === 'adjustment' && l.quantity < 0))
                .reduce((s, l) => s + Math.abs(l.quantity), 0);
            const inGudang = productGudangLogs
                .filter(l => l.type === 'in' || (l.type === 'adjustment' && l.quantity > 0))
                .reduce((s, l) => s + Math.abs(l.quantity), 0);
            const outGudang = productGudangLogs
                .filter(l => l.type === 'out' || (l.type === 'adjustment' && l.quantity < 0))
                .reduce((s, l) => s + Math.abs(l.quantity), 0);

            return {
                product,
                openingToko: openingStockMap.get(tokoKey) ?? product.stock.toko,
                openingGudang: openingStockMap.get(gudangKey) ?? product.stock.gudang,
                inToko,
                outToko,
                inGudang,
                outGudang,
                closingToko: closingStockMap.get(tokoKey) ?? product.stock.toko,
                closingGudang: closingStockMap.get(gudangKey) ?? product.stock.gudang,
                hasData,
            };
        });
    }, [products, dailyStockLogs, openingStockMap, closingStockMap]);

    // ─── 5. Stats ─────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const totalProducts = products.length;
        const totalStockToko = stockAtDateRows.reduce((s, r) => s + r.closingToko, 0);
        const stockIn = dailyTokoLogs
            .filter(l => l.type === 'in')
            .reduce((s, l) => s + l.quantity, 0);
        const stockOut = dailyTokoLogs
            .filter(l => l.type === 'out')
            .reduce((s, l) => s + l.quantity, 0);
        const lowStock = stockAtDateRows.filter(r => r.closingToko < 10).length;

        return { totalProducts, totalStockToko, stockIn, stockOut, lowStock };
    }, [products, stockAtDateRows, dailyTokoLogs]);

    // ─── 6. Columns ───────────────────────────────────────────────────────────
    const stockAtDateColumns: Column<StockAtDateRow>[] = [
        {
            header: 'Produk',
            sortKey: 'product.name' as any,
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <ProductImage
                        src={row.product.image_url}
                        size="thumb"
                        className="h-10 w-10 rounded-lg"
                        placeholderClassName="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100"
                    />
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white leading-snug">{row.product.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{row.product.barcode}</p>
                    </div>
                </div>
            ),
        },
        {
            header: 'Stok Awal Toko',
            filterable: false,
            cell: (row) => (
                <span className="font-mono font-semibold text-gray-500 dark:text-gray-400">
                    {row.openingToko}
                </span>
            ),
        },
        {
            header: 'Masuk',
            filterable: false,
            cell: (row) => (
                row.inToko > 0
                    ? <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-3.5 h-3.5" /> +{row.inToko}
                    </span>
                    : <span className="text-gray-300 dark:text-gray-600">—</span>
            ),
        },
        {
            header: 'Keluar',
            filterable: false,
            cell: (row) => (
                row.outToko > 0
                    ? <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                        <TrendingDown className="w-3.5 h-3.5" /> -{row.outToko}
                    </span>
                    : <span className="text-gray-300 dark:text-gray-600">—</span>
            ),
        },
        {
            header: 'Stok Akhir Toko',
            filterable: false,
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <span className={cn(
                        'font-bold text-base font-mono',
                        row.closingToko < 10
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400',
                    )}>
                        {row.closingToko}
                    </span>
                    {!row.hasData && (
                        <span title="Tidak ada transaksi pada tanggal ini, menampilkan stok terakhir tercatat">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Stok Gudang',
            filterable: false,
            cell: (row) => (
                <span className="font-mono font-semibold text-gray-600 dark:text-gray-400">
                    {row.closingGudang}
                </span>
            ),
        },
        {
            header: 'Total',
            filterable: false,
            cell: (row) => (
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {row.closingToko + row.closingGudang}
                </span>
            ),
        },
    ];

    const movementColumns: Column<StockLog>[] = [
        {
            header: 'Waktu',
            accessorKey: 'timestamp',
            cell: (item) => (
                <span className="text-sm text-muted-foreground font-mono">
                    {format(parseISO(item.timestamp), 'HH:mm', { locale: idLocale })}
                </span>
            ),
        },
        {
            header: 'Produk',
            sortKey: 'product.name',
            cell: (item) => (
                <div>
                    <p className="font-medium">{item.product?.name || 'Produk'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.product?.barcode}</p>
                </div>
            ),
        },
        {
            header: 'Lokasi',
            accessorKey: 'location',
            cell: (item) => (
                <Badge variant="outline" className="text-xs capitalize">{item.location}</Badge>
            ),
        },
        {
            header: 'Tipe',
            accessorKey: 'type',
            cell: (item) => (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                    item.type === 'in'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : item.type === 'out'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                    {item.type === 'in'
                        ? <><ArrowUpCircle className="w-3 h-3" /> Masuk</>
                        : item.type === 'out'
                        ? <><ArrowDownCircle className="w-3 h-3" /> Keluar</>
                        : 'Penyesuaian'}
                </span>
            ),
        },
        {
            header: 'Jumlah',
            accessorKey: 'quantity',
            cell: (item) => (
                <span className={`font-bold font-mono ${item.type === 'in' ? 'text-green-600' : item.type === 'out' ? 'text-red-600' : 'text-blue-600'}`}>
                    {item.type === 'in' ? '+' : item.type === 'out' ? '-' : '±'}{Math.abs(item.quantity)}
                </span>
            ),
        },
        {
            header: 'Stok Sebelum → Sesudah',
            filterable: false,
            cell: (item) => (
                item.stock_before != null && item.stock_after != null ? (
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="text-gray-500">{item.stock_before}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="font-bold text-gray-700 dark:text-gray-200">{item.stock_after}</span>
                    </div>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                )
            ),
        },
        {
            header: 'Catatan',
            accessorKey: 'note',
            cell: (item) => (
                <span className="text-sm text-muted-foreground line-clamp-1 italic">{item.note || '—'}</span>
            ),
        },
    ];

    if (loading) {
        return (
            <MainLayout title="Laporan Stok Harian" subtitle="Laporan stok harian berdasarkan tanggal">
                <PageSkeleton variant="dashboard" />
            </MainLayout>
        );
    }

    const isSelectedToday = selectedDate === toISODate(new Date());

    return (
        <MainLayout
            title="Laporan Stok Harian"
            subtitle={`Laporan stok per tanggal — ${format(parseISO(selectedDate), 'EEEE, dd MMMM yyyy', { locale: idLocale })}`}
        >
            <div className="space-y-6">
                {/* Date Filter */}
                <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
                    <Calendar className="h-5 w-5 text-indigo-500 shrink-0" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">Tanggal Laporan:</span>
                    <DateInput
                        value={selectedDate}
                        onChange={setSelectedDate}
                        placeholder="Pilih tanggal"
                        className="w-full sm:w-[200px]"
                    />
                    {isSelectedToday ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold rounded-full">
                            Hari Ini
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-semibold rounded-full">
                            <History className="w-3.5 h-3.5" />
                            Data Historis
                        </span>
                    )}
                    {!hasHistoricalData && !isSelectedToday && (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold rounded-full">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Tidak ada log pada tanggal ini
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
                        title={isSelectedToday ? 'Total Stok Toko' : `Total Stok Toko (${format(parseISO(selectedDate), 'dd MMM', { locale: idLocale })})`}
                        value={stats.totalStockToko}
                        icon={<Boxes className="w-5 h-5" />}
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Stok Masuk Toko"
                        value={`+${stats.stockIn}`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Stok Keluar Toko"
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
                            {!isSelectedToday && ` pada tanggal ${format(parseISO(selectedDate), 'dd MMM yyyy', { locale: idLocale })}`}
                        </p>
                    </div>
                )}

                {/* Explanation banner for historical mode */}
                {!isSelectedToday && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-start gap-3">
                        <History className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-indigo-800 dark:text-indigo-300 font-semibold text-sm">Mode Historis Aktif</p>
                            <p className="text-indigo-600 dark:text-indigo-400 text-xs mt-0.5">
                                Stok yang ditampilkan merupakan rekonstruksi dari ledger transaksi
                                (nilai <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded">stock_after</code> dari log terakhir pada tanggal ini).
                                Produk bertanda <AlertCircle className="w-3 h-3 inline text-amber-400" /> tidak memiliki transaksi pada tanggal ini — stok terakhir tercatat ditampilkan sebagai estimasi.
                            </p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <Tabs defaultValue="stock">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="stock">
                            Stok {isSelectedToday ? 'Saat Ini' : 'per Tanggal'}
                        </TabsTrigger>
                        <TabsTrigger value="movement">
                            Pergerakan {isSelectedToday ? 'Hari Ini' : 'Tanggal Ini'}
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Tab 1: Stok per tanggal ── */}
                    <TabsContent value="stock" className="mt-6">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-indigo-500" />
                                    Stok Produk
                                    {isSelectedToday
                                        ? ' — Saat Ini'
                                        : ` — ${format(parseISO(selectedDate), 'dd MMM yyyy', { locale: idLocale })}`}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BeautifulTable
                                    data={stockAtDateRows}
                                    columns={stockAtDateColumns}
                                    title=""
                                    hideSelection
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Tab 2: Pergerakan ── */}
                    <TabsContent value="movement" className="mt-6">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                                    Pergerakan Stok — {format(parseISO(selectedDate), 'dd MMM yyyy', { locale: idLocale })}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {dailyStockLogs.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Boxes className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                        <p className="font-medium">Tidak ada pergerakan stok pada tanggal ini</p>
                                        <p className="text-sm mt-1 opacity-60">
                                            {isSelectedToday
                                                ? 'Belum ada transaksi hari ini.'
                                                : `Tidak ada transaksi yang tercatat pada ${format(parseISO(selectedDate), 'dd MMMM yyyy', { locale: idLocale })}.`}
                                        </p>
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
