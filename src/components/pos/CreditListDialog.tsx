import { useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    AlertCircle,
    Banknote,
    CreditCard,
    Check,
    Loader2,
    User,
    Calendar,
    Receipt,
} from 'lucide-react';
import { useCreditSales, useSettleCreditSale } from '@/hooks/useCreditSales';
import { PaymentMethod, Sale } from '@/types';
import { cn } from '@/lib/utils';

interface CreditListDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreditListDialog({ open, onOpenChange }: CreditListDialogProps) {
    const { data: creditSales = [], isLoading } = useCreditSales();
    const settleMutation = useSettleCreditSale();
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [settleMethod, setSettleMethod] = useState<PaymentMethod>('cash');

    const handleSettle = async () => {
        if (!selectedSale) return;

        await settleMutation.mutateAsync({
            saleId: selectedSale.id,
            paymentMethod: settleMethod,
        });

        setSelectedSale(null);
    };

    const totalCredit = creditSales.reduce((acc, sale) => acc + sale.total_amount, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
                {/* Header */}
                <div className="p-4 border-b bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            Daftar Piutang
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            {creditSales.length} piutang belum lunas
                        </span>
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                            Total: Rp {totalCredit.toLocaleString('id-ID')}
                        </Badge>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : creditSales.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Check className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                            <p>Tidak ada piutang yang belum lunas</p>
                        </div>
                    ) : (
                        creditSales.map((sale) => (
                            <div
                                key={sale.id}
                                className={cn(
                                    "p-4 rounded-xl border transition-all cursor-pointer",
                                    selectedSale?.id === sale.id
                                        ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                                        : "border-border hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/20"
                                )}
                                onClick={() => setSelectedSale(selectedSale?.id === sale.id ? null : sale)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <User className="w-4 h-4 text-orange-600" />
                                            <span className="font-semibold truncate">
                                                {sale.credit_customer_name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Receipt className="w-3 h-3" />
                                                {sale.sale_number}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(sale.created_at), 'dd MMM yyyy', { locale: id })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-orange-600">
                                            Rp {sale.total_amount.toLocaleString('id-ID')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {sale.items?.length || 0} item
                                        </p>
                                    </div>
                                </div>

                                {/* Settle Options - shown when selected */}
                                {selectedSale?.id === sale.id && (
                                    <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
                                        <p className="text-sm font-medium mb-2">Metode Pelunasan:</p>
                                        <div className="flex gap-2 mb-3">
                                            <Button
                                                variant={settleMethod === 'cash' ? 'default' : 'outline'}
                                                size="sm"
                                                className={cn(
                                                    "flex-1",
                                                    settleMethod === 'cash' && "bg-emerald-600 hover:bg-emerald-700"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSettleMethod('cash');
                                                }}
                                            >
                                                <Banknote className="w-4 h-4 mr-1" />
                                                Tunai
                                            </Button>
                                            <Button
                                                variant={settleMethod === 'transfer' ? 'default' : 'outline'}
                                                size="sm"
                                                className={cn(
                                                    "flex-1",
                                                    settleMethod === 'transfer' && "bg-blue-600 hover:bg-blue-700"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSettleMethod('transfer');
                                                }}
                                            >
                                                <CreditCard className="w-4 h-4 mr-1" />
                                                Transfer
                                            </Button>
                                        </div>
                                        <Button
                                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSettle();
                                            }}
                                            disabled={settleMutation.isPending}
                                        >
                                            {settleMutation.isPending ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Memproses...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4 mr-2" />
                                                    Lunasi Piutang
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
