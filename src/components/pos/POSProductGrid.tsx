import { useMemo, useState, useEffect } from 'react';
import {
    Search,
    Package,
    Grid3X3,
    List,
    X,
    ChevronLeft,
    ChevronRight
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Product, Location } from '@/types';

type ViewMode = 'grid' | 'list';

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
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number | 'all'>(10);

    // Filter products based on search
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.barcode.toLowerCase().includes(query)
        );
    }, [products, searchQuery]);

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

    // Reset to page 1 when search or pageSize changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, pageSize]);

    return (
        <div className="flex flex-col h-full">
            {/* Search & Controls */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari produk..."
                        className="pl-9 pr-9 rounded-xl h-11"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="hidden sm:block">
                    <TabsList className="rounded-xl">
                        <TabsTrigger value="grid" className="rounded-lg px-3">
                            <Grid3X3 className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="list" className="rounded-lg px-3">
                            <List className="w-4 h-4" />
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Products Grid/List */}
            <ScrollArea className="flex-1 pr-2 md:pr-4">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
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
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <Package className="w-10 h-10 opacity-40" />
                        </div>
                        <p className="text-lg font-semibold text-foreground/70">Tidak ada produk ditemukan</p>
                        <p className="text-sm mt-1">Coba kata kunci lain atau scan barcode</p>
                    </div>
                )}

                {/* Pagination Controls */}
                {filteredProducts.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Tampilkan:</span>
                            <Select
                                value={pageSize === 'all' ? 'all' : String(pageSize)}
                                onValueChange={(v) => setPageSize(v === 'all' ? 'all' : parseInt(v))}
                            >
                                <SelectTrigger className="w-20 h-8 text-xs rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="5" className="text-xs">5</SelectItem>
                                    <SelectItem value="10" className="text-xs">10</SelectItem>
                                    <SelectItem value="20" className="text-xs">20</SelectItem>
                                    <SelectItem value="all" className="text-xs">Semua</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground">
                                dari {filteredProducts.length} produk
                            </span>
                        </div>

                        {pageSize !== 'all' && totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-xs font-medium px-2">
                                    {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
