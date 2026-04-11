import React, { memo } from 'react';
import { Package, Plus, AlertTriangle, Pencil } from 'lucide-react';
import { LazyImage } from '@/components/common/LazyImage';
import { Product, Location } from '@/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
    product: Product;
    stockLocation: Location;
    onAddToCart: (product: Product) => void;
    onEditProduct?: (product: Product) => void;
}

export const ProductCard = memo(function ProductCard({
    product,
    stockLocation,
    onAddToCart,
    onEditProduct,
}: ProductCardProps) {
    const stock = product.stock[stockLocation];
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock < 10;

    return (
        <button
            onClick={() => !isOutOfStock && onAddToCart(product)}
            disabled={isOutOfStock}
            className={cn(
                "group relative flex flex-col rounded-2xl border bg-card overflow-hidden text-left transition-all duration-200",
                "hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5",
                "active:scale-[0.98]",
                isOutOfStock && "opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-none hover:border-border"
            )}
        >
            {/* Product Image */}
            <div className="relative aspect-square w-full bg-muted/50 overflow-hidden">
                <LazyImage
                    src={product.image_url}
                    alt={product.name}
                    containerClassName="w-full h-full"
                    className="group-hover:scale-105 transition-transform duration-300"
                    fallbackIcon={<Package className="w-10 h-10 text-muted-foreground/20" />}
                />

                {/* Out of stock overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-destructive text-white text-xs font-bold px-3 py-1.5 rounded-full">
                            HABIS
                        </div>
                    </div>
                )}

                {/* Edit Button */}
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
                        className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-black/50 backdrop-blur-sm rounded-lg shadow-sm border border-border/50 text-muted-foreground hover:text-primary hover:bg-white dark:hover:bg-black focus:outline-none transition-colors z-10 cursor-pointer"
                        title="Edit Produk"
                    >
                        <Pencil className="w-4 h-4" />
                    </div>
                )}

                {/* Quick add button on hover */}
                {!isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
                        <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg scale-90 group-hover:scale-100 transition-transform duration-200">
                            <Plus className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                    </div>
                )}

                {/* Unit/Multi-unit Badge - Top Left */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
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

                {/* Stock Badge - Bottom Right */}
                <div
                    className={cn(
                        "absolute bottom-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1",
                        isOutOfStock
                            ? "bg-destructive text-white"
                            : isLowStock
                                ? "bg-amber-500 text-white"
                                : "bg-emerald-600 text-white"
                    )}
                >
                    {isLowStock && <AlertTriangle className="w-3 h-3" />}
                    <span>{stock}</span>
                </div>
            </div>

            {/* Product Info */}
            <div className="p-2 sm:p-3 flex-1 flex flex-col">
                <h4 className="font-semibold text-xs sm:text-sm line-clamp-2 leading-snug mb-1 group-hover:text-primary transition-colors">
                    {product.name}
                </h4>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 font-mono mb-1 sm:mb-2 truncate">
                    {product.barcode}
                </p>
                <div className="mt-auto">
                    <p className="font-bold text-sm sm:text-base text-primary">
                        Rp {product.price.toLocaleString('id-ID')}
                        {product.sell_by_quantity && (
                            <span className="text-xs font-normal text-muted-foreground ml-1">/{product.sell_unit}</span>
                        )}
                    </p>
                </div>
            </div>
        </button>
    );
});

export default ProductCard;
