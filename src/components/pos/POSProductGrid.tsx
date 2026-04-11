import { useMemo, useState, useEffect, useCallback, memo } from 'react';
import {
    Search,
    Package,
    Grid3X3,
    LayoutGrid,
    List,
    X,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
} from 'lucide-react';
import { ProductCard } from '@/components/pos/ProductCard';
import { ProductListItem } from '@/components/pos/ProductListItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Product, Location } from '@/types';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

type ViewMode = 'grid' | 'compact' | 'list';
type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc' | 'newest' | 'oldest';

interface POSProductGridProps {
    products: Product[];
    stockLocation: Location;
    onAddToCart: (product: Product) => void;
    onEditProduct?: (product: Product) => void;
    searchInputRef?: React.RefObject<HTMLInputElement>;
}

export const POSProductGrid = memo(function POSProductGrid({
    products,
    stockLocation,
    onAddToCart,
    onEditProduct,
    searchInputRef,
}: POSProductGridProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce 300ms
    const [viewMode, setViewMode] = useState<ViewMode>('compact');
    const [displayCount, setDisplayCount] = useState(24);
    const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'low'>('all');
    const [sortBy, setSortBy] = useState<SortOption>('name-asc');

    // Memoized onAddToCart callback to prevent child re-renders
    const handleAddToCart = useCallback((product: Product) => {
        onAddToCart(product);
    }, [onAddToCart]);

    // Filter products with debounced search
    const filteredProducts = useMemo(() => {
        let filtered = products;

        if (debouncedSearchQuery.trim()) {
            const query = debouncedSearchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.barcode.toLowerCase().includes(query)
            );
        }

        if (stockFilter === 'instock') {
            filtered = filtered.filter(p => p.stock[stockLocation] > 0);
        } else if (stockFilter === 'low') {
            filtered = filtered.filter(p => p.stock[stockLocation] > 0 && p.stock[stockLocation] < 10);
        }

        return filtered;
    }, [products, debouncedSearchQuery, stockFilter, stockLocation]);

    // Sorted products
    const sortedProducts = useMemo(() => {
        const sorted = [...filteredProducts];
        switch (sortBy) {
            case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
            case 'price-asc': sorted.sort((a, b) => a.price - b.price); break;
            case 'price-desc': sorted.sort((a, b) => b.price - a.price); break;
            case 'stock-asc': sorted.sort((a, b) => a.stock[stockLocation] - b.stock[stockLocation]); break;
            case 'stock-desc': sorted.sort((a, b) => b.stock[stockLocation] - a.stock[stockLocation]); break;
            case 'newest': sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
            case 'oldest': sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
        }
        return sorted;
    }, [filteredProducts, sortBy, stockLocation]);

    // Infinite Scroll Displayed products
    const displayedProducts = useMemo(() => {
        return sortedProducts.slice(0, displayCount);
    }, [sortedProducts, displayCount]);

    useEffect(() => {
        setDisplayCount(24);
    }, [debouncedSearchQuery, stockFilter, sortBy]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight < 100;
        if (bottom && displayCount < sortedProducts.length) {
            setDisplayCount(prev => prev + 24);
        }
    };

    const getGridClass = () => {
        switch (viewMode) {
            case 'grid':
                return 'grid grid-cols-2 gap-3 sm:gap-4';
            case 'compact':
                return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3';
            default:
                return 'space-y-2';
        }
    };

    const inStockCount = useMemo(() =>
        products.filter(p => p.stock[stockLocation] > 0).length,
        [products, stockLocation]
    );
    const lowStockCount = useMemo(() =>
        products.filter(p => p.stock[stockLocation] > 0 && p.stock[stockLocation] < 10).length,
        [products, stockLocation]
    );

    return (
        <div className="flex flex-col h-full">
            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari produk atau scan barcode..."
                    className="pl-12 pr-12 h-12 rounded-xl bg-muted/30 border-2 focus-visible:border-primary focus-visible:ring-0 text-base"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 mb-4 -mx-1 px-1">
                {/* Stock Filter Pills - Scrollable on mobile */}
                <div className="flex items-center gap-2 flex-1 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        onClick={() => setStockFilter('all')}
                        className={cn(
                            "px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                            stockFilter === 'all'
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "bg-muted hover:bg-muted/80"
                        )}
                    >
                        Semua ({products.length})
                    </button>
                    <button
                        onClick={() => setStockFilter('instock')}
                        className={cn(
                            "px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                            stockFilter === 'instock'
                                ? "bg-emerald-600 text-white shadow-md"
                                : "bg-muted hover:bg-muted/80"
                        )}
                    >
                        Ada ({inStockCount})
                    </button>
                    {lowStockCount > 0 && (
                        <button
                            onClick={() => setStockFilter('low')}
                            className={cn(
                                "px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                                stockFilter === 'low'
                                    ? "bg-amber-500 text-white shadow-md"
                                    : "bg-muted hover:bg-muted/80"
                            )}
                        >
                            Hampir Habis ({lowStockCount})
                        </button>
                    )}
                </div>

                {/* View Mode Toggle */}
                <div className="hidden sm:flex items-center gap-1 p-1 bg-muted rounded-xl">
                    <button
                        onClick={() => setViewMode('compact')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            viewMode === 'compact'
                                ? "bg-background shadow-sm"
                                : "hover:bg-background/50"
                        )}
                        title="Compact Grid"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            viewMode === 'grid'
                                ? "bg-background shadow-sm"
                                : "hover:bg-background/50"
                        )}
                        title="Standard Grid"
                    >
                        <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            viewMode === 'list'
                                ? "bg-background shadow-sm"
                                : "hover:bg-background/50"
                        )}
                        title="List View"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>

                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-[120px] sm:w-[140px] h-9 rounded-xl text-xs sm:text-sm shrink-0">
                        <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="name-asc">Nama A-Z</SelectItem>
                        <SelectItem value="name-desc">Nama Z-A</SelectItem>
                        <SelectItem value="price-asc">Harga ↑</SelectItem>
                        <SelectItem value="price-desc">Harga ↓</SelectItem>
                        <SelectItem value="stock-desc">Stok ↓</SelectItem>
                        <SelectItem value="stock-asc">Stok ↑</SelectItem>
                        <SelectItem value="newest">Terbaru</SelectItem>
                        <SelectItem value="oldest">Terlama</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Products */}
            <ScrollArea className="flex-1 -mx-1 px-1" onScroll={handleScroll}>
                {viewMode !== 'list' ? (
                    <div className={getGridClass()}>
                        {displayedProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                stockLocation={stockLocation}
                                onAddToCart={handleAddToCart}
                                onEditProduct={onEditProduct}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {displayedProducts.map((product) => (
                            <ProductListItem
                                key={product.id}
                                product={product}
                                stockLocation={stockLocation}
                                onAddToCart={handleAddToCart}
                                onEditProduct={onEditProduct}
                            />
                        ))}
                    </div>
                )}

                {displayCount < filteredProducts.length && (
                    <div className="py-8 text-center">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-e-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                    </div>
                )}

                {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Package className="w-8 h-8 opacity-30" />
                        </div>
                        <p className="font-medium">Produk tidak ditemukan</p>
                        <p className="text-sm mt-1">Coba kata kunci lain</p>
                    </div>
                )}
            </ScrollArea>
            
            {/* Status Info Footer */}
            {filteredProducts.length > 0 && (
                <div className="mt-4 pt-4 border-t text-center text-xs sm:text-sm text-muted-foreground">
                    Menampilkan <span className="font-semibold text-foreground">{Math.min(displayCount, filteredProducts.length)}</span> dari <span className="font-semibold text-foreground">{filteredProducts.length}</span> produk
                </div>
            )}
        </div>
    );
});
