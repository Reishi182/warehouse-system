import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateInput } from '@/components/common/DatePicker';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleItem } from '@/types';
import {
    DollarSign,
    ShoppingCart,
    TrendingUp,
    CreditCard,
    Banknote,
    Package,
    Clock,
    User,
    Calendar,
    BarChart3,
    RefreshCw,
    FileDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import {
    format,
    parseISO,
    startOfDay,
    endOfDay,
    isWithinInterval,
    subDays
} from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/format';

interface DailySalesData {
    date: string;
    totalSales: number;
    totalTransactions: number;
    totalItems: number;
    cashSales: number;
    transferSales: number;
    averageTransaction: number;
    topProducts: { name: string; quantity: number; revenue: number }[];
    hourlyDistribution: { hour: number; count: number; amount: number }[];
    cashierPerformance: { name: string; transactions: number; amount: number }[];
}

// Fetch sales for a specific date
async function fetchSalesForDate(date: Date): Promise<Sale[]> {
    const startDate = startOfDay(date).toISOString();
    const endDate = endOfDay(date).toISOString();

    const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

    if (salesError) throw salesError;

    // Fetch items for these sales
    const saleIds = (sales || []).map(s => s.id);

    let saleItems: SaleItem[] = [];
    if (saleIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
            .from('sale_items')
            .select('*')
            .in('sale_id', saleIds);

        if (itemsError) throw itemsError;

        saleItems = (items || []).map(item => ({
            id: item.id,
            sale_id: item.sale_id,
            product_id: item.product_id,
            product_name: item.product_name,
            barcode: item.barcode,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            discount: 0,
        }));
    }

    return (sales || []).map(row => ({
        id: row.id,
        sale_number: row.sale_number,
        cashier_id: row.cashier_id,
        cashier_name: row.cashier_name,
        payment_method: row.payment_method as 'cash' | 'transfer',
        stock_location: row.stock_location as 'gudang' | 'toko',
        total_amount: row.total_amount,
        order_discount: 0,
        amount_paid: row.total_amount,
        change_amount: 0,
        created_at: row.created_at,
        items: saleItems.filter(item => item.sale_id === row.id),
    }));
}

// Calculate daily stats
function calculateDailyStats(sales: Sale[], date: Date): DailySalesData {
    const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalTransactions = sales.length;
    const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
    const cashSales = sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0);
    const transferSales = sales.filter(s => s.payment_method === 'transfer').reduce((sum, s) => sum + s.total_amount, 0);
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Top products
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    sales.forEach(sale => {
        sale.items.forEach(item => {
            const key = item.product_name;
            const existing = productMap.get(key) || { name: item.product_name, quantity: 0, revenue: 0 };
            existing.quantity += item.quantity;
            existing.revenue += item.subtotal;
            productMap.set(key, existing);
        });
    });
    const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    // Hourly distribution
    const hourlyMap = new Map<number, { count: number; amount: number }>();
    for (let h = 0; h < 24; h++) {
        hourlyMap.set(h, { count: 0, amount: 0 });
    }
    sales.forEach(sale => {
        const hour = parseISO(sale.created_at).getHours();
        const existing = hourlyMap.get(hour)!;
        existing.count += 1;
        existing.amount += sale.total_amount;
    });
    const hourlyDistribution = Array.from(hourlyMap.entries())
        .map(([hour, data]) => ({ hour, ...data }));

    // Cashier performance
    const cashierMap = new Map<string, { name: string; transactions: number; amount: number }>();
    sales.forEach(sale => {
        const key = sale.cashier_name || 'Unknown';
        const existing = cashierMap.get(key) || { name: key, transactions: 0, amount: 0 };
        existing.transactions += 1;
        existing.amount += sale.total_amount;
        cashierMap.set(key, existing);
    });
    const cashierPerformance = Array.from(cashierMap.values())
        .sort((a, b) => b.amount - a.amount);

    return {
        date: format(date, 'yyyy-MM-dd'),
        totalSales,
        totalTransactions,
        totalItems,
        cashSales,
        transferSales,
        averageTransaction,
        topProducts,
        hourlyDistribution,
        cashierPerformance,
    };
}

// Fetch comparison data (yesterday)
async function fetchComparisonData(date: Date): Promise<DailySalesData | null> {
    const yesterday = subDays(date, 1);
    try {
        const sales = await fetchSalesForDate(yesterday);
        return calculateDailyStats(sales, yesterday);
    } catch {
        return null;
    }
}

export default function DailySalesReport() {
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const parsedDate = selectedDate ? parseISO(selectedDate) : new Date();

    // Fetch sales for selected date
    const { data: sales = [], isLoading, refetch } = useQuery({
        queryKey: ['daily-sales', selectedDate],
        queryFn: () => fetchSalesForDate(parsedDate),
    });

    // Fetch yesterday's data for comparison
    const { data: yesterdayData } = useQuery({
        queryKey: ['daily-sales-comparison', selectedDate],
        queryFn: () => fetchComparisonData(parsedDate),
    });

    const stats = useMemo(() => calculateDailyStats(sales, parsedDate), [sales, parsedDate]);

    // Calculate percentage changes
    const changes = useMemo(() => {
        if (!yesterdayData) return { sales: null, transactions: null, average: null };
        const salesChange = yesterdayData.totalSales > 0
            ? ((stats.totalSales - yesterdayData.totalSales) / yesterdayData.totalSales) * 100
            : null;
        const transactionsChange = yesterdayData.totalTransactions > 0
            ? ((stats.totalTransactions - yesterdayData.totalTransactions) / yesterdayData.totalTransactions) * 100
            : null;
        const averageChange = yesterdayData.averageTransaction > 0
            ? ((stats.averageTransaction - yesterdayData.averageTransaction) / yesterdayData.averageTransaction) * 100
            : null;
        return { sales: salesChange, transactions: transactionsChange, average: averageChange };
    }, [stats, yesterdayData]);

    // Product columns for BeautifulTable
    const productColumns: Column<(typeof stats.topProducts)[0] & { id: string }>[] = [
        {
            header: 'Produk',
            accessorKey: 'name',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">{row.name}</span>
                </div>
            ),
        },
        {
            header: 'Qty Terjual',
            accessorKey: 'quantity',
            cell: (row) => (
                <Badge variant="secondary" className="font-mono">
                    {row.quantity} unit
                </Badge>
            ),
        },
        {
            header: 'Pendapatan',
            accessorKey: 'revenue',
            cell: (row) => (
                <span className="font-bold text-green-600">
                    {formatRupiah(row.revenue)}
                </span>
            ),
        },
    ];

    // Peak hours
    const peakHour = useMemo(() => {
        const max = stats.hourlyDistribution.reduce((prev, curr) =>
            curr.amount > prev.amount ? curr : prev
        );
        return max.count > 0 ? max : null;
    }, [stats.hourlyDistribution]);

    return (
        <MainLayout title="Laporan Penjualan Harian" subtitle="Analisis penjualan per hari">
            <div className="space-y-6">
                {/* Date Selector & Actions */}
                <Card>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <DateInput
                                value={selectedDate}
                                onChange={(val) => setSelectedDate(val)}
                                className="w-[200px]"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                            >
                                <Clock className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => refetch()}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="relative overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Penjualan</p>
                                    <p className="text-3xl font-bold mt-1">
                                        {formatRupiah(stats.totalSales)}
                                    </p>
                                    {changes.sales !== null && (
                                        <div className={cn(
                                            "flex items-center gap-1 mt-2 text-sm",
                                            changes.sales >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {changes.sales >= 0 ? (
                                                <ArrowUp className="w-4 h-4" />
                                            ) : (
                                                <ArrowDown className="w-4 h-4" />
                                            )}
                                            {Math.abs(changes.sales).toFixed(1)}% vs kemarin
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
                    </Card>

                    <Card className="relative overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Transaksi</p>
                                    <p className="text-3xl font-bold mt-1">{stats.totalTransactions}</p>
                                    {changes.transactions !== null && (
                                        <div className={cn(
                                            "flex items-center gap-1 mt-2 text-sm",
                                            changes.transactions >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {changes.transactions >= 0 ? (
                                                <ArrowUp className="w-4 h-4" />
                                            ) : (
                                                <ArrowDown className="w-4 h-4" />
                                            )}
                                            {Math.abs(changes.transactions).toFixed(1)}% vs kemarin
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                    </Card>

                    <Card className="relative overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Rata-rata Transaksi</p>
                                    <p className="text-3xl font-bold mt-1">
                                        {formatRupiah(stats.averageTransaction)}
                                    </p>
                                    {changes.average !== null && (
                                        <div className={cn(
                                            "flex items-center gap-1 mt-2 text-sm",
                                            changes.average >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {changes.average >= 0 ? (
                                                <ArrowUp className="w-4 h-4" />
                                            ) : (
                                                <ArrowDown className="w-4 h-4" />
                                            )}
                                            {Math.abs(changes.average).toFixed(1)}% vs kemarin
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                                    <TrendingUp className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                    </Card>

                    <Card className="relative overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Item Terjual</p>
                                    <p className="text-3xl font-bold mt-1">{stats.totalItems}</p>
                                    {peakHour && (
                                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                                            <Clock className="w-4 h-4" />
                                            Peak: {peakHour.hour}:00 ({peakHour.count} transaksi)
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                                    <Package className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
                    </Card>
                </div>

                {/* Payment Methods & Peak Hours */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Payment Methods */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Metode Pembayaran
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 rounded-lg bg-green-500 text-white">
                                            <Banknote className="w-5 h-5" />
                                        </div>
                                        <span className="font-semibold">Cash</span>
                                    </div>
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatRupiah(stats.cashSales)}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {stats.totalSales > 0
                                            ? ((stats.cashSales / stats.totalSales) * 100).toFixed(1)
                                            : 0}% dari total
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 rounded-lg bg-blue-500 text-white">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <span className="font-semibold">Transfer</span>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {formatRupiah(stats.transferSales)}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {stats.totalSales > 0
                                            ? ((stats.transferSales / stats.totalSales) * 100).toFixed(1)
                                            : 0}% dari total
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Hourly Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Distribusi Per Jam
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between h-32 gap-1">
                                {stats.hourlyDistribution.slice(7, 22).map((item) => {
                                    const maxCount = Math.max(...stats.hourlyDistribution.map(h => h.count));
                                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                                    const isPeak = peakHour?.hour === item.hour;

                                    return (
                                        <div
                                            key={item.hour}
                                            className="flex-1 flex flex-col items-center group"
                                        >
                                            <div
                                                className={cn(
                                                    "w-full rounded-t transition-all",
                                                    isPeak
                                                        ? "bg-gradient-to-t from-primary to-primary/60"
                                                        : "bg-primary/20 group-hover:bg-primary/40",
                                                    height === 0 && "bg-muted"
                                                )}
                                                style={{ height: `${Math.max(height, 4)}%` }}
                                                title={`${item.hour}:00 - ${item.count} transaksi (${formatRupiah(item.amount)})`}
                                            />
                                            <span className="text-[10px] text-muted-foreground mt-1">
                                                {item.hour}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                Jam operasional (07:00 - 21:00)
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Cashier Performance */}
                {stats.cashierPerformance.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Performa Kasir
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stats.cashierPerformance.map((cashier, index) => (
                                    <div
                                        key={cashier.name}
                                        className={cn(
                                            "p-4 rounded-xl border transition-all",
                                            index === 0
                                                ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800"
                                                : "bg-muted/30 hover:bg-muted/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                                                index === 0 ? "bg-gradient-to-br from-amber-500 to-orange-500" :
                                                    index === 1 ? "bg-gradient-to-br from-gray-400 to-gray-500" :
                                                        index === 2 ? "bg-gradient-to-br from-amber-700 to-amber-800" :
                                                            "bg-primary/20 text-primary"
                                            )}>
                                                {index < 3 ? index + 1 : cashier.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{cashier.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {cashier.transactions} transaksi
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xl font-bold text-primary">
                                            {formatRupiah(cashier.amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Top Products */}
                <BeautifulTable
                    data={stats.topProducts.map((p, i) => ({ ...p, id: `${i}` }))}
                    columns={productColumns}
                    title="Produk Terlaris"
                    subtitle={`Top ${stats.topProducts.length} produk terjual pada ${format(parsedDate, 'dd MMMM yyyy', { locale: id })}`}
                    isLoading={isLoading}
                    hideSelection
                    hideExport={false}
                    exportFilename={`produk-terlaris-${selectedDate}`}
                    exportTitle="Produk Terlaris"
                    emptyState={{
                        icon: <Package className="w-8 h-8" />,
                        title: 'Belum Ada Penjualan',
                        description: 'Tidak ada penjualan pada tanggal ini',
                    }}
                />

                {/* Recent Transactions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            Transaksi Terbaru
                            <Badge variant="secondary" className="ml-2">
                                {sales.length} transaksi
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                            </div>
                        ) : sales.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                                <p>Tidak ada transaksi pada tanggal ini</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-3">
                                    {sales.slice(0, 20).map((sale) => (
                                        <div
                                            key={sale.id}
                                            className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                                    sale.payment_method === 'cash'
                                                        ? "bg-green-100 dark:bg-green-900/30"
                                                        : "bg-blue-100 dark:bg-blue-900/30"
                                                )}>
                                                    {sale.payment_method === 'cash' ? (
                                                        <Banknote className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <CreditCard className="w-5 h-5 text-blue-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{sale.sale_number}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <User className="w-3 h-3" />
                                                        {sale.cashier_name}
                                                        <span>•</span>
                                                        <Clock className="w-3 h-3" />
                                                        {format(parseISO(sale.created_at), 'HH:mm')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{formatRupiah(sale.total_amount)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {sale.items.length} item
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
