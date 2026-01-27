import { useState } from 'react';
import { useLowStockProducts } from '@/hooks/useLowStockAlert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertTriangle,
    Package,
    Warehouse,
    Store,
    ChevronRight,
    X,
    TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface LowStockAlertWidgetProps {
    /** Maximum number of products to show in the widget */
    maxVisible?: number;
    /** Compact mode for smaller displays */
    compact?: boolean;
    /** Custom class name */
    className?: string;
}

export function LowStockAlertWidget({
    maxVisible = 5,
    compact = false,
    className
}: LowStockAlertWidgetProps) {
    const { lowStockProducts, lowStockCount, thresholds } = useLowStockProducts();
    const [showAllDialog, setShowAllDialog] = useState(false);
    const navigate = useNavigate();

    if (lowStockCount === 0) {
        return compact ? null : (
            <Card className={cn("bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800", className)}>
                <CardContent className="flex items-center gap-3 p-4">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40">
                        <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="font-medium text-green-800 dark:text-green-300">
                            Semua Stok Aman
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                            Tidak ada produk dengan stok rendah
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const visibleProducts = lowStockProducts.slice(0, maxVisible);
    const remainingCount = lowStockCount - maxVisible;

    return (
        <>
            <Card className={cn(
                "border-orange-200 dark:border-orange-800/50 overflow-hidden",
                className
            )}>
                {/* Header with gradient */}
                <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-orange-500 text-white shadow-lg shadow-orange-500/25">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="text-base font-bold">Stok Rendah</span>
                                <Badge variant="destructive" className="ml-2 rounded-full px-2 py-0">
                                    {lowStockCount}
                                </Badge>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                            onClick={() => navigate('/products')}
                        >
                            Kelola
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="divide-y divide-orange-100 dark:divide-orange-900/30">
                        {visibleProducts.map((product) => (
                            <div
                                key={product.id}
                                className="flex items-center justify-between px-4 py-3 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors cursor-pointer"
                                onClick={() => navigate('/products')}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                                        <TrendingDown className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate text-sm">
                                            {product.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-mono">
                                            {product.barcode}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 flex-shrink-0">
                                    {product.isLowGudang && (
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "gap-1 text-xs",
                                                product.stockGudang === 0
                                                    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    : "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                            )}
                                        >
                                            <Warehouse className="w-3 h-3" />
                                            {product.stockGudang}
                                        </Badge>
                                    )}
                                    {product.isLowToko && (
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "gap-1 text-xs",
                                                product.stockToko === 0
                                                    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    : "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                            )}
                                        >
                                            <Store className="w-3 h-3" />
                                            {product.stockToko}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {remainingCount > 0 && (
                        <div className="px-4 py-3 bg-orange-50/50 dark:bg-orange-900/10 border-t border-orange-100 dark:border-orange-900/30">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                                onClick={() => setShowAllDialog(true)}
                            >
                                Lihat {remainingCount} produk lainnya
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </CardContent>

                {/* Threshold info */}
                <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground flex justify-between">
                    <span>Threshold Gudang: &lt;{thresholds.gudang}</span>
                    <span>Threshold Toko: &lt;{thresholds.toko}</span>
                </div>
            </Card>

            {/* All Products Dialog */}
            <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
                <DialogContent className="max-w-lg max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Semua Produk Stok Rendah
                            <Badge variant="destructive" className="ml-2">
                                {lowStockCount}
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>

                    <ScrollArea className="h-[50vh] pr-4">
                        <div className="space-y-2">
                            {lowStockProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">
                                            {product.barcode}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0 ml-3">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "gap-1",
                                                product.isLowGudang
                                                    ? "border-orange-300 bg-orange-50 text-orange-700"
                                                    : "border-green-300 bg-green-50 text-green-700"
                                            )}
                                        >
                                            <Warehouse className="w-3 h-3" />
                                            {product.stockGudang}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "gap-1",
                                                product.isLowToko
                                                    ? "border-orange-300 bg-orange-50 text-orange-700"
                                                    : "border-green-300 bg-green-50 text-green-700"
                                            )}
                                        >
                                            <Store className="w-3 h-3" />
                                            {product.stockToko}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="flex justify-between items-center pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                            Threshold: Gudang &lt;{thresholds.gudang}, Toko &lt;{thresholds.toko}
                        </p>
                        <Button onClick={() => navigate('/products')}>
                            Kelola Produk
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
