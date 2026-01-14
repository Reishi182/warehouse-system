import { useMemo } from 'react';
import { Receipt, Banknote, CreditCard, Clock, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sale } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface TransactionHistoryProps {
    sales: Sale[];
    maxItems?: number;
}

export default function TransactionHistory({ sales, maxItems = 10 }: TransactionHistoryProps) {
    const recentSales = useMemo(() => {
        return [...sales]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, maxItems);
    }, [sales, maxItems]);

    const formatTime = (dateString: string) => {
        try {
            return format(new Date(dateString), 'HH:mm', { locale: localeId });
        } catch {
            return '--:--';
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'dd MMM', { locale: localeId });
        } catch {
            return '--';
        }
    };

    return (
        <Card className="rounded-2xl border-0 shadow-lg">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5 text-primary" />
                        Riwayat Transaksi
                    </CardTitle>
                    <Badge variant="secondary" className="rounded-full">
                        {recentSales.length} terbaru
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {recentSales.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Belum ada transaksi hari ini</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[350px]">
                        <div className="divide-y divide-border">
                            {recentSales.map((sale) => (
                                <div
                                    key={sale.id}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                                >
                                    {/* Payment Icon */}
                                    <div className={`p-2 rounded-xl ${sale.payment_method === 'cash'
                                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                                        }`}>
                                        {sale.payment_method === 'cash' ? (
                                            <Banknote className="w-4 h-4" />
                                        ) : (
                                            <CreditCard className="w-4 h-4" />
                                        )}
                                    </div>

                                    {/* Transaction Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm truncate">{sale.sale_number}</p>
                                            <Badge
                                                variant="outline"
                                                className={`rounded-full text-xs ${sale.payment_method === 'cash'
                                                        ? 'border-emerald-200 text-emerald-600'
                                                        : 'border-blue-200 text-blue-600'
                                                    }`}
                                            >
                                                {sale.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {sale.items?.length || 0} item • {sale.stock_location}
                                        </p>
                                    </div>

                                    {/* Amount & Time */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-sm text-green-600">
                                            +Rp {sale.total_amount.toLocaleString('id-ID')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatTime(sale.created_at)} • {formatDate(sale.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
