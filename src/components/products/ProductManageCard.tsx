import React, { memo } from 'react';
import { Package, MoreHorizontal, Pencil, Trash2, Plus, AlertTriangle, Warehouse, Store } from 'lucide-react';
import { LazyImage } from '@/components/common/LazyImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { STOCK_THRESHOLDS } from '@/constants';

interface ProductManageCardProps {
    product: Product;
    onEdit?: (product: Product) => void;
    onDelete?: (product: Product) => void;
    onAdjustStock?: (product: Product) => void;
    canEdit?: boolean;
    canDelete?: boolean;
    canAdjustStock?: boolean;
    isHighlighted?: boolean;
}

/**
 * Format stock for multi-unit products into "X [unit besar] Y [sub-unit]"
 * e.g. 78.5 KG with 40 KG/SAK → "1 SAK 38.5 KG"
 * e.g. 80 KG with 40 KG/SAK → "2 SAK"
 * e.g. 0.5 KG with 40 KG/SAK → "0.5 KG"
 */
function formatMultiUnitStock(
    stock: number,
    pcsPerBox: number | null | undefined,
    mainUnit: string | null | undefined,
    subUnit: string | null | undefined,
): string {
    const mainLabel = (mainUnit || 'box').toUpperCase();
    const subLabel = (subUnit || 'pcs').toUpperCase();

    if (!pcsPerBox || pcsPerBox <= 0) {
        return `${stock} ${subLabel}`;
    }

    const mainCount = Math.floor(stock / pcsPerBox);
    // Round to avoid floating point artifacts like 38.500000001
    const remainder = parseFloat((stock % pcsPerBox).toFixed(2));

    if (mainCount === 0) {
        return `${remainder} ${subLabel}`;
    }

    if (remainder === 0) {
        return `${mainCount} ${mainLabel}`;
    }

    return `${mainCount} ${mainLabel} ${remainder} ${subLabel}`;
}

export const ProductManageCard = memo(function ProductManageCard({
    product,
    onEdit,
    onDelete,
    onAdjustStock,
    canEdit = true,
    canDelete = true,
    canAdjustStock = true,
    isHighlighted = false,
}: ProductManageCardProps) {
    const stockGudang = product.stock.gudang;
    const stockToko = product.stock.toko;
    const totalStock = stockGudang + stockToko;
    const hasTempBarcode = product.barcode.startsWith('TEMP-');

    const isLowStockGudang = stockGudang < STOCK_THRESHOLDS.LOW_STOCK_GUDANG && stockGudang > 0;
    const isLowStockToko = stockToko < STOCK_THRESHOLDS.LOW_STOCK_TOKO && stockToko > 0;
    const isOutOfStock = totalStock <= 0;
    const hasLowStock = isLowStockGudang || isLowStockToko;

    const isMultiUnit = product.has_multi_unit && product.pcs_per_box;

    // Format stock display: multi-unit → "X SAK Y KG", single-unit → "78.5"
    const stockGudangDisplay = isMultiUnit
        ? formatMultiUnitStock(stockGudang, product.pcs_per_box, product.main_unit, product.sell_unit)
        : `${stockGudang}`;
    const stockTokoDisplay = isMultiUnit
        ? formatMultiUnitStock(stockToko, product.pcs_per_box, product.main_unit, product.sell_unit)
        : `${stockToko}`;

    return (
        <div
            data-product-id={product.id}
            className={cn(
                "group relative flex flex-col rounded-2xl border bg-card overflow-hidden transition-all duration-200",
                "hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5",
                isOutOfStock && "opacity-70",
                isHighlighted && "ring-2 ring-primary ring-offset-2 shadow-lg shadow-primary/20 animate-pulse"
            )}
        >
            {/* Action Menu - Top Right */}
            <div className="absolute top-2 right-2 z-10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-border shadow-lg w-48">
                        {canAdjustStock && onAdjustStock && (
                            <>
                                <DropdownMenuItem
                                    onClick={() => onAdjustStock(product)}
                                    className="gap-2 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" /> Sesuaikan Stok
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        {canEdit && onEdit && (
                            <DropdownMenuItem
                                onClick={() => onEdit(product)}
                                className="gap-2 cursor-pointer"
                            >
                                <Pencil className="w-4 h-4" /> Edit Produk
                            </DropdownMenuItem>
                        )}
                        {canDelete && onDelete && (
                            <DropdownMenuItem
                                onClick={() => onDelete(product)}
                                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                            >
                                <Trash2 className="w-4 h-4" /> Hapus
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Product Image */}
            <div className="relative aspect-square w-full bg-muted/50 overflow-hidden">
                <LazyImage
                    src={product.image_url}
                    alt={product.name}
                    containerClassName="w-full h-full"
                    className="group-hover:scale-105 transition-transform duration-300"
                    fallbackIcon={<Package className="w-12 h-12 text-muted-foreground/20" />}
                />

                {/* Out of stock overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-destructive text-white text-xs font-bold px-3 py-1.5 rounded-full">
                            STOK HABIS
                        </div>
                    </div>
                )}

                {/* Low Stock Warning */}
                {hasLowStock && !isOutOfStock && (
                    <div className="absolute top-2 left-2">
                        <Badge variant="outline" className="bg-amber-500/90 text-white border-0 gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Stok Rendah
                        </Badge>
                    </div>
                )}

                {/* Temp Barcode Warning */}
                {hasTempBarcode && (
                    <div className={cn("absolute left-2", hasLowStock && !isOutOfStock ? "top-9" : "top-2")}>
                        <Badge variant="outline" className="bg-yellow-500/90 text-white border-0 gap-1 text-[10px]">
                            ⚠️ Belum ada Barcode
                        </Badge>
                    </div>
                )}

                {/* Unit/Multi-unit Badge */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end sm:hidden sm:group-hover:flex">
                </div>
                <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                    {product.has_multi_unit && (
                        <span className="bg-blue-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm border border-blue-400/50">
                            📦 {(product.main_unit || 'box').toUpperCase()}/{(product.sell_unit || 'pcs').toUpperCase()}
                        </span>
                    )}
                    {product.sell_by_quantity && (
                        <span className="bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm border border-amber-400/50">
                            📏 per {product.sell_unit}
                        </span>
                    )}
                </div>
            </div>

            {/* Product Info */}
            <div className="p-3 sm:p-4 flex-1 flex flex-col">
                <h4 className="font-semibold text-sm sm:text-base line-clamp-2 leading-snug mb-1 group-hover:text-primary transition-colors">
                    {product.name}
                </h4>
                <p className={cn(
                    "text-[10px] sm:text-xs font-mono mb-2 truncate",
                    hasTempBarcode ? "text-yellow-600 dark:text-yellow-400 italic" : "text-muted-foreground"
                )}>
                    {hasTempBarcode ? '⚠️ Barcode belum diisi' : product.barcode}
                </p>

                {/* Price */}
                <p className="font-bold text-base sm:text-lg text-primary mb-3">
                    Rp {product.price.toLocaleString('id-ID')}
                    {product.sell_by_quantity && (
                        <span className="text-xs font-normal text-muted-foreground ml-1">/{product.sell_unit}</span>
                    )}
                </p>

                {/* Stock Info */}
                <div className="mt-auto grid grid-cols-2 gap-2">
                    <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium",
                        stockGudang <= 0
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : isLowStockGudang
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>
                        <Warehouse className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate text-[10px] sm:text-xs leading-tight" title={stockGudangDisplay}>
                            {stockGudangDisplay}
                        </span>
                    </div>
                    <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium",
                        stockToko <= 0
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : isLowStockToko
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    )}>
                        <Store className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate text-[10px] sm:text-xs leading-tight" title={stockTokoDisplay}>
                            {stockTokoDisplay}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ProductManageCard;
