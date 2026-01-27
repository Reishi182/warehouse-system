import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
import { POSProductGrid } from '@/components/pos/POSProductGrid';
import { POSCartPanel } from '@/components/pos/POSCartPanel';
import { POSMobileCart } from '@/components/pos/POSMobileCart';
import { POSCheckoutDialog } from '@/components/pos/POSCheckoutDialog';
import { POSReceiptDialog } from '@/components/pos/POSReceiptDialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { usePOSCart } from '@/hooks/usePOSCart';
import { usePOSCheckout } from '@/hooks/usePOSCheckout';
import { Location } from '@/types';

export default function POS() {
    const { products, getProductByBarcode, sales, loading } = useData();
    const { profile } = useAuth();
    const { toast } = useToast();
    const { data: storeSettings } = useStoreSettings();

    const searchInputRef = useRef<HTMLInputElement>(null);
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

    // Cart state
    const cart = usePOSCart('toko');

    // Checkout state
    const checkout = usePOSCheckout({
        items: cart.items,
        subtotal: cart.subtotal,
        totalAmount: cart.totalAmount,
        orderDiscount: cart.orderDiscount,
        stockLocation: cart.stockLocation,
        onSuccess: cart.clearCart,
    });

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
                checkout.setPaymentMethod(checkout.paymentMethod === 'cash' ? 'transfer' : 'cash');
            }
            // F12 - Checkout
            if (e.key === 'F12' && cart.items.length > 0) {
                e.preventDefault();
                checkout.openCheckoutDialog();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart.items, checkout]);

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
        cart.addToCart(product);
    };

    if (loading) {
        return (
            <MainLayout title="Point of Sale" subtitle="Sistem kasir untuk penjualan">
                <PageSkeleton variant="dashboard" />
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Point of Sale" subtitle="Sistem kasir untuk penjualan">
            <div className="flex gap-4 h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] md:pr-[21rem] lg:pr-[25rem]">
                {/* Left Panel - Products */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Location Selector & Barcode Scanner */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
                        <div className="hidden sm:block flex-1">
                            <BarcodeScanner onScan={handleScan} placeholder="Scan barcode..." />
                        </div>

                        <Select
                            value={cart.stockLocation}
                            onValueChange={(v: Location) => cart.setStockLocation(v)}
                        >
                            <SelectTrigger className="w-28 md:w-32 rounded-xl h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="toko" className="rounded-lg">🏪 Toko</SelectItem>
                                <SelectItem value="gudang" className="rounded-lg">📦 Gudang</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Mobile Barcode Scanner */}
                    <div className="sm:hidden mb-3">
                        <BarcodeScanner onScan={handleScan} placeholder="Scan barcode..." />
                    </div>

                    {/* Products Grid */}
                    <POSProductGrid
                        products={products}
                        stockLocation={cart.stockLocation}
                        onAddToCart={cart.addToCart}
                        searchInputRef={searchInputRef}
                    />
                </div>

                {/* Desktop Cart Panel */}
                {createPortal(
                    <POSCartPanel
                        items={cart.items}
                        subtotal={cart.subtotal}
                        totalAmount={cart.totalAmount}
                        orderDiscount={cart.orderDiscount}
                        onOrderDiscountChange={cart.setOrderDiscount}
                        paymentMethod={checkout.paymentMethod}
                        onPaymentMethodChange={checkout.setPaymentMethod}
                        onUpdateQuantity={cart.updateQuantity}
                        onRemoveItem={cart.removeItem}
                        onClearCart={cart.clearCart}
                        onCheckout={checkout.openCheckoutDialog}
                        isProcessing={checkout.isProcessing}
                        todayStats={todayStats}
                    />,
                    document.body
                )}

                {/* Mobile Cart */}
                <POSMobileCart
                    items={cart.items}
                    subtotal={cart.subtotal}
                    totalAmount={cart.totalAmount}
                    orderDiscount={cart.orderDiscount}
                    onOrderDiscountChange={cart.setOrderDiscount}
                    paymentMethod={checkout.paymentMethod}
                    onPaymentMethodChange={checkout.setPaymentMethod}
                    onUpdateQuantity={cart.updateQuantity}
                    onRemoveItem={cart.removeItem}
                    onClearCart={cart.clearCart}
                    onCheckout={checkout.openCheckoutDialog}
                    isProcessing={checkout.isProcessing}
                    todayStats={todayStats}
                    open={cartDrawerOpen}
                    onOpenChange={setCartDrawerOpen}
                />
            </div>

            {/* Checkout Dialog */}
            <POSCheckoutDialog
                open={checkout.showCheckoutDialog}
                onOpenChange={checkout.closeCheckoutDialog}
                items={cart.items}
                subtotal={cart.subtotal}
                totalAmount={cart.totalAmount}
                orderDiscount={cart.orderDiscount}
                paymentMethod={checkout.paymentMethod}
                amountPaid={checkout.amountPaid}
                onAmountPaidChange={checkout.setAmountPaid}
                onConfirm={checkout.handleConfirmCheckout}
                isProcessing={checkout.isProcessing}
            />

            {/* Receipt Dialog */}
            <POSReceiptDialog
                open={checkout.showReceiptDialog}
                onOpenChange={checkout.closeReceiptDialog}
                lastSale={checkout.lastSale}
                cashierName={profile?.name || 'Kasir'}
                storeName={storeSettings?.store_name}
                storeAddress={storeSettings?.store_address}
                receiptRef={checkout.receiptRef}
                onPrint={checkout.handlePrint}
            />
        </MainLayout>
    );
}
