import { useState, useMemo, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
;
import { useSalesHistory } from '@/hooks/useSalesHistory';
import { Sale } from '@/types';

type SaleWithStatus = Sale & { _status: string };
import { format, parseISO, startOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    ShoppingCart,
    Calendar,
    Banknote,
    CreditCard,
    User,
    TrendingUp,
    Printer,
    Eye,
    Package,
    AlertTriangle,
    ArrowRightLeft,
    XCircle,
} from 'lucide-react';
;
import { Button } from '@/components/ui/button';
;
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useReactToPrint } from 'react-to-print';
import POSReceipt from '@/components/pos/POSReceipt';
import { useStoreSettings } from '@/hooks/useStoreSettings';

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function SalesHistory() {
    // Fetch ALL sales directly from Supabase (no DataContext limit)
    const { sales, loading, totalCount } = useSalesHistory();
    const { data: storeSettings } = useStoreSettings();
    const [startDate, setStartDate] = useState<string>(toISODate(startOfMonth(new Date())));
    const [endDate, setEndDate] = useState<string>(toISODate(new Date()));
    const [selectedCashier, setSelectedCashier] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Detail dialog
    const [detailSale, setDetailSale] = useState<Sale | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Print dialog
    const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: selectedSaleForPrint?.sale_number || 'Receipt',
        onAfterPrint: () => {
            setPrintDialogOpen(false);
            setSelectedSaleForPrint(null);
        },
    });

    const openPrintDialog = (sale: Sale) => {
        setSelectedSaleForPrint(sale);
        setPrintDialogOpen(true);
    };

    const openDetail = (sale: Sale) => {
        setDetailSale(sale);
        setDetailOpen(true);
    };

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

    // Compute status label
    const getStatusLabel = (s: Sale): string => {
        if (s.is_cancelled) return 'Dibatalkan';
        if (s.is_exchanged) return 'Ditukar';
        if (s.is_credit && !s.credit_settled_at) return 'Piutang';
        if (s.is_credit && s.credit_settled_at) return 'Lunas';
        return 'Selesai';
    };

    // Filter sales and add computed _status field
    const filteredSales = useMemo((): SaleWithStatus[] => {
        return sales
            .filter(s => {
                const saleDate = s.created_at.slice(0, 10);
                if (saleDate < startDate || saleDate > endDate) return false;
                if (selectedCashier !== 'all' && s.cashier_id !== selectedCashier) return false;
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
            })
            .map(s => ({ ...s, _status: getStatusLabel(s) }));
    }, [sales, startDate, endDate, selectedCashier, searchQuery]);

    // Stats - exclude cancelled and exchanged
    const stats = useMemo(() => {
        const validSales = filteredSales.filter(s => !s.is_cancelled && !s.is_exchanged);
        const totalSales = validSales.length;
        const totalRevenue = validSales.reduce((sum, s) => sum + s.total_amount, 0);
        const cashTotal = validSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0);
        const transferTotal = validSales.filter(s => s.payment_method === 'transfer').reduce((sum, s) => sum + s.total_amount, 0);
        const creditSales = validSales.filter(s => s.is_credit && !s.credit_settled_at);
        const creditTotal = creditSales.reduce((sum, s) => sum + s.total_amount, 0);
        const creditCount = creditSales.length;
        return { totalSales, totalRevenue, cashTotal, transferTotal, creditTotal, creditCount };
    }, [filteredSales]);

    // Sale status helper
    const getSaleStatus = (sale: Sale) => {
        if (sale.is_cancelled) return { label: 'Dibatalkan', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> };
        if (sale.is_exchanged) return { label: 'Ditukar', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: <ArrowRightLeft className="w-3 h-3" /> };
        if (sale.is_credit && !sale.credit_settled_at) return { label: 'Piutang', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <AlertTriangle className="w-3 h-3" /> };
        if (sale.is_credit && sale.credit_settled_at) return { label: 'Lunas', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: null };
        return { label: 'Selesai', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: null };
    };

    // Dynamic filter options: only show statuses that exist in current data
    const statusFilterOptions = useMemo(() => {
        const existing = new Set(filteredSales.map(s => s._status));
        const allStatuses = [
            { label: 'Selesai', value: 'Selesai' },
            { label: 'Dibatalkan', value: 'Dibatalkan' },
            { label: 'Ditukar', value: 'Ditukar' },
            { label: 'Piutang', value: 'Piutang' },
            { label: 'Lunas', value: 'Lunas' },
        ];
        return allStatuses.filter(s => existing.has(s.value));
    }, [filteredSales]);

    // Table columns
    const columns: Column<SaleWithStatus>[] = [
        {
            header: 'Invoice',
            accessorKey: 'sale_number',
            cell: (item) => (
                <span className="font-semibold text-sm">{item.sale_number}</span>
            ),
        },
        {
            header: 'Kasir',
            accessorKey: 'cashier_name',
            cell: (item) => (
                <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{item.cashier_name || 'Unknown'}</span>
                </div>
            ),
        },
        {
            header: 'Item',
            accessorKey: 'items',
            filterable: false,
            cell: (item) => (
                <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{item.items?.length || 0} item</span>
                </div>
            ),
        },
        {
            header: 'Metode',
            accessorKey: 'payment_method',
            filterOptions: [
                { label: 'Tunai', value: 'cash' },
                { label: 'Transfer', value: 'transfer' },
            ],
            cell: (item) => (
                <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                    item.payment_method === 'cash'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                )}>
                    {item.payment_method === 'cash' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                    {item.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                </span>
            ),
        },
        {
            header: 'Status',
            accessorKey: '_status' as any,
            filterOptions: statusFilterOptions,
            cell: (item) => {
                const status = getSaleStatus(item);
                return (
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', status.color)}>
                        {status.icon} {status.label}
                    </span>
                );
            },
        },
        {
            header: 'Total',
            accessorKey: 'total_amount',
            filterable: false,
            cell: (item) => (
                <span className={cn(
                    'font-bold text-sm',
                    item.is_cancelled ? 'line-through text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'
                )}>
                    Rp {item.total_amount.toLocaleString('id-ID')}
                </span>
            ),
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            filterOptions: (() => {
                // Group dates by month
                const monthMap = new Map<string, Set<string>>();
                filteredSales.forEach(s => {
                    const month = s.created_at.slice(0, 7);
                    const date = s.created_at.slice(0, 10);
                    if (!monthMap.has(month)) monthMap.set(month, new Set());
                    monthMap.get(month)!.add(date);
                });
                return Array.from(monthMap.entries())
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([month, dates]) => ({
                        label: format(new Date(month + '-01'), 'MMMM yyyy', { locale: idLocale }),
                        value: month,
                        children: Array.from(dates).sort().map(d => ({
                            label: format(new Date(d), 'dd MMMM', { locale: idLocale }),
                            value: d,
                        })),
                    }));
            })(),
            cell: (item) => (
                <div className="text-sm text-muted-foreground">
                    <p>{format(parseISO(item.created_at), 'dd MMM yyyy', { locale: idLocale })}</p>
                    <p className="text-xs">{format(parseISO(item.created_at), 'HH:mm')}</p>
                </div>
            ),
        },
        {
            header: 'Aksi',
            accessorKey: 'id',
            filterable: false,
            sortable: false,
            cell: (item) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => openDetail(item)}
                        title="Lihat Detail"
                    >
                        <Eye className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => openPrintDialog(item)}
                        title="Cetak Struk"
                    >
                        <Printer className="w-4 h-4 text-gray-600" />
                    </Button>
                </div>
            ),
        },
    ];

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
                {/* Stats */}
                <StatsGrid columns={5}>
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
                    <StatsCard
                        title="Piutang"
                        value={`Rp ${stats.creditTotal.toLocaleString('id-ID')}`}
                        subtitle={`${stats.creditCount} transaksi belum lunas`}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        gradient="amber"
                    />
                </StatsGrid>

                {/* Sales Table */}
                <BeautifulTable
                    data={filteredSales}
                    columns={columns}
                    title={`Daftar Transaksi (${filteredSales.length})`}
                    hideSelection
                    itemsPerPage={15}
                />
            </div>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-indigo-500" />
                            Detail Transaksi — {detailSale?.sale_number}
                        </DialogTitle>
                    </DialogHeader>
                    {detailSale && (
                        <div className="space-y-4">
                            {/* Sale Info */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Kasir</p>
                                    <p className="font-medium">{detailSale.cashier_name || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Tanggal</p>
                                    <p className="font-medium">{format(parseISO(detailSale.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Metode Bayar</p>
                                    <p className="font-medium">{detailSale.payment_method === 'cash' ? 'Tunai' : 'Transfer'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Status</p>
                                    {(() => {
                                        const status = getSaleStatus(detailSale);
                                        return (
                                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', status.color)}>
                                                {status.icon} {status.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                                {detailSale.is_credit && detailSale.credit_customer_name && (
                                    <div className="col-span-2">
                                        <p className="text-muted-foreground">Nama Pelanggan (Piutang)</p>
                                        <p className="font-medium">{detailSale.credit_customer_name}</p>
                                    </div>
                                )}
                                {detailSale.is_cancelled && detailSale.cancelled_reason && (
                                    <div className="col-span-2">
                                        <p className="text-muted-foreground">Alasan Batal</p>
                                        <p className="font-medium text-red-600">{detailSale.cancelled_reason}</p>
                                    </div>
                                )}
                            </div>

                            {/* Items Table */}
                            <div className="border rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800 text-left text-muted-foreground">
                                            <th className="px-3 py-2 font-medium">Produk</th>
                                            <th className="px-3 py-2 font-medium text-center">Qty</th>
                                            <th className="px-3 py-2 font-medium text-right">Harga</th>
                                            <th className="px-3 py-2 font-medium text-right">Diskon</th>
                                            <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailSale.items?.map((item, idx) => (
                                            <tr key={item.id || idx} className="border-t border-gray-100 dark:border-gray-800">
                                                <td className="px-3 py-2">
                                                    <p className="font-medium">{item.product_name}</p>
                                                    <p className="text-xs text-muted-foreground">{item.barcode || '-'}</p>
                                                </td>
                                                <td className="px-3 py-2 text-center font-semibold">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right">Rp {item.price.toLocaleString('id-ID')}</td>
                                                <td className="px-3 py-2 text-right text-red-500">
                                                    {item.discount > 0 ? `-Rp ${(item.discount * item.quantity).toLocaleString('id-ID')}` : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                                                    Rp {item.subtotal.toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        {detailSale.order_discount > 0 && (
                                            <tr className="border-t border-gray-200 dark:border-gray-700">
                                                <td colSpan={4} className="px-3 py-2 text-right text-sm text-muted-foreground">Diskon Order:</td>
                                                <td className="px-3 py-2 text-right text-red-500 font-medium">
                                                    -Rp {detailSale.order_discount.toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        )}
                                        <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                                            <td colSpan={4} className="px-3 py-2 text-right font-semibold">Total:</td>
                                            <td className="px-3 py-2 text-right font-bold text-lg text-emerald-600">
                                                Rp {detailSale.total_amount.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                        {detailSale.amount_paid > 0 && (
                                            <>
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-1 text-right text-sm text-muted-foreground">Dibayar:</td>
                                                    <td className="px-3 py-1 text-right text-sm">Rp {detailSale.amount_paid.toLocaleString('id-ID')}</td>
                                                </tr>
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-1 text-right text-sm text-muted-foreground">Kembalian:</td>
                                                    <td className="px-3 py-1 text-right text-sm">Rp {detailSale.change_amount.toLocaleString('id-ID')}</td>
                                                </tr>
                                            </>
                                        )}
                                    </tfoot>
                                </table>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setDetailOpen(false)} className="rounded-xl">
                                    Tutup
                                </Button>
                                <Button onClick={() => { setDetailOpen(false); openPrintDialog(detailSale); }} className="rounded-xl gap-2">
                                    <Printer className="h-4 w-4" /> Cetak Struk
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Print Receipt Dialog */}
            <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <Printer className="h-5 w-5" />
                            Cetak Ulang Struk
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 max-h-[60vh] overflow-y-auto">
                        {selectedSaleForPrint && (
                            <POSReceipt
                                ref={receiptRef}
                                saleNumber={selectedSaleForPrint.sale_number}
                                cashierName={selectedSaleForPrint.cashier_name || 'Unknown'}
                                date={new Date(selectedSaleForPrint.created_at)}
                                items={selectedSaleForPrint.items?.map(item => ({
                                    name: item.product_name,
                                    quantity: item.quantity,
                                    price: item.price,
                                    discount: 0,
                                    subtotal: item.subtotal,
                                })) || []}
                                subtotal={selectedSaleForPrint.items?.reduce((sum, item) => sum + item.subtotal, 0) || 0}
                                orderDiscount={0}
                                total={selectedSaleForPrint.total_amount}
                                paymentMethod={selectedSaleForPrint.payment_method}
                                amountPaid={selectedSaleForPrint.total_amount}
                                change={0}
                                storeName={storeSettings?.store_name}
                                storeAddress={storeSettings?.store_address}
                                isCopy={true}
                            />
                        )}
                    </div>
                    <div className="p-4 border-t bg-white dark:bg-gray-900 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setPrintDialogOpen(false)} className="rounded-xl">
                            Batal
                        </Button>
                        <Button onClick={() => handlePrint()} className="rounded-xl gap-2">
                            <Printer className="h-4 w-4" /> Cetak
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
