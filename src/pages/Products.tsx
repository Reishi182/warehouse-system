import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { Package, AlertTriangle, Warehouse, Store, ArrowDownToLine, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, X, ArrowUpDown, Download, FileText, FileSpreadsheet, ChevronDown, Calendar, Clock, Loader2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
import { AddProductDialog, EditProductDialog, StockAdjustDialog, StockInDialog } from '@/components/products';
import { ProductManageCard } from '@/components/products/ProductManageCard';
import { ProductFilterSidebar, StockFilter, LocationFilter, DataFilter } from '@/components/products/ProductFilterSidebar';
import { exportProductStockPDF, exportProductStockExcel } from '@/lib/export';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/common/DatePicker';
import { useData } from '@/contexts/DataContext';
import { useRole } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Product } from '@/types';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useLocation } from 'react-router-dom';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { STOCK_THRESHOLDS } from '@/constants';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc' | 'newest' | 'oldest';

type PageSize = 5 | 10 | 15 | 'all';

export default function Products() {
    const { products, addProduct, updateProduct, deleteProduct, getProductByBarcode, addStock, loading } = useData();
    const role = useRole();
    const { toast } = useToast();

    // Filter states
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('products_search_query') || '');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [stockFilter, setStockFilter] = useState<StockFilter>(() => (sessionStorage.getItem('products_stock_filter') as StockFilter) || 'all');
    const [locationFilter, setLocationFilter] = useState<LocationFilter>(() => (sessionStorage.getItem('products_location_filter') as LocationFilter) || 'all');
    const [sortBy, setSortBy] = useState<SortOption>(() => (sessionStorage.getItem('products_sort_by') as SortOption) || 'name-asc');
    const [dataFilters, setDataFilters] = useState<DataFilter[]>(() => {
        const saved = sessionStorage.getItem('products_data_filters');
        return saved ? JSON.parse(saved) : [];
    });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(() => {
        const saved = sessionStorage.getItem('products_current_page');
        return saved ? parseInt(saved, 10) : 1;
    });
    const [pageSize, setPageSize] = useState<PageSize>(() => {
        const saved = sessionStorage.getItem('products_page_size');
        if (saved === 'all') return 'all';
        return saved ? (parseInt(saved, 10) as PageSize) : 15;
    });

    useEffect(() => {
        sessionStorage.setItem('products_search_query', searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        sessionStorage.setItem('products_stock_filter', stockFilter);
    }, [stockFilter]);

    useEffect(() => {
        sessionStorage.setItem('products_location_filter', locationFilter);
    }, [locationFilter]);

    useEffect(() => {
        sessionStorage.setItem('products_sort_by', sortBy);
    }, [sortBy]);

    useEffect(() => {
        sessionStorage.setItem('products_data_filters', JSON.stringify(dataFilters));
    }, [dataFilters]);

    useEffect(() => {
        sessionStorage.setItem('products_current_page', currentPage.toString());
    }, [currentPage]);

    useEffect(() => {
        sessionStorage.setItem('products_page_size', pageSize.toString());
    }, [pageSize]);

    // Dialog states
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editProductId, setEditProductId] = useState<string | null>(null);
    const [stockAdjustDialog, setStockAdjustDialog] = useState(false);
    const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
    const [stockInDialog, setStockInDialog] = useState(false);
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [exportDate, setExportDate] = useState('');
    const [exportMode, setExportMode] = useState<'current' | 'historical'>('current');
    const [exportLoading, setExportLoading] = useState(false);
    const location = useLocation();

    // Role permissions
    const canAddProduct = role === 'admin' || role === 'warehouse' || role === 'cashier' || role === 'main_office';
    const canEditProduct = role === 'admin' || role === 'warehouse' || role === 'cashier' || role === 'auditor' || role === 'main_office';
    const canDeleteProduct = role === 'admin' || role === 'auditor' || role === 'main_office';
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
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setCurrentPage(1);
    }, [debouncedSearch, stockFilter, locationFilter, pageSize, sortBy, dataFilters]);

    // Handle highlight from URL (?highlight=<productId>)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const highlightId = params.get('highlight');
        if (!highlightId || products.length === 0) return;

        // Reset all filters to find the product
        setSearchQuery('');
        setStockFilter('all');
        setLocationFilter('all');
        setDataFilters([]);
        setSortBy('newest');

        // Find product index (with newest sort, it will be first if just created)
        const sortedAll = [...products].sort((a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        const idx = sortedAll.findIndex(p => p.id === highlightId);
        if (idx === -1) return;

        // Navigate to the right page
        if (pageSize !== 'all') {
            const targetPage = Math.floor(idx / pageSize) + 1;
            setCurrentPage(targetPage);
        }

        setHighlightedProductId(highlightId);

        // Scroll to the product card after render
        setTimeout(() => {
            const el = document.querySelector(`[data-product-id="${highlightId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);

        // Clear highlight after 4 seconds
        const timer = setTimeout(() => {
            setHighlightedProductId(null);
        }, 4000);

        // Clean up the URL param
        window.history.replaceState(null, '', window.location.pathname + window.location.hash.split('?')[0]);

        return () => clearTimeout(timer);
    }, [location.search, products]);

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
        sell_by_quantity?: boolean;
        sell_unit?: string;
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

    const handleUpdateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
        return await updateProduct(id, updates);
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
        sessionStorage.removeItem('products_search_query');
        sessionStorage.removeItem('products_stock_filter');
        sessionStorage.removeItem('products_location_filter');
        sessionStorage.removeItem('products_sort_by');
        sessionStorage.removeItem('products_data_filters');
        sessionStorage.removeItem('products_current_page');
    }, []);

    // Historical stock calculation
    const calculateHistoricalStock = useCallback(async (targetDate: string) => {
        // targetDate is YYYY-MM-DD, we want end of that day
        const endOfDay = `${targetDate}T23:59:59.999Z`;

        // Fetch all stock_logs AFTER the target date
        const { data: logsAfter, error } = await supabase
            .from('stock_logs')
            .select('product_id, type, quantity, location')
            .gt('timestamp', endOfDay);

        if (error) {
            console.error('Error fetching stock logs:', error);
            return null;
        }

        // Build a map of adjustments per product
        const adjustments: Record<string, { gudang: number; toko: number }> = {};

        for (const log of (logsAfter || [])) {
            if (!log.product_id) continue;
            if (!adjustments[log.product_id]) {
                adjustments[log.product_id] = { gudang: 0, toko: 0 };
            }

            const loc = log.location as 'gudang' | 'toko';
            const qty = log.quantity || 0;

            if (log.type === 'in') {
                // Stock went IN after target date, so reverse = subtract
                adjustments[log.product_id][loc] -= qty;
            } else if (log.type === 'out') {
                // Stock went OUT after target date, so reverse = add back
                adjustments[log.product_id][loc] += qty;
            } else if (log.type === 'adjustment') {
                // Adjustment could be positive or negative
                // qty is the delta, reverse it
                adjustments[log.product_id][loc] -= qty;
            }
        }

        // Apply adjustments to current stock to get historical stock
        return filteredProducts.map(p => {
            const adj = adjustments[p.id] || { gudang: 0, toko: 0 };
            return {
                ...p,
                stock: {
                    gudang: Math.max(0, (p.stock.gudang || 0) + adj.gudang),
                    toko: Math.max(0, (p.stock.toko || 0) + adj.toko),
                },
            };
        });
    }, [filteredProducts]);

    const handleExport = useCallback(async (format: 'pdf' | 'excel') => {
        setExportLoading(true);
        try {
            let dataToExport = filteredProducts;

            if (exportMode === 'historical' && exportDate) {
                const historicalData = await calculateHistoricalStock(exportDate);
                if (historicalData) {
                    dataToExport = historicalData;
                } else {
                    toast({
                        title: 'Gagal',
                        description: 'Gagal menghitung stok historis',
                        variant: 'destructive',
                    });
                    return;
                }
            }

            if (format === 'pdf') {
                await exportProductStockPDF(dataToExport, exportMode === 'historical' ? exportDate : undefined);
            } else {
                await exportProductStockExcel(dataToExport, exportMode === 'historical' ? exportDate : undefined);
            }

            setExportDialogOpen(false);
            toast({
                title: 'Berhasil',
                description: `Export ${format.toUpperCase()} berhasil`,
            });
        } catch (err) {
            toast({
                title: 'Gagal Export',
                description: String(err),
                variant: 'destructive',
            });
        } finally {
            setExportLoading(false);
        }
    }, [filteredProducts, exportMode, exportDate, calculateHistoricalStock, toast]);

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
                    <Button
                        variant="outline"
                        className="rounded-xl text-xs sm:text-sm"
                        disabled={filteredProducts.length === 0}
                        onClick={() => {
                            setExportMode('current');
                            setExportDate('');
                            setExportDialogOpen(true);
                        }}
                    >
                        <Download className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>
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
                                <SheetContent side="left">
                                    <SheetHeader>
                                        <SheetTitle>Filter Produk</SheetTitle>
                                    </SheetHeader>
                                    <ScrollArea className="h-[calc(100dvh-80px)] pr-4">
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

                        {/* Results Count, Sort & Page Size */}
                        <div className="flex flex-col gap-2 mb-4">
                            {/* Row 1: Results count + Sort */}
                            <div className="flex items-center justify-between">
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Menampilkan <span className="font-medium text-foreground">{paginatedProducts.length}</span> dari{' '}
                                    <span className="font-medium text-foreground">{filteredProducts.length}</span> produk
                                </p>

                                {/* Sort Dropdown */}
                                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                                    <SelectTrigger className="w-[120px] sm:w-[150px] h-9 rounded-xl text-xs sm:text-sm">
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

                            {/* Row 2: Page Size Selector - always visible */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Tampilkan:</span>
                                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                                    {pageSizeOptions.map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setPageSize(size)}
                                            className={cn(
                                                "px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-all",
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
                                        isHighlighted={product.id === highlightedProductId}
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
                        {pageSize !== 'all' && totalPages > 1 && (() => {
                            // Generate page numbers with ellipsis
                            const pages: (number | '...')[] = [];
                            if (totalPages <= 7) {
                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                            } else {
                                pages.push(1);
                                if (currentPage > 3) pages.push('...');
                                const start = Math.max(2, currentPage - 1);
                                const end = Math.min(totalPages - 1, currentPage + 1);
                                for (let i = start; i <= end; i++) pages.push(i);
                                if (currentPage < totalPages - 2) pages.push('...');
                                pages.push(totalPages);
                            }

                            return (
                                <div className="flex flex-col items-center gap-3 mt-6 pt-6 border-t">
                                    <div className="flex items-center gap-1.5">
                                        {/* First Page */}
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 rounded-lg"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(1)}
                                            title="Halaman pertama"
                                        >
                                            <ChevronsLeft className="w-4 h-4" />
                                        </Button>
                                        {/* Previous Page */}
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 rounded-lg"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            title="Halaman sebelumnya"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>

                                        {/* Page Numbers */}
                                        <div className="flex items-center gap-1">
                                            {pages.map((page, idx) =>
                                                page === '...' ? (
                                                    <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-sm text-muted-foreground">
                                                        ⋯
                                                    </span>
                                                ) : (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={cn(
                                                            "h-9 min-w-[36px] px-2 rounded-lg text-sm font-medium transition-all",
                                                            currentPage === page
                                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {page}
                                                    </button>
                                                )
                                            )}
                                        </div>

                                        {/* Next Page */}
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 rounded-lg"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            title="Halaman berikutnya"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                        {/* Last Page */}
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 rounded-lg"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(totalPages)}
                                            title="Halaman terakhir"
                                        >
                                            <ChevronsRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <span>Halaman</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={totalPages}
                                            value={currentPage}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val)) {
                                                    setCurrentPage(Math.max(1, Math.min(totalPages, val)));
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    (e.target as HTMLInputElement).blur();
                                                }
                                            }}
                                            className="w-12 h-7 text-center text-sm font-medium text-foreground bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span>dari <span className="font-medium text-foreground">{totalPages}</span></span>
                                    </div>
                                </div>
                            );
                        })()}
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

            {/* Export Dialog with Date Selection */}
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            Export Stok Produk
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        {/* Mode Selection */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => { setExportMode('current'); setExportDate(''); }}
                                className={cn(
                                    "p-3 rounded-xl border-2 text-left transition-all",
                                    exportMode === 'current'
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-muted-foreground/30"
                                )}
                            >
                                <Clock className="w-5 h-5 mb-1 text-primary" />
                                <p className="font-medium text-sm">Stok Saat Ini</p>
                                <p className="text-xs text-muted-foreground">Data stok terkini</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setExportMode('historical')}
                                className={cn(
                                    "p-3 rounded-xl border-2 text-left transition-all",
                                    exportMode === 'historical'
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-muted-foreground/30"
                                )}
                            >
                                <Calendar className="w-5 h-5 mb-1 text-primary" />
                                <p className="font-medium text-sm">Stok Per Tanggal</p>
                                <p className="text-xs text-muted-foreground">Stok di tanggal tertentu</p>
                            </button>
                        </div>

                        {/* Date Picker (only for historical) */}
                        {exportMode === 'historical' && (
                            <div className="space-y-2 p-3 bg-muted/30 rounded-xl border">
                                <Label className="flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4" />
                                    Pilih Tanggal
                                </Label>
                                <DateInput
                                    value={exportDate}
                                    onChange={setExportDate}
                                    disableFuture
                                />
                                <p className="text-xs text-muted-foreground">
                                    Stok akan dihitung mundur berdasarkan log perubahan stok. Hasil menunjukkan jumlah stok pada akhir tanggal yang dipilih.
                                </p>
                            </div>
                        )}

                        {/* Export Format Buttons */}
                        <div className="space-y-2">
                            <Label className="text-sm">Pilih Format</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="h-auto py-3 rounded-xl flex flex-col items-center gap-1"
                                    disabled={exportLoading || (exportMode === 'historical' && !exportDate)}
                                    onClick={() => handleExport('pdf')}
                                >
                                    {exportLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <FileText className="w-5 h-5 text-red-500" />
                                    )}
                                    <span className="text-xs font-medium">Export PDF</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-auto py-3 rounded-xl flex flex-col items-center gap-1"
                                    disabled={exportLoading || (exportMode === 'historical' && !exportDate)}
                                    onClick={() => handleExport('excel')}
                                >
                                    {exportLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                    )}
                                    <span className="text-xs font-medium">Export Excel</span>
                                </Button>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            {filteredProducts.length} produk akan di-export
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
