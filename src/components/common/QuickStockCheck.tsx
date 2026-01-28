import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { Product } from '@/types';
import {
    Package,
    Barcode,
    Search,
    Warehouse,
    Store,
    Camera,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStockCheckProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Quick Stock Check - Scan barcode or search to quickly check product stock
 */
export function QuickStockCheck({ open, onOpenChange }: QuickStockCheckProps) {
    const [query, setQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { products, getProductByBarcode } = useData();

    // Reset on open
    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedProduct(null);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    // Auto-search on barcode scan (typically ends with Enter, but we'll search on each change)
    useEffect(() => {
        if (!query.trim()) {
            setSelectedProduct(null);
            return;
        }

        // Try exact barcode match first
        const byBarcode = getProductByBarcode(query.trim());
        if (byBarcode) {
            setSelectedProduct(byBarcode);
            return;
        }

        // Fallback to name search
        const byName = products.find(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.barcode.includes(query)
        );
        setSelectedProduct(byName || null);
    }, [query, products, getProductByBarcode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Search is already handled by useEffect
    };

    const getStockStatus = (product: Product) => {
        const total = product.stock.gudang + product.stock.toko;
        if (total === 0) return { status: 'out', label: 'Habis', color: 'destructive' as const };
        if (total <= 5) return { status: 'critical', label: 'Kritis', color: 'destructive' as const };
        if (total <= 10) return { status: 'low', label: 'Rendah', color: 'warning' as const };
        return { status: 'ok', label: 'Tersedia', color: 'success' as const };
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Barcode className="w-4 h-4 text-primary" />
                        </div>
                        Cek Stok Cepat
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Scan barcode atau ketik nama produk..."
                            className="pl-10 pr-10"
                            autoComplete="off"
                        />
                        {query && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={() => setQuery('')}
                            >
                                ×
                            </Button>
                        )}
                    </div>

                    {/* Result */}
                    {selectedProduct ? (
                        <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
                            {/* Product Info */}
                            <div className="flex items-start gap-3">
                                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {selectedProduct.image_url ? (
                                        <img
                                            src={selectedProduct.image_url}
                                            alt={selectedProduct.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Package className="w-8 h-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-base truncate">{selectedProduct.name}</h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Barcode className="w-3.5 h-3.5" />
                                        {selectedProduct.barcode}
                                    </p>
                                    <p className="text-sm font-medium text-primary mt-1">
                                        Rp {selectedProduct.price.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <Badge
                                    variant={getStockStatus(selectedProduct).color === 'success' ? 'default' :
                                        getStockStatus(selectedProduct).color === 'warning' ? 'secondary' : 'destructive'}
                                    className="flex-shrink-0"
                                >
                                    {getStockStatus(selectedProduct).label}
                                </Badge>
                            </div>

                            {/* Stock Details */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className={cn(
                                    "rounded-xl p-3 border transition-colors",
                                    selectedProduct.stock.gudang === 0 ? "bg-red-500/10 border-red-500/30" : "bg-muted"
                                )}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Warehouse className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">Gudang</span>
                                    </div>
                                    <p className={cn(
                                        "text-2xl font-bold",
                                        selectedProduct.stock.gudang === 0 && "text-red-500"
                                    )}>
                                        {selectedProduct.stock.gudang}
                                        <span className="text-xs font-normal text-muted-foreground ml-1">pcs</span>
                                    </p>
                                </div>

                                <div className={cn(
                                    "rounded-xl p-3 border transition-colors",
                                    selectedProduct.stock.toko === 0 ? "bg-red-500/10 border-red-500/30" : "bg-muted"
                                )}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Store className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">Toko</span>
                                    </div>
                                    <p className={cn(
                                        "text-2xl font-bold",
                                        selectedProduct.stock.toko === 0 && "text-red-500"
                                    )}>
                                        {selectedProduct.stock.toko}
                                        <span className="text-xs font-normal text-muted-foreground ml-1">pcs</span>
                                    </p>
                                </div>
                            </div>

                            {/* Total Stock */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
                                <span className="text-sm font-medium">Total Stok</span>
                                <span className="text-xl font-bold text-primary">
                                    {selectedProduct.stock.gudang + selectedProduct.stock.toko} pcs
                                </span>
                            </div>

                            {/* Alert if low stock */}
                            {getStockStatus(selectedProduct).status !== 'ok' && (
                                <div className={cn(
                                    "flex items-center gap-2 p-3 rounded-lg text-sm",
                                    getStockStatus(selectedProduct).status === 'out' && "bg-red-500/10 text-red-600",
                                    getStockStatus(selectedProduct).status === 'critical' && "bg-orange-500/10 text-orange-600",
                                    getStockStatus(selectedProduct).status === 'low' && "bg-yellow-500/10 text-yellow-600"
                                )}>
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>
                                        {getStockStatus(selectedProduct).status === 'out' && "Stok habis! Segera lakukan restock."}
                                        {getStockStatus(selectedProduct).status === 'critical' && "Stok sangat rendah! Perlu segera diisi."}
                                        {getStockStatus(selectedProduct).status === 'low' && "Stok mulai menipis."}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : query ? (
                        <div className="rounded-xl border bg-muted/30 p-8 text-center">
                            <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">
                                Produk tidak ditemukan
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Coba periksa barcode atau nama produk
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
                            <Barcode className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">
                                Scan barcode atau ketik nama produk
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                untuk melihat informasi stok
                            </p>
                        </div>
                    )}
                </form>

                {/* Keyboard hint */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">ESC</kbd>
                    <span>untuk menutup</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default QuickStockCheck;
