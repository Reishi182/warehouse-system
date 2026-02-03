import { useMemo, useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
import { POSProductGrid } from '@/components/pos/POSProductGrid';
import { POSCartPanel } from '@/components/pos/POSCartPanel';
import { POSMobileCart } from '@/components/pos/POSMobileCart';
import { POSCheckoutDialog } from '@/components/pos/POSCheckoutDialog';
import { POSReceiptDialog } from '@/components/pos/POSReceiptDialog';
import { POSSalesHistoryDialog } from '@/components/pos/POSSalesHistoryDialog';
import { TabDialog } from '@/components/pos/TabDialog';
import QuantityInputDialog from '@/components/pos/QuantityInputDialog';
import { QuickSaleDialog } from '@/components/pos/QuickSaleDialog';
import { OfflineSyncStatus } from '@/components/pos/OfflineSyncStatus';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { History, ClipboardList, RotateCcw, PackagePlus } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { usePOSCart } from '@/hooks/usePOSCart';
import { usePOSCheckout } from '@/hooks/usePOSCheckout';
import { useOpenTabs, useAddTabTransaction } from '@/hooks/useTabs';
import { supabase } from '@/integrations/supabase/client';
import { Location, Sale, Product } from '@/types';

export default function POS() {
    const { products, getProductByBarcode, sales, loading } = useData();
    const { profile } = useAuth();
    const { toast } = useToast();
    const { data: storeSettings } = useStoreSettings();
    const queryClient = useQueryClient();

    const searchInputRef = useRef<HTMLInputElement>(null);
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
    const [salesHistoryOpen, setSalesHistoryOpen] = useState(false);
    const [tabDialogOpen, setTabDialogOpen] = useState(false);
    const [returnRef, setReturnRef] = useState<string | null>(null);
    const [isProcessingExchange, setIsProcessingExchange] = useState(false);
    const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

    // Open tabs for customer selection
    const { data: openTabs = [] } = useOpenTabs();
    const addTabTransaction = useAddTabTransaction();

    // Variable unit quantity dialog state
    const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
    const [quantityDialogProduct, setQuantityDialogProduct] = useState<Product | null>(null);

    // Quick Sale dialog state
    const [quickSaleDialogOpen, setQuickSaleDialogOpen] = useState(false);

    // Cart state
    const cart = usePOSCart('toko');

    // Checkout state
    const checkout = usePOSCheckout({
        items: cart.items,
        subtotal: cart.subtotal,
        totalAmount: cart.totalAmount,
        orderDiscount: cart.orderDiscount,
        stockLocation: cart.stockLocation,
        onSuccess: async (newSaleId?: string, newSaleNumber?: string) => {
            // Link exchange if we have an original sale
            if (exchangeFromSaleId && newSaleId && newSaleNumber) {
                try {
                    // Update original sale with link to new sale
                    await supabase
                        .from('sales')
                        .update({
                            exchanged_to_sale_id: newSaleId,
                            exchanged_to_sale_number: newSaleNumber,
                        } as any)
                        .eq('id', exchangeFromSaleId);

                    // Update new sale with link to original sale
                    await supabase
                        .from('sales')
                        .update({
                            exchange_from_sale_id: exchangeFromSaleId,
                            exchange_from_sale_number: exchangeFromSaleNumber,
                        } as any)
                        .eq('id', newSaleId);

                    // Add notification for completed exchange
                    await supabase.from('notifications').insert({
                        title: 'Ganti Barang Selesai',
                        message: `Transaksi ${exchangeFromSaleNumber} berhasil ditukar ke ${newSaleNumber}`,
                        type: 'success',
                        link: '/pos',
                    });
                    // Refresh notifications
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                } catch (err) {
                    console.error('Failed to link exchange sales:', err);
                }
            }
            cart.clearCart();
            setReturnRef(null);
            setExchangeFromSaleId(null);
            setExchangeFromSaleNumber(null);
        },
        returnRef,
    });

    // State to hold exchange from sale info for linking after checkout
    const [exchangeFromSaleId, setExchangeFromSaleId] = useState<string | null>(null);
    const [exchangeFromSaleNumber, setExchangeFromSaleNumber] = useState<string | null>(null);

    // Handle exchange - immediately mark original sale as exchanged and return stock
    const handleExchangeSale = async (sale: Sale) => {
        if (!sale.items || sale.items.length === 0) {
            toast({ title: 'Error', description: 'Transaksi tidak memiliki item', variant: 'destructive' });
            return;
        }

        setIsProcessingExchange(true);
        const stockLocation = sale.stock_location || 'toko';
        const stockField = stockLocation === 'toko' ? 'stock_toko' : 'stock_gudang';

        try {
            // 1. Return stock for each item in original sale
            for (const item of sale.items) {
                // Get current stock
                const { data: product, error: fetchError } = await supabase
                    .from('products')
                    .select(`id, ${stockField}`)
                    .eq('id', item.product_id)
                    .single();

                if (fetchError) {
                    console.error(`Failed to fetch product ${item.product_id}:`, fetchError);
                    continue;
                }

                const currentStock = (product as any)?.[stockField] || 0;
                const newStock = currentStock + item.quantity;

                // Update stock
                await supabase
                    .from('products')
                    .update({ [stockField]: newStock })
                    .eq('id', item.product_id);

                // Log stock return
                await supabase.from('stock_logs').insert({
                    product_id: item.product_id,
                    type: 'in',
                    quantity: item.quantity,
                    location: stockLocation,
                    user_id: profile?.id,
                    note: `Ganti barang dari ${sale.sale_number}`,
                });
            }

            // 2. Mark the original sale as exchanged (instead of deleting)
            await supabase
                .from('sales')
                .update({ is_exchanged: true } as any)
                .eq('id', sale.id);

            // 3. Add notification for exchange
            await supabase.from('notifications').insert({
                title: 'Ganti Barang Dimulai',
                message: `Transaksi ${sale.sale_number} sedang ditukar oleh ${profile?.name || 'Kasir'}`,
                type: 'info',
                link: '/pos',
            });
            // Refresh notifications
            queryClient.invalidateQueries({ queryKey: ['notifications'] });

            // 4. Store exchange reference for linking after new sale is created
            setExchangeFromSaleId(sale.id);
            setExchangeFromSaleNumber(sale.sale_number);

            // 5. Load items into cart (now stock is available)
            cart.loadFromSale(sale);
            setReturnRef(sale.sale_number);
            setSalesHistoryOpen(false);

            toast({
                title: '✅ Siap ganti barang',
                description: `Stok dari ${sale.sale_number} sudah dikembalikan. Silakan edit keranjang.`,
            });

        } catch (err) {
            console.error('Exchange error:', err);
            toast({ title: 'Error', description: 'Gagal memproses ganti barang', variant: 'destructive' });
        } finally {
            setIsProcessingExchange(false);
        }
    };

    // Today's stats - exclude cancelled and exchanged sales
    const todayIso = new Date().toISOString().slice(0, 10);
    const salesToday = useMemo(() =>
        sales.filter(s =>
            s.created_at.slice(0, 10) === todayIso &&
            !s.is_cancelled &&
            !s.is_exchanged
        ),
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
        handleAddToCart(product);
    };

    // Handle adding product to cart - check for variable unit products
    const handleAddToCart = (product: Product) => {
        if (product.sell_by_quantity) {
            // Open quantity input dialog for variable unit products
            setQuantityDialogProduct(product);
            setQuantityDialogOpen(true);
        } else {
            // Normal product - add directly
            cart.addToCart(product);
        }
    };

    // Handle variable quantity confirmation
    const handleQuantityConfirm = (quantity: number) => {
        if (quantityDialogProduct && quantity > 0) {
            cart.addToCartWithQuantity(quantityDialogProduct, quantity);
        }
        setQuantityDialogProduct(null);
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
            <div className="flex gap-4 h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] md:pr-[22rem] lg:pr-[25rem]">
                {/* Left Panel - Products */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Location Selector, Barcode Scanner & Offline Status */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
                        <div className="hidden sm:block flex-1">
                            <BarcodeScanner onScan={handleScan} placeholder="Scan barcode..." />
                        </div>

                        {/* Offline Sync Status */}
                        <OfflineSyncStatus />

                        {/* Quick Sale Button */}
                        <Button
                            variant="outline"
                            onClick={() => setQuickSaleDialogOpen(true)}
                            className="h-11 rounded-xl gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        >
                            <PackagePlus className="h-4 w-4" />
                            <span className="hidden sm:inline">Quick Sale</span>
                        </Button>

                        {/* Tab Button */}
                        <Button
                            variant="outline"
                            onClick={() => setTabDialogOpen(true)}
                            className="h-11 rounded-xl gap-2"
                        >
                            <ClipboardList className="h-4 w-4" />
                            <span className="hidden sm:inline">Nota Gantung</span>
                        </Button>

                        {/* Sales History Button */}
                        <Button
                            variant="outline"
                            onClick={() => setSalesHistoryOpen(true)}
                            className="h-11 rounded-xl gap-2"
                        >
                            <History className="h-4 w-4" />
                            <span className="hidden sm:inline">Riwayat</span>
                        </Button>

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
                        onAddToCart={handleAddToCart}
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
                        onClearCart={() => {
                            cart.clearCart();
                            setReturnRef(null);
                            setSelectedTabId(null);
                        }}
                        onCheckout={checkout.openCheckoutDialog}
                        onSaveToTab={(tabId) => {
                            // Find the selected tab to get tabNumber
                            const selectedTab = openTabs.find(t => t.id === tabId);
                            if (!selectedTab) return;

                            // Add items to selected tab
                            addTabTransaction.mutate({
                                tabId,
                                tabNumber: selectedTab.tab_number,
                                stockLocation: cart.stockLocation,
                                cashierId: profile?.user_id || '',
                                cashierName: profile?.name || 'Kasir',
                                items: cart.items.map(item => ({
                                    productId: item.product.id,
                                    quantity: item.quantity,
                                })),
                                products: products.map(p => ({
                                    id: p.id,
                                    name: p.name,
                                    barcode: p.barcode,
                                    price: p.price,
                                })),
                            }, {
                                onSuccess: () => {
                                    cart.clearCart();
                                    setSelectedTabId(null);
                                    toast({ title: 'Berhasil ditambahkan ke tab' });
                                }
                            });
                        }}
                        isProcessing={checkout.isProcessing || addTabTransaction.isPending}
                        todayStats={todayStats}
                        stockLocation={cart.stockLocation}
                        returnRef={returnRef}
                        onSetReturnRef={setReturnRef}
                        openTabs={openTabs}
                        selectedTabId={selectedTabId}
                        onSelectTab={setSelectedTabId}
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
                    onSaveToTab={() => setTabDialogOpen(true)}
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

            {/* Sales History Dialog */}
            <POSSalesHistoryDialog
                open={salesHistoryOpen}
                onOpenChange={setSalesHistoryOpen}
                onCreateReturn={handleExchangeSale}
            />

            {/* Tab Dialog */}
            <TabDialog
                open={tabDialogOpen}
                onOpenChange={setTabDialogOpen}
                stockLocation={cart.stockLocation}
            />

            {/* Variable Quantity Input Dialog */}
            <QuantityInputDialog
                open={quantityDialogOpen}
                onOpenChange={setQuantityDialogOpen}
                product={quantityDialogProduct}
                onConfirm={handleQuantityConfirm}
            />

            {/* Quick Sale Dialog */}
            <QuickSaleDialog
                open={quickSaleDialogOpen}
                onOpenChange={setQuickSaleDialogOpen}
                onAddItem={cart.addManualItem}
            />
        </MainLayout>
    );
}
