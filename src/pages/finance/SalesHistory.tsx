import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { DateInput } from '@/components/common/DatePicker';
import { useData } from '@/contexts/DataContext';
import { Sale } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    Receipt,
    ShoppingCart,
    Calendar,
    Banknote,
    CreditCard,
    ChevronDown,
    ChevronRight,
    Package,
    User,
    TrendingUp,
    DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function SalesHistory() {
    const { sales, loading } = useData();
    const [startDate, setStartDate] = useState<string>(toISODate(startOfMonth(new Date())));
    const [endDate, setEndDate] = useState<string>(toISODate(new Date()));
    const [selectedCashier, setSelectedCashier] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());

    // Get unique cashiers
    const cashiers = useMemo(() => {
        const uniqueCashiers = new Map<string, string>();
        sales.forEach(s => {
            if (s.cashier_id && s.cashier_name) {
                uniqueCashiers.set(s.cashier_id, s.cashier_name);
            }
        });
        return Array.from(uniqueCashiers.entries()).map(([id, name]) => ({ id, name }));
    }, [sales]);

    // Filter sales
    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            const saleDate = s.created_at.slice(0, 10);

            // Date filter
            if (saleDate < startDate || saleDate > endDate) return false;

            // Cashier filter
            if (selectedCashier !== 'all' && s.cashier_id !== selectedCashier) return false;

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchInvoice = s.sale_number.toLowerCase().includes(query);
                const matchCashier = s.cashier_name?.toLowerCase().includes(query);
                const matchItems = s.items?.some(item =>
                    item.product_name.toLowerCase().includes(query)
                );
                if (!matchInvoice && !matchCashier && !matchItems) return false;
            }

            return true;
        });
    }, [sales, startDate, endDate, selectedCashier, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const totalSales = filteredSales.length;
        const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
        const cashTotal = filteredSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0);
        const transferTotal = filteredSales.filter(s => s.payment_method === 'transfer').reduce((sum, s) => sum + s.total_amount, 0);
        const totalItems = filteredSales.reduce((sum, s) => sum + (s.items?.length || 0), 0);

        return { totalSales, totalRevenue, cashTotal, transferTotal, totalItems };
    }, [filteredSales]);

    const toggleExpand = (saleId: string) => {
        setExpandedSales(prev => {
            const next = new Set(prev);
            if (next.has(saleId)) {
                next.delete(saleId);
            } else {
                next.add(saleId);
            }
            return next;
        });
    };

    if (loading) {
        return (
            <MainLayout title="Riwayat Penjualan" subtitle="Detail transaksi penjualan dari kasir">
                <PageSkeleton variant="dashboard" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Riwayat Penjualan"
            subtitle="Detail transaksi penjualan dari kasir"
        >
            <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-500" />
                        <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">Dari:</span>
                        <DateInput
                            value={startDate}
                            onChange={setStartDate}
                            className="w-[180px]"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">Sampai:</span>
                        <DateInput
                            value={endDate}
                            onChange={setEndDate}
                            className="w-[180px]"
                        />
                    </div>
                    <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                        <SelectTrigger className="w-[180px] rounded-xl">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Semua Kasir" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="rounded-lg">Semua Kasir</SelectItem>
                            {cashiers.map(c => (
                                <SelectItem key={c.id} value={c.id} className="rounded-lg">{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Cari invoice, kasir, produk..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-[250px] rounded-xl"
                    />
                </div>

                {/* Stats */}
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total Transaksi"
                        value={stats.totalSales}
                        icon={<ShoppingCart className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Total Pendapatan"
                        value={`Rp ${stats.totalRevenue.toLocaleString('id-ID')}`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Pembayaran Tunai"
                        value={`Rp ${stats.cashTotal.toLocaleString('id-ID')}`}
                        icon={<Banknote className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Pembayaran Transfer"
                        value={`Rp ${stats.transferTotal.toLocaleString('id-ID')}`}
                        icon={<CreditCard className="w-5 h-5" />}
                    />
                </StatsGrid>

                {/* Sales List */}
                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-indigo-500" />
                            Daftar Transaksi ({filteredSales.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filteredSales.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                <p>Tidak ada transaksi ditemukan</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredSales.map((sale) => (
                                    <Collapsible
                                        key={sale.id}
                                        open={expandedSales.has(sale.id)}
                                        onOpenChange={() => toggleExpand(sale.id)}
                                    >
                                        <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                                            <CollapsibleTrigger className="w-full">
                                                <div className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                                                    {/* Expand Icon */}
                                                    <div className="text-muted-foreground">
                                                        {expandedSales.has(sale.id) ? (
                                                            <ChevronDown className="h-5 w-5" />
                                                        ) : (
                                                            <ChevronRight className="h-5 w-5" />
                                                        )}
                                                    </div>

                                                    {/* Payment Icon */}
                                                    <div className={cn(
                                                        "p-2 rounded-xl",
                                                        sale.payment_method === 'cash'
                                                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                                                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                                                    )}>
                                                        {sale.payment_method === 'cash' ? (
                                                            <Banknote className="h-5 w-5" />
                                                        ) : (
                                                            <CreditCard className="h-5 w-5" />
                                                        )}
                                                    </div>

                                                    {/* Invoice Info */}
                                                    <div className="flex-1 text-left">
                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                            {sale.sale_number}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <User className="h-3 w-3" />
                                                            <span>{sale.cashier_name || 'Unknown'}</span>
                                                            <span>•</span>
                                                            <span>{sale.items?.length || 0} item</span>
                                                        </div>
                                                    </div>

                                                    {/* Date & Time */}
                                                    <div className="text-right text-sm text-muted-foreground">
                                                        <p>{format(parseISO(sale.created_at), 'dd MMM yyyy', { locale: idLocale })}</p>
                                                        <p>{format(parseISO(sale.created_at), 'HH:mm', { locale: idLocale })}</p>
                                                    </div>

                                                    {/* Total */}
                                                    <div className="text-right min-w-[120px]">
                                                        <p className="font-bold text-lg text-emerald-600">
                                                            Rp {sale.total_amount.toLocaleString('id-ID')}
                                                        </p>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "text-xs rounded-full",
                                                                sale.payment_method === 'cash'
                                                                    ? 'border-emerald-200 text-emerald-600'
                                                                    : 'border-blue-200 text-blue-600'
                                                            )}
                                                        >
                                                            {sale.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CollapsibleTrigger>

                                            <CollapsibleContent>
                                                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                        <Package className="h-4 w-4" />
                                                        Detail Item
                                                    </p>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="text-left text-muted-foreground border-b border-gray-200 dark:border-gray-700">
                                                                    <th className="pb-2 font-medium">Produk</th>
                                                                    <th className="pb-2 font-medium text-center">Qty</th>
                                                                    <th className="pb-2 font-medium text-right">Harga</th>
                                                                    <th className="pb-2 font-medium text-right">Subtotal</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {sale.items?.map((item, idx) => (
                                                                    <tr key={item.id || idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                                                                        <td className="py-2">
                                                                            <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                                                                            <p className="text-xs text-muted-foreground">{item.barcode}</p>
                                                                        </td>
                                                                        <td className="py-2 text-center font-semibold">{item.quantity}</td>
                                                                        <td className="py-2 text-right">Rp {item.price.toLocaleString('id-ID')}</td>
                                                                        <td className="py-2 text-right font-semibold text-emerald-600">
                                                                            Rp {item.subtotal.toLocaleString('id-ID')}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                            <tfoot>
                                                                <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                                                                    <td colSpan={3} className="pt-3 text-right font-semibold">Total:</td>
                                                                    <td className="pt-3 text-right font-bold text-lg text-emerald-600">
                                                                        Rp {sale.total_amount.toLocaleString('id-ID')}
                                                                    </td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                </div>
                                            </CollapsibleContent>
                                        </div>
                                    </Collapsible>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
