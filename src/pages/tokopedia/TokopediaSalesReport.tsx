import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateInput, MonthInput, YearInput } from '@/components/common/DatePicker';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { supabase } from '@/integrations/supabase/client';
import { TokopediaOrder, TokopediaOrderItem } from '@/types';
import {
    DollarSign, ShoppingCart, TrendingUp, Package, Clock, User,
    Calendar, RefreshCw, ArrowUp, ArrowDown, CalendarDays, CalendarRange,
    Printer, Truck, CheckCircle, ShoppingBag, BarChart3,
} from 'lucide-react';
import {
    format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth,
    startOfYear, endOfYear, subDays, subMonths, subYears,
} from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/format';
import { useReactToPrint } from 'react-to-print';

type PeriodType = 'daily' | 'monthly' | 'yearly';

interface TokopediaSalesData {
    totalOmzet: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalItemsSold: number;
    averageOrderValue: number;
    totalShippingCost: number;
    netRevenue: number; // omzet - shipping
    topProducts: { name: string; quantity: number; revenue: number }[];
    statusDistribution: { status: string; label: string; count: number; amount: number }[];
    dailyTrend: { date: string; count: number; amount: number }[];
}

// Fetch Tokopedia orders for a period
async function fetchTokopediaOrdersForPeriod(date: Date, period: PeriodType) {
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
        default:
            startDate = startOfDay(date).toISOString();
            endDate = endOfDay(date).toISOString();
    }

    const { data: orders, error } = await supabase
        .from('tokopedia_orders')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch items for all orders
    const orderIds = (orders || []).map(o => o.id);
    let allItems: TokopediaOrderItem[] = [];
    if (orderIds.length > 0) {
        const { data: items } = await supabase
            .from('tokopedia_order_items')
            .select('*')
            .in('order_id', orderIds);
        allItems = (items || []) as TokopediaOrderItem[];
    }

    return (orders || []).map(order => ({
        ...order,
        items: allItems.filter(i => i.order_id === order.id),
    })) as TokopediaOrder[];
}

// Calculate stats
function calculateTokopediaStats(orders: TokopediaOrder[]): TokopediaSalesData {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');

    const totalOmzet = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalShippingCost = completedOrders.reduce((sum, o) => sum + (o.shipping_cost || 0), 0);
    const totalItemsSold = completedOrders.reduce(
        (sum, o) => sum + (o.items || []).reduce((iSum, i) => iSum + i.quantity, 0), 0
    );
    const averageOrderValue = completedOrders.length > 0 ? totalOmzet / completedOrders.length : 0;

    // Top products from completed orders
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    completedOrders.forEach(order => {
        (order.items || []).forEach(item => {
            const key = item.product_name;
            const existing = productMap.get(key) || { name: item.product_name, quantity: 0, revenue: 0 };
            existing.quantity += item.quantity;
            existing.revenue += item.total_price;
            productMap.set(key, existing);
        });
    });
    const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    // Status distribution
    const statusLabels: Record<string, string> = {
        order_received: 'Pesanan Baru',
        packing: 'Dikemas',
        shipped: 'Dikirim',
        completed: 'Selesai',
        cancelled: 'Dibatalkan',
    };
    const statusMap = new Map<string, { count: number; amount: number }>();
    orders.forEach(o => {
        const existing = statusMap.get(o.status) || { count: 0, amount: 0 };
        existing.count += 1;
        existing.amount += o.total_amount;
        statusMap.set(o.status, existing);
    });
    const statusDistribution = Array.from(statusMap.entries()).map(([status, data]) => ({
        status,
        label: statusLabels[status] || status,
        ...data,
    }));

    // Daily trend (for monthly/yearly)
    const dailyMap = new Map<string, { count: number; amount: number }>();
    completedOrders.forEach(o => {
        const day = format(parseISO(o.created_at), 'yyyy-MM-dd');
        const existing = dailyMap.get(day) || { count: 0, amount: 0 };
        existing.count += 1;
        existing.amount += o.total_amount;
        dailyMap.set(day, existing);
    });
    const dailyTrend = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
        totalOmzet,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        totalItemsSold,
        averageOrderValue,
        totalShippingCost,
        netRevenue: totalOmzet - totalShippingCost,
        topProducts,
        statusDistribution,
        dailyTrend,
    };
}

// Fetch comparison data
async function fetchComparisonData(date: Date, period: PeriodType): Promise<TokopediaSalesData | null> {
    let compareDate: Date;
    switch (period) {
        case 'monthly': compareDate = subMonths(date, 1); break;
        case 'yearly': compareDate = subYears(date, 1); break;
        default: compareDate = subDays(date, 1);
    }
    try {
        const orders = await fetchTokopediaOrdersForPeriod(compareDate, period);
        return calculateTokopediaStats(orders);
    } catch {
        return null;
    }
}

export default function TokopediaSalesReport() {
    const [period, setPeriod] = useState<PeriodType>('daily');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const parsedDate = selectedDate ? parseISO(selectedDate) : new Date();

    const { data: orders = [], isLoading, refetch } = useQuery({
        queryKey: ['tokopedia-sales-report', period, selectedDate],
        queryFn: () => fetchTokopediaOrdersForPeriod(parsedDate, period),
    });

    const { data: previousPeriodData } = useQuery({
        queryKey: ['tokopedia-sales-report-comparison', period, selectedDate],
        queryFn: () => fetchComparisonData(parsedDate, period),
    });

    const stats = useMemo(() => calculateTokopediaStats(orders), [orders]);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ contentRef: printRef });

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

    const changes = useMemo(() => {
        if (!previousPeriodData) return { omzet: null, orders: null, average: null };
        const omzetChange = previousPeriodData.totalOmzet > 0
            ? ((stats.totalOmzet - previousPeriodData.totalOmzet) / previousPeriodData.totalOmzet) * 100 : null;
        const ordersChange = previousPeriodData.completedOrders > 0
            ? ((stats.completedOrders - previousPeriodData.completedOrders) / previousPeriodData.completedOrders) * 100 : null;
        const averageChange = previousPeriodData.averageOrderValue > 0
            ? ((stats.averageOrderValue - previousPeriodData.averageOrderValue) / previousPeriodData.averageOrderValue) * 100 : null;
        return { omzet: omzetChange, orders: ordersChange, average: averageChange };
    }, [stats, previousPeriodData]);

    // Table columns
    const orderColumns: Column<TokopediaOrder>[] = [
        {
            header: 'No. Order',
            accessorKey: 'order_number',
            sortable: true,
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        row.status === 'completed' ? "bg-green-100 dark:bg-green-900/30" :
                            row.status === 'cancelled' ? "bg-red-100 dark:bg-red-900/30" :
                                "bg-blue-100 dark:bg-blue-900/30"
                    )}>
                        <ShoppingBag className={cn(
                            "w-4 h-4",
                            row.status === 'completed' ? "text-green-600" :
                                row.status === 'cancelled' ? "text-red-600" : "text-blue-600"
                        )} />
                    </div>
                    <div>
                        <span className="font-medium">{row.order_number}</span>
                        {row.status === 'cancelled' && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">Batal</Badge>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: 'Pembeli',
            accessorKey: 'buyer_name',
            sortable: true,
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{row.buyer_name}</span>
                </div>
            ),
        },
        {
            header: 'Items',
            cell: (row) => (
                <Badge variant="secondary" className="font-mono">
                    {row.items?.length || 0} item
                </Badge>
            ),
        },
        {
            header: 'Omzet',
            accessorKey: 'total_amount',
            sortable: true,
            cell: (row) => (
                <span className={cn(
                    "font-bold",
                    row.status === 'cancelled' ? "text-muted-foreground line-through" : "text-green-600"
                )}>
                    {formatRupiah(row.total_amount)}
                </span>
            ),
        },
        {
            header: 'Ongkir',
            accessorKey: 'shipping_cost',
            cell: (row) => formatRupiah(row.shipping_cost || 0),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            sortable: true,
            cell: (row) => {
                const colors: Record<string, string> = {
                    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
                    packing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                    order_received: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                };
                const labels: Record<string, string> = {
                    completed: 'Selesai', cancelled: 'Batal', shipped: 'Dikirim',
                    packing: 'Dikemas', order_received: 'Baru',
                };
                return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[row.status] || ''}`}>
                        {labels[row.status] || row.status}
                    </span>
                );
            },
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            sortable: true,
            cell: (row) => format(parseISO(row.created_at), 'dd MMM HH:mm', { locale: id }),
        },
    ];

    const ChangeIndicator = ({ value, label }: { value: number | null; label: string }) => {
        if (value === null) return null;
        return (
            <div className={cn(
                "flex items-center gap-1 mt-2 text-sm",
                value >= 0 ? "text-green-600" : "text-red-600"
            )}>
                {value >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(value).toFixed(1)}% vs {label}
            </div>
        );
    };

    return (
        <MainLayout title="Laporan Penjualan Tokopedia" subtitle="Analisis omzet & performa penjualan marketplace">
            <div className="space-y-6" ref={printRef}>
                {/* Period Selector */}
                <Card>
                    <CardContent className="py-4 space-y-4">
                        <Tabs value={period} onValueChange={(val) => setPeriod(val as PeriodType)}>
                            <TabsList className="grid grid-cols-3 w-full max-w-md">
                                <TabsTrigger value="daily" className="gap-2"><Calendar className="w-4 h-4" /> Harian</TabsTrigger>
                                <TabsTrigger value="monthly" className="gap-2"><CalendarDays className="w-4 h-4" /> Bulanan</TabsTrigger>
                                <TabsTrigger value="yearly" className="gap-2"><CalendarRange className="w-4 h-4" /> Tahunan</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                {period === 'yearly' ? (
                                    <YearInput value={selectedDate} onChange={setSelectedDate} className="w-full sm:w-[200px]" />
                                ) : period === 'monthly' ? (
                                    <MonthInput value={selectedDate} onChange={setSelectedDate} className="w-full sm:w-[220px]" />
                                ) : (
                                    <DateInput value={selectedDate} onChange={setSelectedDate} className="w-full sm:w-[200px]" />
                                )}
                                <Button variant="outline" size="icon" onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))} title="Hari ini">
                                    <Clock className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
                                <Button variant="default" onClick={() => handlePrint()}><Printer className="w-4 h-4 mr-2" /> Print</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="relative overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Omzet Tokopedia</p>
                                    <p className="text-3xl font-bold mt-1">{formatRupiah(stats.totalOmzet)}</p>
                                    <ChangeIndicator value={changes.omzet} label={getPeriodLabel()} />
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
                                    <p className="text-sm text-muted-foreground">Order Selesai</p>
                                    <p className="text-3xl font-bold mt-1">{stats.completedOrders}</p>
                                    <ChangeIndicator value={changes.orders} label={getPeriodLabel()} />
                                    <p className="text-xs text-muted-foreground mt-1">dari {stats.totalOrders} total order</p>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                    <CheckCircle className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                    </Card>

                    <Card className="relative overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Rata-rata Order</p>
                                    <p className="text-3xl font-bold mt-1">{formatRupiah(stats.averageOrderValue)}</p>
                                    <ChangeIndicator value={changes.average} label={getPeriodLabel()} />
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
                                    <p className="text-sm text-muted-foreground">Item Terjual</p>
                                    <p className="text-3xl font-bold mt-1">{stats.totalItemsSold}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Ongkir: {formatRupiah(stats.totalShippingCost)}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                                    <Package className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
                    </Card>
                </div>

                {/* Status Breakdown + Top Products */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" /> Distribusi Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats.statusDistribution.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.statusDistribution.map(s => {
                                        const pct = stats.totalOrders > 0 ? (s.count / stats.totalOrders) * 100 : 0;
                                        const barColors: Record<string, string> = {
                                            completed: 'bg-green-500',
                                            cancelled: 'bg-red-500',
                                            shipped: 'bg-purple-500',
                                            packing: 'bg-amber-500',
                                            order_received: 'bg-blue-500',
                                        };
                                        return (
                                            <div key={s.status}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-medium">{s.label}</span>
                                                    <span className="text-muted-foreground">{s.count} order · {formatRupiah(s.amount)}</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                    <div className={cn("h-full rounded-full transition-all", barColors[s.status] || 'bg-primary')}
                                                        style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Products */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" /> Top 10 Produk Terlaris
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats.topProducts.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.topProducts.map((product, idx) => (
                                        <div key={product.name} className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0",
                                                idx === 0 ? "bg-gradient-to-br from-amber-500 to-orange-500" :
                                                    idx === 1 ? "bg-gradient-to-br from-gray-400 to-gray-500" :
                                                        idx === 2 ? "bg-gradient-to-br from-amber-700 to-amber-800" :
                                                            "bg-muted text-muted-foreground"
                                            )}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{product.name}</p>
                                                <p className="text-xs text-muted-foreground">{product.quantity} terjual</p>
                                            </div>
                                            <span className="text-sm font-bold text-green-600">{formatRupiah(product.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Orders Table */}
                <BeautifulTable
                    data={orders}
                    columns={orderColumns}
                    title={`Daftar Order Tokopedia — ${getDateDisplay()}`}
                    subtitle={`${stats.completedOrders} order selesai dari ${stats.totalOrders} total`}
                    isLoading={isLoading}
                    hideSelection
                    hideExport={false}
                    exportFilename={`tokopedia-sales-${selectedDate}`}
                    exportTitle="Laporan Penjualan Tokopedia"
                    itemsPerPage={10}
                    emptyState={{
                        icon: <ShoppingBag className="w-8 h-8" />,
                        title: 'Belum Ada Order',
                        description: `Tidak ada order Tokopedia pada ${getDateDisplay()}`,
                    }}
                />
            </div>
        </MainLayout>
    );
}
