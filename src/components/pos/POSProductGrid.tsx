import { useMemo, useState, useEffect } from 'react';
import {
    Search,
    Package,
    Grid3X3,
    LayoutGrid,
    List,
    X,
    ChevronLeft,
    ChevronRight,
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

type ViewMode = 'grid' | 'compact' | 'list';

interface POSProductGridProps {
    products: Product[];
    stockLocation: Location;
    onAddToCart: (product: Product) => void;
    searchInputRef?: React.RefObject<HTMLInputElement>;
}

export function POSProductGrid({
    products,
    stockLocation,
    onAddToCart,
    searchInputRef,
}: POSProductGridProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('compact');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number | 'all'>(24);
    const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'low'>('all');

    // Filter products
    const filteredProducts = useMemo(() => {
        let filtered = products;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
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
    }, [products, searchQuery, stockFilter, stockLocation]);

    // Paginated products
    const paginatedProducts = useMemo(() => {
        if (pageSize === 'all') return filteredProducts;
        const startIndex = (currentPage - 1) * pageSize;
        return filteredProducts.slice(startIndex, startIndex + pageSize);
    }, [filteredProducts, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        if (pageSize === 'all') return 1;
        return Math.ceil(filteredProducts.length / pageSize);
    }, [filteredProducts.length, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, pageSize, stockFilter]);

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
            </div>

            {/* Products */}
            <ScrollArea className="flex-1 -mx-1 px-1">
                {viewMode !== 'list' ? (
                    <div className={getGridClass()}>
                        {paginatedProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                stockLocation={stockLocation}
                                onAddToCart={onAddToCart}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {paginatedProducts.map((product) => (
                            <ProductListItem
                                key={product.id}
                                product={product}
                                stockLocation={stockLocation}
                                onAddToCart={onAddToCart}
                            />
                        ))}
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

            {/* Pagination */}
            {filteredProducts.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <Select
                            value={pageSize === 'all' ? 'all' : String(pageSize)}
                            onValueChange={(v) => setPageSize(v === 'all' ? 'all' : parseInt(v))}
                        >
                            <SelectTrigger className="w-[70px] sm:w-[80px] h-9 rounded-lg text-xs sm:text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                                <SelectItem value="12">12</SelectItem>
                                <SelectItem value="24">24</SelectItem>
                                <SelectItem value="48">48</SelectItem>
                                <SelectItem value="all">All</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                            dari {filteredProducts.length} produk
                        </span>
                    </div>

                    {pageSize !== 'all' && totalPages > 1 && (
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 bg-muted rounded-lg">
                                {currentPage} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
