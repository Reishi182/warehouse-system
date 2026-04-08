import React, { memo, useMemo } from 'react';
import {
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    Banknote,
    Package,
    X,
    RotateCcw,
    ClipboardList,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { PaymentMethod, Location, CustomerTab } from '@/types';
import { CartItem } from '@/hooks/usePOSCart';
import { cn } from '@/lib/utils';

interface POSCartPanelProps {
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
    onSaveToTab?: (tabId: string) => void;
    isProcessing: boolean;
    todayStats: { count: number; total: number };
    returnRef?: string | null;
    onSetReturnRef?: (ref: string | null) => void;
    onCancelExchange?: () => void;
    stockLocation: Location;
    // Tab customer selection
    openTabs?: CustomerTab[];
    selectedTabId?: string | null;
    onSelectTab?: (tabId: string | null) => void;
}

export const POSCartPanel = memo(function POSCartPanel({
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
    returnRef,
    onSetReturnRef,
    onCancelExchange,
    stockLocation,
    openTabs = [],
    selectedTabId,
    onSelectTab,
}: POSCartPanelProps) {
    // Memoize computed values to prevent re-calculations
    const itemCount = useMemo(() =>
        items.reduce((acc, it) => acc + it.quantity, 0),
        [items]
    );

    const selectedTab = useMemo(() =>
        openTabs.find(t => t.id === selectedTabId),
        [openTabs, selectedTabId]
    );

    const isTabMode = !!selectedTabId;

    return (
        <div className="hidden md:flex fixed top-0 right-0 h-screen w-72 lg:w-80 xl:w-[400px] flex-col border-l bg-gradient-to-b from-background via-background to-muted/20 shadow-2xl z-40 pointer-events-auto overflow-hidden">
            {/* Header with Glassmorphism */}
            <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <ShoppingCart className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-sm">Keranjang</span>
                        {items.length > 0 && (
                            <Badge className="rounded-full text-[10px] px-1.5 h-5 bg-primary/20 text-primary border-0">
                                {itemCount} item
                            </Badge>
                        )}
                    </div>
                    {items.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearCart}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Hapus
                        </Button>
                    )}
                </div>

                {/* Stats / Exchange Info */}
                {returnRef ? (
                    /* Exchange Mode */
                    <div className="mt-2 px-2.5 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/50">
                                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-[9px] text-amber-600 font-medium">Tukar Barang</p>
                                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{returnRef}</p>
                                </div>
                            </div>
                            {onCancelExchange && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 gap-1 rounded-md px-2"
                                    onClick={onCancelExchange}
                                >
                                    <X className="w-3 h-3" />
                                    Batalkan
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Normal Mode: Today Stats */}
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted/50">
                                <p className="text-[10px] text-muted-foreground">Hari Ini</p>
                                <p className="text-xs font-semibold">{todayStats.count} transaksi</p>
                            </div>
                            <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10">
                                <p className="text-[10px] text-emerald-600">Total</p>
                                <p className="text-xs font-semibold text-emerald-600">
                                    Rp {todayStats.total.toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>

                        {/* Nota Gantung Dropdown */}
                        {onSelectTab && (
                            <div className="mt-2">
                                <SearchableSelect
                                    options={[
                                        { value: '__normal__', label: 'Bayar Langsung (Normal)', description: 'Transaksi langsung tanpa tab' },
                                        ...openTabs.map((tab) => ({
                                            value: tab.id,
                                            label: tab.customer_name,
                                            description: `Saldo: Rp ${tab.total_amount.toLocaleString('id-ID')}`
                                        }))
                                    ]}
                                    value={selectedTabId || '__normal__'}
                                    onValueChange={(val) => onSelectTab(val === '__normal__' ? null : val)}
                                    placeholder="Pilih Nota Gantung..."
                                    searchPlaceholder="Cari pelanggan..."
                                    emptyMessage="Pelanggan tidak ditemukan."
                                    className="h-8 text-xs"
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-hidden">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                            <ShoppingCart className="w-8 h-8 opacity-30" />
                        </div>
                        <p className="text-sm font-medium">Keranjang kosong</p>
                        <p className="text-xs mt-1 text-muted-foreground/70">Klik produk untuk menambahkan</p>
                    </div>
                ) : (
                    <ScrollArea className="h-full">
                        <div className="p-2 space-y-1.5">
                            {items.map((it) => {
                                const isVariableUnit = it.product.sell_by_quantity;
                                const isManualEntry = it.isManualEntry;
                                const unit = it.product.sell_unit || 'pcs';
                                const qtyDisplay = isVariableUnit
                                    ? `${it.quantity} ${unit}`
                                    : it.quantity;
                                const effectivePrice = it.unitPrice || it.product.price;
                                const itemTotal = effectivePrice * it.quantity;

                                return (
                                    <div
                                        key={it.product.id}
                                        className={cn(
                                            "px-2 py-2 rounded-lg border transition-all",
                                            "hover:border-primary/30",
                                            isManualEntry && "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10",
                                            !isManualEntry && "bg-card"
                                        )}
                                    >
                                        {/* Top: Image + Name + Price */}
                                        <div className="flex gap-2">
                                            {/* Product Image */}
                                            <div className={cn(
                                                "w-8 h-8 rounded-md flex items-center justify-center overflow-hidden shrink-0",
                                                isManualEntry ? "bg-amber-100 dark:bg-amber-900/50" : "bg-muted/50"
                                            )}>
                                                {it.product.image_url ? (
                                                    <img
                                                        src={it.product.image_url}
                                                        alt={it.product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Package className={cn(
                                                        "w-3.5 h-3.5",
                                                        isManualEntry ? "text-amber-500" : "text-muted-foreground/30"
                                                    )} />
                                                )}
                                            </div>

                                            {/* Name (wraps) + Price */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium leading-tight">{it.product.name}</p>
                                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                                    Rp {effectivePrice.toLocaleString('id-ID')}
                                                    {isVariableUnit && <span className="text-amber-600">/{unit}</span>}
                                                    <span className="mx-1 text-muted-foreground/50">→</span>
                                                    <span className="font-semibold text-primary">Rp {itemTotal.toLocaleString('id-ID')}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Bottom: Qty Controls + Delete */}
                                        <div className="flex items-center justify-between mt-1.5 pl-10">
                                            {/* Qty Controls */}
                                            <div className="flex items-center shrink-0 bg-muted/20 rounded-lg border shadow-sm overflow-hidden h-8">
                                                <button
                                                    onClick={() => onUpdateQuantity(it.product.id, Math.max(0, it.quantity - 1))}
                                                    className="h-full w-8 flex items-center justify-center hover:bg-muted transition-colors border-r"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={it.quantity}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val)) onUpdateQuantity(it.product.id, val);
                                                        else if (e.target.value === '') onUpdateQuantity(it.product.id, 0);
                                                    }}
                                                    step="any"
                                                    min="0"
                                                    className="w-12 bg-transparent text-center text-xs font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (isManualEntry) {
                                                            onUpdateQuantity(it.product.id, it.quantity + 1);
                                                        } else {
                                                            const availableStock = it.product.stock[stockLocation];
                                                            if (it.quantity < availableStock) {
                                                                onUpdateQuantity(it.product.id, it.quantity + 1);
                                                            }
                                                        }
                                                    }}
                                                    disabled={!isManualEntry && it.quantity >= it.product.stock[stockLocation]}
                                                    className="h-full w-8 flex items-center justify-center hover:bg-muted transition-colors border-l disabled:opacity-30"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => onRemoveItem(it.product.id)}
                                                className="flex items-center gap-1 px-1.5 h-7 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                <span className="text-[10px]">Hapus</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}
            </div>

            {/* Order Summary Footer */}
            {items.length > 0 && (
                <div className="border-t bg-gradient-to-t from-muted/30 to-transparent p-3 space-y-3">
                    {/* Subtotal & Discount */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground shrink-0">Diskon</Label>
                            <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                                <Input
                                    type="text"
                                    value={orderDiscount > 0 ? orderDiscount.toLocaleString('id-ID') : ''}
                                    onChange={(e) => {
                                        // Remove non-digits and parse
                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                        onOrderDiscountChange(parseInt(numericValue) || 0);
                                    }}
                                    className="h-7 text-xs rounded-lg pl-7 bg-muted/50 border-0"
                                    placeholder="0"
                                />
                            </div>
                            {orderDiscount > 0 && (
                                <span className="text-xs text-emerald-600 font-medium shrink-0">
                                    -{orderDiscount.toLocaleString('id-ID')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center py-2 border-t border-dashed">
                        <span className="font-semibold text-sm">Total</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                            Rp {totalAmount.toLocaleString('id-ID')}
                        </span>
                    </div>

                    {/* Payment Method Toggle - Only show if NOT in tab mode */}
                    {!isTabMode && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => onPaymentMethodChange('cash')}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-medium transition-all",
                                    paymentMethod === 'cash'
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Banknote className="w-4 h-4" />
                                Tunai
                            </button>
                            <button
                                onClick={() => onPaymentMethodChange('transfer')}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-medium transition-all",
                                    paymentMethod === 'transfer'
                                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <CreditCard className="w-4 h-4" />
                                Transfer
                            </button>
                        </div>
                    )}

                    {/* Checkout Button - Only if NOT in tab mode */}
                    {!isTabMode && (
                        <Button
                            className={cn(
                                "w-full h-11 text-sm font-bold rounded-xl transition-all",
                                "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
                                "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                                items.length > 0 && !isProcessing && "animate-pulse-subtle"
                            )}
                            disabled={items.length === 0 || isProcessing}
                            onClick={onCheckout}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Bayar Sekarang
                                </>
                            )}
                        </Button>
                    )}

                    {/* Save to Tab Button - Show when tab is selected */}
                    {isTabMode && onSaveToTab && selectedTabId && (
                        <Button
                            className={cn(
                                "w-full h-11 text-sm font-bold rounded-xl transition-all",
                                "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300",
                                "shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 text-white",
                                items.length > 0 && !isProcessing && "animate-pulse-subtle"
                            )}
                            disabled={items.length === 0 || isProcessing}
                            onClick={() => onSaveToTab(selectedTabId)}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <ClipboardList className="w-4 h-4 mr-2" />
                                    Simpan ke Tab: {selectedTab?.customer_name}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
});
