import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/useDataStore';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import {
    Search,
    Package,
    Users,
    FileText,
    ShoppingCart,
    Settings,
    LayoutDashboard,
    Truck,
    History,
    DollarSign,
    Box,
    ArrowRight,
    Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
    id: string;
    title: string;
    subtitle?: string;
    type: 'product' | 'page' | 'action' | 'customer' | 'sale';
    icon: React.ReactNode;
    path?: string;
    action?: () => void;
    badge?: string;
}

interface GlobalSearchProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const PAGES: SearchResult[] = [
    { id: 'dashboard', title: 'Dashboard', type: 'page', icon: <LayoutDashboard className="w-4 h-4" />, path: '/' },
    { id: 'products', title: 'Produk', subtitle: 'Kelola produk', type: 'page', icon: <Package className="w-4 h-4" />, path: '/products' },
    { id: 'pos', title: 'Point of Sale', subtitle: 'Kasir', type: 'page', icon: <ShoppingCart className="w-4 h-4" />, path: '/pos' },
    { id: 'sales', title: 'Riwayat Penjualan', type: 'page', icon: <History className="w-4 h-4" />, path: '/finance/sales-history' },
    { id: 'cash-transfer', title: 'Transfer Kas', type: 'page', icon: <DollarSign className="w-4 h-4" />, path: '/cash-transfer' },
    { id: 'stock-requests', title: 'Request Stok', type: 'page', icon: <Box className="w-4 h-4" />, path: '/requests' },
    { id: 'surat-jalan', title: 'Surat Jalan', type: 'page', icon: <Truck className="w-4 h-4" />, path: '/surat-jalan' },
    { id: 'customers', title: 'Pelanggan', type: 'page', icon: <Users className="w-4 h-4" />, path: '/customers' },
    { id: 'reports', title: 'Laporan', type: 'page', icon: <FileText className="w-4 h-4" />, path: '/reports' },
    { id: 'settings', title: 'Pengaturan', type: 'page', icon: <Settings className="w-4 h-4" />, path: '/settings' },
];

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const products = useDataStore(s => s.products);
    const { profile } = useAuth();

    // Reset on open
    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    // Build search results
    const results = useMemo<SearchResult[]>(() => {
        if (!query.trim()) {
            // Show recent/popular pages when no query
            return PAGES.slice(0, 6);
        }

        const q = query.toLowerCase();
        const results: SearchResult[] = [];

        // Search products
        const matchingProducts = products
            .filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.barcode.toLowerCase().includes(q)
            )
            .slice(0, 5)
            .map(p => ({
                id: `product-${p.id}`,
                title: p.name,
                subtitle: `Barcode: ${p.barcode} | Stok: ${p.stock.gudang + p.stock.toko}`,
                type: 'product' as const,
                icon: <Package className="w-4 h-4" />,
                path: '/products',
                badge: p.stock.gudang + p.stock.toko === 0 ? 'Habis' : undefined,
            }));

        // Search pages
        const matchingPages = PAGES.filter(p =>
            p.title.toLowerCase().includes(q) ||
            (p.subtitle?.toLowerCase().includes(q))
        );

        // Combine results
        results.push(...matchingProducts);
        results.push(...matchingPages);

        return results.slice(0, 10);
    }, [query, products]);

    // Handle navigation
    const handleSelect = useCallback((result: SearchResult) => {
        if (result.action) {
            result.action();
        } else if (result.path) {
            navigate(result.path);
        }
        onOpenChange(false);
    }, [navigate, onOpenChange]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!open) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(i => Math.min(i + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(i => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (results[selectedIndex]) {
                        handleSelect(results[selectedIndex]);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, results, selectedIndex, handleSelect]);

    // Reset selection when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const getTypeLabel = (type: SearchResult['type']) => {
        switch (type) {
            case 'product': return 'Produk';
            case 'page': return 'Halaman';
            case 'action': return 'Aksi';
            case 'customer': return 'Pelanggan';
            case 'sale': return 'Penjualan';
            default: return '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>Pencarian Global</DialogTitle>
                </DialogHeader>

                {/* Search Input */}
                <div className="flex items-center border-b px-4 py-3">
                    <Search className="w-5 h-5 text-muted-foreground mr-3" />
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cari produk, halaman, atau aksi..."
                        className="border-0 p-0 h-auto text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <ScrollArea className="max-h-[400px]">
                    {results.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Tidak ada hasil untuk "{query}"</p>
                        </div>
                    ) : (
                        <div className="p-2">
                            {query ? (
                                <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {results.length} hasil ditemukan
                                </p>
                            ) : (
                                <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Navigasi Cepat
                                </p>
                            )}
                            {results.map((result, index) => (
                                <button
                                    key={result.id}
                                    onClick={() => handleSelect(result)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                                        index === selectedIndex
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <div className={cn(
                                        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                                        index === selectedIndex
                                            ? "bg-primary-foreground/20"
                                            : "bg-muted"
                                    )}>
                                        {result.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">{result.title}</span>
                                            {result.badge && (
                                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                                    {result.badge}
                                                </Badge>
                                            )}
                                        </div>
                                        {result.subtitle && (
                                            <p className={cn(
                                                "text-sm truncate",
                                                index === selectedIndex
                                                    ? "text-primary-foreground/70"
                                                    : "text-muted-foreground"
                                            )}>
                                                {result.subtitle}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0 flex items-center gap-2">
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "text-[10px]",
                                                index === selectedIndex && "bg-primary-foreground/20 text-primary-foreground"
                                            )}
                                        >
                                            {getTypeLabel(result.type)}
                                        </Badge>
                                        <ArrowRight className={cn(
                                            "w-4 h-4",
                                            index === selectedIndex
                                                ? "text-primary-foreground"
                                                : "text-muted-foreground"
                                        )} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑↓</kbd>
                            navigasi
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↵</kbd>
                            pilih
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">esc</kbd>
                            tutup
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Command className="w-3 h-3" />
                        <span>VMB Search</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default GlobalSearch;
