import { useState, useMemo, useRef } from 'react';
import { DateInput } from '@/components/common/DatePicker';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sale } from '@/types';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

interface POSSalesHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function POSSalesHistoryDialog({ open, onOpenChange }: POSSalesHistoryDialogProps) {
    const { sales } = useData();
    const { user, profile } = useAuth();
    const { data: storeSettings } = useStoreSettings();

    // Default to today's date
    const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
    const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);

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

    // Filter sales by current cashier, date and search query
    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            // Only show current cashier's sales
            if (s.cashier_id !== user?.id) return false;

            const saleDate = s.created_at.slice(0, 10);

            // Date filter
            if (saleDate !== selectedDate) return false;

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
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [sales, selectedDate, searchQuery, user?.id]);

    // Stats
    const stats = useMemo(() => {
        const totalSales = filteredSales.length;
        const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
        const cashTotal = filteredSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0);
        const transferTotal = filteredSales.filter(s => s.payment_method === 'transfer').reduce((sum, s) => sum + s.total_amount, 0);

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

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-4 sm:p-6 pb-0">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <History className="h-5 w-5 text-primary" />
                            Riwayat Penjualan Saya
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6 pb-4 sm:pb-6">
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
                        <ScrollArea className="flex-1 mt-3">
                            {filteredSales.length === 0 ? (
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
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-semibold text-sm truncate">{sale.sale_number}</span>
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
                                                                        <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                                        <span className="truncate">{item.product_name}</span>
                                                                        <span className="text-muted-foreground flex-shrink-0">x{item.quantity}</span>
                                                                    </div>
                                                                    <span className="font-medium flex-shrink-0 ml-2">
                                                                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Discount & Total */}
                                                        {(sale.discount && sale.discount > 0) && (
                                                            <div className="flex justify-between text-xs mt-2 pt-2 border-t border-dashed">
                                                                <span className="text-red-500">Diskon</span>
                                                                <span className="text-red-500">-Rp {sale.discount.toLocaleString('id-ID')}</span>
                                                            </div>
                                                        )}

                                                        {/* Print Button */}
                                                        <div className="flex justify-end mt-3 pt-2 border-t">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openPrintDialog(sale);
                                                                }}
                                                                className="text-xs h-7 rounded-lg"
                                                            >
                                                                <Printer className="h-3 w-3 mr-1" />
                                                                Cetak Struk
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </div>
                                        </Collapsible>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
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
                                            sale={selectedSaleForPrint}
                                            storeName={storeSettings?.store_name}
                                            storeAddress={storeSettings?.store_address}
                                            storePhone={storeSettings?.store_phone}
                                            cashierName={profile?.name || 'Kasir'}
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
        </>
    );
}
