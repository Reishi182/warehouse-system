import { useMemo } from 'react';
import { Receipt, Banknote, CreditCard, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sale } from '@/types';
import { Link } from 'react-router-dom';

interface CashierStatsGridProps {
    salesToday: Sale[];
    totalCashTransfer: number;
}

export default function CashierStatsGrid({ salesToday, totalCashTransfer }: CashierStatsGridProps) {
    const stats = useMemo(() => {
        const count = salesToday.length;
        const totalAmount = salesToday.reduce((acc, s) => acc + s.total_amount, 0);
        const cashSales = salesToday.filter(s => s.payment_method === 'cash');
        const transferSales = salesToday.filter(s => s.payment_method === 'transfer');
        const cashAmount = cashSales.reduce((acc, s) => acc + s.total_amount, 0);
        const transferAmount = transferSales.reduce((acc, s) => acc + s.total_amount, 0);
        const saldoBelumDisetor = Math.max(0, cashAmount - totalCashTransfer);

        return {
            count,
            totalAmount,
            cashAmount,
            transferAmount,
            cashCount: cashSales.length,
            transferCount: transferSales.length,
            saldoBelumDisetor,
        };
    }, [salesToday, totalCashTransfer]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Total Transaksi */}
            <Card className="rounded-2xl border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Receipt className="w-5 h-5 text-primary" />
                        <Badge variant="secondary" className="rounded-full text-xs">
                            Hari ini
                        </Badge>
                    </div>
                    <p className="text-2xl font-bold">{stats.count}</p>
                    <p className="text-xs text-muted-foreground">Total Transaksi</p>
                </CardContent>
            </Card>

            {/* Total Penjualan */}
            <Card className="rounded-2xl border-0 shadow-md bg-gradient-to-br from-green-500/5 to-green-500/10">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <Link to="/pos" className="text-xs text-primary hover:underline flex items-center gap-1">
                            POS <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                        Rp {stats.totalAmount.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Penjualan</p>
                </CardContent>
            </Card>

            {/* Cash Masuk */}
            <Card className="rounded-2xl border-0 shadow-md bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Banknote className="w-5 h-5 text-emerald-600" />
                        <Badge className="rounded-full text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30">
                            {stats.cashCount} trx
                        </Badge>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">
                        Rp {stats.cashAmount.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Cash Masuk</p>
                </CardContent>
            </Card>

            {/* Saldo Belum Disetor */}
            <Card className="rounded-2xl border-0 shadow-md bg-gradient-to-br from-amber-500/5 to-amber-500/10">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <CreditCard className="w-5 h-5 text-amber-600" />
                        <Link to="/cash-transfer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            Setor <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">
                        Rp {stats.saldoBelumDisetor.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-muted-foreground">Belum Disetor</p>
                </CardContent>
            </Card>
        </div>
    );
}
