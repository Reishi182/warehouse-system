import { useMemo, useEffect } from 'react';
import {
    CheckCircle2,
    CreditCard,
    Banknote,
    Loader2,
    Delete,
    AlertCircle,
    User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AppModal } from '@/components/ui/app-modal';
import { DatePicker } from '@/components/common/DatePicker';
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
    splitCashAmount: number;
    onSplitCashAmountChange: (amount: number) => void;
    splitTransferAmount: number;
    onSplitTransferAmountChange: (amount: number) => void;
    transactionDate: Date;
    onTransactionDateChange: (date: Date) => void;
    onConfirm: () => void;
    isProcessing: boolean;
    // Credit transaction props
    isCredit: boolean;
    onIsCreditChange: (isCredit: boolean) => void;
    creditCustomerName: string;
    onCreditCustomerNameChange: (name: string) => void;
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
    splitCashAmount,
    onSplitCashAmountChange,
    splitTransferAmount,
    onSplitTransferAmountChange,
    transactionDate,
    onTransactionDateChange,
    onConfirm,
    isProcessing,
    isCredit,
    onIsCreditChange,
    creditCustomerName,
    onCreditCustomerNameChange,
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

    const canConfirm = useMemo(() => {
        if (isProcessing) return false;
        if (isCredit) {
            return creditCustomerName.trim().length > 0;
        }
        if (paymentMethod === 'split') {
            return (splitCashAmount + splitTransferAmount) >= totalAmount;
        }
        return paymentMethod === 'transfer' || amountPaid >= totalAmount;
    }, [isProcessing, isCredit, creditCustomerName, paymentMethod, amountPaid, totalAmount, splitCashAmount, splitTransferAmount]);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && canConfirm) {
                e.preventDefault();
                onConfirm();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, canConfirm, onConfirm]);

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
        <AppModal
            open={open}
            onClose={() => onOpenChange(false)}
            hideHeader
            noPadding
            size="sm"
            scrollable={false}
            disableClose={isProcessing}
        >
            {/* Header - gradient */}
            <div className={cn(
                "p-6 border-b",
                isCredit
                    ? "bg-gradient-to-br from-white to-orange-100 dark:from-slate-900 dark:to-orange-900/30"
                    : "bg-gradient-to-br from-white to-primary/20 dark:from-slate-900 dark:to-primary/30"
            )}>
                <h2 className="text-xl font-bold">
                    {isCredit ? 'Transaksi Piutang' : 'Pembayaran'}
                </h2>
                <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {items.length} item · {isCredit ? 'Piutang' : paymentMethod === 'cash' ? 'Tunai' : paymentMethod === 'split' ? 'Split (Trf+Tunai)' : 'Transfer'}
                    </div>
                    <div className={cn("text-2xl font-bold", isCredit ? "text-orange-600" : "text-primary")}>
                        Rp {totalAmount.toLocaleString('id-ID')}
                    </div>
                </div>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
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

                {/* Credit Transaction Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", isCredit ? "bg-orange-500 text-white" : "bg-orange-100 dark:bg-orange-900/30")}>
                            <AlertCircle className={cn("w-5 h-5", isCredit ? "text-white" : "text-orange-600")} />
                        </div>
                        <div>
                            <p className="font-medium text-sm">Transaksi Piutang</p>
                            <p className="text-xs text-muted-foreground">Customer belum bayar</p>
                        </div>
                    </div>
                    <Switch checked={isCredit} onCheckedChange={onIsCreditChange} />
                </div>

                {/* Credit Customer Name Input */}
                {isCredit && (
                    <div className="space-y-2">
                        <Label className="text-sm">Nama Customer</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={creditCustomerName}
                                onChange={(e) => onCreditCustomerNameChange(e.target.value)}
                                className="h-11 pl-10 rounded-xl"
                                placeholder="Masukkan nama customer..."
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {/* Transaction Date Picker */}
                <div className="space-y-2">
                    <Label className="text-sm">Tanggal Transaksi</Label>
                    <DatePicker
                        date={transactionDate}
                        onDateChange={(date) => date && onTransactionDateChange(date)}
                        disableFuture
                        placeholder="Pilih tanggal transaksi"
                        className="h-10"
                    />
                    {transactionDate.toDateString() !== new Date().toDateString() && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                            ⚠️ Transaksi akan dicatat pada tanggal {transactionDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    )}
                </div>

                {/* Cash Payment */}
                {!isCredit && paymentMethod === 'cash' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm">Uang Diterima</Label>
                            <Input isCurrency
                                type="number"
                                value={amountPaid || ''}
                                onChange={(e) => onAmountPaidChange(parseInt(e.target.value) || 0)}
                                className="h-12 text-xl font-bold text-center rounded-xl"
                                placeholder="0"
                            />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {quickAmounts.map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => onAmountPaidChange(amount)}
                                    className={cn(
                                        "py-2 rounded-lg text-sm font-medium transition-all",
                                        amountPaid === amount ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                                    )}
                                >
                                    {formatQuickAmount(amount)}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((key) => (
                                <button
                                    key={key}
                                    onClick={() => handleKeypadInput(key)}
                                    className={cn(
                                        "h-12 rounded-xl text-lg font-bold transition-all active:scale-95",
                                        key === 'clear' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                            : key === 'backspace' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                : "bg-muted hover:bg-muted/80"
                                    )}
                                >
                                    {key === 'clear' ? 'C' : key === 'backspace' ? <Delete className="w-5 h-5 mx-auto" /> : key}
                                </button>
                            ))}
                        </div>
                        {amountPaid >= totalAmount && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-white to-emerald-100 dark:from-slate-900 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Kembalian</span>
                                    <span className="text-xl font-bold text-emerald-600">Rp {changeAmount.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Split Payment */}
                {!isCredit && paymentMethod === 'split' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm">Nominal Transfer</Label>
                            <Input isCurrency
                                type="number"
                                value={splitTransferAmount || ''}
                                onChange={(e) => onSplitTransferAmountChange(parseInt(e.target.value) || 0)}
                                className="h-12 text-xl font-bold text-center rounded-xl border-blue-200"
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm">Nominal Tunai</Label>
                            <Input isCurrency
                                type="number"
                                value={splitCashAmount || ''}
                                onChange={(e) => onSplitCashAmountChange(parseInt(e.target.value) || 0)}
                                className="h-12 text-xl font-bold text-center rounded-xl border-emerald-200"
                                placeholder="0"
                            />
                        </div>
                        {(splitCashAmount + splitTransferAmount) >= totalAmount && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-white to-emerald-100 dark:from-slate-900 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Kembalian</span>
                                    <span className="text-xl font-bold text-emerald-600">
                                        Rp {Math.max(0, (splitCashAmount + splitTransferAmount) - totalAmount).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Transfer Payment */}
                {!isCredit && paymentMethod === 'transfer' && (
                    <div className="p-5 rounded-xl bg-gradient-to-br from-white to-blue-100 dark:from-slate-900 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 text-center">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-blue-600 flex items-center justify-center">
                            <CreditCard className="w-7 h-7 text-white" />
                        </div>
                        <p className="font-semibold text-blue-700 dark:text-blue-400">Pembayaran Transfer</p>
                        <p className="text-sm text-blue-600/70 dark:text-blue-400/70 mt-1">Pastikan transfer sudah diterima</p>
                    </div>
                )}

                {/* Credit Info */}
                {isCredit && (
                    <div className="p-5 rounded-xl bg-gradient-to-br from-white to-orange-100 dark:from-slate-900 dark:to-orange-900/30 border border-orange-200 dark:border-orange-800 text-center">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-orange-500 flex items-center justify-center">
                            <AlertCircle className="w-7 h-7 text-white" />
                        </div>
                        <p className="font-semibold text-orange-700 dark:text-orange-400">Transaksi Piutang</p>
                        <p className="text-sm text-orange-600/70 dark:text-orange-400/70 mt-1">
                            Stok akan berkurang, pembayaran ditangguhkan
                        </p>
                    </div>
                )}

                {/* Confirm Button */}
                <Button
                    className={cn(
                        "w-full h-12 text-base font-bold rounded-xl",
                        isCredit ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700"
                    )}
                    onClick={onConfirm}
                    disabled={!canConfirm}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Memproses...
                        </>
                    ) : isCredit ? (
                        <>
                            <AlertCircle className="w-5 h-5 mr-2" />
                            Catat Piutang
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            Konfirmasi Pembayaran
                        </>
                    )}
                </Button>
            </div>
        </AppModal>
    );
}