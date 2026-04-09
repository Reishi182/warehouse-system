import { useState, useMemo, useEffect } from 'react';
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

export function StockOpnameProductPicker({
    open,
    onOpenChange,
    products,
    onConfirm,
    alreadyAddedIds = [],
}: StockOpnameProductPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden gap-0 bg-gray-50/50 dark:bg-gray-950/50">
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
                            placeholder="Cari nama produk atau ketik barcode..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-11 rounded-xl text-base"
                            autoFocus
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto rounded-xl border bg-white dark:bg-card relative">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="px-4 py-3 w-[50px] text-center border-b border-muted">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={toggleAll}
                                            className="rounded"
                                        />
                                    </th>
                                    <th className="px-4 py-3 font-semibold border-b border-muted w-14">Gambar</th>
                                    <th className="px-4 py-3 font-semibold border-b border-muted">Detail Produk</th>
                                    <th className="px-4 py-3 font-semibold border-b border-muted text-right">Stok Gudang</th>
                                    <th className="px-4 py-3 font-semibold border-b border-muted text-right">Stok Toko</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y relative">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                                            <Package className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                            {searchQuery ? "Tidak ada produk yang cocok dengan pencarian" : "Semua produk sudah ditambahkan"}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedProducts.map(product => {
                                        const isSelected = selectedIds.has(product.id);
                                        const isMulti = product.has_multi_unit && product.pcs_per_box;

                                        return (
                                            <tr
                                                key={product.id}
                                                onClick={() => toggleSelection(product.id)}
                                                className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                                                    isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
                                                }`}
                                            >
                                                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelection(product.id)}
                                                        className="rounded"
                                                    />
                                                </td>
                                                <td className="px-4 py-2" onClick={(e) => {
                                                    // Allow clicking cell to toggle checkbox
                                                    e.stopPropagation();
                                                    toggleSelection(product.id);
                                                }}>
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center border">
                                                        {product.image_url ? (
                                                            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="w-5 h-5 text-muted-foreground/30" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{product.name}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-muted-foreground font-mono">{product.barcode}</span>
                                                        {isMulti && (
                                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-blue-50 text-blue-600 border-blue-200 uppercase">
                                                                Multi-Unit
                                                            </Badge>
                                                        )}
                                                        {(product.stock.gudang + product.stock.toko) === 0 && (
                                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-red-50 text-red-600 border-red-200">
                                                                Kosong
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium">
                                                    <span className={product.stock.gudang === 0 ? "text-muted-foreground" : ""}>
                                                        {formatStock(product, product.stock.gudang)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium">
                                                    <span className={product.stock.toko === 0 ? "text-muted-foreground" : ""}>
                                                        {formatStock(product, product.stock.toko)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
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

                <DialogFooter className="p-4 px-5 bg-white dark:bg-card border-t flex items-center justify-between sm:justify-between">
                    <div className="text-sm font-medium text-muted-foreground">
                        {selectedIds.size > 0 ? (
                            <span className="text-primary font-bold">{selectedIds.size} produk terpilih</span>
                        ) : (
                            "Belum ada produk yang dipilih"
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleClose}>
                            Batal
                        </Button>
                        <Button 
                            onClick={handleConfirm} 
                            disabled={selectedIds.size === 0}
                        >
                            Tambahkan ke Opname
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
