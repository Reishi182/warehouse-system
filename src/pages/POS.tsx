import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    ShoppingCart,
    CheckCircle2,
    Trash2,
    Plus,
    Minus,
    Receipt,
    CreditCard,
    Banknote,
    Search,
    Package,
    Grid3X3,
    List,
    X,
    Percent,
    Printer,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
import POSReceipt from '@/components/pos/POSReceipt';
import { ProductCard } from '@/components/pos/ProductCard';
import { ProductListItem } from '@/components/pos/ProductListItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { Location, PaymentMethod, Product } from '@/types';
import { cn } from '@/lib/utils';
import { useReactToPrint } from 'react-to-print';

type CartItem = {
    product: Product;
    quantity: number;
    discount: number;
};

type LastSaleData = {
    saleNumber: string;
    total: number;
    subtotal: number;
    orderDiscount: number;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        discount: number;
        subtotal: number;
    }>;
    method: PaymentMethod;
    amountPaid: number;
    change: number;
    date: Date;
};

type ViewMode = 'grid' | 'list';

export default function POS() {
    const { products, getProductByBarcode, createSale, sales, loading } = useData();
    const { profile } = useAuth();
    const { toast } = useToast();
    const { data: storeSettings } = useStoreSettings();

    const [stockLocation, setStockLocation] = useState<Location>('toko');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [items, setItems] = useState<CartItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [orderDiscount, setOrderDiscount] = useState(0);
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number | 'all'>(10);

    // Checkout confirmation dialog
    const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
    const [amountPaid, setAmountPaid] = useState(0);

    // Receipt dialog
    const [showReceiptDialog, setShowReceiptDialog] = useState(false);
    const [lastSale, setLastSale] = useState<LastSaleData | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    // Today's stats
    const todayIso = new Date().toISOString().slice(0, 10);
    const salesToday = useMemo(() =>
        sales.filter(s => s.created_at.slice(0, 10) === todayIso),
        [sales, todayIso]
    );

    const todayStats = useMemo(() => {
        const count = salesToday.length;
        const total = salesToday.reduce((acc, s) => acc + s.total_amount, 0);
        return { count, total };
    }, [salesToday]);

    // Filter products based on search
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.barcode.toLowerCase().includes(query)
        );
    }, [products, searchQuery]);

    // Paginated products
    const paginatedProducts = useMemo(() => {
        if (pageSize === 'all') return filteredProducts;
        const startIndex = (currentPage - 1) * pageSize;
        return filteredProducts.slice(startIndex, startIndex + pageSize);
    }, [filteredProducts, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        if (pageSize === 'all') return 1;
        return Math.ceil(filteredProducts.length / pageSize);
    }, [filteredProducts.length, pageSize]);

    // Reset to page 1 when search or pageSize changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, pageSize]);

    // Print hook - must be before any early returns
    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: lastSale?.saleNumber || 'Receipt',
    });

    // Calculate totals - must be before early returns
    const subtotal = useMemo(() => {
        return items.reduce((acc, it) => {
            const itemTotal = it.product.price * it.quantity;
            const itemDiscount = itemTotal * (it.discount / 100);
            return acc + (itemTotal - itemDiscount);
        }, 0);
    }, [items]);

    const totalAmount = useMemo(() => {
        const discountAmount = subtotal * (orderDiscount / 100);
        return subtotal - discountAmount;
    }, [subtotal, orderDiscount]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // F1 - Focus search
            if (e.key === 'F1') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // F2 - Toggle payment method
            if (e.key === 'F2') {
                e.preventDefault();
                setPaymentMethod(prev => prev === 'cash' ? 'transfer' : 'cash');
            }
            // F12 - Checkout
            if (e.key === 'F12' && items.length > 0) {
                e.preventDefault();
                openCheckoutDialog();
            }
            // Escape - Clear search
            if (e.key === 'Escape') {
                setSearchQuery('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items]);

    const addToCart = useCallback((product: Product) => {
        const availableStock = product.stock[stockLocation];

        if (availableStock <= 0) {
            toast({
                title: 'Stok habis',
                description: `${product.name} tidak tersedia di ${stockLocation}`,
                variant: 'destructive'
            });
            return;
        }

        setItems((prev) => {
            const idx = prev.findIndex((it) => it.product.id === product.id);
            if (idx >= 0) {
                const next = [...prev];
                const newQty = next[idx].quantity + 1;
                if (newQty > availableStock) {
                    toast({
                        title: 'Stok tidak cukup',
                        description: `Maksimal ${availableStock} unit tersedia`,
                        variant: 'destructive'
                    });
                    return prev;
                }
                next[idx] = { ...next[idx], quantity: newQty };
                return next;
            }
            return [...prev, { product, quantity: 1, discount: 0 }];
        });
    }, [stockLocation, toast]);

    if (loading) {
        return (
            <MainLayout title="Point of Sale" subtitle="Sistem kasir untuk penjualan">
                <PageSkeleton variant="dashboard" />
            </MainLayout>
        );
    }

    const handleScan = (barcode: string) => {
        const product = getProductByBarcode(barcode);
        if (!product) {
            toast({
                title: 'Produk tidak ditemukan',
                description: `Barcode: ${barcode}`,
                variant: 'destructive'
            });
            return;
        }
        addToCart(product);
    };

    const updateQty = (productId: string, qty: number) => {
        if (qty < 0) return;
        setItems((prev) =>
            prev
                .map((it) => (it.product.id === productId ? { ...it, quantity: qty } : it))
                .filter((it) => it.quantity > 0),
        );
    };

    const updateItemDiscount = (productId: string, discount: number) => {
        setItems((prev) =>
            prev.map((it) =>
                it.product.id === productId
                    ? { ...it, discount: Math.min(100, Math.max(0, discount)) }
                    : it
            ),
        );
    };

    const removeItem = (productId: string) => {
        setItems((prev) => prev.filter((it) => it.product.id !== productId));
    };

    const clearCart = () => {
        setItems([]);
        setOrderDiscount(0);
    };

    const openCheckoutDialog = () => {
        if (items.length === 0) return;
        setAmountPaid(Math.ceil(totalAmount / 1000) * 1000); // Round up to nearest 1000
        setShowCheckoutDialog(true);
    };

    const handleConfirmCheckout = async () => {
        if (items.length === 0) return;
        if (paymentMethod === 'cash' && amountPaid < totalAmount) {
            toast({
                title: 'Uang tidak cukup',
                description: 'Jumlah bayar harus minimal sama dengan total',
                variant: 'destructive'
            });
            return;
        }

        setIsProcessing(true);
        setShowCheckoutDialog(false);

        try {
            const now = new Date();
            const yyyy = String(now.getFullYear());
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
            const saleNumber = `INV/${yyyy}${mm}${dd}-${rand}`;

            const changeAmount = paymentMethod === 'cash' ? Math.max(0, amountPaid - totalAmount) : 0;
            const finalAmountPaid = paymentMethod === 'cash' ? amountPaid : totalAmount;

            const ok = await createSale({
                paymentMethod,
                stockLocation,
                items: items.map((it) => ({
                    productId: it.product.id,
                    quantity: it.quantity,
                    discount: it.discount
                })),
                orderDiscount,
                amountPaid: finalAmountPaid,
            });

            if (ok) {
                // Create detailed last sale data for receipt
                const saleItems = items.map(it => {
                    const itemTotal = it.product.price * it.quantity;
                    const itemDiscountAmount = itemTotal * (it.discount / 100);
                    return {
                        name: it.product.name,
                        quantity: it.quantity,
                        price: it.product.price,
                        discount: it.discount,
                        subtotal: Math.round(itemTotal - itemDiscountAmount),
                    };
                });

                setLastSale({
                    saleNumber,
                    total: totalAmount,
                    subtotal,
                    orderDiscount,
                    items: saleItems,
                    method: paymentMethod,
                    amountPaid: finalAmountPaid,
                    change: changeAmount,
                    date: now,
                });

                setShowReceiptDialog(true);
                toast({
                    title: '✅ Penjualan berhasil!',
                    description: `Total Rp ${totalAmount.toLocaleString('id-ID')}`,
                });
                setItems([]);
                setOrderDiscount(0);
                setAmountPaid(0);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // ProductCard and ProductListItem are now imported from @/components/pos/*

    return (
        <MainLayout title="Point of Sale" subtitle="Sistem kasir untuk penjualan">
            <div className="flex gap-4 h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] md:pr-[21rem] lg:pr-[25rem]">
                {/* Left Panel - Products */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Search & Controls */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari produk..."
                                className="pl-9 pr-9 rounded-xl h-11"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="hidden sm:block">
                            <BarcodeScanner onScan={handleScan} placeholder="Scan barcode..." />
                        </div>

                        <Select value={stockLocation} onValueChange={(v: Location) => setStockLocation(v)}>
                            <SelectTrigger className="w-28 md:w-32 rounded-xl h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="toko" className="rounded-lg">🏪 Toko</SelectItem>
                                <SelectItem value="gudang" className="rounded-lg">📦 Gudang</SelectItem>
                            </SelectContent>
                        </Select>

                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="hidden sm:block">
                            <TabsList className="rounded-xl">
                                <TabsTrigger value="grid" className="rounded-lg px-3">
                                    <Grid3X3 className="w-4 h-4" />
                                </TabsTrigger>
                                <TabsTrigger value="list" className="rounded-lg px-3">
                                    <List className="w-4 h-4" />
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Mobile Barcode Scanner */}
                    <div className="sm:hidden mb-3">
                        <BarcodeScanner onScan={handleScan} placeholder="Scan barcode..." />
                    </div>

                    {/* Products Grid/List */}
                    <ScrollArea className="flex-1 pr-2 md:pr-4">
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                                {paginatedProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        stockLocation={stockLocation}
                                        onAddToCart={addToCart}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {paginatedProducts.map((product) => (
                                    <ProductListItem
                                        key={product.id}
                                        product={product}
                                        stockLocation={stockLocation}
                                        onAddToCart={addToCart}
                                    />
                                ))}
                            </div>
                        )}

                        {filteredProducts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                    <Package className="w-10 h-10 opacity-40" />
                                </div>
                                <p className="text-lg font-semibold text-foreground/70">Tidak ada produk ditemukan</p>
                                <p className="text-sm mt-1">Coba kata kunci lain atau scan barcode</p>
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {filteredProducts.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Tampilkan:</span>
                                    <Select
                                        value={pageSize === 'all' ? 'all' : String(pageSize)}
                                        onValueChange={(v) => setPageSize(v === 'all' ? 'all' : parseInt(v))}
                                    >
                                        <SelectTrigger className="w-20 h-8 text-xs rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="5" className="text-xs">5</SelectItem>
                                            <SelectItem value="10" className="text-xs">10</SelectItem>
                                            <SelectItem value="20" className="text-xs">20</SelectItem>
                                            <SelectItem value="all" className="text-xs">Semua</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-xs text-muted-foreground">
                                        dari {filteredProducts.length} produk
                                    </span>
                                </div>

                                {pageSize !== 'all' && totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <span className="text-xs font-medium px-2">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Right Panel - Cart (Desktop: Fixed Full Height - Rendered via Portal) */}
                {createPortal(
                    <div className="hidden md:flex fixed top-0 right-0 h-screen w-80 lg:w-96 flex-col border-l bg-card shadow-xl z-[60]">
                        {/* Header */}
                        <div className="px-4 py-3 border-b bg-muted/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-base font-semibold">
                                    <ShoppingCart className="w-4 h-4 text-primary" />
                                    Keranjang
                                    {items.length > 0 && (
                                        <Badge variant="secondary" className="rounded-full text-xs px-2">
                                            {items.reduce((acc, it) => acc + it.quantity, 0)}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="rounded-full text-xs px-2 py-0.5">
                                        <Receipt className="w-3 h-3 mr-1" />
                                        {todayStats.count} transaksi
                                    </Badge>
                                    <Badge className="rounded-full bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-xs px-2 py-0.5">
                                        Rp {todayStats.total.toLocaleString('id-ID')}
                                    </Badge>
                                </div>
                                {items.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 h-6 text-xs rounded-lg px-2">
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Hapus
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-hidden">
                            {items.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                                    <ShoppingCart className="w-12 h-12 opacity-30 mb-3" />
                                    <p className="text-sm font-medium">Keranjang kosong</p>
                                    <p className="text-xs mt-1">Klik produk untuk menambahkan</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-full px-3 py-2">
                                    <div className="space-y-2">
                                        {items.map((it) => (
                                            <div key={it.product.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border">
                                                <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {it.product.image_url ? (
                                                        <img src={it.product.image_url} alt={it.product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package className="w-4 h-4 text-muted-foreground/30" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-xs truncate">{it.product.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Rp {it.product.price.toLocaleString('id-ID')}
                                                        {it.discount > 0 && <span className="ml-1 text-green-600">-{it.discount}%</span>}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                    <Button size="icon" variant="ghost" onClick={() => updateQty(it.product.id, it.quantity - 1)} className="h-6 w-6 rounded-md">
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <span className="w-6 text-center text-xs font-medium">{it.quantity}</span>
                                                    <Button size="icon" variant="ghost" onClick={() => updateQty(it.product.id, it.quantity + 1)} className="h-6 w-6 rounded-md">
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <div className="text-right flex-shrink-0 flex items-center gap-1">
                                                    <p className="font-semibold text-xs">{((it.product.price * it.quantity) * (1 - it.discount / 100)).toLocaleString('id-ID')}</p>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md" onClick={() => removeItem(it.product.id)}>
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>

                        {/* Order Summary Footer */}
                        {items.length > 0 && (
                            <div className="border-t p-3 space-y-2 bg-background">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground">Diskon</Label>
                                    <div className="relative flex-1">
                                        <Input type="number" min={0} max={100} value={orderDiscount} onChange={(e) => setOrderDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="h-7 text-xs rounded-md pr-6" />
                                        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                    </div>
                                    <span className="text-xs text-red-500 font-medium">-Rp {(subtotal * orderDiscount / 100).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center pt-1 border-t">
                                    <span className="font-semibold text-sm">Total</span>
                                    <span className="text-lg font-bold text-primary">Rp {totalAmount.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')} className={cn("h-8 text-xs rounded-lg", paymentMethod === 'cash' ? "bg-green-600 hover:bg-green-700 text-white" : "")}>
                                        <Banknote className="w-3 h-3 mr-1" />Tunai
                                    </Button>
                                    <Button variant={paymentMethod === 'transfer' ? 'default' : 'outline'} onClick={() => setPaymentMethod('transfer')} className={cn("h-8 text-xs rounded-lg", paymentMethod === 'transfer' ? "bg-blue-500 hover:bg-blue-600" : "")}>
                                        <CreditCard className="w-3 h-3 mr-1" />Transfer
                                    </Button>
                                </div>
                                <Button className={cn("w-full h-10 text-sm font-semibold rounded-lg", "bg-primary hover:bg-primary/90")} disabled={items.length === 0 || isProcessing} onClick={openCheckoutDialog}>
                                    {isProcessing ? (<><span className="animate-spin mr-2">⏳</span>Memproses...</>) : (<><Receipt className="w-4 h-4 mr-2" />Bayar</>)}
                                </Button>
                            </div>
                        )}
                    </div>
                    , document.body)}

                {/* Mobile Cart - Floating Button + Drawer */}
                <div className="md:hidden">
                    <Sheet open={cartDrawerOpen} onOpenChange={setCartDrawerOpen}>
                        <SheetTrigger asChild>
                            <Button className={cn("fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full shadow-xl", "bg-primary hover:bg-primary/90", items.length > 0 && "animate-pulse")}>
                                <ShoppingCart className="w-6 h-6" />
                                {items.length > 0 && (
                                    <Badge className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs bg-destructive">
                                        {items.reduce((acc, it) => acc + it.quantity, 0)}
                                    </Badge>
                                )}
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col">
                            <SheetHeader className="px-4 py-3 border-b bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <SheetTitle className="flex items-center gap-2 text-base">
                                        <ShoppingCart className="w-4 h-4 text-primary" />
                                        Keranjang
                                        {items.length > 0 && (
                                            <Badge variant="secondary" className="rounded-full text-xs px-2">{items.reduce((acc, it) => acc + it.quantity, 0)}</Badge>
                                        )}
                                    </SheetTitle>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="rounded-full text-xs px-2 py-0.5"><Receipt className="w-3 h-3 mr-1" />{todayStats.count} transaksi</Badge>
                                        <Badge className="rounded-full bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-xs px-2 py-0.5">Rp {todayStats.total.toLocaleString('id-ID')}</Badge>
                                    </div>
                                    {items.length > 0 && (
                                        <Button variant="outline" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 h-6 text-xs rounded-lg px-2"><Trash2 className="w-3 h-3 mr-1" />Hapus</Button>
                                    )}
                                </div>
                            </SheetHeader>
                            <div className="flex-1 overflow-hidden">
                                {items.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                                        <ShoppingCart className="w-12 h-12 opacity-30 mb-3" />
                                        <p className="text-sm font-medium">Keranjang kosong</p>
                                        <p className="text-xs mt-1">Klik produk untuk menambahkan</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-full px-3 py-2">
                                        <div className="space-y-2">
                                            {items.map((it) => (
                                                <div key={it.product.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border">
                                                    <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        {it.product.image_url ? <img src={it.product.image_url} alt={it.product.name} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-muted-foreground/30" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-xs truncate">{it.product.name}</p>
                                                        <p className="text-xs text-muted-foreground">Rp {it.product.price.toLocaleString('id-ID')}{it.discount > 0 && <span className="ml-1 text-green-600">-{it.discount}%</span>}</p>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <Button size="icon" variant="ghost" onClick={() => updateQty(it.product.id, it.quantity - 1)} className="h-6 w-6 rounded-md"><Minus className="w-3 h-3" /></Button>
                                                        <span className="w-6 text-center text-xs font-medium">{it.quantity}</span>
                                                        <Button size="icon" variant="ghost" onClick={() => updateQty(it.product.id, it.quantity + 1)} className="h-6 w-6 rounded-md"><Plus className="w-3 h-3" /></Button>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 flex items-center gap-1">
                                                        <p className="font-semibold text-xs">{((it.product.price * it.quantity) * (1 - it.discount / 100)).toLocaleString('id-ID')}</p>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md" onClick={() => removeItem(it.product.id)}><X className="w-3 h-3" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                            {items.length > 0 && (
                                <div className="border-t p-3 space-y-2 bg-background">
                                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span>Rp {subtotal.toLocaleString('id-ID')}</span></div>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs text-muted-foreground">Diskon</Label>
                                        <div className="relative flex-1"><Input type="number" min={0} max={100} value={orderDiscount} onChange={(e) => setOrderDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="h-7 text-xs rounded-md pr-6" /><Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" /></div>
                                        <span className="text-xs text-red-500 font-medium">-Rp {(subtotal * orderDiscount / 100).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t"><span className="font-semibold text-sm">Total</span><span className="text-lg font-bold text-primary">Rp {totalAmount.toLocaleString('id-ID')}</span></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')} className={cn("h-8 text-xs rounded-lg", paymentMethod === 'cash' ? "bg-green-600 hover:bg-green-700 text-white" : "")}><Banknote className="w-3 h-3 mr-1" />Tunai</Button>
                                        <Button variant={paymentMethod === 'transfer' ? 'default' : 'outline'} onClick={() => setPaymentMethod('transfer')} className={cn("h-8 text-xs rounded-lg", paymentMethod === 'transfer' ? "bg-blue-500 hover:bg-blue-600" : "")}><CreditCard className="w-3 h-3 mr-1" />Transfer</Button>
                                    </div>
                                    <Button className={cn("w-full h-10 text-sm font-semibold rounded-lg", "bg-primary hover:bg-primary/90")} disabled={items.length === 0 || isProcessing} onClick={() => { setCartDrawerOpen(false); openCheckoutDialog(); }}>
                                        {isProcessing ? (<><span className="animate-spin mr-2">⏳</span>Memproses...</>) : (<><Receipt className="w-4 h-4 mr-2" />Bayar</>)}
                                    </Button>
                                </div>
                            )}
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Checkout Confirmation Dialog */}
            <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
                <DialogContent className="max-w-md rounded-2xl border-2 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
                    <DialogHeader className="relative z-10">
                        <DialogTitle className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 shadow-sm">
                                <ShoppingCart className="w-5 h-5 text-primary" />
                            </div>
                            Konfirmasi Pembayaran
                        </DialogTitle>
                        <DialogDescription>
                            Periksa detail transaksi sebelum melanjutkan
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 relative z-10">
                        {/* Order Summary */}
                        <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl space-y-2 border">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal ({items.length} item)</span>
                                <span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            {orderDiscount > 0 && (
                                <div className="flex justify-between text-sm text-emerald-600">
                                    <span>Diskon ({orderDiscount}%)</span>
                                    <span>-Rp {Math.round(subtotal * orderDiscount / 100).toLocaleString('id-ID')}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                <span>Total</span>
                                <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                                    Rp {totalAmount.toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>

                        {/* Payment Method Display */}
                        <div className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                            paymentMethod === 'cash'
                                ? "bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/30"
                                : "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30"
                        )}>
                            <div className={cn(
                                "p-2 rounded-lg",
                                paymentMethod === 'cash' ? "bg-emerald-500/20" : "bg-blue-500/20"
                            )}>
                                {paymentMethod === 'cash' ? (
                                    <Banknote className="w-6 h-6 text-emerald-600" />
                                ) : (
                                    <CreditCard className="w-6 h-6 text-blue-600" />
                                )}
                            </div>
                            <div>
                                <p className="font-semibold">Metode Pembayaran</p>
                                <p className="text-sm text-muted-foreground">
                                    {paymentMethod === 'cash' ? 'Tunai' : 'Transfer Bank'}
                                </p>
                            </div>
                        </div>

                        {/* Cash Payment Input */}
                        {paymentMethod === 'cash' && (
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Uang Diterima</Label>
                                    <Input
                                        type="number"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(parseInt(e.target.value) || 0)}
                                        className="text-lg h-12 font-bold text-right rounded-xl"
                                        min={totalAmount}
                                    />
                                </div>

                                {/* Quick Amount Buttons */}
                                <div className="grid grid-cols-4 gap-2">
                                    {[totalAmount, Math.ceil(totalAmount / 10000) * 10000, Math.ceil(totalAmount / 50000) * 50000, Math.ceil(totalAmount / 100000) * 100000].map((amount, idx) => (
                                        <Button
                                            key={idx}
                                            variant={amountPaid === amount ? 'default' : 'outline'}
                                            size="sm"
                                            className="rounded-lg text-xs"
                                            onClick={() => setAmountPaid(amount)}
                                        >
                                            {amount >= 1000 ? `${(amount / 1000).toFixed(0)}k` : amount}
                                        </Button>
                                    ))}
                                </div>

                                {/* Change Display */}
                                {amountPaid >= totalAmount && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                        <div className="flex justify-between items-center">
                                            <span className="text-green-700 dark:text-green-400 font-medium">Kembalian</span>
                                            <span className="text-2xl font-bold text-green-600">
                                                Rp {(amountPaid - totalAmount).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowCheckoutDialog(false)} className="rounded-xl">
                            Batal
                        </Button>
                        <Button
                            onClick={handleConfirmCheckout}
                            disabled={isProcessing || (paymentMethod === 'cash' && amountPaid < totalAmount)}
                            className="rounded-xl"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Konfirmasi Bayar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Dialog */}
            <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
                <DialogContent className="max-w-sm p-0 overflow-hidden bg-gray-100">
                    <div className="p-4 bg-white border-b">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                Transaksi Berhasil!
                            </DialogTitle>
                        </DialogHeader>
                    </div>

                    {/* Receipt Preview */}
                    <div className="p-4 max-h-[60vh] overflow-y-auto">
                        {lastSale && (
                            <POSReceipt
                                ref={receiptRef}
                                saleNumber={lastSale.saleNumber}
                                cashierName={profile?.name || 'Kasir'}
                                date={lastSale.date}
                                items={lastSale.items}
                                subtotal={lastSale.subtotal}
                                orderDiscount={lastSale.orderDiscount}
                                total={lastSale.total}
                                paymentMethod={lastSale.method}
                                amountPaid={lastSale.amountPaid}
                                change={lastSale.change}
                                storeName={storeSettings?.store_name}
                                storeAddress={storeSettings?.store_address}
                            />
                        )}
                    </div>

                    <div className="p-4 bg-white border-t flex gap-2">
                        <Button variant="outline" onClick={() => setShowReceiptDialog(false)} className="flex-1 rounded-xl">
                            Tutup
                        </Button>
                        <Button onClick={() => handlePrint()} className="flex-1 rounded-xl">
                            <Printer className="w-4 h-4 mr-2" />
                            Cetak Struk
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout >
    );
}
