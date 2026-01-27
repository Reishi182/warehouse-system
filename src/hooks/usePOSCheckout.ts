import { useState, useCallback, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PaymentMethod, Location } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from './usePOSCart';

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
};

export interface UsePOSCheckoutOptions {
    items: CartItem[];
    subtotal: number;
    totalAmount: number;
    orderDiscount: number;
    stockLocation: Location;
    onSuccess: () => void;
}

export interface UsePOSCheckoutReturn {
    paymentMethod: PaymentMethod;
    setPaymentMethod: (method: PaymentMethod) => void;
    isProcessing: boolean;
    showCheckoutDialog: boolean;
    showReceiptDialog: boolean;
    amountPaid: number;
    setAmountPaid: (amount: number) => void;
    lastSale: LastSaleData | null;
    receiptRef: React.RefObject<HTMLDivElement>;
    openCheckoutDialog: () => void;
    closeCheckoutDialog: () => void;
    closeReceiptDialog: () => void;
    handleConfirmCheckout: () => Promise<void>;
    handlePrint: () => void;
}

export function usePOSCheckout(options: UsePOSCheckoutOptions): UsePOSCheckoutReturn {
    const { items, subtotal, totalAmount, orderDiscount, stockLocation, onSuccess } = options;
    const { createSale } = useData();
    const { profile } = useAuth();
    const { toast } = useToast();

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
    const [showReceiptDialog, setShowReceiptDialog] = useState(false);
    const [amountPaid, setAmountPaid] = useState(0);
    const [lastSale, setLastSale] = useState<LastSaleData | null>(null);

    const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: lastSale?.saleNumber || 'Receipt',
    });

    const openCheckoutDialog = useCallback(() => {
        if (items.length === 0) return;
        setAmountPaid(Math.ceil(totalAmount / 1000) * 1000);
        setShowCheckoutDialog(true);
    }, [items.length, totalAmount]);

    const closeCheckoutDialog = useCallback(() => {
        setShowCheckoutDialog(false);
    }, []);

    const closeReceiptDialog = useCallback(() => {
        setShowReceiptDialog(false);
    }, []);

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
            const now = new Date();
            const yyyy = String(now.getFullYear());
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
            const saleNumber = `INV/${yyyy}${mm}${dd}-${rand}`;

            const changeAmount = paymentMethod === 'cash' ? Math.max(0, amountPaid - totalAmount) : 0;
            const finalAmountPaid = paymentMethod === 'cash' ? amountPaid : totalAmount;

            const ok = await createSale({
                paymentMethod,
                stockLocation,
                items: items.map((it) => ({
                    productId: it.product.id,
                    quantity: it.quantity,
                    discount: it.discount
                })),
                orderDiscount,
                amountPaid: finalAmountPaid,
            });

            if (ok) {
                const saleItems = items.map(it => {
                    const itemTotal = it.product.price * it.quantity;
                    const itemDiscountAmount = itemTotal * (it.discount / 100);
                    return {
                        name: it.product.name,
                        quantity: it.quantity,
                        price: it.product.price,
                        discount: it.discount,
                        subtotal: Math.round(itemTotal - itemDiscountAmount),
                    };
                });

                setLastSale({
                    saleNumber,
                    total: totalAmount,
                    subtotal,
                    orderDiscount,
                    items: saleItems,
                    method: paymentMethod,
                    amountPaid: finalAmountPaid,
                    change: changeAmount,
                    date: now,
                });

                setShowReceiptDialog(true);
                toast({
                    title: '✅ Penjualan berhasil!',
                    description: `Total Rp ${totalAmount.toLocaleString('id-ID')}`,
                });

                onSuccess();
                setAmountPaid(0);
            }
        } finally {
            setIsProcessing(false);
        }
    }, [items, paymentMethod, amountPaid, totalAmount, subtotal, orderDiscount, stockLocation, createSale, toast, onSuccess]);

    return {
        paymentMethod,
        setPaymentMethod,
        isProcessing,
        showCheckoutDialog,
        showReceiptDialog,
        amountPaid,
        setAmountPaid,
        lastSale,
        receiptRef,
        openCheckoutDialog,
        closeCheckoutDialog,
        closeReceiptDialog,
        handleConfirmCheckout,
        handlePrint: () => handlePrint(),
    };
}
