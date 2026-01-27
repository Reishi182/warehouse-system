import {
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    Receipt,
    CreditCard,
    Banknote,
    Package,
    X,
    Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
    isProcessing,
    todayStats,
    open,
    onOpenChange,
}: POSMobileCartProps) {
    const itemCount = items.reduce((acc, it) => acc + it.quantity, 0);

    return (
        <div className="md:hidden">
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetTrigger asChild>
                    <Button className={cn("fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full shadow-xl", "bg-primary hover:bg-primary/90", items.length > 0 && "animate-pulse")}>
                        <ShoppingCart className="w-6 h-6" />
                        {items.length > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs bg-destructive">
                                {itemCount}
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
                                    <Badge variant="secondary" className="rounded-full text-xs px-2">{itemCount}</Badge>
                                )}
                            </SheetTitle>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex gap-2">
                                <Badge variant="outline" className="rounded-full text-xs px-2 py-0.5"><Receipt className="w-3 h-3 mr-1" />{todayStats.count} transaksi</Badge>
                                <Badge className="rounded-full bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-xs px-2 py-0.5">Rp {todayStats.total.toLocaleString('id-ID')}</Badge>
                            </div>
                            {items.length > 0 && (
                                <Button variant="outline" size="sm" onClick={onClearCart} className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 h-6 text-xs rounded-lg px-2"><Trash2 className="w-3 h-3 mr-1" />Hapus</Button>
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
                                                <Button size="icon" variant="ghost" onClick={() => onUpdateQuantity(it.product.id, it.quantity - 1)} className="h-6 w-6 rounded-md"><Minus className="w-3 h-3" /></Button>
                                                <span className="w-6 text-center text-xs font-medium">{it.quantity}</span>
                                                <Button size="icon" variant="ghost" onClick={() => onUpdateQuantity(it.product.id, it.quantity + 1)} className="h-6 w-6 rounded-md"><Plus className="w-3 h-3" /></Button>
                                            </div>
                                            <div className="text-right flex-shrink-0 flex items-center gap-1">
                                                <p className="font-semibold text-xs">{((it.product.price * it.quantity) * (1 - it.discount / 100)).toLocaleString('id-ID')}</p>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md" onClick={() => onRemoveItem(it.product.id)}><X className="w-3 h-3" /></Button>
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
                                <div className="relative flex-1"><Input type="number" min={0} max={100} value={orderDiscount} onChange={(e) => onOrderDiscountChange(parseInt(e.target.value) || 0)} className="h-7 text-xs rounded-md pr-6" /><Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" /></div>
                                <span className="text-xs text-red-500 font-medium">-Rp {(subtotal * orderDiscount / 100).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t"><span className="font-semibold text-sm">Total</span><span className="text-lg font-bold text-primary">Rp {totalAmount.toLocaleString('id-ID')}</span></div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => onPaymentMethodChange('cash')} className={cn("h-8 text-xs rounded-lg", paymentMethod === 'cash' ? "bg-green-600 hover:bg-green-700 text-white" : "")}><Banknote className="w-3 h-3 mr-1" />Tunai</Button>
                                <Button variant={paymentMethod === 'transfer' ? 'default' : 'outline'} onClick={() => onPaymentMethodChange('transfer')} className={cn("h-8 text-xs rounded-lg", paymentMethod === 'transfer' ? "bg-blue-500 hover:bg-blue-600" : "")}><CreditCard className="w-3 h-3 mr-1" />Transfer</Button>
                            </div>
                            <Button className={cn("w-full h-10 text-sm font-semibold rounded-lg", "bg-primary hover:bg-primary/90")} disabled={items.length === 0 || isProcessing} onClick={() => { onOpenChange(false); onCheckout(); }}>
                                {isProcessing ? (<><span className="animate-spin mr-2">⏳</span>Memproses...</>) : (<><Receipt className="w-4 h-4 mr-2" />Bayar</>)}
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
