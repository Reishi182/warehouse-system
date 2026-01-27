import {
    ShoppingCart,
    CheckCircle2,
    CreditCard,
    Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
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
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl border-2 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
                <DialogHeader className="relative z-10">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 shadow-sm">
                            <ShoppingCart className="w-5 h-5 text-primary" />
                        </div>
                        Konfirmasi Pembayaran
                    </DialogTitle>
                    <DialogDescription>
                        Periksa detail transaksi sebelum melanjutkan
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 relative z-10">
                    {/* Order Summary */}
                    <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl space-y-2 border">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal ({items.length} item)</span>
                            <span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
                        </div>
                        {orderDiscount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600">
                                <span>Diskon ({orderDiscount}%)</span>
                                <span>-Rp {Math.round(subtotal * orderDiscount / 100).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                            <span>Total</span>
                            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                                Rp {totalAmount.toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    {/* Payment Method Display */}
                    <div className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                        paymentMethod === 'cash'
                            ? "bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/30"
                            : "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30"
                    )}>
                        <div className={cn(
                            "p-2 rounded-lg",
                            paymentMethod === 'cash' ? "bg-emerald-500/20" : "bg-blue-500/20"
                        )}>
                            {paymentMethod === 'cash' ? (
                                <Banknote className="w-6 h-6 text-emerald-600" />
                            ) : (
                                <CreditCard className="w-6 h-6 text-blue-600" />
                            )}
                        </div>
                        <div>
                            <p className="font-semibold">Metode Pembayaran</p>
                            <p className="text-sm text-muted-foreground">
                                {paymentMethod === 'cash' ? 'Tunai' : 'Transfer Bank'}
                            </p>
                        </div>
                    </div>

                    {/* Cash Payment Input */}
                    {paymentMethod === 'cash' && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>Uang Diterima</Label>
                                <Input
                                    type="number"
                                    value={amountPaid}
                                    onChange={(e) => onAmountPaidChange(parseInt(e.target.value) || 0)}
                                    className="text-lg h-12 font-bold text-right rounded-xl"
                                    min={totalAmount}
                                />
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="grid grid-cols-4 gap-2">
                                {[totalAmount, Math.ceil(totalAmount / 10000) * 10000, Math.ceil(totalAmount / 50000) * 50000, Math.ceil(totalAmount / 100000) * 100000].map((amount, idx) => (
                                    <Button
                                        key={idx}
                                        variant={amountPaid === amount ? 'default' : 'outline'}
                                        size="sm"
                                        className="rounded-lg text-xs"
                                        onClick={() => onAmountPaidChange(amount)}
                                    >
                                        {amount >= 1000 ? `${(amount / 1000).toFixed(0)}k` : amount}
                                    </Button>
                                ))}
                            </div>

                            {/* Change Display */}
                            {amountPaid >= totalAmount && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                    <div className="flex justify-between items-center">
                                        <span className="text-green-700 dark:text-green-400 font-medium">Kembalian</span>
                                        <span className="text-2xl font-bold text-green-600">
                                            Rp {(amountPaid - totalAmount).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                        Batal
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isProcessing || (paymentMethod === 'cash' && amountPaid < totalAmount)}
                        className="rounded-xl"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Konfirmasi Bayar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
