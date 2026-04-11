import { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
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
        const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight < 50;
        if (bottom && displayCount < filteredProducts.length) {
            setDisplayCount(prev => prev + 50);
        }
    };

    // Get selected product name
    const selectedProduct = products.find(p => p.id === value);

    // Handle both stock formats: product.stock.gudang OR product.stock_gudang
    const getStock = (product: Product) => {
        if (product.stock) {
            return stockLocation === 'gudang' ? product.stock.gudang : product.stock.toko;
        }
        // Fallback to flat stock properties
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
                        'w-full justify-between font-normal',
                        !value && 'text-muted-foreground',
                        className
                    )}
                >
                    <span className="truncate">
                        {selectedProduct ? selectedProduct.name : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[350px] max-w-[350px] p-0" align="start">
                {/* Search Input */}
                <div className="flex items-center border-b px-3 py-2">
                    <Search className="h-4 w-4 text-muted-foreground mr-2" />
                    <Input
                        ref={inputRef}
                        placeholder="Cari nama, barcode, atau kategori..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-0 focus-visible:ring-0 p-0 h-8"
                    />
                </div>

                {/* Products List */}
                <ScrollArea className="h-[300px]" onScroll={handleScroll}>
                    {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                            <Package className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">
                                {search ? 'Produk tidak ditemukan' : 'Tidak ada produk'}
                            </p>
                        </div>
                    ) : (
                        <div className="p-1">
                            {displayedProducts.map((product) => {
                                const stock = getStock(product);
                                const isSelected = value === product.id;

                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => {
                                            onChange(product.id);
                                            setOpen(false);
                                            setSearch('');
                                        }}
                                        className={cn(
                                            'flex items-center w-full px-3 py-2 rounded-lg text-left transition-colors',
                                            isSelected
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-muted'
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4 flex-shrink-0',
                                                isSelected ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{product.name}</p>
                                            <div className="flex items-center gap-2 text-xs opacity-70">
                                                <span>{product.barcode}</span>
                                                {product.category && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{product.category}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {showStock && (
                                            <span className={cn(
                                                'ml-2 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                                                stock > 0
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            )}>
                                                Stok: {formatStockDisplay(stock, product)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                            {displayCount < filteredProducts.length && (
                                <div className="py-2 text-center text-xs text-muted-foreground animate-pulse">
                                    Memuat lebih banyak...
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                {/* Results count */}
                <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                    {filteredProducts.length} produk ditemukan
                </div>
            </PopoverContent>
        </Popover>
    );
}
