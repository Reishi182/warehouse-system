import { useMemo } from 'react';
import {
    CheckCircle2,
    CreditCard,
    Banknote,
    Loader2,
    Delete,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PaymentMethod } from '@/types';
import { CartItem } from '@/hooks/usePOSCart';
import { cn } from '@/lib/utils';

interface POSCheckoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: CartItem[];
    subtotal: number;
    totalAmount: number;
    orderDiscount: number;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    onAmountPaidChange: (amount: number) => void;
    onConfirm: () => void;
    isProcessing: boolean;
}

export function POSCheckoutDialog({
    open,
    onOpenChange,
    items,
    subtotal,
    totalAmount,
    orderDiscount,
    paymentMethod,
    amountPaid,
    onAmountPaidChange,
    onConfirm,
    isProcessing,
}: POSCheckoutDialogProps) {
    const changeAmount = useMemo(() => Math.max(0, amountPaid - totalAmount), [amountPaid, totalAmount]);

    const quickAmounts = useMemo(() => {
        const base = Math.ceil(totalAmount / 10000) * 10000;
        const amounts = new Set([
            10000, 20000, 50000, 100000, 150000, 200000, 300000, 500000, 1000000,
            base, base + 10000, base + 50000,
        ].filter(a => a >= totalAmount && a <= totalAmount + 500000));
        return [...amounts].sort((a, b) => a - b).slice(0, 8);
    }, [totalAmount]);

    const formatQuickAmount = (amount: number) => {
        if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}jt`;
        return `${amount / 1000}k`;
    };

    const handleKeypadInput = (value: string) => {
        if (value === 'clear') {
            onAmountPaidChange(0);
        } else if (value === 'backspace') {
            onAmountPaidChange(Math.floor(amountPaid / 10));
        } else {
            const newVal = parseInt(String(amountPaid) + value);
            if (!isNaN(newVal) && newVal <= 999999999) {
                onAmountPaidChange(newVal);
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-2xl max-w-md p-0 overflow-hidden border-0 shadow-2xl">
                {/* Header - White to Primary gradient */}
                <div className="bg-gradient-to-br from-white to-primary/20 dark:from-slate-900 dark:to-primary/30 p-6 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Pembayaran</DialogTitle>
                    </DialogHeader>

                    <div className="mt-3 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            {items.length} item · {paymentMethod === 'cash' ? 'Tunai' : 'Transfer'}
                        </div>
                        <div className="text-2xl font-bold text-primary">
                            Rp {totalAmount.toLocaleString('id-ID')}
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {/* Order Summary */}
                    <div className="p-3 rounded-xl bg-muted/30 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                        </div>
                        {orderDiscount > 0 && (
                            <div className="flex justify-between text-emerald-600">
                                <span>Diskon</span>
                                <span>-Rp {orderDiscount.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                    </div>

                    {/* Cash Payment */}
                    {paymentMethod === 'cash' && (
                        <div className="space-y-4">
                            {/* Amount Input */}
                            <div className="space-y-2">
                                <Label className="text-sm">Uang Diterima</Label>
                                <Input
                                    type="number"
                                    value={amountPaid || ''}
                                    onChange={(e) => onAmountPaidChange(parseInt(e.target.value) || 0)}
                                    className="h-12 text-xl font-bold text-center rounded-xl"
                                    placeholder="0"
                                />
                            </div>

                            {/* Quick Amount */}
                            <div className="grid grid-cols-4 gap-2">
                                {quickAmounts.map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => onAmountPaidChange(amount)}
                                        className={cn(
                                            "py-2 rounded-lg text-sm font-medium transition-all",
                                            amountPaid === amount
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted hover:bg-muted/80"
                                        )}
                                    >
                                        {formatQuickAmount(amount)}
                                    </button>
                                ))}
                            </div>

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-2">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => handleKeypadInput(key)}
                                        className={cn(
                                            "h-12 rounded-xl text-lg font-bold transition-all active:scale-95",
                                            key === 'clear'
                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                : key === 'backspace'
                                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    : "bg-muted hover:bg-muted/80"
                                        )}
                                    >
                                        {key === 'clear' ? 'C' : key === 'backspace' ? <Delete className="w-5 h-5 mx-auto" /> : key}
                                    </button>
                                ))}
                            </div>

                            {/* Change Display - White to Green gradient */}
                            {amountPaid >= totalAmount && (
                                <div className="p-4 rounded-xl bg-gradient-to-r from-white to-emerald-100 dark:from-slate-900 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-emerald-700 dark:text-emerald-400">Kembalian</span>
                                        <span className="text-xl font-bold text-emerald-600">
                                            Rp {changeAmount.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Transfer Payment - White to Blue gradient */}
                    {paymentMethod === 'transfer' && (
                        <div className="p-5 rounded-xl bg-gradient-to-br from-white to-blue-100 dark:from-slate-900 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 text-center">
                            <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-blue-600 flex items-center justify-center">
                                <CreditCard className="w-7 h-7 text-white" />
                            </div>
                            <p className="font-semibold text-blue-700 dark:text-blue-400">Pembayaran Transfer</p>
                            <p className="text-sm text-blue-600/70 dark:text-blue-400/70 mt-1">Pastikan transfer sudah diterima</p>
                        </div>
                    )}

                    {/* Confirm Button */}
                    <Button
                        className="w-full h-12 text-base font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700"
                        onClick={onConfirm}
                        disabled={isProcessing || (paymentMethod === 'cash' && amountPaid < totalAmount)}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                Konfirmasi Pembayaran
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
