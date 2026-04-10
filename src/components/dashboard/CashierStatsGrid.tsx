import { useMemo } from 'react';
import { Receipt, Banknote, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sale } from '@/types';
import { Link } from 'react-router-dom';
import { formatCompact } from '@/lib/format';

interface CashierStatsGridProps {
    salesToday: Sale[];
    totalCashTransfer: number;
}

export default function CashierStatsGrid({ salesToday, totalCashTransfer }: CashierStatsGridProps) {
    const stats = useMemo(() => {
        const count = salesToday.length;
        const totalAmount = salesToday.reduce((acc, s) => acc + s.total_amount, 0);
        const cashSales = salesToday.filter(s => s.payment_method === 'cash');
        const cashAmount = cashSales.reduce((acc, s) => acc + s.total_amount, 0);
        const saldoBelumDisetor = Math.max(0, cashAmount - totalCashTransfer);

        return {
            count,
            totalAmount,
            cashAmount,
            cashCount: cashSales.length,
            saldoBelumDisetor,
        };
    }, [salesToday, totalCashTransfer]);


    const cards = [
        {
            title: 'Total Transaksi',
            value: stats.count,
            subtitle: 'transaksi hari ini',
            icon: Receipt,
            gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
            valueColor: 'text-blue-600 dark:text-blue-400',
            link: null,
        },
        {
            title: 'Total Penjualan',
            value: formatCompact(stats.totalAmount),
            subtitle: 'pendapatan hari ini',
            icon: TrendingUp,
            gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
            iconBg: 'bg-emerald-500/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            valueColor: 'text-emerald-600 dark:text-emerald-400',
            link: { to: '/pos', label: 'POS' },
        },
        {
            title: 'Cash Masuk',
            value: formatCompact(stats.cashAmount),
            subtitle: `${stats.cashCount} transaksi tunai`,
            icon: Banknote,
            gradient: 'from-violet-500/20 via-violet-500/10 to-transparent',
            iconBg: 'bg-violet-500/20',
            iconColor: 'text-violet-600 dark:text-violet-400',
            valueColor: 'text-violet-600 dark:text-violet-400',
            link: null,
        },
        {
            title: 'Belum Disetor',
            value: formatCompact(stats.saldoBelumDisetor),
            subtitle: 'perlu setor',
            icon: Wallet,
            gradient: 'from-amber-500/20 via-amber-500/10 to-transparent',
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-600 dark:text-amber-400',
            valueColor: 'text-amber-600 dark:text-amber-400',
            link: { to: '/cash-transfer', label: 'Setor' },
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {cards.map((card, index) => {
                const Icon = card.icon;

                return (
                    <Card
                        key={card.title}
                        className={`
                            relative overflow-hidden border-0 shadow-lg 
                            bg-gradient-to-br ${card.gradient}
                            backdrop-blur-xl
                            hover:shadow-xl hover:scale-[1.02]
                            transition-all duration-300 ease-out
                            animate-slide-up
                        `}
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {/* Decorative glow */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl" />

                        <CardContent className="p-5 relative">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2.5 rounded-xl ${card.iconBg} backdrop-blur-sm`}>
                                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                                </div>

                                {card.link ? (
                                    <Link
                                        to={card.link.to}
                                        className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                                    >
                                        {card.link.label} <ArrowUpRight className="w-3 h-3" />
                                    </Link>
                                ) : (
                                    <Badge variant="secondary" className="rounded-full text-xs bg-muted/50">
                                        Hari ini
                                    </Badge>
                                )}
                            </div>

                            {/* Value */}
                            <div className="space-y-1">
                                <p className={`text-2xl xl:text-3xl font-bold ${card.valueColor} tracking-tight`}>
                                    {card.value}
                                </p>
                                <p className="text-sm text-muted-foreground font-medium">
                                    {card.title}
                                </p>
                                <p className="text-xs text-muted-foreground/70">
                                    {card.subtitle}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
