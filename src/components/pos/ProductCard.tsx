import React, { memo } from 'react';
import { Package, Plus } from 'lucide-react';
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

    return (
        <button
            onClick={() => !isOutOfStock && onAddToCart(product)}
            disabled={isOutOfStock}
            className={cn(
                "group relative flex flex-col rounded-2xl border-2 bg-card p-4 text-left transition-all duration-200",
                "hover:shadow-xl hover:border-primary hover:-translate-y-1",
                isOutOfStock && "opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-none"
            )}
        >
            {/* Product Image */}
            <div className="aspect-square w-full rounded-xl bg-muted/30 mb-3 overflow-hidden flex items-center justify-center relative">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                ) : (
                    <Package className="w-12 h-12 text-muted-foreground/20" />
                )}

                {/* Out of stock overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="text-destructive font-bold text-sm bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">
                            HABIS
                        </span>
                    </div>
                )}

                {/* Quick add button on hover */}
                {!isOutOfStock && (
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                            <Plus className="w-5 h-5" />
                        </div>
                    </div>
                )}
            </div>

            {/* Stock Badge */}
            <Badge
                variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "outline"}
                className={cn(
                    "absolute top-3 right-3 text-xs font-semibold",
                    !isOutOfStock && !isLowStock && "bg-primary/10 text-primary border-primary/20"
                )}
            >
                {isOutOfStock ? 'Habis' : `${stock} pcs`}
            </Badge>

            {/* Product Info */}
            <h4 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {product.name}
            </h4>
            <p className="text-xs text-muted-foreground mb-2 font-mono">{product.barcode}</p>
            <p className="font-bold text-lg text-primary">
                Rp {product.price.toLocaleString('id-ID')}
            </p>
        </button>
    );
});

export default ProductCard;
