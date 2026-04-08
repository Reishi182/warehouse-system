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
import { UnitPickerDialog, SellUnit } from '@/components/pos/UnitPickerDialog';
import { isMultiUnit } from '@/lib/multiUnit';
import { QuickSaleDialog } from '@/components/pos/QuickSaleDialog';
import { CreditListDialog } from '@/components/pos/CreditListDialog';
import { OfflineSyncStatus } from '@/components/pos/OfflineSyncStatus';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { History, ClipboardList, RotateCcw, PackagePlus, AlertCircle } from 'lucide-react';
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

    // Multi-unit picker dialog state
    const [unitPickerOpen, setUnitPickerOpen] = useState(false);
    const [unitPickerProduct, setUnitPickerProduct] = useState<Product | null>(null);

    // Quick Sale dialog state
    const [quickSaleDialogOpen, setQuickSaleDialogOpen] = useState(false);

    // Credit List dialog state
    const [creditListDialogOpen, setCreditListDialogOpen] = useState(false);

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
            if (exchangeFromSaleId && exchangeFromSale && newSaleId && newSaleNumber) {
                try {
                    const stockLocation = exchangeFromSale.stock_location || 'toko';
                    const stockField = stockLocation === 'toko' ? 'stock_toko' : 'stock_gudang';

                    // Bug fix #3: Return stock NOW (at checkout), not when exchange starts
                    for (const item of exchangeFromSale.items || []) {
                        const { data: product } = await supabase
                            .from('products')
                            .select(`id, ${stockField}`)
                            .eq('id', item.product_id)
                            .single();

                        if (product) {
                            const currentStock = (product as any)?.[stockField] || 0;
                            await supabase
                                .from('products')
                                .update({ [stockField]: currentStock + item.quantity })
                                .eq('id', item.product_id);

                            await supabase.from('stock_logs').insert({
                                product_id: item.product_id,
                                type: 'in',
                                quantity: item.quantity,
                                location: stockLocation,
                                user_id: profile?.user_id,
                                note: `Ganti barang dari ${exchangeFromSaleNumber}`,
                            });
                        }
                    }

                    // Mark original sale as exchanged
                    await supabase
                        .from('sales')
                        .update({
                            is_exchanged: true,
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
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                } catch (err) {
                    console.error('Failed to link exchange sales:', err);
                }
            }
            cart.clearCart();
            setReturnRef(null);
            setExchangeFromSaleId(null);
            setExchangeFromSaleNumber(null);
            setExchangeFromSale(null);
        },
        returnRef,
    });

    // State to hold exchange from sale info for linking after checkout
    const [exchangeFromSaleId, setExchangeFromSaleId] = useState<string | null>(null);
    const [exchangeFromSaleNumber, setExchangeFromSaleNumber] = useState<string | null>(null);
    const [exchangeFromSale, setExchangeFromSale] = useState<Sale | null>(null);

    // Bug fix #3: Exchange no longer returns stock immediately.
    // Stock is only returned when checkout completes (in onSuccess above).
    const handleExchangeSale = async (sale: Sale) => {
        if (!sale.items || sale.items.length === 0) {
            toast({ title: 'Error', description: 'Transaksi tidak memiliki item', variant: 'destructive' });
            return;
        }

        setIsProcessingExchange(true);

        try {
            // Store exchange reference for linking after new sale is created
            setExchangeFromSaleId(sale.id);
            setExchangeFromSaleNumber(sale.sale_number);
            setExchangeFromSale(sale);

            // Load items into cart for editing
            cart.loadFromSale(sale);
            setReturnRef(sale.sale_number);
            setSalesHistoryOpen(false);

            toast({
                title: '✅ Siap ganti barang',
                description: `Item dari ${sale.sale_number} dimuat ke keranjang. Edit lalu checkout untuk menyelesaikan.`,
            });

        } catch (err) {
            console.error('Exchange error:', err);
            toast({ title: 'Error', description: 'Gagal memproses ganti barang', variant: 'destructive' });
        } finally {
            setIsProcessingExchange(false);
        }
    };

    // Handle cancel exchange — since stock is NOT returned until checkout, just clear state
    const handleCancelExchange = async () => {
        if (!exchangeFromSale || !exchangeFromSaleId) return;

        const confirmed = window.confirm(
            `Batalkan tukar barang dari ${exchangeFromSaleNumber}?`
        );
        if (!confirmed) return;

        // Simply clear exchange state — no stock to reverse
        cart.clearCart();
        setReturnRef(null);
        setExchangeFromSaleId(null);
        setExchangeFromSaleNumber(null);
        setExchangeFromSale(null);

        queryClient.invalidateQueries({ queryKey: ['notifications'] });

        toast({
            title: 'Tukar barang dibatalkan',
            description: 'Keranjang dikosongkan',
        });
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

    // Handle adding product to cart - check for variable unit or multi-unit products
    const handleAddToCart = (product: Product) => {
        if (product.sell_by_quantity) {
            // Open quantity input dialog for variable unit products
            setQuantityDialogProduct(product);
            setQuantityDialogOpen(true);
        } else if (isMultiUnit(product)) {
            // Open unit picker dialog for multi-unit products (box/pcs)
            setUnitPickerProduct(product);
            setUnitPickerOpen(true);
        } else {
            // Normal product - add directly
            cart.addToCart(product);
        }
    };

    // Handle multi-unit selection
    const handleUnitSelect = (unit: SellUnit) => {
        if (unitPickerProduct) {
            cart.addToCartWithUnit(unitPickerProduct, unit);
        }
        setUnitPickerOpen(false);
        setUnitPickerProduct(null);
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
            <div className="flex gap-4 h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] md:pr-72 lg:pr-80 xl:pr-[400px]">
                {/* Left Panel - Products */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Location Selector, Barcode Scanner & Offline Status */}
                    <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="hidden sm:block flex-1 min-w-[200px]">
                            <BarcodeScanner onScan={handleScan} placeholder="Scan barcode..." />
                        </div>

                        {/* Offline Sync Status */}
                        <OfflineSyncStatus />

                        {/* Quick Sale Button */}
                        <Button
                            variant="outline"
                            onClick={() => setQuickSaleDialogOpen(true)}
                            className="h-9 sm:h-11 px-2 sm:px-3 rounded-lg sm:rounded-xl gap-1.5 sm:gap-2 border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 shrink-0"
                        >
                            <PackagePlus className="h-4 w-4" />
                            <span className="hidden sm:inline text-sm font-medium">Quick Sale</span>
                        </Button>

                        {/* Piutang (Credit) Button */}
                        <Button
                            variant="outline"
                            onClick={() => setCreditListDialogOpen(true)}
                            className="h-9 sm:h-11 px-2 sm:px-3 rounded-lg sm:rounded-xl gap-1.5 sm:gap-2 border-orange-400 bg-orange-50 text-orange-800 hover:bg-orange-100 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 shrink-0"
                        >
                            <AlertCircle className="h-4 w-4" />
                            <span className="hidden sm:inline text-sm font-medium">Piutang</span>
                        </Button>

                        {/* Tab Button */}
                        <Button
                            variant="outline"
                            onClick={() => setTabDialogOpen(true)}
                            className="h-9 sm:h-11 px-2 sm:px-3 rounded-lg sm:rounded-xl gap-1.5 sm:gap-2 shrink-0 text-foreground"
                        >
                            <ClipboardList className="h-4 w-4" />
                            <span className="hidden sm:inline text-sm font-medium">Nota Gantung</span>
                        </Button>

                        {/* Sales History Button */}
                        <Button
                            variant="outline"
                            onClick={() => setSalesHistoryOpen(true)}
                            className="h-9 sm:h-11 px-2 sm:px-3 rounded-lg sm:rounded-xl gap-1.5 sm:gap-2 shrink-0 text-foreground"
                        >
                            <History className="h-4 w-4" />
                            <span className="hidden sm:inline text-sm font-medium">Riwayat</span>
                        </Button>

                        <Select
                            value={cart.stockLocation}
                            onValueChange={(v: Location) => cart.setStockLocation(v)}
                        >
                            <SelectTrigger className="w-20 sm:w-28 md:w-32 rounded-lg sm:rounded-xl h-9 sm:h-11 text-xs sm:text-sm shrink-0">
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

                {/* Desktop Cart Panel — portaled to body to avoid parent overflow clip */}
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
                            if (exchangeFromSaleId) {
                                handleCancelExchange();
                            } else {
                                cart.clearCart();
                                setReturnRef(null);
                                setSelectedTabId(null);
                            }
                        }}
                        onCancelExchange={exchangeFromSaleId ? handleCancelExchange : undefined}
                        onCheckout={checkout.openCheckoutDialog}
                        onSaveToTab={(tabId) => {
                            const selectedTab = openTabs.find(t => t.id === tabId);
                            if (!selectedTab) return;
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
                    stockLocation={cart.stockLocation}
                    returnRef={returnRef}
                    onCancelExchange={exchangeFromSaleId ? handleCancelExchange : undefined}
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
                transactionDate={checkout.transactionDate}
                onTransactionDateChange={checkout.setTransactionDate}
                onConfirm={checkout.handleConfirmCheckout}
                isProcessing={checkout.isProcessing}
                // Credit transaction props
                isCredit={checkout.isCredit}
                onIsCreditChange={checkout.setIsCredit}
                creditCustomerName={checkout.creditCustomerName}
                onCreditCustomerNameChange={checkout.setCreditCustomerName}
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

            {/* Multi-Unit Picker Dialog (Dynamic: SAK/KG, BOX/PCS, ROLL/METER, etc.) */}
            <UnitPickerDialog
                open={unitPickerOpen}
                onClose={() => { setUnitPickerOpen(false); setUnitPickerProduct(null); }}
                product={unitPickerProduct}
                onSelect={handleUnitSelect}
            />

            {/* Quick Sale Dialog */}
            <QuickSaleDialog
                open={quickSaleDialogOpen}
                onOpenChange={setQuickSaleDialogOpen}
                onAddItem={cart.addManualItem}
            />

            {/* Credit List Dialog */}
            <CreditListDialog
                open={creditListDialogOpen}
                onOpenChange={setCreditListDialogOpen}
            />
        </MainLayout>
    );
}
