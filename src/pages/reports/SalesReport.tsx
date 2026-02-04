import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateInput, MonthInput, YearInput } from '@/components/common/DatePicker';
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
    ArrowDown,
    ChevronDown,
    ChevronUp,
    CalendarDays,
    CalendarRange,
    Percent,
    Printer,
} from 'lucide-react';
import {
    format,
    parseISO,
    startOfDay,
    endOfDay,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    subDays,
    subMonths,
    subYears,
} from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/format';
import { useReactToPrint } from 'react-to-print';

type PeriodType = 'daily' | 'monthly' | 'yearly';

interface SalesData {
    date: string;
    totalSales: number;
    grossSales: number;
    totalTransactions: number;
    totalItems: number;
    totalDiscount: number;
    cashSales: number;
    transferSales: number;
    averageTransaction: number;
    topProducts: { name: string; quantity: number; revenue: number }[];
    hourlyDistribution: { hour: number; count: number; amount: number }[];
    cashierPerformance: { name: string; transactions: number; amount: number }[];
}

// Fetch sales for a specific period
async function fetchSalesForPeriod(date: Date, period: PeriodType): Promise<Sale[]> {
    let startDate: string;
    let endDate: string;

    switch (period) {
        case 'monthly':
            startDate = startOfMonth(date).toISOString();
            endDate = endOfMonth(date).toISOString();
            break;
        case 'yearly':
            startDate = startOfYear(date).toISOString();
            endDate = endOfYear(date).toISOString();
            break;
        default: // daily
            startDate = startOfDay(date).toISOString();
            endDate = endOfDay(date).toISOString();
    }

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
        order_discount: row.order_discount || 0,
        amount_paid: row.total_amount,
        change_amount: 0,
        created_at: row.created_at,
        is_cancelled: row.is_cancelled || false,
        is_exchanged: row.is_exchanged || false,
        items: saleItems.filter(item => item.sale_id === row.id),
    }));
}

// Calculate stats - exclude cancelled and exchanged sales
function calculateStats(sales: Sale[], date: Date): SalesData {
    // Filter out cancelled and exchanged sales for totals
    const validSales = sales.filter(s => !s.is_cancelled && !s.is_exchanged);

    const totalSales = validSales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalTransactions = validSales.length;
    const totalItems = validSales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
    const totalDiscount = validSales.reduce((sum, s) => sum + (s.order_discount || 0), 0);
    const grossSales = totalSales + totalDiscount; // Total before discount
    const cashSales = validSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0);
    const transferSales = validSales.filter(s => s.payment_method === 'transfer').reduce((sum, s) => sum + s.total_amount, 0);
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Top products - only from valid sales
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    validSales.forEach(sale => {
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

    // Hourly distribution - only valid sales
    const hourlyMap = new Map<number, { count: number; amount: number }>();
    for (let h = 0; h < 24; h++) {
        hourlyMap.set(h, { count: 0, amount: 0 });
    }
    validSales.forEach(sale => {
        const hour = parseISO(sale.created_at).getHours();
        const existing = hourlyMap.get(hour)!;
        existing.count += 1;
        existing.amount += sale.total_amount;
    });
    const hourlyDistribution = Array.from(hourlyMap.entries())
        .map(([hour, data]) => ({ hour, ...data }));

    // Cashier performance - only valid sales
    const cashierMap = new Map<string, { name: string; transactions: number; amount: number }>();
    validSales.forEach(sale => {
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
        grossSales,
        totalTransactions,
        totalItems,
        totalDiscount,
        cashSales,
        transferSales,
        averageTransaction,
        topProducts,
        hourlyDistribution,
        cashierPerformance,
    };
}

// Fetch comparison data (previous period)
async function fetchComparisonData(date: Date, period: PeriodType): Promise<SalesData | null> {
    let compareDate: Date;
    switch (period) {
        case 'monthly':
            compareDate = subMonths(date, 1);
            break;
        case 'yearly':
            compareDate = subYears(date, 1);
            break;
        default:
            compareDate = subDays(date, 1);
    }
    try {
        const sales = await fetchSalesForPeriod(compareDate, period);
        return calculateStats(sales, compareDate);
    } catch {
        return null;
    }
}

export default function SalesReport() {
    const [period, setPeriod] = useState<PeriodType>('daily');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
    const parsedDate = selectedDate ? parseISO(selectedDate) : new Date();

    // Fetch sales for selected period
    const { data: sales = [], isLoading, refetch } = useQuery({
        queryKey: ['sales-report', period, selectedDate],
        queryFn: () => fetchSalesForPeriod(parsedDate, period),
    });

    // Fetch previous period data for comparison
    const { data: previousPeriodData } = useQuery({
        queryKey: ['sales-report-comparison', period, selectedDate],
        queryFn: () => fetchComparisonData(parsedDate, period),
    });

    const stats = useMemo(() => calculateStats(sales, parsedDate), [sales, parsedDate]);

    // Print ref and handler
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ contentRef: printRef });

    // Get period labels
    const getPeriodLabel = () => {
        switch (period) {
            case 'monthly': return 'bulan lalu';
            case 'yearly': return 'tahun lalu';
            default: return 'kemarin';
        }
    };

    const getDateDisplay = () => {
        switch (period) {
            case 'monthly': return format(parsedDate, 'MMMM yyyy', { locale: id });
            case 'yearly': return format(parsedDate, 'yyyy');
            default: return format(parsedDate, 'dd MMMM yyyy', { locale: id });
        }
    };

    const getPageTitle = () => {
        switch (period) {
            case 'monthly': return 'Laporan Penjualan Bulanan';
            case 'yearly': return 'Laporan Penjualan Tahunan';
            default: return 'Laporan Penjualan Harian';
        }
    };

    // Calculate percentage changes
    const changes = useMemo(() => {
        if (!previousPeriodData) return { sales: null, transactions: null, average: null, discount: null };
        const salesChange = previousPeriodData.totalSales > 0
            ? ((stats.totalSales - previousPeriodData.totalSales) / previousPeriodData.totalSales) * 100
            : null;
        const transactionsChange = previousPeriodData.totalTransactions > 0
            ? ((stats.totalTransactions - previousPeriodData.totalTransactions) / previousPeriodData.totalTransactions) * 100
            : null;
        const averageChange = previousPeriodData.averageTransaction > 0
            ? ((stats.averageTransaction - previousPeriodData.averageTransaction) / previousPeriodData.averageTransaction) * 100
            : null;
        const discountChange = previousPeriodData.totalDiscount > 0
            ? ((stats.totalDiscount - previousPeriodData.totalDiscount) / previousPeriodData.totalDiscount) * 100
            : null;
        return { sales: salesChange, transactions: transactionsChange, average: averageChange, discount: discountChange };
    }, [stats, previousPeriodData]);

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
        <MainLayout title={getPageTitle()} subtitle="Analisis penjualan per periode">
            <div className="space-y-6">
                {/* Period Selector & Date Selector */}
                <Card>
                    <CardContent className="py-4 space-y-4">
                        {/* Period Tabs */}
                        <Tabs value={period} onValueChange={(val) => setPeriod(val as PeriodType)}>
                            <TabsList className="grid grid-cols-3 w-full max-w-md">
                                <TabsTrigger value="daily" className="gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Harian
                                </TabsTrigger>
                                <TabsTrigger value="monthly" className="gap-2">
                                    <CalendarDays className="w-4 h-4" />
                                    Bulanan
                                </TabsTrigger>
                                <TabsTrigger value="yearly" className="gap-2">
                                    <CalendarRange className="w-4 h-4" />
                                    Tahunan
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Date Selector & Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                {period === 'yearly' ? (
                                    <YearInput
                                        value={selectedDate}
                                        onChange={(val) => setSelectedDate(val)}
                                        className="w-full sm:w-[200px]"
                                    />
                                ) : period === 'monthly' ? (
                                    <MonthInput
                                        value={selectedDate}
                                        onChange={(val) => setSelectedDate(val)}
                                        className="w-full sm:w-[220px]"
                                    />
                                ) : (
                                    <DateInput
                                        value={selectedDate}
                                        onChange={(val) => setSelectedDate(val)}
                                        className="w-full sm:w-[200px]"
                                    />
                                )}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                                    title="Hari ini"
                                >
                                    <Clock className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => refetch()}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Refresh
                                </Button>
                                <Button variant="default" onClick={() => handlePrint()}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Laporan
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                                            {Math.abs(changes.sales).toFixed(1)}% vs {getPeriodLabel()}
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
                                            {Math.abs(changes.transactions).toFixed(1)}% vs {getPeriodLabel()}
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
                                            {Math.abs(changes.average).toFixed(1)}% vs {getPeriodLabel()}
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

                    <Card className="relative overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Diskon</p>
                                    <p className="text-3xl font-bold mt-1">
                                        {formatRupiah(stats.totalDiscount)}
                                    </p>
                                    {changes.discount !== null && (
                                        <div className={cn(
                                            "flex items-center gap-1 mt-2 text-sm",
                                            changes.discount >= 0 ? "text-red-600" : "text-green-600"
                                        )}>
                                            {changes.discount >= 0 ? (
                                                <ArrowUp className="w-4 h-4" />
                                            ) : (
                                                <ArrowDown className="w-4 h-4" />
                                            )}
                                            {Math.abs(changes.discount).toFixed(1)}% vs {getPeriodLabel()}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/30">
                                    <Percent className="w-6 h-6 text-rose-600" />
                                </div>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
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

                    {/* Hourly Distribution - Only for Daily */}
                    {period === 'daily' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" />
                                    Distribusi Per Jam
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(() => {
                                    const hourlyData = stats.hourlyDistribution.slice(7, 22);
                                    const maxCount = Math.max(...hourlyData.map(h => h.count), 1);
                                    const hasData = hourlyData.some(h => h.count > 0);

                                    if (!hasData) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                                <Clock className="w-8 h-8 mb-2 opacity-50" />
                                                <p className="text-sm">Belum ada transaksi hari ini</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <>
                                            <div className="flex items-end justify-between h-32 gap-1">
                                                {hourlyData.map((item) => {
                                                    const height = (item.count / maxCount) * 100;
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
                                                                        : item.count > 0
                                                                            ? "bg-primary/30 group-hover:bg-primary/50"
                                                                            : "bg-muted"
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
                                        </>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    )}
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
                    subtitle={`Top ${stats.topProducts.length} produk terjual pada ${getDateDisplay()}`}
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
                            <ScrollArea className="h-[500px]">
                                <div className="space-y-2">
                                    {sales.slice(0, 30).map((sale) => {
                                        const isExpanded = expandedSaleId === sale.id;
                                        return (
                                            <div key={sale.id} className="rounded-xl border overflow-hidden">
                                                {/* Transaction Header - Clickable */}
                                                <div
                                                    className={cn(
                                                        "flex items-center justify-between p-4 cursor-pointer transition-colors",
                                                        isExpanded ? "bg-muted" : "bg-muted/30 hover:bg-muted/50"
                                                    )}
                                                    onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                                            sale.is_cancelled ? "bg-red-100 dark:bg-red-900/30" :
                                                                sale.is_exchanged ? "bg-orange-100 dark:bg-orange-900/30" :
                                                                    sale.payment_method === 'cash'
                                                                        ? "bg-green-100 dark:bg-green-900/30"
                                                                        : "bg-blue-100 dark:bg-blue-900/30"
                                                        )}>
                                                            {sale.payment_method === 'cash' ? (
                                                                <Banknote className={cn(
                                                                    "w-5 h-5",
                                                                    sale.is_cancelled ? "text-red-600" :
                                                                        sale.is_exchanged ? "text-orange-600" : "text-green-600"
                                                                )} />
                                                            ) : (
                                                                <CreditCard className={cn(
                                                                    "w-5 h-5",
                                                                    sale.is_cancelled ? "text-red-600" :
                                                                        sale.is_exchanged ? "text-orange-600" : "text-blue-600"
                                                                )} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium">{sale.sale_number}</p>
                                                                {sale.is_cancelled && (
                                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                                                        Dibatalkan
                                                                    </Badge>
                                                                )}
                                                                {sale.is_exchanged && (
                                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                                                        Ditukar
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <User className="w-3 h-3" />
                                                                {sale.cashier_name}
                                                                <span>•</span>
                                                                <Clock className="w-3 h-3" />
                                                                {format(parseISO(sale.created_at), 'HH:mm')}
                                                                <span>•</span>
                                                                <Package className="w-3 h-3" />
                                                                {sale.items.length} item
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className={cn(
                                                                "font-bold",
                                                                (sale.is_cancelled || sale.is_exchanged) && "text-muted-foreground line-through"
                                                            )}>{formatRupiah(sale.total_amount)}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {sale.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                                                            </p>
                                                        </div>
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                                        ) : (
                                                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded Detail */}
                                                {isExpanded && (
                                                    <div className="border-t bg-background/50 p-4">
                                                        <p className="text-xs font-semibold text-muted-foreground mb-3">DETAIL ITEM</p>
                                                        <div className="space-y-2">
                                                            {sale.items.map((item, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                            <Package className="w-4 h-4 text-primary" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-medium text-sm">{item.product_name}</p>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {item.barcode}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="font-medium">{formatRupiah(item.subtotal)}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {item.quantity} x {formatRupiah(item.price)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Summary */}
                                                        <div className="mt-4 pt-3 border-t flex justify-between items-center">
                                                            <span className="text-sm text-muted-foreground">Total</span>
                                                            <span className={cn(
                                                                "text-lg font-bold",
                                                                (sale.is_cancelled || sale.is_exchanged) ? "text-muted-foreground line-through" : "text-primary"
                                                            )}>
                                                                {formatRupiah(sale.total_amount)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Hidden Printable Receipt */}
            <div className="hidden">
                <div
                    ref={printRef}
                    className="p-4 bg-white text-black font-mono text-sm"
                    style={{ width: '80mm', margin: '0 auto' }}
                >
                    {/* Header */}
                    <div className="text-center mb-4 border-b-2 border-dashed border-black pb-3">
                        <h1 className="text-base font-bold">
                            {period === 'monthly' ? 'LAPORAN PENJUALAN BULANAN' :
                                period === 'yearly' ? 'LAPORAN PENJUALAN TAHUNAN' :
                                    'LAPORAN PENJUALAN HARIAN'}
                        </h1>
                        <p className="text-sm mt-1">{getDateDisplay()}</p>
                        <p className="text-xs text-gray-600 mt-1">
                            Dicetak: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: id })}
                        </p>
                    </div>

                    {/* Summary Stats */}
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                            <span>Total Transaksi:</span>
                            <span className="font-bold">{stats.totalTransactions}</span>
                        </div>
                        <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                            <span>Total Item Terjual:</span>
                            <span className="font-bold">{stats.totalItems}</span>
                        </div>
                        <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                            <span>Total Diskon:</span>
                            <span className="font-bold">{formatRupiah(stats.totalDiscount)}</span>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="mt-4 pt-3 border-t-2 border-dashed border-black">
                        <h2 className="font-bold text-center mb-2 text-xs">METODE PEMBAYARAN</h2>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span>Tunai:</span>
                                <span className="font-bold">{formatRupiah(stats.cashSales)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Transfer:</span>
                                <span className="font-bold">{formatRupiah(stats.transferSales)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Grand Total */}
                    <div className="mt-4 pt-3 border-t-2 border-double border-black">
                        <div className="flex justify-between text-xs">
                            <span>Subtotal:</span>
                            <span>{formatRupiah(stats.grossSales)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-red-600">
                            <span>Diskon:</span>
                            <span>- {formatRupiah(stats.totalDiscount)}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-400">
                            <span className="font-bold">TOTAL PENJUALAN:</span>
                            <span className="font-bold">{formatRupiah(stats.totalSales)}</span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                            <span>Rata-rata/Transaksi:</span>
                            <span>{formatRupiah(stats.averageTransaction)}</span>
                        </div>
                    </div>

                    {/* Top Products */}
                    {stats.topProducts.length > 0 && (
                        <div className="mt-4 pt-3 border-t-2 border-dashed border-black">
                            <h2 className="font-bold text-center mb-2 text-xs">TOP 5 PRODUK TERLARIS</h2>
                            <div className="space-y-1 text-xs">
                                {stats.topProducts.slice(0, 5).map((product, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span className="truncate" style={{ maxWidth: '55%' }}>{idx + 1}. {product.name}</span>
                                        <span>{product.quantity} pcs</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-dashed border-gray-400 text-center text-xs text-gray-500">
                        <p>--- Terima Kasih ---</p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

