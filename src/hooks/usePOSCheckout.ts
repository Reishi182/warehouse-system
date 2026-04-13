import { useState, useCallback, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PaymentMethod, Location } from '@/types';
import { useDataStore } from '@/store/useDataStore';
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
    amountCash?: number;
    amountTransfer?: number;
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
    exchangeFromSale?: any; // The original sale we are exchanging from
}

export interface UsePOSCheckoutReturn {
    paymentMethod: PaymentMethod;
    setPaymentMethod: (method: PaymentMethod) => void;
    isProcessing: boolean;
    showCheckoutDialog: boolean;
    showReceiptDialog: boolean;
    amountPaid: number;

    setAmountPaid: (amount: number) => void;
    splitCashAmount: number;
    setSplitCashAmount: (amount: number) => void;
    splitTransferAmount: number;
    setSplitTransferAmount: (amount: number) => void;
    transactionDate: Date;
    setTransactionDate: (date: Date) => void;
    lastSale: LastSaleData | null;
    receiptRef: React.RefObject<HTMLDivElement>;
    openCheckoutDialog: () => void;
    closeCheckoutDialog: () => void;
    closeReceiptDialog: () => void;
    handleConfirmCheckout: () => Promise<void>;
    handlePrint: () => void;
    // Credit transaction
    isCredit: boolean;
    setIsCredit: (isCredit: boolean) => void;
    creditCustomerName: string;
    setCreditCustomerName: (name: string) => void;
}

export function usePOSCheckout(options: UsePOSCheckoutOptions): UsePOSCheckoutReturn {
    const { items, subtotal, totalAmount, orderDiscount, stockLocation, onSuccess, returnRef, exchangeFromSale } = options;
    const createSale = useDataStore(s => s.createSale);
    const products = useDataStore(s => s.products);
    const { profile, user } = useAuth();
    const { toast } = useToast();

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
    const [showReceiptDialog, setShowReceiptDialog] = useState(false);
    const [amountPaid, setAmountPaid] = useState(0);
    const [splitCashAmount, setSplitCashAmount] = useState(0);
    const [splitTransferAmount, setSplitTransferAmount] = useState(0);
    const [transactionDate, setTransactionDate] = useState<Date>(new Date());
    const [lastSale, setLastSale] = useState<LastSaleData | null>(null);
    // Credit transaction state
    const [isCredit, setIsCredit] = useState(false);
    const [creditCustomerName, setCreditCustomerName] = useState('');

    const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: lastSale?.saleNumber || 'Receipt',
    });

    const openCheckoutDialog = useCallback(() => {
        const validItems = items.filter(it => it.quantity > 0);
        if (validItems.length === 0) {
            toast({
                title: 'Keranjang Kosong',
                description: 'Tidak ada item dengan jumlah lebih dari 0',
                variant: 'destructive',
            });
            return;
        }
        setAmountPaid(Math.ceil(totalAmount / 1000) * 1000);
        setSplitCashAmount(0);
        setSplitTransferAmount(totalAmount);
        setTransactionDate(new Date()); // Reset to today when opening
        setIsCredit(false); // Reset credit state
        setCreditCustomerName(''); // Reset customer name
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

        let changeAmount = 0;
        let finalAmountPaid = 0;
        let amountCash = 0;
        let amountTransfer = 0;

        if (isCredit) {
            finalAmountPaid = 0;
            changeAmount = 0;
        } else if (paymentMethod === 'split') {
            finalAmountPaid = splitCashAmount + splitTransferAmount;
            changeAmount = Math.max(0, finalAmountPaid - totalAmount);
            amountCash = splitCashAmount;
            amountTransfer = splitTransferAmount;
        } else if (paymentMethod === 'cash') {
            finalAmountPaid = amountPaid;
            changeAmount = Math.max(0, amountPaid - totalAmount);
            amountCash = amountPaid;
        } else {
            // transfer
            finalAmountPaid = totalAmount;
            changeAmount = 0;
            amountTransfer = totalAmount;
        }

        // Prepare items with product details
        const validItems = items.filter(it => it.quantity > 0);
        const saleItems = validItems.map(it => {
            const effectivePrice = it.unitPrice || it.product.price;
            const itemTotal = effectivePrice * it.quantity;
            // discount is now a fixed amount in Rupiah per item
            const itemDiscountAmount = it.discount * it.quantity;
            return {
                // Use null for manual entry items (Quick Sale)
                productId: it.isManualEntry ? null : it.product.id,
                productName: it.product.name,
                barcode: it.product.barcode || '',
                quantity: it.quantity,
                price: effectivePrice,
                discount: it.discount,
                subtotal: Math.round(itemTotal - itemDiscountAmount),
                isManualEntry: it.isManualEntry || false,
                // Multi-unit: how many base units to deduct from stock
                stockDeductQty: it.quantity * (it.unitMultiplier || 1),
            };
        });

        // Save to offline queue
        // Bug fix #2: Include isCredit, creditCustomerName, and transactionDate
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
            amountCash,
            amountTransfer,
            createdAt: transactionDate.toISOString(),
            isCredit,
            creditCustomerName: isCredit ? creditCustomerName.trim() : undefined,
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
            amountCash,
            amountTransfer,
            date: transactionDate,
            isOffline: true,
            returnRef,
        });

        return true;
    }, [user, profile, items, paymentMethod, amountPaid, totalAmount, subtotal, orderDiscount, stockLocation, returnRef, isCredit, creditCustomerName, transactionDate]);

    const handleConfirmCheckout = useCallback(async () => {
        const validItems = items.filter(it => it.quantity > 0);
        if (validItems.length === 0) return;

        // Skip payment check for credit transactions
        if (!isCredit && paymentMethod === 'cash' && amountPaid < totalAmount) {
            toast({
                title: 'Uang tidak cukup',
                description: 'Jumlah bayar harus minimal sama dengan total',
                variant: 'destructive'
            });
            return;
        }

        // Validate credit customer name
        if (isCredit && !creditCustomerName.trim()) {
            toast({
                title: 'Nama customer diperlukan',
                description: 'Masukkan nama customer untuk transaksi piutang',
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
            const HH = String(now.getHours()).padStart(2, '0');
            const MM = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            const rand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
            const saleNumber = `INV/${yyyy}${mm}${dd}-${HH}${MM}${ss}-${rand}`;

            let changeAmount = 0;
            let finalAmountPaid = 0;
            let amountCash = undefined;
            let amountTransfer = undefined;

            if (isCredit) {
                finalAmountPaid = 0;
                changeAmount = 0;
            } else if (paymentMethod === 'split') {
                finalAmountPaid = splitCashAmount + splitTransferAmount;
                changeAmount = Math.max(0, finalAmountPaid - totalAmount);
                amountCash = splitCashAmount;
                amountTransfer = splitTransferAmount;
            } else if (paymentMethod === 'cash') {
                changeAmount = Math.max(0, amountPaid - totalAmount);
                finalAmountPaid = amountPaid;
                amountCash = amountPaid;
                amountTransfer = 0;
            } else {
                changeAmount = 0;
                finalAmountPaid = totalAmount;
                amountCash = 0;
                amountTransfer = totalAmount;
            }

            // Only pass transactionDate if it's a backdated (different day from today)
            const isBackdated = transactionDate.toDateString() !== new Date().toDateString();

            const result = await createSale({
                paymentMethod,
                stockLocation,
                items: validItems.map((it) => ({
                    // Use null for manual entry items (Quick Sale)
                    productId: it.isManualEntry ? null : it.product.id,
                    productName: it.product.name,
                    price: it.unitPrice || it.product.price,
                    barcode: it.product.barcode || '',
                    quantity: it.quantity,
                    discount: it.discount,
                    isManualEntry: it.isManualEntry || false,
                    // Multi-unit: how many base units to deduct from stock
                    stockDeductQty: it.quantity * (it.unitMultiplier || 1),
                })),
                orderDiscount,
                amountPaid: isCredit ? 0 : finalAmountPaid, // No payment for credit
                amountCash,
                amountTransfer,
                // Credit transaction fields
                isCredit,
                creditCustomerName: isCredit ? creditCustomerName.trim() : undefined,
                // Only pass transaction date for backdated transactions
                ...(isBackdated && { transactionDate }),
                // Pass exchange info so createSale can calculate net stock
                ...(exchangeFromSale && {
                    exchangeOriginalItems: exchangeFromSale.items || [],
                    exchangeOriginalLocation: exchangeFromSale.stock_location || 'toko'
                }),
            });

            if (result) {
                const saleItems = validItems.map(it => {
                    const effectivePrice = it.unitPrice || it.product.price;
                    const itemTotal = effectivePrice * it.quantity;
                    // discount is now a fixed amount in Rupiah per item
                    const itemDiscountAmount = it.discount * it.quantity;
                    return {
                        name: it.product.name,
                        quantity: it.quantity,
                        price: effectivePrice,
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
                    amountCash,
                    amountTransfer,
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
        splitCashAmount,
        setSplitCashAmount,
        splitTransferAmount,
        setSplitTransferAmount,
        transactionDate,
        setTransactionDate,
        lastSale,
        receiptRef,
        openCheckoutDialog,
        closeCheckoutDialog,
        closeReceiptDialog,
        handleConfirmCheckout,
        handlePrint,
        // Credit transaction
        isCredit,
        setIsCredit,
        creditCustomerName,
        setCreditCustomerName,
    };
}
