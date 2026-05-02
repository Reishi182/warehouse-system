import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import {
    X, ShoppingBag, User, Clock, CreditCard, Banknote,
    Package, Tag, Receipt, BadgePercent, ArrowLeftRight,
    AlertTriangle, CheckCircle2, Wallet,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sale } from '@/types';
import { formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';

interface TransactionDetailDialogProps {
    sale: Sale | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function PaymentIcon({ method, className }: { method: string; className?: string }) {
    if (method === 'cash') return <Banknote className={cn('w-4 h-4', className)} />;
    if (method === 'transfer') return <CreditCard className={cn('w-4 h-4', className)} />;
    return <Wallet className={cn('w-4 h-4', className)} />;
}

function StatusBadge({ sale }: { sale: Sale }) {
    if (sale.is_cancelled) {
        return (
            <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 gap-1">
                <AlertTriangle className="w-3 h-3" /> Dibatalkan
            </Badge>
        );
    }
    if (sale.is_exchanged) {
        return (
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800 gap-1">
                <ArrowLeftRight className="w-3 h-3" /> Ditukar
            </Badge>
        );
    }
    if (sale.is_credit && !sale.credit_settled_at) {
        return (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 gap-1">
                <AlertTriangle className="w-3 h-3" /> Piutang
            </Badge>
        );
    }
    return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Lunas
        </Badge>
    );
}

export function TransactionDetailDialog({ sale, open, onOpenChange }: TransactionDetailDialogProps) {
    if (!sale) return null;

    const totalItemDiscount = sale.items.reduce((s, i) => s + (i.discount || 0) * i.quantity, 0);
    const orderDiscount = sale.order_discount || 0;
    const totalDiscount = totalItemDiscount + orderDiscount;
    const grossTotal = sale.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const hasAnyDiscount = totalDiscount > 0;

    const paymentColor =
        sale.payment_method === 'cash'
            ? 'bg-emerald-500'
            : sale.payment_method === 'transfer'
            ? 'bg-blue-500'
            : 'bg-indigo-500';

    const paymentLabel =
        sale.payment_method === 'cash' ? 'Tunai'
        : sale.payment_method === 'transfer' ? 'Transfer'
        : 'Split';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
                {/* ── Header gradient ── */}
                <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 pb-5">
                    {/* close */}
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg', paymentColor)}>
                            <PaymentIcon method={sale.payment_method} className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white/60 text-xs mb-0.5">No. Transaksi</p>
                            <h2 className="text-white font-bold text-base leading-tight font-mono">
                                {sale.sale_number}
                            </h2>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <StatusBadge sale={sale} />
                                <Badge className="bg-white/10 text-white/80 border-white/20 gap-1 text-xs">
                                    <PaymentIcon method={sale.payment_method} className="w-3 h-3" />
                                    {paymentLabel}
                                </Badge>
                                <Badge className="bg-white/10 text-white/80 border-white/20 gap-1 text-xs">
                                    <Package className="w-3 h-3" />
                                    {sale.stock_location === 'gudang' ? 'Gudang' : 'Toko'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Meta row */}
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/60">
                        <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {sale.cashier_name}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(sale.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                        </span>
                        {sale.is_credit && sale.credit_customer_name && (
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-amber-400" />
                                <span className="text-amber-300">{sale.credit_customer_name}</span>
                            </span>
                        )}
                    </div>
                </div>

                <DialogHeader className="sr-only">
                    <DialogTitle>Detail Transaksi {sale.sale_number}</DialogTitle>
                </DialogHeader>

                <div className="bg-background">
                    {/* ── Item list ── */}
                    <ScrollArea className="max-h-[40vh]">
                        <div className="p-4 space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <ShoppingBag className="w-3.5 h-3.5" />
                                {sale.items.length} Item Terjual
                            </p>

                            {sale.items.map((item, idx) => {
                                const itemDiscount = (item.discount || 0) * item.quantity;
                                const originalSubtotal = item.price * item.quantity;
                                return (
                                    <div
                                        key={item.id ?? idx}
                                        className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0"
                                    >
                                        {/* Index bubble */}
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
                                            {idx + 1}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm leading-tight truncate">
                                                {item.product_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                                {item.barcode}
                                            </p>
                                            {/* Price detail */}
                                            <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                                                <span>
                                                    {formatRupiah(item.price)} × {item.quantity}
                                                    {item.unit ? ` ${item.unit}` : ''}
                                                </span>
                                                {itemDiscount > 0 && (
                                                    <span className="flex items-center gap-0.5 text-rose-500">
                                                        <Tag className="w-3 h-3" />
                                                        Diskon {formatRupiah(item.discount || 0)}/item
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            {itemDiscount > 0 ? (
                                                <>
                                                    <p className="text-xs text-muted-foreground line-through">
                                                        {formatRupiah(originalSubtotal)}
                                                    </p>
                                                    <p className="text-sm font-bold text-emerald-600">
                                                        {formatRupiah(item.subtotal)}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-sm font-bold">
                                                    {formatRupiah(item.subtotal)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    {/* ── Summary ── */}
                    <div className="p-4 pt-0 space-y-2 border-t border-border">
                        {/* Gross */}
                        <div className="flex justify-between text-sm text-muted-foreground pt-3">
                            <span>Subtotal</span>
                            <span>{formatRupiah(grossTotal)}</span>
                        </div>

                        {/* Item discount breakdown */}
                        {totalItemDiscount > 0 && (
                            <div className="flex justify-between text-sm text-rose-500">
                                <span className="flex items-center gap-1">
                                    <Tag className="w-3.5 h-3.5" />
                                    Diskon Item
                                </span>
                                <span>- {formatRupiah(totalItemDiscount)}</span>
                            </div>
                        )}

                        {/* Order discount */}
                        {orderDiscount > 0 && (
                            <div className="flex justify-between text-sm text-rose-500">
                                <span className="flex items-center gap-1">
                                    <BadgePercent className="w-3.5 h-3.5" />
                                    Diskon Order
                                </span>
                                <span>- {formatRupiah(orderDiscount)}</span>
                            </div>
                        )}

                        {/* Total discount summary */}
                        {hasAnyDiscount && (
                            <div className="flex justify-between text-xs text-muted-foreground bg-rose-50 dark:bg-rose-950/20 px-2 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/40">
                                <span>Total Hemat</span>
                                <span className="font-semibold text-rose-600">- {formatRupiah(totalDiscount)}</span>
                            </div>
                        )}

                        {/* Grand total */}
                        <div className="flex justify-between items-center pt-2 border-t border-border">
                            <span className="font-bold text-base">Total</span>
                            <span className={cn(
                                'font-bold text-xl',
                                (sale.is_cancelled || sale.is_exchanged)
                                    ? 'text-muted-foreground line-through'
                                    : 'text-emerald-600'
                            )}>
                                {formatRupiah(sale.total_amount)}
                            </span>
                        </div>

                        {/* Split payment detail */}
                        {sale.payment_method === 'split' && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1.5 rounded-lg">
                                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                    Tunai: <span className="font-semibold text-emerald-600">{formatRupiah(sale.amount_cash || 0)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 px-2 py-1.5 rounded-lg">
                                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                    Transfer: <span className="font-semibold text-blue-600">{formatRupiah(sale.amount_transfer || 0)}</span>
                                </div>
                            </div>
                        )}

                        {/* Change */}
                        {sale.change_amount > 0 && (
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Receipt className="w-3.5 h-3.5" />
                                    Kembalian
                                </span>
                                <span className="font-semibold">{formatRupiah(sale.change_amount)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
