import React, { memo } from 'react';
import { Package, Plus, AlertTriangle, Pencil } from 'lucide-react';
import { Product, Location } from '@/types';
import { cn } from '@/lib/utils';

interface ProductListItemProps {
    product: Product;
    stockLocation: Location;
    onAddToCart: (product: Product) => void;
    onEditProduct?: (product: Product) => void;
}

export const ProductListItem = memo(function ProductListItem({
    product,
    stockLocation,
    onAddToCart,
    onEditProduct,
}: ProductListItemProps) {
    const stock = product.stock[stockLocation];
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock < 10;

    return (
        <button
            onClick={() => !isOutOfStock && onAddToCart(product)}
            disabled={isOutOfStock}
            className={cn(
                "group w-full flex items-center gap-3 p-3 rounded-xl border bg-card text-left transition-all",
                "hover:shadow-md hover:border-primary/30",
                isOutOfStock && "opacity-50 cursor-not-allowed hover:shadow-none hover:border-border"
            )}
        >
            {/* Product Image */}
            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <Package className="w-5 h-5 text-muted-foreground/30" />
                )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {product.name}
                </h4>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {product.barcode}
                </p>
            </div>

            {/* Stock Badge */}
            <div className="flex flex-col gap-1 items-end">
                <div
                    className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1",
                        isOutOfStock
                            ? "bg-destructive text-white"
                            : isLowStock
                                ? "bg-amber-500 text-white"
                                : "bg-emerald-600 text-white"
                    )}
                >
                    {isLowStock && <AlertTriangle className="w-3 h-3" />}
                    {stock}
                </div>
                {product.has_multi_unit && (
                    <span className="text-[9px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 rounded">
                        📦 {(product.main_unit || 'box').toUpperCase()}/{(product.sell_unit || 'pcs').toUpperCase()}
                    </span>
                )}
                {product.sell_by_quantity && (
                    <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 rounded">
                        📏 per {product.sell_unit}
                    </span>
                )}
            </div>

            {/* Price */}
            <div className="shrink-0 w-24 text-right">
                <p className="font-bold text-sm text-primary">
                    Rp {product.price.toLocaleString('id-ID')}
                </p>
                {product.sell_by_quantity && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">/{product.sell_unit}</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
                {onEditProduct && (
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onEditProduct(product);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                e.preventDefault();
                                onEditProduct(product);
                            }
                        }}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors focus:outline-none cursor-pointer"
                        title="Edit Produk"
                    >
                        <Pencil className="w-4 h-4" />
                    </div>
                )}
                
                {/* Add Button */}
                {!isOutOfStock && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                            <Plus className="w-4 h-4" strokeWidth={2.5} />
                        </div>
                    </div>
                )}
            </div>
        </button>
    );
});

export default ProductListItem;
