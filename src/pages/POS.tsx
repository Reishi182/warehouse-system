import { useMemo, useState, useRef, useEffect } from 'react';
import {
    ShoppingCart,
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
    Calculator,
    Keyboard
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
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
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { Location, PaymentMethod, Product } from '@/types';
import { cn } from '@/lib/utils';

type CartItem = {
    product: Product;
    quantity: number;
    discount: number; // percentage discount per item
};

type ViewMode = 'grid' | 'list';

export default function POS() {
    const { products, getProductByBarcode, createSale, sales, loading } = useData();
    const { toast } = useToast();

    const [stockLocation, setStockLocation] = useState<Location>('toko');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [items, setItems] = useState<CartItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showReceiptDialog, setShowReceiptDialog] = useState(false);
    const [lastSale, setLastSale] = useState<{ total: number; items: CartItem[]; method: PaymentMethod } | null>(null);
    const [orderDiscount, setOrderDiscount] = useState(0); // percentage

    const searchInputRef = useRef<HTMLInputElement>(null);

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
                handleCheckout();
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

    const addToCart = (product: Product) => {
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
    };

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

    const handleCheckout = async () => {
        if (items.length === 0) return;

        setIsProcessing(true);
        try {
            const ok = await createSale({
                paymentMethod,
                stockLocation,
                items: items.map((it) => ({ productId: it.product.id, quantity: it.quantity })),
            });

            if (ok) {
                setLastSale({ total: totalAmount, items: [...items], method: paymentMethod });
                setShowReceiptDialog(true);
                toast({
                    title: '✅ Penjualan berhasil!',
                    description: `Total Rp ${totalAmount.toLocaleString('id-ID')}`,
                });
                setItems([]);
                setOrderDiscount(0);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const ProductCard = ({ product }: { product: Product }) => {
        const stock = product.stock[stockLocation];
        const isOutOfStock = stock <= 0;

        return (
            <button
                onClick={() => !isOutOfStock && addToCart(product)}
                disabled={isOutOfStock}
                className={cn(
                    "group relative flex flex-col rounded-xl border bg-card p-3 text-left transition-all hover:shadow-lg hover:border-primary/50",
                    isOutOfStock && "opacity-50 cursor-not-allowed"
                )}
            >
                {/* Product Image */}
                <div className="aspect-square w-full rounded-lg bg-muted/50 mb-2 overflow-hidden flex items-center justify-center">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                    ) : (
                        <Package className="w-10 h-10 text-muted-foreground/30" />
                    )}
                </div>

                {/* Stock Badge */}
                <Badge
                    variant={isOutOfStock ? "destructive" : stock < 10 ? "secondary" : "outline"}
                    className="absolute top-2 right-2 text-xs"
                >
                    {isOutOfStock ? 'Habis' : `${stock}`}
                </Badge>

                {/* Product Info */}
                <h4 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h4>
                <p className="text-xs text-muted-foreground mb-1">{product.barcode}</p>
                <p className="font-bold text-primary">
                    Rp {product.price.toLocaleString('id-ID')}
                </p>
            </button>
        );
    };

    const ProductListItem = ({ product }: { product: Product }) => {
        const stock = product.stock[stockLocation];
        const isOutOfStock = stock <= 0;

        return (
            <button
                onClick={() => !isOutOfStock && addToCart(product)}
                disabled={isOutOfStock}
                className={cn(
                    "flex items-center gap-3 w-full p-3 rounded-lg border bg-card hover:shadow-md hover:border-primary/50 transition-all text-left",
                    isOutOfStock && "opacity-50 cursor-not-allowed"
                )}
            >
                {/* Product Image */}
                <div className="w-12 h-12 rounded-lg bg-muted/50 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <Package className="w-6 h-6 text-muted-foreground/30" />
                    )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{product.name}</h4>
                    <p className="text-xs text-muted-foreground">{product.barcode}</p>
                </div>

                {/* Price & Stock */}
                <div className="text-right">
                    <p className="font-bold text-primary">Rp {product.price.toLocaleString('id-ID')}</p>
                    <Badge variant={isOutOfStock ? "destructive" : "outline"} className="text-xs">
                        {isOutOfStock ? 'Habis' : `Stok: ${stock}`}
                    </Badge>
                </div>
            </button>
        );
    };

    return (
        <MainLayout title="Point of Sale" subtitle="Sistem kasir untuk penjualan">
            <div className="flex gap-4 h-[calc(100vh-140px)]">
                {/* Left Panel - Products */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Search & Controls */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari produk... (F1)"
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

                        <BarcodeScanner onScan={handleScan} placeholder="Scan barcode..." />

                        <Select value={stockLocation} onValueChange={(v: Location) => setStockLocation(v)}>
                            <SelectTrigger className="w-32 rounded-xl h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="toko" className="rounded-lg">🏪 Toko</SelectItem>
                                <SelectItem value="gudang" className="rounded-lg">📦 Gudang</SelectItem>
                                <SelectItem value="lainnya" className="rounded-lg">📍 Lainnya</SelectItem>
                            </SelectContent>
                        </Select>

                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
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

                    {/* Products Grid/List */}
                    <ScrollArea className="flex-1 pr-4">
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {filteredProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredProducts.map((product) => (
                                    <ProductListItem key={product.id} product={product} />
                                ))}
                            </div>
                        )}

                        {filteredProducts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                <Package className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium">Tidak ada produk ditemukan</p>
                                <p className="text-sm">Coba kata kunci lain atau scan barcode</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Right Panel - Cart */}
                <Card className="w-96 flex flex-col rounded-2xl border-0 shadow-xl bg-gradient-to-b from-card to-muted/20">
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
                                <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-medium">Keranjang kosong</p>
                                <p className="text-sm">Klik produk untuk menambahkan</p>
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
                                    onClick={handleCheckout}
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

            {/* Receipt Dialog */}
            <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-green-600" />
                            Transaksi Berhasil
                        </DialogTitle>
                    </DialogHeader>

                    {lastSale && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-primary">
                                        Rp {lastSale.total.toLocaleString('id-ID')}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {lastSale.method === 'cash' ? 'Tunai' : 'Transfer'} • {new Date().toLocaleString('id-ID')}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Items:</p>
                                {lastSale.items.map((it) => (
                                    <div key={it.product.id} className="flex justify-between text-sm">
                                        <span>{it.product.name} x{it.quantity}</span>
                                        <span>Rp {(it.product.price * it.quantity).toLocaleString('id-ID')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
                            Tutup
                        </Button>
                        <Button onClick={() => {
                            // TODO: Print receipt
                            toast({ title: 'Fitur cetak akan segera hadir' });
                        }}>
                            <Receipt className="w-4 h-4 mr-2" />
                            Cetak Struk
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
