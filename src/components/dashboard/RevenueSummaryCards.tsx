import { useMemo } from 'react';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    CalendarDays,
    Wallet,
    ArrowUpRight,
    Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sale } from '@/types';

interface RevenueSummaryCardsProps {
    sales: Sale[];
}

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function getStartOfWeek(d: Date) {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    return new Date(d.setDate(diff));
}

export default function RevenueSummaryCards({ sales }: RevenueSummaryCardsProps) {
    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = toISODate(now);

        // Yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toISODate(yesterday);

        // Today's revenue
        const todayRevenue = sales
            .filter(s => s.created_at.slice(0, 10) === todayStr)
            .reduce((acc, s) => acc + s.total_amount, 0);

        const yesterdayRevenue = sales
            .filter(s => s.created_at.slice(0, 10) === yesterdayStr)
            .reduce((acc, s) => acc + s.total_amount, 0);

        const dailyChange = yesterdayRevenue > 0
            ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100)
            : 0;

        // This week (last 7 days)
        const thisWeekStart = new Date(now);
        thisWeekStart.setDate(thisWeekStart.getDate() - 6);
        const thisWeekRevenue = sales
            .filter(s => new Date(s.created_at) >= thisWeekStart)
            .reduce((acc, s) => acc + s.total_amount, 0);

        // Previous week
        const prevWeekStart = new Date(thisWeekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekEnd = new Date(thisWeekStart);
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
        const prevWeekRevenue = sales
            .filter(s => {
                const date = new Date(s.created_at);
                return date >= prevWeekStart && date <= prevWeekEnd;
            })
            .reduce((acc, s) => acc + s.total_amount, 0);

        const weeklyChange = prevWeekRevenue > 0
            ? ((thisWeekRevenue - prevWeekRevenue) / prevWeekRevenue * 100)
            : 0;

        // This month
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthRevenue = sales
            .filter(s => new Date(s.created_at) >= thisMonthStart)
            .reduce((acc, s) => acc + s.total_amount, 0);

        // Previous month
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const prevMonthRevenue = sales
            .filter(s => {
                const date = new Date(s.created_at);
                return date >= prevMonthStart && date <= prevMonthEnd;
            })
            .reduce((acc, s) => acc + s.total_amount, 0);

        const monthlyChange = prevMonthRevenue > 0
            ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue * 100)
            : 0;

        // Average order value (AOV) - this month
        const thisMonthSales = sales.filter(s => new Date(s.created_at) >= thisMonthStart);
        const aov = thisMonthSales.length > 0
            ? thisMonthRevenue / thisMonthSales.length
            : 0;

        // Previous month AOV
        const prevMonthSales = sales.filter(s => {
            const date = new Date(s.created_at);
            return date >= prevMonthStart && date <= prevMonthEnd;
        });
        const prevAov = prevMonthSales.length > 0
            ? prevMonthRevenue / prevMonthSales.length
            : 0;

        const aovChange = prevAov > 0
            ? ((aov - prevAov) / prevAov * 100)
            : 0;

        return {
            todayRevenue,
            dailyChange,
            thisWeekRevenue,
            weeklyChange,
            thisMonthRevenue,
            monthlyChange,
            aov,
            aovChange,
            todayTransactions: sales.filter(s => s.created_at.slice(0, 10) === todayStr).length,
        };
    }, [sales]);

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}jt`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}rb`;
        }
        return value.toLocaleString('id-ID');
    };

    const cards = [
        {
            title: 'Revenue Hari Ini',
            value: stats.todayRevenue,
            change: stats.dailyChange,
            subtitle: `${stats.todayTransactions} transaksi`,
            icon: DollarSign,
            gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
            iconBg: 'bg-emerald-500/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            valueColor: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            title: 'Revenue 7 Hari',
            value: stats.thisWeekRevenue,
            change: stats.weeklyChange,
            subtitle: 'vs minggu lalu',
            icon: Calendar,
            gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
            valueColor: 'text-blue-600 dark:text-blue-400',
        },
        {
            title: 'Revenue Bulan Ini',
            value: stats.thisMonthRevenue,
            change: stats.monthlyChange,
            subtitle: 'vs bulan lalu',
            icon: CalendarDays,
            gradient: 'from-violet-500/20 via-violet-500/10 to-transparent',
            iconBg: 'bg-violet-500/20',
            iconColor: 'text-violet-600 dark:text-violet-400',
            valueColor: 'text-violet-600 dark:text-violet-400',
        },
        {
            title: 'Rata-rata Order',
            value: stats.aov,
            change: stats.aovChange,
            subtitle: 'per transaksi',
            icon: Sparkles,
            gradient: 'from-amber-500/20 via-amber-500/10 to-transparent',
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-600 dark:text-amber-400',
            valueColor: 'text-amber-600 dark:text-amber-400',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                const isPositive = card.change >= 0;

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

                                <Badge
                                    variant="secondary"
                                    className={`
                                        rounded-full px-2.5 py-1 text-xs font-semibold
                                        ${isPositive
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                        }
                                    `}
                                >
                                    <span className="flex items-center gap-1">
                                        {isPositive ? (
                                            <TrendingUp className="w-3 h-3" />
                                        ) : (
                                            <TrendingDown className="w-3 h-3" />
                                        )}
                                        {Math.abs(card.change).toFixed(1)}%
                                    </span>
                                </Badge>
                            </div>

                            {/* Value */}
                            <div className="space-y-1">
                                <p className={`text-2xl xl:text-3xl font-bold ${card.valueColor} tracking-tight`}>
                                    Rp {formatCurrency(card.value)}
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
