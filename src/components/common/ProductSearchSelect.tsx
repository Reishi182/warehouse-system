import { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, Package, Tag, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Product } from '@/types';

interface ProductSearchSelectProps {
    products: Product[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    /** Filter products that are already selected */
    excludeIds?: string[];
    /** Show stock info */
    showStock?: boolean;
    /** Stock location to show */
    stockLocation?: 'gudang' | 'toko';
    className?: string;
}

/** Generate a consistent hue from a string */
function stringToHue(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
}

export default function ProductSearchSelect({
    products,
    value,
    onChange,
    placeholder = 'Pilih Produk...',
    disabled = false,
    excludeIds = [],
    showStock = false,
    stockLocation = 'gudang',
    className,
}: ProductSearchSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [displayCount, setDisplayCount] = useState(50);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset display count when search changes
    useEffect(() => {
        setDisplayCount(50);
    }, [search]);

    // Focus search input when popover opens
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        if (!open) setSearch('');
    }, [open]);

    // Filter products based on search
    const filteredProducts = useMemo(() => {
        const query = search.toLowerCase().trim();
        return products
            .filter(p => !excludeIds.includes(p.id))
            .filter(p => {
                if (!query) return true;
                return (
                    (p.name || '').toLowerCase().includes(query) ||
                    (p.barcode || '').toLowerCase().includes(query) ||
                    (p.category || '').toLowerCase().includes(query)
                );
            })
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [products, search, excludeIds]);

    const displayedProducts = filteredProducts.slice(0, displayCount);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (nearBottom && displayCount < filteredProducts.length) {
            setDisplayCount(prev => prev + 50);
        }
    };

    const selectedProduct = products.find(p => p.id === value);

    // Handle both stock formats
    const getStock = (product: Product) => {
        if (product.stock) {
            return stockLocation === 'gudang' ? product.stock.gudang : product.stock.toko;
        }
        const p = product as any;
        return stockLocation === 'gudang' ? (p.stock_gudang || 0) : (p.stock_toko || 0);
    };

    const formatStockDisplay = (stock: number, product: Product) => {
        if (product.has_multi_unit && product.main_unit && product.pcs_per_box) {
            const mainQty = Math.floor(stock / product.pcs_per_box);
            const remainQty = stock % product.pcs_per_box;
            if (remainQty === 0) return `${mainQty} ${product.main_unit}`;
            return `${mainQty} ${product.main_unit} ${remainQty} ${product.sell_unit}`;
        }
        return `${stock} ${product.sell_unit || 'pcs'}`;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'w-full justify-between font-normal h-10 px-3',
                        'border border-input bg-background',
                        'hover:bg-accent/50 hover:border-primary/40',
                        'transition-all duration-200',
                        open && 'border-primary/60 ring-2 ring-primary/10',
                        !value && 'text-muted-foreground',
                        className
                    )}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {selectedProduct ? (
                            <>
                                {/* Color avatar */}
                                <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white shrink-0"
                                    style={{
                                        background: `hsl(${stringToHue(selectedProduct.name || '')}, 65%, 50%)`,
                                    }}
                                >
                                    {(selectedProduct.name || '?')[0].toUpperCase()}
                                </span>
                                <span className="truncate text-sm font-medium text-foreground">
                                    {selectedProduct.name}
                                </span>
                            </>
                        ) : (
                            <span className="text-sm">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown
                        className={cn(
                            'ml-2 h-4 w-4 shrink-0 transition-transform duration-200',
                            open ? 'rotate-180 text-primary' : 'opacity-40'
                        )}
                    />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className={cn(
                    'w-[calc(100vw-2rem)] sm:w-[400px] max-w-[400px]',
                    'p-0 shadow-xl border border-border/60 rounded-xl overflow-hidden'
                )}
                align="start"
                sideOffset={6}
            >
                {/* ── Search bar ── */}
                <div className="relative flex items-center border-b border-border/50 bg-muted/30 px-3 py-2.5 gap-2">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                        ref={inputRef}
                        placeholder="Cari nama, barcode, atau kategori..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-0 bg-transparent focus-visible:ring-0 p-0 h-7 text-sm placeholder:text-muted-foreground/60"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted rounded px-1.5 py-0.5 shrink-0"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* ── Product list ── */}
                <div
                    className="overflow-y-auto"
                    style={{ maxHeight: 320 }}
                    onScroll={handleScroll}
                    onWheel={(e) => e.stopPropagation()}
                >
                    {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <Package className="h-6 w-6 opacity-40" />
                            </div>
                            <p className="text-sm font-medium">
                                {search ? 'Produk tidak ditemukan' : 'Tidak ada produk'}
                            </p>
                            {search && (
                                <p className="text-xs opacity-60">Coba kata kunci lain</p>
                            )}
                        </div>
                    ) : (
                        <div className="p-1.5 space-y-0.5">
                            {displayedProducts.map((product) => {
                                const stock = getStock(product);
                                const isSelected = value === product.id;
                                const hue = stringToHue(product.name || '');

                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => {
                                            onChange(product.id);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            'group flex items-center w-full px-2.5 py-2 rounded-lg text-left',
                                            'transition-all duration-150 outline-none',
                                            isSelected
                                                ? 'bg-primary/10 ring-1 ring-primary/30'
                                                : 'hover:bg-accent/60'
                                        )}
                                    >
                                        {/* Color avatar */}
                                        <span
                                            className={cn(
                                                'inline-flex items-center justify-center w-8 h-8 rounded-lg',
                                                'text-sm font-bold text-white shrink-0 mr-2.5',
                                                'transition-transform duration-150',
                                                isSelected && 'scale-95'
                                            )}
                                            style={{ background: `hsl(${hue}, 60%, 48%)` }}
                                        >
                                            {(product.name || '?')[0].toUpperCase()}
                                        </span>

                                        {/* Name + meta */}
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                'text-sm font-medium truncate leading-tight',
                                                isSelected ? 'text-primary' : 'text-foreground'
                                            )}>
                                                {product.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {product.barcode && (
                                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <Hash className="w-2.5 h-2.5" />
                                                        {product.barcode}
                                                    </span>
                                                )}
                                                {product.category && (
                                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <Tag className="w-2.5 h-2.5" />
                                                        {product.category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stock badge */}
                                        {showStock && (
                                            <span className={cn(
                                                'ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                                                stock > 0
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                    : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                                            )}>
                                                {formatStockDisplay(stock, product)}
                                            </span>
                                        )}

                                        {/* Checkmark */}
                                        <Check className={cn(
                                            'ml-2 h-4 w-4 shrink-0 text-primary transition-opacity duration-150',
                                            isSelected ? 'opacity-100' : 'opacity-0'
                                        )} />
                                    </button>
                                );
                            })}

                            {/* Load more indicator */}
                            {displayCount < filteredProducts.length && (
                                <div className="py-3 text-center">
                                    <span className="text-xs text-muted-foreground animate-pulse">
                                        ↓ Scroll untuk memuat lebih banyak
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">
                        {search
                            ? `${filteredProducts.length} hasil untuk "${search}"`
                            : `${filteredProducts.length} produk`}
                    </span>
                    {value && (
                        <button
                            onClick={() => { onChange(''); setOpen(false); }}
                            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                        >
                            Hapus pilihan
                        </button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
