import React, { memo } from 'react';
import { Package, Plus, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Product, Location } from '@/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
    product: Product;
    stockLocation: Location;
    onAddToCart: (product: Product) => void;
}

export const ProductCard = memo(function ProductCard({
    product,
    stockLocation,
    onAddToCart,
}: ProductCardProps) {
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
                "group relative flex flex-col rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30 p-4 text-left transition-all duration-300",
                "backdrop-blur-sm",
                "hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02]",
                "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-primary/5 before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100",
                "after:absolute after:inset-[-1px] after:rounded-2xl after:bg-gradient-to-br after:from-primary/50 after:via-transparent after:to-primary/30 after:opacity-0 after:-z-10 after:blur-sm after:transition-opacity hover:after:opacity-100",
                isOutOfStock && "opacity-60 cursor-not-allowed hover:translate-y-0 hover:scale-100 hover:shadow-none"
            )}
            style={{
                boxShadow: !isOutOfStock ? '0 4px 20px -5px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)' : undefined
            }}
        >
            {/* Animated gradient border on hover */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />

            {/* Product Image */}
            <div className="aspect-square w-full rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 mb-3 overflow-hidden flex items-center justify-center relative border border-border/50">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                        <Package className="w-12 h-12" />
                    </div>
                )}

                {/* Out of stock overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-destructive font-bold text-sm bg-destructive/10 px-4 py-2 rounded-full border border-destructive/30 shadow-lg shadow-destructive/10">
                            HABIS
                        </span>
                    </div>
                )}

                {/* Quick add button on hover */}
                {!isOutOfStock && (
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-4 shadow-xl shadow-primary/40 transform scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 delay-100">
                            <Plus className="w-6 h-6" strokeWidth={2.5} />
                        </div>
                    </div>
                )}

                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
            </div>

            {/* Premium Stock Badge */}
            <Badge
                variant="outline"
                className={cn(
                    "absolute top-3 right-3 text-xs font-bold px-3 py-1 transition-all duration-300",
                    "backdrop-blur-md border",
                    `bg-gradient-to-r ${stockColors.bg} ${stockColors.border} ${stockColors.text}`,
                    !isOutOfStock && "group-hover:scale-110 group-hover:shadow-lg",
                    stockColors.glow
                )}
            >
                {isOutOfStock ? (
                    <span className="flex items-center gap-1">Habis</span>
                ) : (
                    <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {stock} pcs
                    </span>
                )}
            </Badge>

            {/* Product Info */}
            <div className="relative z-10">
                <h4 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors duration-200">
                    {product.name}
                </h4>
                <p className="text-xs text-muted-foreground mb-2 font-mono tracking-wider opacity-60">
                    {product.barcode}
                </p>
                <p className="font-bold text-lg bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    Rp {product.price.toLocaleString('id-ID')}
                </p>
            </div>
        </button>
    );
});

export default ProductCard;
