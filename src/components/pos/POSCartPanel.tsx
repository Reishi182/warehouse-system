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
        <div className="hidden md:flex fixed top-0 right-0 h-screen w-72 lg:w-80 xl:w-[400px] flex-col border-l bg-gradient-to-b from-background via-background to-muted/20 shadow-2xl z-40 pointer-events-auto">
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

                {/* Today's Stats */}
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

                {/* Nota Gantung Dropdown - Show when no exchange is active */}
                {!returnRef && onSelectTab && (
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
            </div>

            {/* Return Reference Badge - Show when exchange is active (replaces nota gantung) */}
            {returnRef && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
                    <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-0 rounded-full gap-1 text-xs">
                        <RotateCcw className="w-3 h-3" />
                        Ref Tukar Barang: {returnRef}
                    </Badge>
                    {onCancelExchange ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 gap-1"
                            onClick={onCancelExchange}
                        >
                            <X className="w-3 h-3" />
                            Batalkan Tukar
                        </Button>
                    ) : onSetReturnRef && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-amber-600 hover:text-amber-700"
                            onClick={() => onSetReturnRef(null)}
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            )}

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
                        <div className="p-3 space-y-2">
                            {items.map((it, index) => {
                                const isVariableUnit = it.product.sell_by_quantity;
                                const isManualEntry = it.isManualEntry;
                                const unit = it.product.sell_unit || 'pcs';
                                const qtyDisplay = isVariableUnit
                                    ? `${it.quantity} ${unit}`
                                    : it.quantity;

                                return (
                                    <div
                                        key={it.product.id}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-xl bg-card border transition-all",
                                            "hover:border-primary/30 hover:shadow-sm",
                                            isManualEntry && "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20",
                                            isVariableUnit && !isManualEntry && "border-amber-200/50 dark:border-amber-800/50"
                                        )}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        {/* Product Image */}
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0",
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
                                                    "w-4 h-4",
                                                    isManualEntry ? "text-amber-500" : "text-muted-foreground/30"
                                                )} />
                                            )}
                                        </div>

                                        {/* Product Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-medium text-xs truncate">{it.product.name}</p>
                                                {isManualEntry && (
                                                    <Badge className="h-4 px-1.5 text-[9px] bg-amber-500 text-white border-0 rounded-full shrink-0">
                                                        Manual
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                Rp {it.product.price.toLocaleString('id-ID')}
                                                {isVariableUnit && <span className="text-amber-600">/{unit}</span>}
                                                {it.discount > 0 && (
                                                    <span className="ml-1 text-emerald-600 font-medium">-Rp {it.discount.toLocaleString('id-ID')}</span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Quantity Display */}
                                        {isVariableUnit && !isManualEntry ? (
                                            // Variable unit: show quantity with unit
                                            <div className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                                                    {qtyDisplay}
                                                </span>
                                            </div>
                                        ) : isManualEntry && it.quantity % 1 !== 0 ? (
                                            // Manual entry with decimal quantity: show as display only (no +/- buttons)
                                            <div className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                                                    {it.quantity}
                                                </span>
                                            </div>
                                        ) : (
                                            // Normal product or manual entry with integer: +/- buttons
                                            <div className={cn(
                                                "flex items-center rounded-lg p-0.5 shrink-0",
                                                isManualEntry ? "bg-amber-100/50 dark:bg-amber-900/30" : "bg-muted/50"
                                            )}>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => onUpdateQuantity(it.product.id, it.quantity - 1)}
                                                    className="h-5 w-5 lg:h-6 lg:w-6 rounded-md hover:bg-background"
                                                >
                                                    <Minus className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                                                </Button>
                                                <span className="w-5 lg:w-6 text-center text-[10px] lg:text-xs font-semibold">{it.quantity}</span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        // Manual items have no stock limit
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
                                                    className="h-5 w-5 lg:h-6 lg:w-6 rounded-md hover:bg-background disabled:opacity-50"
                                                >
                                                    <Plus className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                                                </Button>
                                            </div>
                                        )}

                                        {/* Remove Button */}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                                            onClick={() => onRemoveItem(it.product.id)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
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
