import { AlertTriangle, Package, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useLowStockProducts } from '@/hooks/useLowStockProducts';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface LowStockWidgetProps {
    maxItems?: number;
    className?: string;
}

/**
 * Dashboard widget showing products with low stock levels
 */
export function LowStockWidget({ maxItems = 5, className }: LowStockWidgetProps) {
    const { lowStockProducts, stats, hasAlerts } = useLowStockProducts();

    const displayProducts = lowStockProducts.slice(0, maxItems);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'out_of_stock':
                return 'bg-red-500';
            case 'critical':
                return 'bg-orange-500';
            case 'low':
                return 'bg-yellow-500';
            default:
                return 'bg-green-500';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'out_of_stock':
                return <Badge variant="destructive" className="text-[10px]">Habis</Badge>;
            case 'critical':
                return <Badge className="bg-orange-500 text-[10px]">Kritis</Badge>;
            case 'low':
                return <Badge className="bg-yellow-500 text-black text-[10px]">Rendah</Badge>;
            default:
                return null;
        }
    };

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            hasAlerts ? "bg-red-500/10" : "bg-green-500/10"
                        )}>
                            {hasAlerts ? (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                            ) : (
                                <Package className="w-4 h-4 text-green-500" />
                            )}
                        </div>
                        Peringatan Stok
                    </CardTitle>
                    <Link to="/products">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            Lihat Semua
                            <ExternalLink className="w-3 h-3" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                {/* Stats summary */}
                {hasAlerts && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-2 rounded-lg bg-red-500/10">
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.outOfStock}</p>
                            <p className="text-[10px] text-muted-foreground">Habis</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-orange-500/10">
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.critical}</p>
                            <p className="text-[10px] text-muted-foreground">Kritis</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-yellow-500/10">
                            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{stats.low}</p>
                            <p className="text-[10px] text-muted-foreground">Rendah</p>
                        </div>
                    </div>
                )}

                {/* Product list */}
                {hasAlerts ? (
                    <ScrollArea className="h-[200px] -mx-2 px-2">
                        <div className="space-y-2">
                            {displayProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    {/* Product image or placeholder */}
                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Package className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>

                                    {/* Product info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm truncate">{product.name}</p>
                                            {getStatusBadge(product.stockStatus)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Progress
                                                value={product.percentageRemaining}
                                                className="h-1.5 flex-1"
                                                indicatorClassName={getStatusColor(product.stockStatus)}
                                            />
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {product.totalStock} pcs
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {lowStockProducts.length > maxItems && (
                            <p className="text-center text-xs text-muted-foreground mt-3">
                                +{lowStockProducts.length - maxItems} produk lainnya
                            </p>
                        )}
                    </ScrollArea>
                ) : (
                    <div className="py-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                            <Package className="w-6 h-6 text-green-500" />
                        </div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            Semua stok aman!
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Tidak ada produk dengan stok rendah
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default LowStockWidget;
