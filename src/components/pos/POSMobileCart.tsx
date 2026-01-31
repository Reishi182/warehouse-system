import {
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    Banknote,
    Package,
    X,
    Percent,
    ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from '@/components/ui/sheet';
import { PaymentMethod } from '@/types';
import { CartItem } from '@/hooks/usePOSCart';
import { cn } from '@/lib/utils';

interface POSMobileCartProps {
    items: CartItem[];
    subtotal: number;
    totalAmount: number;
    orderDiscount: number;
    onOrderDiscountChange: (discount: number) => void;
    paymentMethod: PaymentMethod;
    onPaymentMethodChange: (method: PaymentMethod) => void;
    onUpdateQuantity: (productId: string, qty: number) => void;
    onRemoveItem: (productId: string) => void;
    onClearCart: () => void;
    onCheckout: () => void;
    onSaveToTab?: () => void;
    isProcessing: boolean;
    todayStats: { count: number; total: number };
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function POSMobileCart({
    items,
    subtotal,
    totalAmount,
    orderDiscount,
    onOrderDiscountChange,
    paymentMethod,
    onPaymentMethodChange,
    onUpdateQuantity,
    onRemoveItem,
    onClearCart,
    onCheckout,
    onSaveToTab,
    isProcessing,
    todayStats,
    open,
    onOpenChange,
}: POSMobileCartProps) {
    const itemCount = items.reduce((acc, it) => acc + it.quantity, 0);

    return (
        <div className="md:hidden">
            <Sheet open={open} onOpenChange={onOpenChange}>
                {/* Floating Cart Button */}
                <SheetTrigger asChild>
                    <Button
                        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-2xl bg-primary shadow-xl hover:scale-105 transition-transform"
                    >
                        <ShoppingCart className="w-6 h-6" />
                        {items.length > 0 && (
                            <Badge className="absolute -top-2 -right-2 h-6 min-w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold bg-destructive">
                                {itemCount}
                            </Badge>
                        )}
                    </Button>
                </SheetTrigger>

                <SheetContent
                    side="bottom"
                    className="h-[85vh] rounded-t-2xl p-0 flex flex-col"
                >
                    {/* Handle Bar */}
                    <div className="flex justify-center py-3">
                        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                    </div>

                    {/* Header - White to Primary gradient */}
                    <div className="px-4 pb-4 border-b bg-gradient-to-r from-white to-primary/10 dark:from-slate-900 dark:to-primary/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg">Keranjang</h2>
                                    <p className="text-xs text-muted-foreground">{itemCount} item</p>
                                </div>
                            </div>
                            {items.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClearCart}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        {/* Today Stats - White to Emerald gradient */}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="px-3 py-2 rounded-lg bg-card border">
                                <p className="text-[10px] text-muted-foreground">Hari Ini</p>
                                <p className="font-bold">{todayStats.count} transaksi</p>
                            </div>
                            <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-white to-emerald-100 dark:from-slate-900 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                                <p className="text-[10px] text-emerald-600">Total</p>
                                <p className="font-bold text-emerald-600">
                                    Rp {(todayStats.total / 1000).toFixed(0)}k
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-hidden">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
                                </div>
                                <p className="font-medium text-muted-foreground">Keranjang kosong</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-full">
                                <div className="p-4 space-y-2">
                                    {items.map((it) => (
                                        <div
                                            key={it.product.id}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {it.product.image_url ? (
                                                    <img src={it.product.image_url} alt={it.product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-4 h-4 text-muted-foreground/30" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{it.product.name}</p>
                                                <p className="text-xs text-muted-foreground">Rp {it.product.price.toLocaleString('id-ID')}</p>
                                            </div>
                                            <div className="flex items-center gap-0.5 bg-background rounded-lg border">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => onUpdateQuantity(it.product.id, it.quantity - 1)}
                                                    className="h-7 w-7"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </Button>
                                                <span className="w-6 text-center text-sm font-bold">{it.quantity}</span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => onUpdateQuantity(it.product.id, it.quantity + 1)}
                                                    className="h-7 w-7"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => onRemoveItem(it.product.id)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>

                    {/* Footer */}
                    {items.length > 0 && (
                        <div className="border-t bg-card p-4 space-y-3">
                            {/* Discount */}
                            <div className="flex items-center gap-2">
                                <Label className="text-sm shrink-0">Diskon</Label>
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                                    <Input
                                        type="text"
                                        value={orderDiscount > 0 ? orderDiscount.toLocaleString('id-ID') : ''}
                                        onChange={(e) => {
                                            const numericValue = e.target.value.replace(/[^\d]/g, '');
                                            onOrderDiscountChange(parseInt(numericValue) || 0);
                                        }}
                                        className="h-9 rounded-lg pl-10"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-center py-2 border-y border-dashed">
                                <span className="font-bold">Total</span>
                                <span className="text-xl font-bold text-primary">
                                    Rp {totalAmount.toLocaleString('id-ID')}
                                </span>
                            </div>

                            {/* Payment Method */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => onPaymentMethodChange('cash')}
                                    className={cn(
                                        "flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all",
                                        paymentMethod === 'cash'
                                            ? "bg-emerald-600 text-white"
                                            : "bg-muted"
                                    )}
                                >
                                    <Banknote className="w-4 h-4" /> Tunai
                                </button>
                                <button
                                    onClick={() => onPaymentMethodChange('transfer')}
                                    className={cn(
                                        "flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all",
                                        paymentMethod === 'transfer'
                                            ? "bg-blue-600 text-white"
                                            : "bg-muted"
                                    )}
                                >
                                    <CreditCard className="w-4 h-4" /> Transfer
                                </button>
                            </div>

                            {/* Checkout Button */}
                            <Button
                                className="w-full h-12 text-base font-bold rounded-xl bg-primary"
                                disabled={items.length === 0 || isProcessing}
                                onClick={onCheckout}
                            >
                                {isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
                            </Button>

                            {/* Save to Tab */}
                            {onSaveToTab && (
                                <Button
                                    variant="outline"
                                    className="w-full h-10 rounded-xl border-amber-300 text-amber-600 hover:bg-amber-50"
                                    disabled={items.length === 0}
                                    onClick={onSaveToTab}
                                >
                                    <ClipboardList className="w-4 h-4 mr-2" />
                                    Simpan ke Tab
                                </Button>
                            )}
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
