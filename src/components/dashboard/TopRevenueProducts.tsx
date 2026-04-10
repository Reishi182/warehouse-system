import { useMemo } from 'react';
import { Trophy, TrendingUp, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sale, Product } from '@/types';
import { formatCompact } from '@/lib/format';

interface TopRevenueProductsProps {
    sales: Sale[];
    products: Product[];
    limit?: number;
    days?: number;
}

export default function TopRevenueProducts({
    sales,
    products,
    limit = 5,
    days = 30
}: TopRevenueProductsProps) {
    const topProducts = useMemo(() => {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        // Filter sales within date range (exclude cancelled sales)
        const filteredSales = sales.filter(s =>
            new Date(s.created_at) >= startDate && !s.is_cancelled
        );

        // Aggregate revenue per product
        // Use product_id as key for database products, or product_name for manual items
        const revenueByProduct: Record<string, {
            productId: string | null;
            productName: string;
            revenue: number;
            quantity: number;
            transactions: number;
            isManual: boolean;
        }> = {};

        filteredSales.forEach(sale => {
            sale.items?.forEach(item => {
                // For manual items (product_id is null or empty), use product_name as key
                const isManualItem = !item.product_id || item.product_id === '';
                const key = isManualItem
                    ? `manual:${item.product_name.toLowerCase().trim()}`
                    : item.product_id;

                if (!revenueByProduct[key]) {
                    revenueByProduct[key] = {
                        productId: isManualItem ? null : item.product_id,
                        productName: item.product_name,
                        revenue: 0,
                        quantity: 0,
                        transactions: 0,
                        isManual: isManualItem,
                    };
                }
                revenueByProduct[key].revenue += item.subtotal;
                revenueByProduct[key].quantity += item.quantity;
                revenueByProduct[key].transactions += 1;
            });
        });

        // Sort by revenue and take top N
        const sorted = Object.values(revenueByProduct)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);

        // Calculate max revenue for percentage bars
        const maxRevenue = sorted[0]?.revenue || 1;

        return sorted.map((item, index) => ({
            ...item,
            rank: index + 1,
            percentage: (item.revenue / maxRevenue) * 100,
            product: item.productId ? products.find(p => p.id === item.productId) : undefined,
        }));
    }, [sales, products, limit, days]);

    const totalRevenue = topProducts.reduce((acc, p) => acc + p.revenue, 0);


    const getRankBadge = (rank: number) => {
        switch (rank) {
            case 1:
                return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white';
            case 2:
                return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800';
            case 3:
                return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const getProgressColor = (rank: number) => {
        switch (rank) {
            case 1:
                return 'bg-gradient-to-r from-amber-400 to-yellow-500';
            case 2:
                return 'bg-gradient-to-r from-slate-400 to-slate-500';
            case 3:
                return 'bg-gradient-to-r from-amber-600 to-amber-700';
            default:
                return 'bg-primary/70';
        }
    };

    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10">
                            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold">
                                Top Revenue Products
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {days} hari terakhir
                            </p>
                        </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        Total: Rp {formatCompact(totalRevenue)}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                {topProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Package className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">Belum ada data penjualan</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {topProducts.map((item, index) => (
                            <div
                                key={item.productId || `manual-${item.productName}-${index}`}
                                className="group animate-slide-up"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Rank Badge */}
                                    <div className={`
                                        flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                                        text-xs font-bold shadow-sm
                                        ${getRankBadge(item.rank)}
                                    `}>
                                        {item.rank}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                    {item.productName}
                                                </h4>
                                                {item.isManual && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 flex-shrink-0">
                                                        Manual
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-sm font-bold text-primary flex-shrink-0">
                                                Rp {formatCompact(item.revenue)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                                            <span>{item.quantity} unit terjual</span>
                                            <span>•</span>
                                            <span>{item.transactions} transaksi</span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressColor(item.rank)}`}
                                                style={{
                                                    width: `${item.percentage}%`,
                                                    animationDelay: `${index * 100 + 200}ms`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
