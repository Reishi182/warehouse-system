import { useState, useMemo, useCallback, memo } from 'react';
import { Package, AlertTriangle, Warehouse, Store, ArrowDownToLine, ChevronLeft, ChevronRight, Filter, X, ArrowUpDown } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
import { AddProductDialog, EditProductDialog, StockAdjustDialog, StockInDialog } from '@/components/products';
import { ProductManageCard } from '@/components/products/ProductManageCard';
import { ProductFilterSidebar, StockFilter, LocationFilter, DataFilter } from '@/components/products/ProductFilterSidebar';
import { useData } from '@/contexts/DataContext';
import { useRole } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Product } from '@/types';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { STOCK_THRESHOLDS } from '@/constants';
import { cn } from '@/lib/utils';

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc' | 'newest' | 'oldest';

type PageSize = 5 | 10 | 15 | 'all';

export default function Products() {
    const { products, addProduct, updateProduct, deleteProduct, getProductByBarcode, addStock, loading } = useData();
    const role = useRole();
    const { toast } = useToast();

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [stockFilter, setStockFilter] = useState<StockFilter>('all');
    const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('name-asc');
    const [dataFilters, setDataFilters] = useState<DataFilter[]>([]);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<PageSize>(15);

    // Dialog states
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editProductId, setEditProductId] = useState<string | null>(null);
    const [stockAdjustDialog, setStockAdjustDialog] = useState(false);
    const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
    const [stockInDialog, setStockInDialog] = useState(false);
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

    // Role permissions
    const canAddProduct = role === 'admin' || role === 'warehouse' || role === 'cashier';
    const canEditProduct = role === 'admin' || role === 'warehouse' || role === 'cashier' || role === 'auditor';
    const canDeleteProduct = role === 'admin' || role === 'auditor';
    const canAdjustStock = role === 'admin' || role === 'auditor';

    // Product counts for filter sidebar
    const productCounts = useMemo(() => ({
        total: products.length,
        inStock: products.filter(p => p.stock.gudang > 0 || p.stock.toko > 0).length,
        lowStock: products.filter(p =>
            (p.stock.gudang < STOCK_THRESHOLDS.LOW_STOCK_GUDANG && p.stock.gudang > 0) ||
            (p.stock.toko < STOCK_THRESHOLDS.LOW_STOCK_TOKO && p.stock.toko > 0)
        ).length,
        outOfStock: products.filter(p => p.stock.gudang <= 0 && p.stock.toko <= 0).length,
        noBarcode: products.filter(p => p.barcode.startsWith('TEMP-')).length,
        noStock: products.filter(p => p.stock.gudang <= 0 && p.stock.toko <= 0).length,
        noImage: products.filter(p => !p.image_url).length,
    }), [products]);

    // Toggle data filter
    const handleDataFilterToggle = useCallback((filter: DataFilter) => {
        setDataFilters(prev =>
            prev.includes(filter)
                ? prev.filter(f => f !== filter)
                : [...prev, filter]
        );
        setCurrentPage(1);
    }, []);

    // Filtered products
    const filteredProducts = useMemo(() => {
        let filtered = products;

        // Search filter
        if (debouncedSearch.trim()) {
            const query = debouncedSearch.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.barcode.toLowerCase().includes(query)
            );
        }

        // Stock filter
        if (stockFilter === 'instock') {
            filtered = filtered.filter(p => {
                if (locationFilter === 'gudang') return p.stock.gudang > 0;
                if (locationFilter === 'toko') return p.stock.toko > 0;
                return p.stock.gudang > 0 || p.stock.toko > 0;
            });
        } else if (stockFilter === 'low') {
            filtered = filtered.filter(p => {
                if (locationFilter === 'gudang') return p.stock.gudang < STOCK_THRESHOLDS.LOW_STOCK_GUDANG && p.stock.gudang > 0;
                if (locationFilter === 'toko') return p.stock.toko < STOCK_THRESHOLDS.LOW_STOCK_TOKO && p.stock.toko > 0;
                return (p.stock.gudang < STOCK_THRESHOLDS.LOW_STOCK_GUDANG && p.stock.gudang > 0) ||
                    (p.stock.toko < STOCK_THRESHOLDS.LOW_STOCK_TOKO && p.stock.toko > 0);
            });
        } else if (stockFilter === 'outofstock') {
            filtered = filtered.filter(p => {
                if (locationFilter === 'gudang') return p.stock.gudang <= 0;
                if (locationFilter === 'toko') return p.stock.toko <= 0;
                return p.stock.gudang <= 0 && p.stock.toko <= 0;
            });
        }

        // Data completeness filters
        if (dataFilters.includes('noBarcode')) {
            filtered = filtered.filter(p => p.barcode.startsWith('TEMP-'));
        }
        if (dataFilters.includes('noStock')) {
            filtered = filtered.filter(p => p.stock.gudang <= 0 && p.stock.toko <= 0);
        }
        if (dataFilters.includes('noImage')) {
            filtered = filtered.filter(p => !p.image_url);
        }

        // Location-based secondary sort (optional, doesn't filter if stockFilter handles it)
        if (locationFilter !== 'all' && stockFilter === 'all') {
            const loc = locationFilter;
            filtered = [...filtered].sort((a, b) => b.stock[loc] - a.stock[loc]);
        }

        // Apply sort
        const sorted = [...filtered];
        switch (sortBy) {
            case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
            case 'price-asc': sorted.sort((a, b) => a.price - b.price); break;
            case 'price-desc': sorted.sort((a, b) => b.price - a.price); break;
            case 'stock-asc': {
                const loc = locationFilter !== 'all' ? locationFilter : 'toko';
                sorted.sort((a, b) => (a.stock[loc as 'gudang' | 'toko']) - (b.stock[loc as 'gudang' | 'toko']));
                break;
            }
            case 'stock-desc': {
                const loc = locationFilter !== 'all' ? locationFilter : 'toko';
                sorted.sort((a, b) => (b.stock[loc as 'gudang' | 'toko']) - (a.stock[loc as 'gudang' | 'toko']));
                break;
            }
            case 'newest': sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
            case 'oldest': sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
        }

        return sorted;
    }, [products, debouncedSearch, stockFilter, locationFilter, sortBy, dataFilters]);

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

    // Reset page when filters change
    useMemo(() => {
        setCurrentPage(1);
    }, [debouncedSearch, stockFilter, locationFilter, pageSize, sortBy, dataFilters]);

    // Stats for hero section
    const stats = useMemo(() => ({
        total: products.length,
        lowStock: products.filter(p =>
            p.stock.gudang < STOCK_THRESHOLDS.LOW_STOCK_GUDANG ||
            p.stock.toko < STOCK_THRESHOLDS.LOW_STOCK_TOKO
        ).length,
        totalGudang: products.reduce((acc, p) => acc + p.stock.gudang, 0),
        totalToko: products.reduce((acc, p) => acc + p.stock.toko, 0),
    }), [products]);

    // Handlers
    const handleBarcodeScanned = useCallback((barcode: string) => {
        const product = getProductByBarcode(barcode);
        if (product) {
            setSearchQuery(barcode);
            toast({
                title: 'Produk ditemukan',
                description: product.name,
            });
        } else {
            toast({
                title: 'Produk tidak ditemukan',
                description: 'Barcode: ' + barcode,
                variant: 'destructive',
            });
        }
    }, [getProductByBarcode, toast]);

    const handleAddProduct = async (product: {
        name: string;
        barcode: string;
        price: number;
        stock: { gudang: number; toko: number };
        image_url?: string;
        has_multi_unit?: boolean;
        pcs_per_box?: number | null;
        box_price?: number | null;
    }): Promise<boolean> => {
        const success = await addProduct(product);
        return success;
    };

    const handleDeleteProduct = useCallback(async (product: Product) => {
        const ok = await deleteProduct(product.id);
        if (ok) {
            toast({
                title: 'Produk dihapus',
                description: `${product.name} berhasil dihapus`,
            });
        }
    }, [deleteProduct, toast]);

    const handleEditProduct = useCallback((product: Product) => {
        setEditProductId(product.id);
        setEditDialogOpen(true);
    }, []);

    const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
        await updateProduct(id, updates);
    };

    const openStockAdjustDialog = useCallback((product: Product) => {
        setStockAdjustProduct(product);
        setStockAdjustDialog(true);
    }, []);

    const handleStockAdjustSave = async (productId: string, newStock: { gudang: number; toko: number }) => {
        await updateProduct(productId, { stock: newStock });
        toast({
            title: 'Stok diperbarui',
            description: `Stok ${stockAdjustProduct?.name} berhasil diperbarui`,
        });
    };

    const resetFilters = useCallback(() => {
        setSearchQuery('');
        setStockFilter('all');
        setLocationFilter('all');
        setDataFilters([]);
        setSortBy('name-asc');
        setCurrentPage(1);
    }, []);

    const editProduct = editProductId ? products.find(p => p.id === editProductId) || null : null;

    if (loading) {
        return (
            <MainLayout title="Produk" subtitle="Kelola daftar produk dan stok">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    const pageSizeOptions: PageSize[] = [5, 10, 15, 'all'];

    return (
        <MainLayout
            title="Manajemen Produk"
            subtitle="Kelola inventaris produk, pantau stok, dan atur harga"
            actions={
                <div className="flex gap-2 flex-wrap">
                    {(role === 'warehouse' || role === 'admin' || role === 'cashier') && (
                        <Button variant="outline" className="rounded-xl text-xs sm:text-sm" onClick={() => setStockInDialog(true)}>
                            <ArrowDownToLine className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Stok Masuk</span>
                        </Button>
                    )}
                    {canAddProduct && (
                        <AddProductDialog
                            onAdd={handleAddProduct}
                            getProductByBarcode={getProductByBarcode}
                            userRole={role}
                        />
                    )}
                </div>
            }
        >
            <div className="space-y-6">
                {/* Stats Cards */}
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total Produk"
                        value={stats.total}
                        icon={<Package className="w-5 h-5" />}
                        gradient="blue"
                        animationDelay={0}
                    />
                    <StatsCard
                        title="Stok Rendah"
                        value={stats.lowStock}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        subtitle={stats.lowStock > 0 ? "perlu restock" : undefined}
                        subtitleType="warning"
                        gradient="orange"
                        animationDelay={100}
                    />
                    <StatsCard
                        title="Stok Gudang"
                        value={stats.totalGudang.toLocaleString()}
                        icon={<Warehouse className="w-5 h-5" />}
                        gradient="amber"
                        animationDelay={200}
                    />
                    <StatsCard
                        title="Stok Toko"
                        value={stats.totalToko.toLocaleString()}
                        icon={<Store className="w-5 h-5" />}
                        gradient="emerald"
                        animationDelay={300}
                    />
                </StatsGrid>

                {/* Main Content: Sidebar + Grid */}
                <div className="flex gap-6">
                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:block w-64 shrink-0">
                        <div className="sticky top-4 p-4 rounded-2xl border bg-card">
                            <ProductFilterSidebar
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                stockFilter={stockFilter}
                                onStockFilterChange={setStockFilter}
                                locationFilter={locationFilter}
                                onLocationFilterChange={setLocationFilter}
                                dataFilters={dataFilters}
                                onDataFilterToggle={handleDataFilterToggle}
                                productCounts={productCounts}
                                onReset={resetFilters}
                            />
                        </div>
                    </aside>

                    {/* Products Grid */}
                    <div className="flex-1 min-w-0">
                        {/* Mobile Filter Bar */}
                        <div className="lg:hidden flex items-center gap-2 mb-4">
                            <BarcodeScanner
                                onScan={handleBarcodeScanned}
                                placeholder="Scan atau cari produk..."
                                className="flex-1"
                            />
                            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="icon" className="shrink-0 rounded-xl h-11 w-11">
                                        <Filter className="h-4 w-4" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-80">
                                    <SheetHeader>
                                        <SheetTitle>Filter Produk</SheetTitle>
                                    </SheetHeader>
                                    <ScrollArea className="h-[calc(100vh-80px)] pr-4">
                                        <ProductFilterSidebar
                                            searchQuery={searchQuery}
                                            onSearchChange={setSearchQuery}
                                            stockFilter={stockFilter}
                                            onStockFilterChange={setStockFilter}
                                            locationFilter={locationFilter}
                                            onLocationFilterChange={setLocationFilter}
                                            dataFilters={dataFilters}
                                            onDataFilterToggle={handleDataFilterToggle}
                                            productCounts={productCounts}
                                            onReset={resetFilters}
                                            className="py-4"
                                        />
                                    </ScrollArea>
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* Results Count & Page Size */}
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-muted-foreground">
                                Menampilkan <span className="font-medium text-foreground">{paginatedProducts.length}</span> dari{' '}
                                <span className="font-medium text-foreground">{filteredProducts.length}</span> produk
                            </p>

                            {/* Page Size Selector */}
                            <div className="flex items-center gap-2">
                                {/* Sort Dropdown */}
                                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                                    <SelectTrigger className="w-[130px] sm:w-[150px] h-9 rounded-xl text-xs sm:text-sm">
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

                                {/* Page Size Selector */}
                                <span className="text-xs text-muted-foreground hidden sm:inline">Tampilkan:</span>
                                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                                    {pageSizeOptions.map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setPageSize(size)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                pageSize === size
                                                    ? "bg-background shadow-sm"
                                                    : "hover:bg-background/50"
                                            )}
                                        >
                                            {size === 'all' ? 'All' : size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Product Grid */}
                        {paginatedProducts.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                                {paginatedProducts.map((product) => (
                                    <ProductManageCard
                                        key={product.id}
                                        product={product}
                                        onEdit={handleEditProduct}
                                        onDelete={handleDeleteProduct}
                                        onAdjustStock={openStockAdjustDialog}
                                        canEdit={canEditProduct}
                                        canDelete={canDeleteProduct}
                                        canAdjustStock={canAdjustStock}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Package className="w-8 h-8 opacity-30" />
                                </div>
                                <p className="font-medium">Produk tidak ditemukan</p>
                                <p className="text-sm mt-1">Coba ubah filter atau kata kunci pencarian</p>
                                {(searchQuery || stockFilter !== 'all' || locationFilter !== 'all') && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={resetFilters}
                                        className="mt-4 rounded-xl"
                                    >
                                        Reset Filter
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Pagination */}
                        {pageSize !== 'all' && totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-lg"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm font-medium px-4 py-2 bg-muted rounded-lg">
                                    {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 rounded-lg"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Product Dialog */}
            <EditProductDialog
                product={editProduct}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onUpdate={handleUpdateProduct}
                products={products}
                userRole={role}
            />

            {/* Stock Adjustment Dialog */}
            <StockAdjustDialog
                product={stockAdjustProduct}
                open={stockAdjustDialog}
                onOpenChange={setStockAdjustDialog}
                onSave={handleStockAdjustSave}
            />

            {/* Stock In Dialog */}
            <StockInDialog
                open={stockInDialog}
                onOpenChange={setStockInDialog}
                onAddStock={addStock}
                getProductByBarcode={getProductByBarcode}
            />
        </MainLayout>
    );
}
