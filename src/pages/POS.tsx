import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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
    Keyboard,
    Printer
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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

    const [stockLocation, setStockLocation] = useState<Location>('toko');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [items, setItems] = useState<CartItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [orderDiscount, setOrderDiscount] = useState(0);
    const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');

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

    const addToCart = useCallback((product: Product) => {
        if (product.stock[stockLocation] <= 0) {
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
                if (newQty > product.stock[stockLocation]) {
                    toast({
                        title: 'Stok tidak cukup',
                        description: `Maksimal ${product.stock[stockLocation]} unit`,
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
            {/* Mobile Tab Bar */}
            <div className="md:hidden flex gap-2 mb-4">
                <Button
                    variant={mobileTab === 'products' ? 'default' : 'outline'}
                    onClick={() => setMobileTab('products')}
                    className="flex-1 rounded-xl"
                >
                    <Package className="w-4 h-4 mr-2" />
                    Produk
                </Button>
                <Button
                    variant={mobileTab === 'cart' ? 'default' : 'outline'}
                    onClick={() => setMobileTab('cart')}
                    className="flex-1 rounded-xl relative"
                >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Keranjang
                    {items.length > 0 && (
                        <Badge className="absolute -top-2 -right-2 rounded-full px-2 py-0.5 text-xs">
                            {items.reduce((acc, it) => acc + it.quantity, 0)}
                        </Badge>
                    )}
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-180px)] md:h-[calc(100vh-140px)]">
                {/* Left Panel - Products (hidden on mobile when cart is active) */}
                <div className={cn(
                    "flex-1 flex flex-col min-w-0",
                    mobileTab === 'cart' && "hidden md:flex"
                )}>
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                                {filteredProducts.map((product) => (
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
                                {filteredProducts.map((product) => (
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
                    </ScrollArea>
                </div>

                {/* Right Panel - Cart (hidden on mobile when products is active) */}
                <Card className={cn(
                    "w-full md:w-96 flex flex-col rounded-2xl border-2 shadow-xl bg-card",
                    mobileTab === 'products' && "hidden md:flex"
                )}>
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                Keranjang
                                {items.length > 0 && (
                                    <Badge variant="secondary" className="rounded-full">
                                        {items.reduce((acc, it) => acc + it.quantity, 0)}
                                    </Badge>
                                )}
                            </CardTitle>
                            {items.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Hapus
                                </Button>
                            )}
                        </div>
                        {/* Today's Stats */}
                        <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="rounded-full">
                                <Receipt className="w-3 h-3 mr-1" />
                                {todayStats.count} transaksi
                            </Badge>
                            <Badge className="rounded-full bg-green-500/10 text-green-600 border-green-200">
                                Rp {todayStats.total.toLocaleString('id-ID')}
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
                        {/* Cart Items */}
                        {items.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                                    <ShoppingCart className="w-10 h-10 opacity-40" />
                                </div>
                                <p className="font-semibold text-foreground/70">Keranjang kosong</p>
                                <p className="text-sm mt-1">Klik produk untuk menambahkan</p>
                            </div>
                        ) : (
                            <ScrollArea className="flex-1 -mx-4 px-4">
                                <div className="space-y-3">
                                    {items.map((it) => (
                                        <div
                                            key={it.product.id}
                                            className="flex items-start gap-3 p-3 rounded-xl bg-background border"
                                        >
                                            {/* Product Image */}
                                            <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {it.product.image_url ? (
                                                    <img src={it.product.image_url} alt={it.product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-6 h-6 text-muted-foreground/30" />
                                                )}
                                            </div>

                                            {/* Product Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{it.product.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Rp {it.product.price.toLocaleString('id-ID')}
                                                    {it.discount > 0 && (
                                                        <span className="ml-1 text-green-600">-{it.discount}%</span>
                                                    )}
                                                </p>

                                                {/* Quantity Controls */}
                                                <div className="flex items-center gap-1 mt-2">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => updateQty(it.product.id, it.quantity - 1)}
                                                        className="rounded-full h-7 w-7"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={it.quantity}
                                                        onChange={(e) => updateQty(it.product.id, parseInt(e.target.value) || 0)}
                                                        className="w-14 text-center h-7 text-sm rounded-lg px-1"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => updateQty(it.product.id, it.quantity + 1)}
                                                        className="rounded-full h-7 w-7"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Subtotal & Delete */}
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-bold text-sm">
                                                    Rp {((it.product.price * it.quantity) * (1 - it.discount / 100)).toLocaleString('id-ID')}
                                                </p>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full mt-1"
                                                    onClick={() => removeItem(it.product.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}

                        {/* Order Summary */}
                        {items.length > 0 && (
                            <div className="pt-4 mt-4 border-t space-y-3">
                                {/* Subtotal */}
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                                </div>

                                {/* Discount Input */}
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm text-muted-foreground flex-shrink-0">Diskon</Label>
                                    <div className="relative flex-1">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={orderDiscount}
                                            onChange={(e) => setOrderDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                            className="h-8 text-sm rounded-lg pr-8"
                                        />
                                        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm text-red-500 font-medium">
                                        -Rp {(subtotal * orderDiscount / 100).toLocaleString('id-ID')}
                                    </span>
                                </div>

                                {/* Total */}
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="font-semibold">Total</span>
                                    <span className="text-2xl font-bold text-primary">
                                        Rp {totalAmount.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                {/* Payment Method */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                                        onClick={() => setPaymentMethod('cash')}
                                        className="rounded-xl h-12"
                                    >
                                        <Banknote className="w-5 h-5 mr-2" />
                                        Tunai (F2)
                                    </Button>
                                    <Button
                                        variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                                        onClick={() => setPaymentMethod('transfer')}
                                        className="rounded-xl h-12"
                                    >
                                        <CreditCard className="w-5 h-5 mr-2" />
                                        Transfer
                                    </Button>
                                </div>

                                {/* Checkout Button */}
                                <Button
                                    size="lg"
                                    className="w-full rounded-xl h-14 text-lg font-bold shadow-lg shadow-primary/30"
                                    disabled={items.length === 0 || isProcessing}
                                    onClick={openCheckoutDialog}
                                >
                                    {isProcessing ? (
                                        <>
                                            <span className="animate-spin mr-2">⏳</span>
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            <Receipt className="w-6 h-6 mr-2" />
                                            Bayar (F12)
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Keyboard Shortcuts Hint */}
                <div className="fixed bottom-20 md:bottom-4 left-4 flex gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="rounded-full">
                        <Keyboard className="w-3 h-3 mr-1" />
                        F1: Cari
                    </Badge>
                    <Badge variant="outline" className="rounded-full">F2: Bayar</Badge>
                    <Badge variant="outline" className="rounded-full">F12: Checkout</Badge>
                    <Badge variant="outline" className="rounded-full">ESC: Clear</Badge>
                </div>
            </div>

            {/* Checkout Confirmation Dialog */}
            <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            Konfirmasi Pembayaran
                        </DialogTitle>
                        <DialogDescription>
                            Periksa detail transaksi sebelum melanjutkan
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Order Summary */}
                        <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal ({items.length} item)</span>
                                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            {orderDiscount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Diskon ({orderDiscount}%)</span>
                                    <span>-Rp {Math.round(subtotal * orderDiscount / 100).toLocaleString('id-ID')}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                <span>Total</span>
                                <span className="text-primary">Rp {totalAmount.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        {/* Payment Method Display */}
                        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
                            {paymentMethod === 'cash' ? (
                                <Banknote className="w-6 h-6 text-primary" />
                            ) : (
                                <CreditCard className="w-6 h-6 text-primary" />
                            )}
                            <div>
                                <p className="font-medium">Metode Pembayaran</p>
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
        </MainLayout>
    );
}
