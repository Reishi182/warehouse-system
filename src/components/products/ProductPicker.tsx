import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Search, Sparkles, Store } from 'lucide-react';
import { Product } from '@/types';

interface ProductPickerProps {
    products: Product[];
    onSelect: (product: Product) => void;
    trigger?: React.ReactNode;
    title?: string;
    requireStockIn?: 'gudang' | 'toko' | 'none';
}

export function ProductPicker({
    products,
    onSelect,
    trigger,
    title = 'Pilih Barang',
    requireStockIn = 'none'
}: ProductPickerProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [displayCount, setDisplayCount] = useState(50);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const nameMatch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const barcodeMatch = (p.barcode || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSearch = nameMatch || barcodeMatch;
            if (!matchesSearch) return false;

            if (requireStockIn === 'gudang') return (p.stock?.gudang || 0) > 0;
            if (requireStockIn === 'toko') return (p.stock?.toko || 0) > 0;
            return true;
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [products, searchTerm, requireStockIn]);

    // Reset display count when search changes
    useMemo(() => {
        setDisplayCount(50);
    }, [searchTerm]);

    const displayedProducts = filteredProducts.slice(0, displayCount);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight < 100;
        if (bottom && displayCount < filteredProducts.length) {
            setDisplayCount(prev => prev + 50);
        }
    };

    const handleSelect = (product: Product) => {
        onSelect(product);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" variant="outline" className="rounded-xl gap-2 hover:bg-primary/10 hover:border-primary/50">
                        <Package className="w-4 h-4" /> Tambah Barang
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col rounded-3xl p-0 overflow-hidden border-2 shadow-2xl">
                <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 rounded-xl bg-primary/10 shadow-sm">
                            <Package className="w-6 h-6 text-primary" />
                        </div>
                        {title}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="p-4 border-b bg-muted/20">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Ketik nama barang atau scan barcode..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 rounded-2xl border-2 focus-visible:ring-primary/20 text-base shadow-sm"
                        />
                    </div>
                </div>

                <div 
                    className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/5 min-h-[350px]"
                    onScroll={handleScroll}
                >
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-muted-foreground/20">
                            <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-muted-foreground font-medium">Barang tidak ditemukan</p>
                            <p className="text-sm text-muted-foreground/70">Coba kata kunci lain atau pastikan stok tersedia.</p>
                        </div>
                    ) : (
                        displayedProducts.map(product => (
                            <div 
                                key={product.id} 
                                className="flex justify-between items-center p-4 rounded-2xl bg-background border hover:border-primary/40 hover:shadow-md transition-all group cursor-pointer"
                                onClick={() => handleSelect(product)}
                            >
                                <div className="space-y-1.5 flex-1 pr-4">
                                    <p className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">{product.name}</p>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <Badge variant="outline" className="font-mono text-xs bg-muted/30">
                                            {product.barcode}
                                        </Badge>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className={`text-xs gap-1 ${product.stock.gudang <= 0 ? 'bg-destructive/10 text-destructive border-destructive/20 opacity-70' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'}`}>
                                                <Sparkles className="w-3 h-3" />
                                                Gudang: {product.stock.gudang} {(product.has_multi_unit && product.main_unit) || product.sell_unit || 'pcs'}
                                            </Badge>
                                            <Badge variant="outline" className={`text-xs gap-1 ${product.stock.toko <= 0 ? 'bg-destructive/10 text-destructive border-destructive/20 opacity-70' : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'}`}>
                                                <Store className="w-3 h-3" />
                                                Toko: {product.stock.toko} {(product.has_multi_unit && product.main_unit) || product.sell_unit || 'pcs'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <Button 
                                    className="rounded-xl shadow-sm shrink-0 shadow-primary/20 bg-primary hover:bg-primary/90 hidden sm:flex"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(product);
                                    }}
                                >
                                    Pilih
                                </Button>
                            </div>
                        ))
                    )}
                    {displayCount < filteredProducts.length && (
                        <div className="py-4 text-center">
                            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-e-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                            <p className="mt-2 text-xs text-muted-foreground font-medium">Memuat lebih banyak rincian...</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
