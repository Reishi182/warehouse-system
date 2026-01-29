import { useState, useMemo, useRef } from 'react';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useCustomerExchange } from '@/hooks/useCustomerExchange';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useSales } from '@/hooks/useSales';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from 'react-to-print';
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    Search,
    ArrowLeftRight,
    Package,
    Plus,
    Minus,
    Trash2,
    Receipt,
    Check,
    AlertCircle,
    ArrowRight,
    Printer,
    Calendar,
    List,
    Eye
} from 'lucide-react';
import { Sale, SaleItem, Product, ItemCondition, Location } from '@/types';
import { cn } from '@/lib/utils';

// Helper function to format currency
const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;

interface ReturnedItem {
    id: string;
    productId: string;
    productName: string;
    barcode: string;
    quantity: number;
    maxQuantity: number;
    originalPrice: number;
    condition: ItemCondition;
    conditionNote: string;
}

interface NewItem {
    id: string;
    productId: string;
    productName: string;
    barcode: string;
    quantity: number;
    maxStock: number;
    price: number;
}

interface ExchangeResult {
    exchangeNumber: string;
    originalSaleNumber: string;
    returnedItems: ReturnedItem[];
    newItems: NewItem[];
    originalValue: number;
    newValue: number;
    difference: number;
    amountPaid: number;
    changeGiven: number;
    date: Date;
}

export default function CustomerExchange() {
    const { user, profile } = useAuth();
    const role = useRole();
    const { products } = useData();
    const { toast } = useToast();
    const { searchSale, checkAlreadyExchanged, createExchange } = useCustomerExchange();
    const { settings } = useStoreSettings();
    const { data: allSales = [], isLoading: isLoadingSales } = useSales();

    // Determine stock location based on role
    const stockLocation = role === 'warehouse' ? 'gudang' : 'toko';
    const locationLabel = role === 'warehouse' ? 'Gudang' : 'Toko';

    // State
    const [saleNumberSearch, setSaleNumberSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [foundSale, setFoundSale] = useState<Sale | null>(null);
    const [returnedItems, setReturnedItems] = useState<ReturnedItem[]>([]);
    const [newItems, setNewItems] = useState<NewItem[]>([]);
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [amountPaid, setAmountPaid] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    // Date filter state for sales list
    const [dateFrom, setDateFrom] = useState<string>(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [salesListSearch, setSalesListSearch] = useState('');

    // Dialogs
    const [showAddNewItemDialog, setShowAddNewItemDialog] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [showReceiptDialog, setShowReceiptDialog] = useState(false);
    const [exchangeResult, setExchangeResult] = useState<ExchangeResult | null>(null);

    // Print ref
    const receiptRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Tukar-Barang-${exchangeResult?.exchangeNumber || ''}`,
    });

    // Calculations
    const originalValue = useMemo(() =>
        returnedItems.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0),
        [returnedItems]
    );

    const newValue = useMemo(() =>
        newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        [newItems]
    );

    const difference = newValue - originalValue;

    const changeAmount = useMemo(() => {
        if (difference > 0) {
            return amountPaid - difference;
        }
        return -difference; // Refund amount
    }, [difference, amountPaid]);

    // Filtered products for adding new items (based on role's stock location)
    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        const search = productSearch.toLowerCase();
        return products
            .filter(p => {
                const availableStock = stockLocation === 'gudang' ? p.stock.gudang : p.stock.toko;
                return (p.name.toLowerCase().includes(search) ||
                    p.barcode.toLowerCase().includes(search)) &&
                    availableStock > 0 &&
                    !newItems.some(ni => ni.productId === p.id);
            })
            .slice(0, 10);
    }, [products, productSearch, newItems, stockLocation]);

    // Filtered sales for the sales list with date filter
    const filteredSales = useMemo(() => {
        if (!dateFrom || !dateTo) return [];

        const fromDate = startOfDay(new Date(dateFrom));
        const toDate = endOfDay(new Date(dateTo));
        const search = salesListSearch.toLowerCase();

        return allSales
            .filter(sale => {
                const saleDate = new Date(sale.created_at);
                const withinDateRange = isWithinInterval(saleDate, { start: fromDate, end: toDate });

                if (!withinDateRange) return false;

                // Optional search filter
                if (search) {
                    const matchesSaleNumber = sale.sale_number.toLowerCase().includes(search);
                    const matchesProduct = sale.items?.some(item =>
                        item.product_name.toLowerCase().includes(search) ||
                        item.barcode.toLowerCase().includes(search)
                    );
                    return matchesSaleNumber || matchesProduct;
                }

                return true;
            })
            .slice(0, 50); // Limit to 50 results
    }, [allSales, dateFrom, dateTo, salesListSearch]);

    // Select a sale from the list to start exchange
    const handleSelectSale = (sale: Sale) => {
        setFoundSale(sale);
        setReturnedItems([]);
        setNewItems([]);
        toast({ title: 'Berhasil', description: `Transaksi ${sale.sale_number} dipilih` });
    };

    // Search for original sale
    const handleSearchSale = async () => {
        if (!saleNumberSearch.trim()) {
            toast({ title: 'Error', description: 'Masukkan nomor struk', variant: 'destructive' });
            return;
        }

        setIsSearching(true);
        try {
            const sale = await searchSale(saleNumberSearch.trim());
            if (sale) {
                setFoundSale(sale);
                setReturnedItems([]);
                setNewItems([]);
                toast({ title: 'Berhasil', description: `Transaksi ${sale.sale_number} ditemukan` });
            } else {
                toast({
                    title: 'Tidak Ditemukan',
                    description: 'Transaksi tidak ditemukan atau sudah lebih dari 1 hari',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Gagal mencari transaksi', variant: 'destructive' });
        } finally {
            setIsSearching(false);
        }
    };

    // Add item from original sale to return list
    const handleAddReturnItem = async (saleItem: SaleItem) => {
        // Check if already added
        if (returnedItems.some(ri => ri.productId === saleItem.product_id)) {
            toast({ title: 'Info', description: 'Item sudah ada di daftar tukar' });
            return;
        }

        // Check if already exchanged before
        if (foundSale) {
            const alreadyExchanged = await checkAlreadyExchanged(foundSale.id, saleItem.product_id);
            if (alreadyExchanged) {
                toast({
                    title: 'Tidak Bisa Ditukar',
                    description: 'Item ini sudah pernah ditukar sebelumnya',
                    variant: 'destructive'
                });
                return;
            }
        }

        setReturnedItems(prev => [...prev, {
            id: crypto.randomUUID(),
            productId: saleItem.product_id,
            productName: saleItem.product_name,
            barcode: saleItem.barcode,
            quantity: saleItem.quantity,
            maxQuantity: saleItem.quantity,
            originalPrice: saleItem.price,
            condition: 'baik',
            conditionNote: ''
        }]);
    };

    // Update returned item
    const handleUpdateReturnItem = (id: string, field: keyof ReturnedItem, value: any) => {
        setReturnedItems(prev => prev.map(item => {
            if (item.id === id) {
                if (field === 'quantity') {
                    const qty = Math.min(Math.max(1, value), item.maxQuantity);
                    return { ...item, quantity: qty };
                }
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    // Remove returned item
    const handleRemoveReturnItem = (id: string) => {
        setReturnedItems(prev => prev.filter(item => item.id !== id));
    };

    // Add new item (replacement)
    const handleAddNewItem = (product: Product) => {
        if (newItems.some(ni => ni.productId === product.id)) {
            toast({ title: 'Info', description: 'Produk sudah ada di daftar' });
            return;
        }

        const maxStock = stockLocation === 'gudang' ? product.stock.gudang : product.stock.toko;
        setNewItems(prev => [...prev, {
            id: crypto.randomUUID(),
            productId: product.id,
            productName: product.name,
            barcode: product.barcode,
            quantity: 1,
            maxStock: maxStock,
            price: product.price
        }]);
        setShowAddNewItemDialog(false);
        setProductSearch('');
    };

    // Update new item quantity
    const handleUpdateNewItem = (id: string, quantity: number) => {
        setNewItems(prev => prev.map(item => {
            if (item.id === id) {
                const qty = Math.min(Math.max(1, quantity), item.maxStock);
                return { ...item, quantity: qty };
            }
            return item;
        }));
    };

    // Remove new item
    const handleRemoveNewItem = (id: string) => {
        setNewItems(prev => prev.filter(item => item.id !== id));
    };

    // Process exchange
    const handleProcessExchange = async () => {
        if (!foundSale || !user) return;

        if (returnedItems.length === 0) {
            toast({ title: 'Error', description: 'Pilih item yang akan ditukar', variant: 'destructive' });
            return;
        }

        if (newItems.length === 0) {
            toast({ title: 'Error', description: 'Pilih item pengganti', variant: 'destructive' });
            return;
        }

        // Check condition notes for damaged items
        const damagedWithoutNote = returnedItems.filter(
            item => item.condition === 'rusak' && !item.conditionNote.trim()
        );
        if (damagedWithoutNote.length > 0) {
            toast({
                title: 'Error',
                description: 'Isi catatan kondisi untuk item yang rusak',
                variant: 'destructive'
            });
            return;
        }

        // Check payment if customer needs to pay more
        if (difference > 0 && amountPaid < difference) {
            toast({
                title: 'Error',
                description: `Pembayaran kurang. Minimum: ${formatCurrency(difference)}`,
                variant: 'destructive'
            });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await createExchange.mutateAsync({
                originalSaleId: foundSale.id,
                originalSaleNumber: foundSale.sale_number,
                cashierId: user.id,
                cashierName: profile?.name || user.email || 'Kasir',
                stockLocation: stockLocation as Location,
                returnedItems: returnedItems.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    barcode: item.barcode,
                    quantity: item.quantity,
                    originalPrice: item.originalPrice,
                    condition: item.condition,
                    conditionNote: item.conditionNote
                })),
                newItems: newItems.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    barcode: item.barcode,
                    quantity: item.quantity,
                    price: item.price
                })),
                reason,
                note,
                amountPaid: difference > 0 ? amountPaid : 0
            });

            // Show receipt
            setExchangeResult({
                exchangeNumber: result.exchange_number as string,
                originalSaleNumber: foundSale.sale_number,
                returnedItems: [...returnedItems],
                newItems: [...newItems],
                originalValue,
                newValue,
                difference,
                amountPaid: difference > 0 ? amountPaid : 0,
                changeGiven: changeAmount,
                date: new Date()
            });
            setShowReceiptDialog(true);

            // Reset form
            setFoundSale(null);
            setSaleNumberSearch('');
            setReturnedItems([]);
            setNewItems([]);
            setReason('');
            setNote('');
            setAmountPaid(0);

        } catch (error) {
            // Error handled by hook
        } finally {
            setIsProcessing(false);
        }
    };

    // Reset all
    const handleReset = () => {
        setFoundSale(null);
        setSaleNumberSearch('');
        setReturnedItems([]);
        setNewItems([]);
        setReason('');
        setNote('');
        setAmountPaid(0);
    };

    return (
        <MainLayout>
            <div className="flex flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ArrowLeftRight className="h-6 w-6" />
                            Tukar Barang
                        </h1>
                        <p className="text-muted-foreground">
                            Proses penukaran barang customer (maksimal 1 hari setelah pembelian)
                        </p>
                    </div>
                    {foundSale && (
                        <Button variant="outline" onClick={handleReset}>
                            Reset
                        </Button>
                    )}
                </div>

                {/* Search Sale - Tabbed Interface */}
                {!foundSale && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Receipt className="h-5 w-5" />
                                Cari Transaksi
                            </CardTitle>
                            <CardDescription>
                                Pilih transaksi dari daftar atau cari manual dengan nomor struk
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="list" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="list" className="flex items-center gap-2">
                                        <List className="h-4 w-4" />
                                        Daftar Penjualan
                                    </TabsTrigger>
                                    <TabsTrigger value="manual" className="flex items-center gap-2">
                                        <Search className="h-4 w-4" />
                                        Cari Manual
                                    </TabsTrigger>
                                </TabsList>

                                {/* Sales List Tab */}
                                <TabsContent value="list" className="space-y-4">
                                    {/* Date Filter */}
                                    <div className="flex flex-wrap gap-4 items-end">
                                        <div className="flex-1 min-w-[150px]">
                                            <Label className="mb-2 block text-sm">Dari Tanggal</Label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="date"
                                                    value={dateFrom}
                                                    onChange={(e) => setDateFrom(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-[150px]">
                                            <Label className="mb-2 block text-sm">Sampai Tanggal</Label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="date"
                                                    value={dateTo}
                                                    onChange={(e) => setDateTo(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-[200px]">
                                            <Label className="mb-2 block text-sm">Cari Produk/Struk</Label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Nama produk atau nomor struk..."
                                                    value={salesListSearch}
                                                    onChange={(e) => setSalesListSearch(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sales List */}
                                    <ScrollArea className="h-[400px] border rounded-lg">
                                        {isLoadingSales ? (
                                            <div className="flex items-center justify-center h-full py-8">
                                                <span className="text-muted-foreground">Memuat data penjualan...</span>
                                            </div>
                                        ) : filteredSales.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                                                <Receipt className="h-8 w-8 mb-2" />
                                                <span>Tidak ada transaksi pada rentang tanggal ini</span>
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {filteredSales.map((sale) => (
                                                    <div
                                                        key={sale.id}
                                                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                                                        onClick={() => handleSelectSale(sale)}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold">{sale.sale_number}</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {format(new Date(sale.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-primary">
                                                                    {formatCurrency(sale.total_amount)}
                                                                </span>
                                                                <Button size="sm" variant="ghost">
                                                                    <Eye className="h-4 w-4 mr-1" />
                                                                    Pilih
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground mb-2">
                                                            Kasir: {sale.cashier_name}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {sale.items?.slice(0, 3).map((item, idx) => (
                                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                                    {item.product_name} x{item.quantity}
                                                                </Badge>
                                                            ))}
                                                            {sale.items && sale.items.length > 3 && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    +{sale.items.length - 3} lainnya
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                    <div className="text-sm text-muted-foreground text-center">
                                        Menampilkan {filteredSales.length} transaksi
                                    </div>
                                </TabsContent>

                                {/* Manual Search Tab */}
                                <TabsContent value="manual">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Nomor struk (contoh: TRX-20260126-001)"
                                                value={saleNumberSearch}
                                                onChange={(e) => setSaleNumberSearch(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearchSale()}
                                                className="pl-10"
                                            />
                                        </div>
                                        <Button onClick={handleSearchSale} disabled={isSearching}>
                                            {isSearching ? 'Mencari...' : 'Cari'}
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Gunakan pencarian manual jika transaksi tidak muncul di daftar
                                    </p>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                )}

                {/* Selected Sale Info */}
                {foundSale && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Receipt className="h-5 w-5" />
                                Transaksi Terpilih
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold">{foundSale.sale_number}</span>
                                    <Badge variant="outline">
                                        {format(new Date(foundSale.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Kasir: {foundSale.cashier_name} | Total: {formatCurrency(foundSale.total_amount)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Main Exchange Area */}
                {foundSale && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Left: Items from Original Sale */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Item Transaksi Asli</CardTitle>
                                <CardDescription>
                                    Pilih item yang ingin ditukar customer
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px]">
                                    <div className="space-y-2">
                                        {foundSale.items?.map((item) => {
                                            const isAdded = returnedItems.some(ri => ri.productId === item.product_id);
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-lg border",
                                                        isAdded ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                                                    )}
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-medium">{item.product_name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {item.quantity} x {formatCurrency(item.price)}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant={isAdded ? "secondary" : "default"}
                                                        onClick={() => !isAdded && handleAddReturnItem(item)}
                                                        disabled={isAdded}
                                                    >
                                                        {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Right: Selected Return Items */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Item yang Ditukar
                                </CardTitle>
                                <CardDescription>
                                    Total nilai: {formatCurrency(originalValue)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px]">
                                    {returnedItems.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                            <AlertCircle className="h-8 w-8 mb-2" />
                                            <span>Pilih item dari transaksi asli</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {returnedItems.map((item) => (
                                                <div key={item.id} className="p-3 rounded-lg border space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{item.productName}</span>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleRemoveReturnItem(item.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Label className="w-16 text-sm">Qty:</Label>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-7 w-7"
                                                                onClick={() => handleUpdateReturnItem(item.id, 'quantity', item.quantity - 1)}
                                                                disabled={item.quantity <= 1}
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </Button>
                                                            <Input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={(e) => handleUpdateReturnItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                                className="w-16 h-7 text-center"
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-7 w-7"
                                                                onClick={() => handleUpdateReturnItem(item.id, 'quantity', item.quantity + 1)}
                                                                disabled={item.quantity >= item.maxQuantity}
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <span className="text-sm text-muted-foreground">
                                                            / {item.maxQuantity}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Label className="w-16 text-sm">Kondisi:</Label>
                                                        <Select
                                                            value={item.condition}
                                                            onValueChange={(v) => handleUpdateReturnItem(item.id, 'condition', v)}
                                                        >
                                                            <SelectTrigger className="h-7 flex-1">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="baik">Baik</SelectItem>
                                                                <SelectItem value="rusak">Rusak</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {item.condition === 'rusak' && (
                                                        <Input
                                                            placeholder="Catatan kondisi kerusakan..."
                                                            value={item.conditionNote}
                                                            onChange={(e) => handleUpdateReturnItem(item.id, 'conditionNote', e.target.value)}
                                                            className="h-7 text-sm"
                                                        />
                                                    )}

                                                    <div className="text-right text-sm font-medium">
                                                        {formatCurrency(item.originalPrice * item.quantity)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* New Items (Replacement) */}
                {returnedItems.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ArrowRight className="h-5 w-5" />
                                        Item Pengganti
                                    </CardTitle>
                                    <CardDescription>
                                        Total nilai: {formatCurrency(newValue)}
                                    </CardDescription>
                                </div>
                                <Button onClick={() => setShowAddNewItemDialog(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tambah Item
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {newItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <Package className="h-8 w-8 mb-2" />
                                    <span>Belum ada item pengganti</span>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produk</TableHead>
                                            <TableHead>Harga</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {newItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="font-medium">{item.productName}</div>
                                                    <div className="text-sm text-muted-foreground">{item.barcode}</div>
                                                </TableCell>
                                                <TableCell>{formatCurrency(item.price)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            className="h-7 w-7"
                                                            onClick={() => handleUpdateNewItem(item.id, item.quantity - 1)}
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <Input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleUpdateNewItem(item.id, parseInt(e.target.value) || 1)}
                                                            className="w-16 h-7 text-center"
                                                        />
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            className="h-7 w-7"
                                                            onClick={() => handleUpdateNewItem(item.id, item.quantity + 1)}
                                                            disabled={item.quantity >= item.maxStock}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(item.price * item.quantity)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveNewItem(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Summary & Payment */}
                {returnedItems.length > 0 && newItems.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Ringkasan & Pembayaran</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Left: Reason & Notes */}
                                <div className="space-y-4">
                                    <div>
                                        <Label>Alasan Penukaran</Label>
                                        <Input
                                            placeholder="Contoh: Ukuran tidak cocok"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label>Catatan Tambahan</Label>
                                        <Textarea
                                            placeholder="Catatan lainnya..."
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Right: Payment Summary */}
                                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                                    <div className="flex justify-between">
                                        <span>Nilai Item Dikembalikan:</span>
                                        <span className="font-medium">{formatCurrency(originalValue)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Nilai Item Pengganti:</span>
                                        <span className="font-medium">{formatCurrency(newValue)}</span>
                                    </div>
                                    <hr />
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>{difference >= 0 ? 'Tambah Bayar:' : 'Kembalian:'}</span>
                                        <span className={difference >= 0 ? 'text-destructive' : 'text-green-600'}>
                                            {formatCurrency(Math.abs(difference))}
                                        </span>
                                    </div>

                                    {difference > 0 && (
                                        <>
                                            <div className="pt-2">
                                                <Label>Uang Dibayar Customer</Label>
                                                <Input
                                                    type="number"
                                                    value={amountPaid || ''}
                                                    onChange={(e) => setAmountPaid(parseInt(e.target.value) || 0)}
                                                    placeholder="0"
                                                    className="text-lg font-bold"
                                                />
                                            </div>
                                            {amountPaid >= difference && (
                                                <div className="flex justify-between text-green-600 font-medium">
                                                    <span>Kembalian:</span>
                                                    <span>{formatCurrency(amountPaid - difference)}</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <Button
                                        className="w-full mt-4"
                                        size="lg"
                                        onClick={handleProcessExchange}
                                        disabled={isProcessing || (difference > 0 && amountPaid < difference)}
                                    >
                                        {isProcessing ? 'Memproses...' : 'Proses Tukar Barang'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Add New Item Dialog */}
            <Dialog open={showAddNewItemDialog} onOpenChange={setShowAddNewItemDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pilih Item Pengganti</DialogTitle>
                        <DialogDescription>
                            Cari produk untuk dijadikan item pengganti
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari produk..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="pl-10"
                                autoFocus
                            />
                        </div>
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                                {filteredProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                                        onClick={() => handleAddNewItem(product)}
                                    >
                                        <div>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {product.barcode} | Stok: {product.stock.toko}
                                            </div>
                                        </div>
                                        <div className="font-medium">{formatCurrency(product.price)}</div>
                                    </div>
                                ))}
                                {productSearch && filteredProducts.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        Tidak ada produk ditemukan
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Receipt Dialog */}
            <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Struk Tukar Barang</DialogTitle>
                    </DialogHeader>

                    {/* Printable Receipt */}
                    <div
                        ref={receiptRef}
                        className="p-4 bg-white text-black text-sm font-mono exchange-receipt"
                        style={{
                            fontFamily: "'Courier New', Courier, monospace",
                            WebkitFontSmoothing: 'antialiased',
                            textRendering: 'geometricPrecision',
                            letterSpacing: '0.02em'
                        }}
                    >
                        <div className="text-center mb-4">
                            <h2 className="font-bold text-lg">{settings?.store_name || 'TOKO'}</h2>
                            <p className="text-xs">{settings?.store_address}</p>
                            <p className="text-xs">{settings?.store_phone}</p>
                            <p className="font-bold mt-2">STRUK TUKAR BARANG</p>
                        </div>

                        <div className="border-t border-dashed pt-2 mb-2">
                            <div className="flex justify-between">
                                <span>No. Tukar:</span>
                                <span className="font-bold">{exchangeResult?.exchangeNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>No. Struk Asli:</span>
                                <span>{exchangeResult?.originalSaleNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tanggal:</span>
                                <span>{exchangeResult?.date && format(exchangeResult.date, 'dd/MM/yyyy HH:mm')}</span>
                            </div>
                        </div>

                        <div className="border-t border-dashed pt-2 mb-2">
                            <p className="font-bold mb-1">Item Dikembalikan:</p>
                            {exchangeResult?.returnedItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span>{item.quantity}x {item.productName}</span>
                                    <span>-{formatCurrency(item.originalPrice * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-dashed pt-2 mb-2">
                            <p className="font-bold mb-1">Item Pengganti:</p>
                            {exchangeResult?.newItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span>{item.quantity}x {item.productName}</span>
                                    <span>{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-dashed pt-2">
                            <div className="flex justify-between">
                                <span>Nilai Tukar:</span>
                                <span>{formatCurrency(exchangeResult?.originalValue || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Nilai Pengganti:</span>
                                <span>{formatCurrency(exchangeResult?.newValue || 0)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Selisih:</span>
                                <span>{formatCurrency(Math.abs(exchangeResult?.difference || 0))}</span>
                            </div>
                            {(exchangeResult?.difference || 0) > 0 && (
                                <>
                                    <div className="flex justify-between">
                                        <span>Dibayar:</span>
                                        <span>{formatCurrency(exchangeResult?.amountPaid || 0)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span>Kembalian:</span>
                                        <span>{formatCurrency(exchangeResult?.changeGiven || 0)}</span>
                                    </div>
                                </>
                            )}
                            {(exchangeResult?.difference || 0) < 0 && (
                                <div className="flex justify-between font-bold">
                                    <span>Refund:</span>
                                    <span>{formatCurrency(Math.abs(exchangeResult?.difference || 0))}</span>
                                </div>
                            )}
                        </div>

                        <div className="text-center mt-4 text-xs">
                            <p>Terima kasih atas kunjungan Anda</p>
                            <p>Barang yang sudah ditukar tidak dapat ditukar kembali</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
                            Tutup
                        </Button>
                        <Button onClick={() => handlePrint()}>
                            <Printer className="h-4 w-4 mr-2" />
                            Cetak
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
