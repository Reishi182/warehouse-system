import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { DateInput } from '@/components/common/DatePicker';
import { useAuth } from '@/contexts/AuthContext';
import { Sale, SaleItem, PaymentMethod, Location } from '@/types';
import { format, subDays } from 'date-fns';
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
    Search,
    Printer,
    History,
    X,
    XCircle,
    RotateCcw,
    Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { useCancelSale } from '@/hooks/useCancelSale';
import { supabase } from '@/integrations/supabase/client';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

interface POSSalesHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreateReturn?: (originalSale: Sale) => void;
}

export function POSSalesHistoryDialog({ open, onOpenChange, onCreateReturn }: POSSalesHistoryDialogProps) {
    const { user, profile } = useAuth();
    const { data: storeSettings } = useStoreSettings();
    const cancelSale = useCancelSale();

    // Default to today's date
    const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
    const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);

    // Direct-fetch state: fetch sales for the selected date directly from Supabase
    const [dateSales, setDateSales] = useState<Sale[]>([]);
    const [loadingSales, setLoadingSales] = useState(false);

    // Cancel dialog state
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    // Fetch sales for the selected date directly from Supabase (no limit issues)
    const fetchSalesForDate = useCallback(async () => {
        if (!open || !user?.id) return;

        setLoadingSales(true);
        try {
            // Build UTC range from local date
            const localStart = new Date(selectedDate + 'T00:00:00');
            const localEnd = new Date(selectedDate + 'T23:59:59.999');

            const { data, error } = await supabase
                .from('sales')
                .select('id, sale_number, cashier_id, cashier_name, payment_method, stock_location, total_amount, order_discount, amount_paid, change_amount, created_at, is_exchanged, exchanged_to_sale_id, exchanged_to_sale_number, exchange_from_sale_id, exchange_from_sale_number, is_cancelled, cancelled_at, cancelled_reason, is_credit, credit_customer_name, credit_settled_at, credit_payment_method, sale_items(id, sale_id, product_id, product_name, barcode, quantity, price, subtotal, discount)')
                .eq('cashier_id', user.id)
                .gte('created_at', localStart.toISOString())
                .lte('created_at', localEnd.toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching sales for date:', error);
                setDateSales([]);
                return;
            }

            setDateSales((data || []).map((s: any): Sale => ({
                id: s.id,
                sale_number: s.sale_number,
                cashier_id: s.cashier_id,
                cashier_name: s.cashier_name,
                payment_method: s.payment_method as PaymentMethod,
                stock_location: s.stock_location as Location,
                total_amount: s.total_amount,
                order_discount: s.order_discount || 0,
                amount_paid: s.amount_paid || 0,
                change_amount: s.change_amount || 0,
                is_exchanged: s.is_exchanged || false,
                exchanged_to_sale_id: s.exchanged_to_sale_id,
                exchanged_to_sale_number: s.exchanged_to_sale_number,
                exchange_from_sale_id: s.exchange_from_sale_id,
                exchange_from_sale_number: s.exchange_from_sale_number,
                is_cancelled: s.is_cancelled || false,
                cancelled_at: s.cancelled_at,
                cancelled_reason: s.cancelled_reason,
                is_credit: s.is_credit || false,
                credit_customer_name: s.credit_customer_name,
                credit_settled_at: s.credit_settled_at,
                credit_payment_method: s.credit_payment_method as PaymentMethod | null,
                created_at: s.created_at,
                items: (s.sale_items || []).map((it: any): SaleItem => ({
                    id: it.id,
                    sale_id: it.sale_id,
                    product_id: it.product_id,
                    product_name: it.product_name,
                    barcode: it.barcode,
                    quantity: it.quantity,
                    price: it.price,
                    subtotal: it.subtotal,
                    discount: it.discount || 0,
                })),
            })));
        } finally {
            setLoadingSales(false);
        }
    }, [open, selectedDate, user?.id]);

    // Fetch when dialog opens or date changes
    useEffect(() => {
        fetchSalesForDate();
    }, [fetchSalesForDate]);

    // Print handler
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

    // Filter sales by search query only (date filtering is already done by the query)
    const filteredSales = useMemo(() => {
        return dateSales.filter(s => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchInvoice = s.sale_number.toLowerCase().includes(query);
                const matchItems = s.items?.some(item =>
                    item.product_name.toLowerCase().includes(query) ||
                    item.barcode.toLowerCase().includes(query)
                );
                if (!matchInvoice && !matchItems) return false;
            }

            return true;
        });
    }, [dateSales, searchQuery]);

    // Stats - exclude cancelled and exchanged sales from totals
    const stats = useMemo(() => {
        // Only count active sales (not cancelled, not exchanged)
        const activeSales = filteredSales.filter(s => !s.is_cancelled && !s.is_exchanged);
        const totalSales = activeSales.length;
        const totalRevenue = activeSales.reduce((sum, s) => sum + s.total_amount, 0);
        const cashTotal = activeSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0);
        const transferTotal = activeSales.filter(s => s.payment_method === 'transfer').reduce((sum, s) => sum + s.total_amount, 0);

        return { totalSales, totalRevenue, cashTotal, transferTotal };
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

    // Quick date buttons
    const setToday = () => setSelectedDate(toISODate(new Date()));
    const setYesterday = () => setSelectedDate(toISODate(subDays(new Date(), 1)));

    // Cancel sale handler
    const openCancelDialog = (sale: Sale) => {
        setSaleToCancel(sale);
        setCancelReason('');
        setCancelDialogOpen(true);
    };

    const handleCancelSale = () => {
        if (!saleToCancel || !cancelReason.trim() || !profile) return;

        cancelSale.mutate({
            saleId: saleToCancel.id,
            saleNumber: saleToCancel.sale_number,
            items: saleToCancel.items?.map(i => ({
                product_id: i.product_id,
                product_name: i.product_name,
                quantity: i.quantity,
            })) || [],
            stockLocation: (saleToCancel.stock_location || 'toko') as any,
            reason: cancelReason.trim(),
            cancelledBy: profile.user_id,
            cancelledByName: profile.name,
        }, {
            onSuccess: () => {
                setCancelDialogOpen(false);
                setSaleToCancel(null);
                setCancelReason('');
                fetchSalesForDate(); // Re-fetch to update list
            },
        });
    };

    // Create return sale (replacement)
    const handleCreateReturn = (sale: Sale) => {
        if (onCreateReturn) {
            onCreateReturn(sale);
            onOpenChange(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] !overflow-y-hidden !flex flex-col p-0">
                    <DialogHeader className="p-4 sm:p-6 pb-0">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <History className="h-5 w-5 text-primary" />
                            Riwayat Penjualan Saya
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 sm:px-6 pb-4 sm:pb-6">
                        {/* Filters */}
                        <div className="flex flex-col gap-3 py-4 border-b">
                            {/* Date Filter */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                                    <span className="text-sm font-medium text-muted-foreground">Tanggal:</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DateInput
                                        value={selectedDate}
                                        onChange={setSelectedDate}
                                        className="flex-1"
                                        disableFuture
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={setToday}
                                        className="text-xs h-11 px-3 rounded-xl whitespace-nowrap"
                                    >
                                        Hari Ini
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={setYesterday}
                                        className="text-xs h-11 px-3 rounded-xl whitespace-nowrap"
                                    >
                                        Kemarin
                                    </Button>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nomor struk, produk, barcode..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 rounded-xl"
                                />
                                {searchQuery && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-b">
                            <div className="text-center p-2 rounded-lg bg-muted/30">
                                <div className="text-lg font-bold text-foreground">{stats.totalSales}</div>
                                <div className="text-xs text-muted-foreground">Transaksi</div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                                <div className="text-lg font-bold text-green-600">Rp {(stats.totalRevenue / 1000).toFixed(0)}k</div>
                                <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                <div className="text-lg font-bold text-blue-600">Rp {(stats.cashTotal / 1000).toFixed(0)}k</div>
                                <div className="text-xs text-muted-foreground">Tunai</div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                <div className="text-lg font-bold text-purple-600">Rp {(stats.transferTotal / 1000).toFixed(0)}k</div>
                                <div className="text-xs text-muted-foreground">Transfer</div>
                            </div>
                        </div>

                        {/* Sales List */}
                        <div className="flex-1 min-h-0 mt-3 overflow-y-auto">
                            {loadingSales ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p className="text-sm">Memuat riwayat...</p>
                                </div>
                            ) : filteredSales.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p className="text-sm">Tidak ada transaksi ditemukan</p>
                                    <p className="text-xs mt-1">Coba ubah tanggal atau kata kunci pencarian</p>
                                </div>
                            ) : (
                                <div className="space-y-2 pr-2">
                                    {filteredSales.map((sale) => (
                                        <Collapsible
                                            key={sale.id}
                                            open={expandedSales.has(sale.id)}
                                            onOpenChange={() => toggleExpand(sale.id)}
                                        >
                                            <div className="border border-border rounded-xl overflow-hidden">
                                                <CollapsibleTrigger className="w-full">
                                                    <div className="flex items-center gap-2 sm:gap-3 p-3 hover:bg-muted/50 transition-colors">
                                                        {/* Expand Icon */}
                                                        <div className="flex-shrink-0">
                                                            {expandedSales.has(sale.id) ? (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </div>

                                                        {/* Sale Info */}
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className={cn(
                                                                    "font-semibold text-sm truncate",
                                                                    (sale.is_cancelled || sale.is_exchanged) && "line-through opacity-60"
                                                                )}>{sale.sale_number}</span>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "text-[10px] px-1.5 py-0",
                                                                        sale.payment_method === 'cash'
                                                                            ? "border-green-300 text-green-600 bg-green-50 dark:bg-green-900/20"
                                                                            : "border-purple-300 text-purple-600 bg-purple-50 dark:bg-purple-900/20"
                                                                    )}
                                                                >
                                                                    {sale.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                                                                </Badge>
                                                                {/* Status Badges */}
                                                                {sale.is_cancelled && (
                                                                    <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-600 border-0">
                                                                        Batal
                                                                    </Badge>
                                                                )}
                                                                {sale.is_exchanged && (
                                                                    <Badge className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-600 border-0">
                                                                        Ditukar → {sale.exchanged_to_sale_number || 'Proses'}
                                                                    </Badge>
                                                                )}
                                                                {sale.exchange_from_sale_number && (
                                                                    <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-600 border-0">
                                                                        Dari → {sale.exchange_from_sale_number}
                                                                    </Badge>
                                                                )}
                                                                {/* Bug fix 5: Show credit badge */}
                                                                {sale.is_credit && (
                                                                    <Badge className="text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-700 border-0">
                                                                        Piutang{sale.credit_customer_name ? ` • ${sale.credit_customer_name}` : ''}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {format(new Date(sale.created_at), 'HH:mm', { locale: idLocale })} • {sale.items?.length || 0} item
                                                            </div>
                                                        </div>

                                                        {/* Amount */}
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="font-bold text-sm text-primary">
                                                                Rp {sale.total_amount.toLocaleString('id-ID')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CollapsibleTrigger>

                                                <CollapsibleContent>
                                                    <div className="border-t px-3 py-2 bg-muted/30">
                                                        {/* Items */}
                                                        <div className="space-y-1.5">
                                                            {sale.items?.map((item, idx) => (
                                                                <div key={idx} className="flex items-center justify-between text-xs">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <Package className={cn(
                                                                            "h-3 w-3 flex-shrink-0",
                                                                            !item.product_id ? "text-amber-500" : "text-muted-foreground"
                                                                        )} />
                                                                        <span className="truncate">{item.product_name}</span>
                                                                        {!item.product_id && (
                                                                            <Badge className="h-4 px-1.5 text-[9px] bg-amber-500 text-white border-0 rounded-full shrink-0">
                                                                                Manual
                                                                            </Badge>
                                                                        )}
                                                                        <span className="text-muted-foreground flex-shrink-0">x{item.quantity}</span>
                                                                    </div>
                                                                    <span className="font-medium flex-shrink-0 ml-2">
                                                                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Discount & Total */}
                                                        {/* Bug fix 3: Use order_discount instead of non-existent discount field */}
                                                        {(sale.order_discount && sale.order_discount > 0) && (
                                                            <div className="flex justify-between text-xs mt-2 pt-2 border-t border-dashed">
                                                                <span className="text-red-500">Diskon</span>
                                                                <span className="text-red-500">-Rp {sale.order_discount.toLocaleString('id-ID')}</span>
                                                            </div>
                                                        )}

                                                        {/* Action Buttons */}
                                                        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t">
                                                            {/* Cancel Button - only for today's active sales */}
                                                            {!sale.is_cancelled && !sale.is_exchanged && sale.created_at.slice(0, 10) === toISODate(new Date()) && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openCancelDialog(sale);
                                                                    }}
                                                                    className="text-xs h-7 rounded-lg text-red-600 border-red-300 hover:bg-red-50"
                                                                >
                                                                    <XCircle className="h-3 w-3 mr-1" />
                                                                    Cancel
                                                                </Button>
                                                            )}

                                                            {/* Create Return Button - only for active sales */}
                                                            {onCreateReturn && !sale.is_cancelled && !sale.is_exchanged && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCreateReturn(sale);
                                                                    }}
                                                                    className="text-xs h-7 rounded-lg text-orange-600 border-orange-300 hover:bg-orange-50"
                                                                >
                                                                    <RotateCcw className="h-3 w-3 mr-1" />
                                                                    Ganti Barang
                                                                </Button>
                                                            )}

                                                            {/* Print Button */}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openPrintDialog(sale);
                                                                }}
                                                                className="text-xs h-7 rounded-lg ml-auto"
                                                            >
                                                                <Printer className="h-3 w-3 mr-1" />
                                                                Cetak
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </div>
                                        </Collapsible>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Print Receipt Dialog */}
            <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
                <DialogContent className="max-w-sm p-0 overflow-hidden">
                    <DialogHeader className="p-4 pb-0">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Printer className="h-4 w-4" />
                            Cetak Struk
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                        {selectedSaleForPrint && (
                            <>
                                <div className="border rounded-lg p-2 mb-4 max-h-[50vh] overflow-auto bg-white">
                                    <div ref={receiptRef}>
                                        <POSReceipt
                                            saleNumber={selectedSaleForPrint.sale_number}
                                            cashierName={selectedSaleForPrint.cashier_name || profile?.name || 'Kasir'}
                                            date={new Date(selectedSaleForPrint.created_at)}
                                            items={(selectedSaleForPrint.items || []).map(item => ({
                                                name: item.product_name,
                                                quantity: item.quantity,
                                                price: item.price,
                                                discount: 0,
                                                subtotal: item.subtotal,
                                            }))}
                                            subtotal={selectedSaleForPrint.total_amount + (selectedSaleForPrint.discount || 0)}
                                            orderDiscount={selectedSaleForPrint.discount || 0}
                                            total={selectedSaleForPrint.total_amount}
                                            paymentMethod={selectedSaleForPrint.payment_method}
                                            amountPaid={selectedSaleForPrint.amount_paid || selectedSaleForPrint.total_amount}
                                            change={selectedSaleForPrint.change_amount || 0}
                                            storeName={storeSettings?.store_name}
                                            storeAddress={storeSettings?.store_address}
                                            isCopy={true}
                                        />
                                    </div>
                                </div>
                                <Button onClick={() => handlePrint()} className="w-full rounded-xl">
                                    <Printer className="h-4 w-4 mr-2" />
                                    Cetak Sekarang
                                </Button>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Batalkan Penjualan?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Stok akan dikembalikan. Transaksi: {saleToCancel?.sale_number}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Input
                            placeholder="Alasan pembatalan..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelSale}
                            disabled={!cancelReason.trim() || cancelSale.isPending}
                            className="rounded-xl bg-red-600 hover:bg-red-700"
                        >
                            {cancelSale.isPending ? 'Memproses...' : 'Ya, Batalkan'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
