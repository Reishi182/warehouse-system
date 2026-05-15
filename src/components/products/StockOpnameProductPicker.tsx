import { useState, useMemo, useEffect, useRef, memo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Package, CheckSquare } from 'lucide-react';
import { Product } from '@/types';
import ProductImage from '@/components/common/ProductImage';

function formatStock(product: Product, stock: number) {
    if (!product.has_multi_unit || !product.pcs_per_box || product.pcs_per_box <= 0) {
        return `${stock} ${(product.sell_unit || 'pcs').toLowerCase()}`;
    }
    const mainLabel = (product.main_unit || 'box').toLowerCase();
    const subLabel = (product.sell_unit || 'pcs').toLowerCase();
    const ppb = product.pcs_per_box;
    const mainCount = Math.floor(stock / ppb);
    const subCount = parseFloat((stock % ppb).toFixed(2));
    if (mainCount === 0) return `${subCount} ${subLabel}`;
    if (subCount === 0) return `${mainCount} ${mainLabel}`;
    return `${mainCount} ${mainLabel} ${subCount} ${subLabel}`;
}

interface StockOpnameProductPickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    products: Product[];
    onConfirm: (selectedProducts: Product[]) => void;
    alreadyAddedIds?: string[];
}

export const StockOpnameProductPicker = memo(function StockOpnameProductPicker({
    open,
    onOpenChange,
    products,
    onConfirm,
    alreadyAddedIds = [],
}: StockOpnameProductPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Focus input after dialog animation completes (avoid competing with CSS animation)
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Reset selection when modal opens
    // Optional: Keep selection persistent if they close/reopen, but usually resetting makes sense
    // We'll manage resetting on close/confirm

    const handleClose = () => {
        onOpenChange(false);
        setTimeout(() => {
            setSearchQuery('');
            setSelectedIds(new Set());
        }, 200);
    };

    const handleConfirm = () => {
        const selected = products.filter(p => selectedIds.has(p.id));
        onConfirm(selected);
        handleClose();
    };

    const addedIdsSet = useMemo(() => new Set(alreadyAddedIds), [alreadyAddedIds]);

    const filteredProducts = useMemo(() => {
        // Exclude products already added to the opname list (using O(1) Set lookup)
        let filtered = products.filter(p => !addedIdsSet.has(p.id));

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                p => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)
            );
        }

        // Sort: items with stock > 0 first, then alphabetically
        return filtered.sort((a, b) => {
            const totalA = a.stock.gudang + a.stock.toko;
            const totalB = b.stock.gudang + b.stock.toko;
            if (totalA > 0 && totalB === 0) return -1;
            if (totalA === 0 && totalB > 0) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [products, searchQuery, addedIdsSet]);

    // --- Pagination for Rendering Optimization ---
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    const paginatedProducts = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProducts, page]);

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    // ---------------------------------------------

    const toggleSelection = (productId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const isAllSelected = filteredProducts.length > 0 && selectedIds.size === filteredProducts.length;

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleClose();
            else onOpenChange(val);
        }}>
            <DialogContent className="max-w-4xl w-[100vw] sm:w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] !rounded-none sm:!rounded-xl p-0 flex flex-col overflow-hidden gap-0 bg-gray-50/50 dark:bg-gray-950/50 border-0 sm:border">
                <DialogHeader className="p-5 pb-4 bg-white dark:bg-card border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <CheckSquare className="w-5 h-5 text-primary" />
                        Pilih Produk Opname
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Pilih satu atau lebih produk yang ingin dimasukkan ke dalam daftar pengecekan fisik (Stok Opname).
                    </p>
                </DialogHeader>

                <div className="p-4 bg-white dark:bg-card flex flex-col gap-4 flex-1 overflow-hidden min-h-[400px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Cari nama produk atau ketik barcode..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-11 rounded-xl text-base"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto rounded-xl border bg-white dark:bg-card relative">
                        {/* Desktop Header */}
                        <div className="hidden md:grid grid-cols-[40px_60px_1fr_100px_100px] gap-2 p-3 text-xs font-bold text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-md border-b">
                            <div className="flex justify-center content-center items-center">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={toggleAll}
                                    className="rounded"
                                />
                            </div>
                            <div>Gambar</div>
                            <div>Detail Produk</div>
                            <div className="text-right">Stok Gudang</div>
                            <div className="text-right">Stok Toko</div>
                        </div>

                        {/* Mobile Select All */}
                        <div className="md:hidden flex items-center justify-between p-3 bg-muted/50 sticky top-0 z-10 backdrop-blur-md border-b">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={toggleAll}
                                    className="rounded"
                                    id="select-all-mobile"
                                />
                                <label htmlFor="select-all-mobile" className="text-sm font-semibold">Pilih Semua Produk</label>
                            </div>
                        </div>

                        <div className="divide-y relative">
                            {filteredProducts.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                                    <Package className="w-10 h-10 opacity-20 mb-3" />
                                    <span>{searchQuery ? "Tidak ada produk yang cocok dengan pencarian" : "Semua produk sudah ditambahkan"}</span>
                                </div>
                            ) : (
                                paginatedProducts.map(product => {
                                    const isSelected = selectedIds.has(product.id);
                                    const isMulti = product.has_multi_unit && product.pcs_per_box;

                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => toggleSelection(product.id)}
                                            className={`cursor-pointer transition-colors hover:bg-muted/30 p-3 md:p-3 flex flex-col md:grid md:grid-cols-[40px_60px_1fr_100px_100px] gap-3 md:gap-2 md:items-center ${
                                                isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
                                            }`}
                                        >
                                            {/* Top section on mobile: Checkbox, Image, Info */}
                                            <div className="flex items-start md:contents gap-3">
                                                <div className="pt-0.5 md:pt-0 w-[24px] md:w-[40px] flex justify-center shrink-0">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelection(product.id)}
                                                        className="rounded"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                
                                                <div className="w-12 h-12 md:w-10 md:h-10 rounded-lg overflow-hidden flex items-center justify-center border shrink-0">
                                                    <ProductImage
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        size="thumb"
                                                        className="w-full h-full"
                                                        placeholderClassName="w-full h-full bg-muted/50"
                                                    />
                                                </div>

                                                <div className="flex-1 min-w-0 md:col-start-3">
                                                    <div className="font-medium text-sm md:text-sm line-clamp-2 leading-tight md:truncate md:line-clamp-none">{product.name}</div>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                        <span className="text-xs text-muted-foreground font-mono">{product.barcode}</span>
                                                        {isMulti && (
                                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-blue-50 text-blue-600 border-blue-200 uppercase">
                                                                Multi
                                                            </Badge>
                                                        )}
                                                        {(product.stock.gudang + product.stock.toko) === 0 && (
                                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-red-50 text-red-600 border-red-200">
                                                                Kosong
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stocks section: Bottom on mobile, columns on desktop */}
                                            <div className="grid grid-cols-2 md:contents text-xs md:text-sm mt-1 md:mt-0 pl-11 md:pl-0">
                                                <div className="md:text-right">
                                                    <div className="text-muted-foreground md:hidden mb-0.5 text-[10px] uppercase font-semibold">Stok Gudang</div>
                                                    <div className={`font-medium ${product.stock.gudang === 0 ? "text-muted-foreground" : ""}`}>
                                                        {formatStock(product, product.stock.gudang)}
                                                    </div>
                                                </div>
                                                <div className="md:text-right">
                                                    <div className="text-muted-foreground md:hidden mb-0.5 text-[10px] uppercase font-semibold">Stok Toko</div>
                                                    <div className={`font-medium ${product.stock.toko === 0 ? "text-muted-foreground" : ""}`}>
                                                        {formatStock(product, product.stock.toko)}
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-2 pt-2 text-sm">
                            <span className="text-xs text-muted-foreground">
                                Menampilkan {(page - 1) * ITEMS_PER_PAGE + 1} - {Math.min(page * ITEMS_PER_PAGE, filteredProducts.length)} dari {filteredProducts.length} produk
                            </span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">Sebelumnya</Button>
                                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8">Selanjutnya</Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 px-5 bg-white dark:bg-card border-t flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-auto">
                    <div className="text-sm font-medium text-muted-foreground w-full sm:w-auto text-center sm:text-left">
                        {selectedIds.size > 0 ? (
                            <span className="text-primary font-bold">{selectedIds.size} produk terpilih</span>
                        ) : (
                            "Belum ada produk yang dipilih"
                        )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={handleClose} className="flex-1 sm:flex-none">
                            Batal
                        </Button>
                        <Button 
                            onClick={handleConfirm} 
                            disabled={selectedIds.size === 0}
                            className="flex-1 sm:flex-none"
                        >
                            <span className="hidden sm:inline">Tambahkan ke Opname</span>
                            <span className="sm:hidden">Tambah ({selectedIds.size})</span>
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});
