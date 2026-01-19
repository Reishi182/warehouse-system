import React, { memo } from 'react';
import { Package, Plus, X } from 'lucide-react';
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

    return (
        <button
            onClick={() => !isOutOfStock && onAddToCart(product)}
            disabled={isOutOfStock}
            className={cn(
                "group flex items-center gap-4 w-full p-4 rounded-xl border-2 bg-card transition-all duration-200 text-left",
                "hover:shadow-lg hover:border-primary hover:bg-primary/5",
                isOutOfStock && "opacity-60 cursor-not-allowed hover:shadow-none hover:bg-card"
            )}
        >
            {/* Product Image */}
            <div className="w-14 h-14 rounded-xl bg-muted/30 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <Package className="w-7 h-7 text-muted-foreground/20" />
                )}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <X className="w-5 h-5 text-destructive" />
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {product.name}
                </h4>
                <p className="text-xs text-muted-foreground font-mono">{product.barcode}</p>
            </div>

            {/* Price & Stock */}
            <div className="text-right">
                <p className="font-bold text-lg text-primary">Rp {product.price.toLocaleString('id-ID')}</p>
                <Badge
                    variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "outline"}
                    className={cn(
                        "text-xs",
                        !isOutOfStock && !isLowStock && "bg-primary/10 text-primary border-primary/20"
                    )}
                >
                    {isOutOfStock ? 'Habis' : `Stok: ${stock}`}
                </Badge>
            </div>

            {/* Add indicator */}
            {!isOutOfStock && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                        <Plus className="w-4 h-4" />
                    </div>
                </div>
            )}
        </button>
    );
});

export default ProductListItem;
