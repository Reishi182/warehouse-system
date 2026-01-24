import React, { memo } from 'react';
import { Package, Plus, X, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Product, Location } from '@/types';
import { cn } from '@/lib/utils';

interface ProductListItemProps {
    product: Product;
    stockLocation: Location;
    onAddToCart: (product: Product) => void;
}

export const ProductListItem = memo(function ProductListItem({
    product,
    stockLocation,
    onAddToCart,
}: ProductListItemProps) {
    const stock = product.stock[stockLocation];
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock < 10;

    // Dynamic colors based on stock status
    const stockColors = isOutOfStock
        ? { bg: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30', glow: 'shadow-red-500/20', text: 'text-red-500' }
        : isLowStock
            ? { bg: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30', glow: 'shadow-amber-500/20', text: 'text-amber-500' }
            : { bg: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20', text: 'text-emerald-600' };

    return (
        <button
            onClick={() => !isOutOfStock && onAddToCart(product)}
            disabled={isOutOfStock}
            className={cn(
                "group flex items-center gap-4 w-full p-4 rounded-xl border bg-gradient-to-r from-card via-card to-muted/20 transition-all duration-300 text-left",
                "backdrop-blur-sm",
                "hover:shadow-xl hover:border-primary/50 hover:bg-gradient-to-r hover:from-primary/5 hover:via-card hover:to-primary/5",
                "hover:-translate-x-1",
                "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-primary/0 before:via-primary/5 before:to-primary/0 before:opacity-0 before:transition-opacity hover:before:opacity-100",
                isOutOfStock && "opacity-60 cursor-not-allowed hover:shadow-none hover:bg-card hover:translate-x-0",
                "relative overflow-hidden"
            )}
            style={{
                boxShadow: !isOutOfStock ? '0 2px 15px -3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.1)' : undefined
            }}
        >
            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />

            {/* Product Image */}
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 overflow-hidden flex items-center justify-center flex-shrink-0 relative border border-border/50 transition-transform duration-300 group-hover:scale-105">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                ) : (
                    <Package className="w-8 h-8 text-muted-foreground/30" />
                )}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                        <X className="w-6 h-6 text-destructive" />
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0 relative z-10">
                <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors duration-200">
                    {product.name}
                </h4>
                <p className="text-xs text-muted-foreground font-mono tracking-wider opacity-60">
                    {product.barcode}
                </p>
            </div>

            {/* Price & Stock */}
            <div className="text-right flex flex-col items-end gap-1 relative z-10">
                <p className="font-bold text-lg bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    Rp {product.price.toLocaleString('id-ID')}
                </p>
                <Badge
                    variant="outline"
                    className={cn(
                        "text-xs font-bold px-3 py-0.5 transition-all duration-300",
                        "backdrop-blur-md border",
                        `bg-gradient-to-r ${stockColors.bg} ${stockColors.border} ${stockColors.text}`,
                        !isOutOfStock && "group-hover:scale-105",
                        stockColors.glow
                    )}
                >
                    {isOutOfStock ? (
                        'Habis'
                    ) : (
                        <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {stock} pcs
                        </span>
                    )}
                </Badge>
            </div>

            {/* Add indicator */}
            {!isOutOfStock && (
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                    <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg shadow-primary/30">
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                </div>
            )}
        </button>
    );
});

export default ProductListItem;
