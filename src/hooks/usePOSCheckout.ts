import { useState, useCallback, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PaymentMethod, Location } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from './usePOSCart';
import { addOfflineSale, isOnline } from '@/lib/offlineQueue';

export type LastSaleData = {
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
    isOffline?: boolean; // Flag to show if sale was saved offline
    returnRef?: string | null; // Reference to original sale for returns
};

export interface UsePOSCheckoutOptions {
    items: CartItem[];
    subtotal: number;
    totalAmount: number;
    orderDiscount: number;
    stockLocation: Location;
    onSuccess: (newSaleId?: string, newSaleNumber?: string) => void;
    returnRef?: string | null;
}

export interface UsePOSCheckoutReturn {
    paymentMethod: PaymentMethod;
    setPaymentMethod: (method: PaymentMethod) => void;
    isProcessing: boolean;
    showCheckoutDialog: boolean;
    showReceiptDialog: boolean;
    amountPaid: number;
    setAmountPaid: (amount: number) => void;
    transactionDate: Date;
    setTransactionDate: (date: Date) => void;
    lastSale: LastSaleData | null;
    receiptRef: React.RefObject<HTMLDivElement>;
    openCheckoutDialog: () => void;
    closeCheckoutDialog: () => void;
    closeReceiptDialog: () => void;
    handleConfirmCheckout: () => Promise<void>;
    handlePrint: () => void;
}

export function usePOSCheckout(options: UsePOSCheckoutOptions): UsePOSCheckoutReturn {
    const { items, subtotal, totalAmount, orderDiscount, stockLocation, onSuccess, returnRef } = options;
    const { createSale, products } = useData();
    const { profile, user } = useAuth();
    const { toast } = useToast();

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
    const [showReceiptDialog, setShowReceiptDialog] = useState(false);
    const [amountPaid, setAmountPaid] = useState(0);
    const [transactionDate, setTransactionDate] = useState<Date>(new Date());
    const [lastSale, setLastSale] = useState<LastSaleData | null>(null);

    const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: lastSale?.saleNumber || 'Receipt',
    });

    const openCheckoutDialog = useCallback(() => {
        if (items.length === 0) return;
        setAmountPaid(Math.ceil(totalAmount / 1000) * 1000);
        setTransactionDate(new Date()); // Reset to today when opening
        setShowCheckoutDialog(true);
    }, [items.length, totalAmount]);

    const closeCheckoutDialog = useCallback(() => {
        setShowCheckoutDialog(false);
    }, []);

    const closeReceiptDialog = useCallback(() => {
        setShowReceiptDialog(false);
    }, []);

    // Process sale offline - save to local storage
    const processOfflineSale = useCallback(() => {
        if (!user || !profile) return false;

        const now = new Date();
        const yyyy = String(now.getFullYear());
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const saleNumber = `INV/${yyyy}${mm}${dd}-${rand}-OFF`; // -OFF suffix for offline

        const changeAmount = paymentMethod === 'cash' ? Math.max(0, amountPaid - totalAmount) : 0;
        const finalAmountPaid = paymentMethod === 'cash' ? amountPaid : totalAmount;

        // Prepare items with product details
        const saleItems = items.map(it => {
            const itemTotal = it.product.price * it.quantity;
            // discount is now a fixed amount in Rupiah per item
            const itemDiscountAmount = it.discount * it.quantity;
            return {
                // Use null for manual entry items (Quick Sale)
                productId: it.isManualEntry ? null : it.product.id,
                productName: it.product.name,
                barcode: it.product.barcode || '',
                quantity: it.quantity,
                price: it.product.price,
                discount: it.discount,
                subtotal: Math.round(itemTotal - itemDiscountAmount),
                isManualEntry: it.isManualEntry || false,
            };
        });

        // Save to offline queue
        addOfflineSale({
            saleNumber,
            cashierId: user.id,
            cashierName: profile.name,
            paymentMethod,
            stockLocation,
            items: saleItems,
            totalAmount,
            orderDiscount,
            amountPaid: finalAmountPaid,
            changeAmount,
            createdAt: now.toISOString(),
        });

        // Set last sale for receipt
        setLastSale({
            saleNumber,
            total: totalAmount,
            subtotal,
            orderDiscount,
            items: saleItems.map(it => ({
                name: it.productName,
                quantity: it.quantity,
                price: it.price,
                discount: it.discount,
                subtotal: it.subtotal,
            })),
            method: paymentMethod,
            amountPaid: finalAmountPaid,
            change: changeAmount,
            date: now,
            isOffline: true,
            returnRef,
        });

        return true;
    }, [user, profile, items, paymentMethod, amountPaid, totalAmount, subtotal, orderDiscount, stockLocation, returnRef]);

    const handleConfirmCheckout = useCallback(async () => {
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
            // Check if we're offline
            if (!isOnline()) {
                console.log('[POS] Offline mode - saving to local queue');

                const offlineSuccess = processOfflineSale();

                if (offlineSuccess) {
                    setShowReceiptDialog(true);
                    toast({
                        title: '📴 Transaksi Disimpan (Offline)',
                        description: `Total Rp ${totalAmount.toLocaleString('id-ID')} - Akan sync saat online`,
                    });
                    onSuccess();
                    setAmountPaid(0);
                } else {
                    toast({
                        title: 'Gagal menyimpan',
                        description: 'User tidak terautentikasi',
                        variant: 'destructive',
                    });
                }
                return;
            }

            // Online mode - use normal createSale
            const now = new Date();
            const yyyy = String(now.getFullYear());
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
            const saleNumber = `INV/${yyyy}${mm}${dd}-${rand}`;

            const changeAmount = paymentMethod === 'cash' ? Math.max(0, amountPaid - totalAmount) : 0;
            const finalAmountPaid = paymentMethod === 'cash' ? amountPaid : totalAmount;

            const result = await createSale({
                paymentMethod,
                stockLocation,
                items: items.map((it) => ({
                    // Use null for manual entry items (Quick Sale)
                    productId: it.isManualEntry ? null : it.product.id,
                    productName: it.product.name,
                    price: it.product.price,
                    barcode: it.product.barcode || '',
                    quantity: it.quantity,
                    discount: it.discount,
                    isManualEntry: it.isManualEntry || false,
                })),
                orderDiscount,
                amountPaid: finalAmountPaid,
                // Pass transaction date for backdated transactions
                transactionDate,
            });

            if (result) {
                const saleItems = items.map(it => {
                    const itemTotal = it.product.price * it.quantity;
                    // discount is now a fixed amount in Rupiah per item
                    const itemDiscountAmount = it.discount * it.quantity;
                    return {
                        name: it.product.name,
                        quantity: it.quantity,
                        price: it.product.price,
                        discount: it.discount,
                        subtotal: Math.round(itemTotal - itemDiscountAmount),
                    };
                });

                setLastSale({
                    saleNumber: result.saleNumber,
                    total: totalAmount,
                    subtotal,
                    orderDiscount,
                    items: saleItems,
                    method: paymentMethod,
                    amountPaid: finalAmountPaid,
                    change: changeAmount,
                    date: transactionDate,
                    isOffline: false,
                    returnRef,
                });

                setShowReceiptDialog(true);
                toast({
                    title: '✅ Penjualan berhasil!',
                    description: `Total Rp ${totalAmount.toLocaleString('id-ID')}`,
                });

                onSuccess(result.saleId, result.saleNumber);
                setAmountPaid(0);
            }
        } finally {
            setIsProcessing(false);
        }
    }, [items, paymentMethod, amountPaid, totalAmount, subtotal, orderDiscount, stockLocation, createSale, toast, onSuccess, processOfflineSale, returnRef, transactionDate]);

    return {
        paymentMethod,
        setPaymentMethod,
        isProcessing,
        showCheckoutDialog,
        showReceiptDialog,
        amountPaid,
        setAmountPaid,
        transactionDate,
        setTransactionDate,
        lastSale,
        receiptRef,
        openCheckoutDialog,
        closeCheckoutDialog,
        closeReceiptDialog,
        handleConfirmCheckout,
        handlePrint: () => handlePrint(),
    };
}
