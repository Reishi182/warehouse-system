import { useMemo } from 'react';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    CalendarDays,
    Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sale } from '@/types';

interface RevenueSummaryCardsProps {
    sales: Sale[];
    compact?: boolean;
}

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function RevenueSummaryCards({ sales, compact = false }: RevenueSummaryCardsProps) {
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

    const allCards = [
        {
            title: 'Revenue Hari Ini',
            value: stats.todayRevenue,
            change: stats.dailyChange,
            subtitle: `${stats.todayTransactions} transaksi`,
            icon: DollarSign,
            bgGradient: 'from-emerald-500 to-teal-600',
            iconBg: 'bg-white/20',
        },
        {
            title: 'Revenue 7 Hari',
            value: stats.thisWeekRevenue,
            change: stats.weeklyChange,
            subtitle: 'vs minggu lalu',
            icon: Calendar,
            bgGradient: 'from-blue-500 to-indigo-600',
            iconBg: 'bg-white/20',
        },
        {
            title: 'Revenue Bulan Ini',
            value: stats.thisMonthRevenue,
            change: stats.monthlyChange,
            subtitle: 'vs bulan lalu',
            icon: CalendarDays,
            bgGradient: 'from-violet-500 to-purple-600',
            iconBg: 'bg-white/20',
        },
        {
            title: 'Rata-rata Order',
            value: stats.aov,
            change: stats.aovChange,
            subtitle: 'per transaksi',
            icon: Sparkles,
            bgGradient: 'from-amber-500 to-orange-600',
            iconBg: 'bg-white/20',
        },
    ];

    const cards = compact ? allCards.slice(0, 1) : allCards;

    return (
        <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2 xl:grid-cols-4'} gap-4`}>
            {cards.map((card, index) => {
                const Icon = card.icon;
                const isPositive = card.change >= 0;

                return (
                    <Card
                        key={card.title}
                        className={`
                            relative overflow-hidden border-0 
                            bg-gradient-to-br ${card.bgGradient}
                            hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-1
                            transition-all duration-300 ease-out
                            animate-slide-up cursor-default
                            group
                        `}
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {/* Decorative circles */}
                        <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
                        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/5 rounded-full blur-lg" />

                        <CardContent className="p-5 relative">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2.5 rounded-xl ${card.iconBg} backdrop-blur-sm`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>

                                <Badge
                                    variant="secondary"
                                    className={`
                                        rounded-full px-2.5 py-1 text-xs font-semibold border-0
                                        ${isPositive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-red-500/30 text-white'
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
                                <p className="text-2xl xl:text-3xl font-bold text-white tracking-tight">
                                    Rp {formatCurrency(card.value)}
                                </p>
                                <p className="text-sm text-white/80 font-medium">
                                    {card.title}
                                </p>
                                <p className="text-xs text-white/60">
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
