import React, { memo } from 'react';
import { Search, X, RotateCcw, Filter, Warehouse, Store, Package, AlertTriangle, PackageX, ScanBarcode, ImageOff, PackageMinus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export type StockFilter = 'all' | 'instock' | 'low' | 'outofstock';
export type LocationFilter = 'all' | 'gudang' | 'toko';
export type DataFilter = 'noBarcode' | 'noStock' | 'noImage';

interface ProductFilterSidebarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    stockFilter: StockFilter;
    onStockFilterChange: (filter: StockFilter) => void;
    locationFilter: LocationFilter;
    onLocationFilterChange: (filter: LocationFilter) => void;
    dataFilters: DataFilter[];
    onDataFilterToggle: (filter: DataFilter) => void;
    productCounts: {
        total: number;
        inStock: number;
        lowStock: number;
        outOfStock: number;
        noBarcode: number;
        noStock: number;
        noImage: number;
    };
    onReset: () => void;
    className?: string;
}

export const ProductFilterSidebar = memo(function ProductFilterSidebar({
    searchQuery,
    onSearchChange,
    stockFilter,
    onStockFilterChange,
    locationFilter,
    onLocationFilterChange,
    dataFilters,
    onDataFilterToggle,
    productCounts,
    onReset,
    className,
}: ProductFilterSidebarProps) {
    const hasActiveFilters = searchQuery || stockFilter !== 'all' || locationFilter !== 'all' || dataFilters.length > 0;

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Filter</h3>
                </div>
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cari Produk</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Nama atau barcode..."
                        className="pl-9 pr-9 h-10 rounded-xl bg-muted/50"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                        >
                            <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                    )}
                </div>
            </div>

            {/* Stock Filter */}
            <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Status Stok</Label>
                <RadioGroup value={stockFilter} onValueChange={(v) => onStockFilterChange(v as StockFilter)}>
                    <div className="space-y-2">
                        <label className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all",
                            stockFilter === 'all'
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted/50"
                        )}>
                            <RadioGroupItem value="all" id="stock-all" />
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="flex-1 text-sm">Semua</span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {productCounts.total}
                            </span>
                        </label>

                        <label className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all",
                            stockFilter === 'instock'
                                ? "bg-emerald-500/10 border border-emerald-500/30"
                                : "hover:bg-muted/50"
                        )}>
                            <RadioGroupItem value="instock" id="stock-instock" />
                            <div className="w-4 h-4 rounded-full bg-emerald-500" />
                            <span className="flex-1 text-sm">Ada Stok</span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                {productCounts.inStock}
                            </span>
                        </label>

                        <label className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all",
                            stockFilter === 'low'
                                ? "bg-amber-500/10 border border-amber-500/30"
                                : "hover:bg-muted/50"
                        )}>
                            <RadioGroupItem value="low" id="stock-low" />
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="flex-1 text-sm">Stok Rendah</span>
                            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                {productCounts.lowStock}
                            </span>
                        </label>

                        <label className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all",
                            stockFilter === 'outofstock'
                                ? "bg-red-500/10 border border-red-500/30"
                                : "hover:bg-muted/50"
                        )}>
                            <RadioGroupItem value="outofstock" id="stock-out" />
                            <PackageX className="w-4 h-4 text-red-500" />
                            <span className="flex-1 text-sm">Habis</span>
                            <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                                {productCounts.outOfStock}
                            </span>
                        </label>
                    </div>
                </RadioGroup>
            </div>

            {/* Location Filter */}
            <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Lokasi Stok</Label>
                <RadioGroup value={locationFilter} onValueChange={(v) => onLocationFilterChange(v as LocationFilter)}>
                    <div className="space-y-2">
                        <label className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all",
                            locationFilter === 'all'
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted/50"
                        )}>
                            <RadioGroupItem value="all" id="loc-all" />
                            <span className="flex-1 text-sm">Semua Lokasi</span>
                        </label>

                        <label className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all",
                            locationFilter === 'gudang'
                                ? "bg-blue-500/10 border border-blue-500/30"
                                : "hover:bg-muted/50"
                        )}>
                            <RadioGroupItem value="gudang" id="loc-gudang" />
                            <Warehouse className="w-4 h-4 text-blue-500" />
                            <span className="flex-1 text-sm">Gudang</span>
                        </label>

                        <label className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all",
                            locationFilter === 'toko'
                                ? "bg-emerald-500/10 border border-emerald-500/30"
                                : "hover:bg-muted/50"
                        )}>
                            <RadioGroupItem value="toko" id="loc-toko" />
                            <Store className="w-4 h-4 text-emerald-500" />
                            <span className="flex-1 text-sm">Toko</span>
                        </label>
                    </div>
                </RadioGroup>
            </div>

            {/* Data Completeness Filter - only show if there are missing items */}
            {(productCounts.noBarcode > 0 || productCounts.noStock > 0 || productCounts.noImage > 0) && (
                <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground">Data Belum Lengkap</Label>
                    <div className="space-y-2">
                        {productCounts.noBarcode > 0 && (
                            <button
                                onClick={() => onDataFilterToggle('noBarcode')}
                                className={cn(
                                    "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all w-full text-left",
                                    dataFilters.includes('noBarcode')
                                        ? "bg-yellow-500/10 border border-yellow-500/30"
                                        : "hover:bg-muted/50"
                                )}
                            >
                                <ScanBarcode className="w-4 h-4 text-yellow-500" />
                                <span className="flex-1 text-sm">Belum ada Barcode</span>
                                <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                                    {productCounts.noBarcode}
                                </span>
                            </button>
                        )}

                        {productCounts.noStock > 0 && (
                            <button
                                onClick={() => onDataFilterToggle('noStock')}
                                className={cn(
                                    "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all w-full text-left",
                                    dataFilters.includes('noStock')
                                        ? "bg-orange-500/10 border border-orange-500/30"
                                        : "hover:bg-muted/50"
                                )}
                            >
                                <PackageMinus className="w-4 h-4 text-orange-500" />
                                <span className="flex-1 text-sm">Belum ada Stok</span>
                                <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                                    {productCounts.noStock}
                                </span>
                            </button>
                        )}

                        {productCounts.noImage > 0 && (
                            <button
                                onClick={() => onDataFilterToggle('noImage')}
                                className={cn(
                                    "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all w-full text-left",
                                    dataFilters.includes('noImage')
                                        ? "bg-purple-500/10 border border-purple-500/30"
                                        : "hover:bg-muted/50"
                                )}
                            >
                                <ImageOff className="w-4 h-4 text-purple-500" />
                                <span className="flex-1 text-sm">Belum ada Gambar</span>
                                <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                                    {productCounts.noImage}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

export default ProductFilterSidebar;
