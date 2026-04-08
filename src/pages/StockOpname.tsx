import { useState, useMemo, useCallback } from 'react';
import {
    ClipboardCheck, Search, Package, Warehouse, Store, Plus, Trash2,
    AlertTriangle, CheckCircle2, ArrowRight, Loader2, ScanBarcode
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { LazyImage } from '@/components/common/LazyImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useProductUnits, unitsToSelectOptions } from '@/hooks/useProductUnits';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import BarcodeScanner from '@/components/common/BarcodeScanner';

interface OpnameItem {
    product: Product;
    // Physical count input (in base sub-units)
    physicalGudang: number;
    physicalToko: number;
    // Multi-unit helper inputs
    mainGudang: number;
    subGudang: number;
    mainToko: number;
    subToko: number;
    // Note
    note: string;
}

/**
 * Format stock for multi-unit display: "X [main] Y [sub]"
 */
function formatMultiUnitStock(
    stock: number,
    pcsPerBox: number | null | undefined,
    mainUnit: string | null | undefined,
    subUnit: string | null | undefined,
): string {
    const mainLabel = (mainUnit || 'box').toUpperCase();
    const subLabel = (subUnit || 'pcs').toUpperCase();

    if (!pcsPerBox || pcsPerBox <= 0) {
        return `${stock} ${subLabel}`;
    }

    const mainCount = Math.floor(stock / pcsPerBox);
    const remainder = parseFloat((stock % pcsPerBox).toFixed(2));

    if (mainCount === 0) return `${remainder} ${subLabel}`;
    if (remainder === 0) return `${mainCount} ${mainLabel}`;
    return `${mainCount} ${mainLabel} ${remainder} ${subLabel}`;
}

/**
 * Format a difference value with sign
 */
function formatDiff(diff: number, unit?: string): string {
    const sign = diff > 0 ? '+' : '';
    const label = unit ? ` ${unit}` : '';
    return `${sign}${diff}${label}`;
}

export default function StockOpname() {
    const { products, refreshData } = useData();
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const { data: unitsData } = useProductUnits();
    const SELL_UNITS = unitsToSelectOptions(unitsData || []);

    const [searchQuery, setSearchQuery] = useState('');
    const [opnameItems, setOpnameItems] = useState<OpnameItem[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Search results
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        const addedIds = new Set(opnameItems.map(i => i.product.id));
        return products
            .filter(p => !addedIds.has(p.id))
            .filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.barcode.toLowerCase().includes(q)
            )
            .slice(0, 8);
    }, [searchQuery, products, opnameItems]);

    // Get unit labels for a product
    const getUnitLabels = useCallback((product: Product) => {
        const mainLabel = SELL_UNITS.find(u => u.value === product.main_unit)?.label ?? (product.main_unit || 'BOX').toUpperCase();
        const subLabel = SELL_UNITS.find(u => u.value === product.sell_unit)?.label ?? (product.sell_unit || 'PCS').toUpperCase();
        return { mainLabel, subLabel };
    }, [SELL_UNITS]);

    // Add product to opname list
    const addProduct = useCallback((product: Product) => {
        const isMulti = product.has_multi_unit && product.pcs_per_box;
        const ppb = product.pcs_per_box || 1;

        setOpnameItems(prev => [
            ...prev,
            {
                product,
                physicalGudang: product.stock.gudang,
                physicalToko: product.stock.toko,
                mainGudang: isMulti ? Math.floor(product.stock.gudang / ppb) : 0,
                subGudang: isMulti ? parseFloat((product.stock.gudang % ppb).toFixed(2)) : product.stock.gudang,
                mainToko: isMulti ? Math.floor(product.stock.toko / ppb) : 0,
                subToko: isMulti ? parseFloat((product.stock.toko % ppb).toFixed(2)) : product.stock.toko,
                note: '',
            }
        ]);
        setSearchQuery('');
    }, []);

    // Remove from list
    const removeItem = useCallback((productId: string) => {
        setOpnameItems(prev => prev.filter(i => i.product.id !== productId));
    }, []);

    // Update physical count
    const updateItem = useCallback((productId: string, field: keyof OpnameItem, value: any) => {
        setOpnameItems(prev => prev.map(item => {
            if (item.product.id !== productId) return item;

            const updated = { ...item, [field]: value };
            const isMulti = item.product.has_multi_unit && item.product.pcs_per_box;
            const ppb = item.product.pcs_per_box || 1;

            // Recalculate physicals from multi-unit inputs
            if (isMulti) {
                if (field === 'mainGudang' || field === 'subGudang') {
                    updated.physicalGudang = (updated.mainGudang * ppb) + updated.subGudang;
                }
                if (field === 'mainToko' || field === 'subToko') {
                    updated.physicalToko = (updated.mainToko * ppb) + updated.subToko;
                }
            } else {
                // Single unit — physicalGudang/Toko is the direct field
                if (field === 'subGudang') updated.physicalGudang = value;
                if (field === 'subToko') updated.physicalToko = value;
            }

            return updated;
        }));
    }, []);

    // Handle barcode scan
    const handleBarcodeScan = useCallback((barcode: string) => {
        const product = products.find(p => p.barcode === barcode);
        if (!product) {
            toast({ title: 'Produk tidak ditemukan', description: `Barcode: ${barcode}`, variant: 'destructive' });
            return;
        }
        const alreadyAdded = opnameItems.some(i => i.product.id === product.id);
        if (alreadyAdded) {
            toast({ title: 'Sudah ditambahkan', description: product.name });
            return;
        }
        addProduct(product);
        toast({ title: 'Produk ditambahkan', description: product.name });
    }, [products, opnameItems, addProduct, toast]);

    // Calculate stats
    const stats = useMemo(() => {
        let totalDiffGudang = 0;
        let totalDiffToko = 0;
        let itemsWithDiff = 0;

        opnameItems.forEach(item => {
            const dg = item.physicalGudang - item.product.stock.gudang;
            const dt = item.physicalToko - item.product.stock.toko;
            totalDiffGudang += dg;
            totalDiffToko += dt;
            if (dg !== 0 || dt !== 0) itemsWithDiff++;
        });

        return { totalDiffGudang, totalDiffToko, itemsWithDiff, totalItems: opnameItems.length };
    }, [opnameItems]);

    // Submit all adjustments
    const handleSubmit = async () => {
        if (!user || !profile) return;
        if (opnameItems.length === 0) return;

        // Filter only items with actual changes
        const changedItems = opnameItems.filter(item => {
            const dg = item.physicalGudang - item.product.stock.gudang;
            const dt = item.physicalToko - item.product.stock.toko;
            return dg !== 0 || dt !== 0;
        });

        if (changedItems.length === 0) {
            toast({ title: 'Tidak ada perubahan', description: 'Semua stok fisik sama dengan sistem', variant: 'destructive' });
            return;
        }

        setSubmitting(true);

        try {
            for (const item of changedItems) {
                const diffGudang = item.physicalGudang - item.product.stock.gudang;
                const diffToko = item.physicalToko - item.product.stock.toko;

                // Update stock in products table
                const updateData: any = {};
                if (diffGudang !== 0) updateData.stock_gudang = item.physicalGudang;
                if (diffToko !== 0) updateData.stock_toko = item.physicalToko;

                const { error: updateError } = await supabase
                    .from('products')
                    .update(updateData)
                    .eq('id', item.product.id);

                if (updateError) {
                    toast({
                        title: 'Gagal update stok',
                        description: `${item.product.name}: ${updateError.message}`,
                        variant: 'destructive',
                    });
                    continue;
                }

                // Log adjustments
                const notePrefix = `Stok Opname oleh ${profile.name}`;
                const noteDetail = item.note ? ` — ${item.note}` : '';

                if (diffGudang !== 0) {
                    await supabase.from('stock_logs').insert({
                        product_id: item.product.id,
                        type: 'adjustment',
                        quantity: diffGudang,
                        location: 'gudang',
                        user_id: user.id,
                        note: `${notePrefix}: selisih ${diffGudang > 0 ? '+' : ''}${diffGudang} gudang${noteDetail}`,
                    });
                }

                if (diffToko !== 0) {
                    await supabase.from('stock_logs').insert({
                        product_id: item.product.id,
                        type: 'adjustment',
                        quantity: diffToko,
                        location: 'toko',
                        user_id: user.id,
                        note: `${notePrefix}: selisih ${diffToko > 0 ? '+' : ''}${diffToko} toko${noteDetail}`,
                    });
                }
            }

            await refreshData();
            setSubmitted(true);
            toast({
                title: 'Stok Opname Berhasil',
                description: `${changedItems.length} produk berhasil disesuaikan`,
            });
        } catch (err) {
            toast({
                title: 'Gagal',
                description: String(err),
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Reset for new session
    const handleReset = () => {
        setOpnameItems([]);
        setSubmitted(false);
    };

    // Success screen
    if (submitted) {
        return (
            <MainLayout title="Stok Opname" subtitle="Pengecekan dan penyesuaian stok">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Stok Opname Selesai!</h2>
                    <p className="text-muted-foreground mb-6">
                        {stats.itemsWithDiff} produk berhasil disesuaikan
                    </p>
                    <Button onClick={handleReset} className="rounded-xl">
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        Mulai Opname Baru
                    </Button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Stok Opname" subtitle="Hitung stok fisik dan sesuaikan dengan sistem">
            <div className="space-y-6">
                {/* Stats */}
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Produk Dicek"
                        value={stats.totalItems}
                        icon={<Package className="w-5 h-5" />}
                        gradient="blue"
                        animationDelay={0}
                    />
                    <StatsCard
                        title="Ada Selisih"
                        value={stats.itemsWithDiff}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        subtitle={stats.itemsWithDiff > 0 ? 'perlu disesuaikan' : undefined}
                        subtitleType="warning"
                        gradient="orange"
                        animationDelay={100}
                    />
                    <StatsCard
                        title="Selisih Gudang"
                        value={formatDiff(stats.totalDiffGudang)}
                        icon={<Warehouse className="w-5 h-5" />}
                        gradient="amber"
                        animationDelay={200}
                    />
                    <StatsCard
                        title="Selisih Toko"
                        value={formatDiff(stats.totalDiffToko)}
                        icon={<Store className="w-5 h-5" />}
                        gradient="emerald"
                        animationDelay={300}
                    />
                </StatsGrid>

                {/* Search / Add Product */}
                <div className="relative">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <BarcodeScanner
                                onScan={handleBarcodeScan}
                                placeholder="Cari atau scan barcode produk untuk ditambahkan..."
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Search dropdown */}
                    {searchQuery.trim() && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border rounded-xl shadow-xl max-h-80 overflow-y-auto">
                            {searchResults.map(product => {
                                const isMulti = product.has_multi_unit && product.pcs_per_box;
                                const { mainLabel, subLabel } = getUnitLabels(product);
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => addProduct(product)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-muted/50 overflow-hidden shrink-0">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-muted-foreground/30" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">{product.barcode}</p>
                                        </div>
                                        <div className="text-right text-xs text-muted-foreground shrink-0">
                                            <p>G: {isMulti ? formatMultiUnitStock(product.stock.gudang, product.pcs_per_box, product.main_unit, product.sell_unit) : product.stock.gudang}</p>
                                            <p>T: {isMulti ? formatMultiUnitStock(product.stock.toko, product.pcs_per_box, product.main_unit, product.sell_unit) : product.stock.toko}</p>
                                        </div>
                                        <Plus className="w-4 h-4 text-primary shrink-0" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Opname List */}
                {opnameItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <ScanBarcode className="w-8 h-8 opacity-30" />
                        </div>
                        <p className="font-medium">Belum ada produk</p>
                        <p className="text-sm mt-1">Scan barcode atau cari produk untuk mulai opname</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {opnameItems.map((item, idx) => {
                            const { product } = item;
                            const isMulti = product.has_multi_unit && product.pcs_per_box;
                            const ppb = product.pcs_per_box || 1;
                            const { mainLabel, subLabel } = getUnitLabels(product);
                            const diffGudang = parseFloat((item.physicalGudang - product.stock.gudang).toFixed(2));
                            const diffToko = parseFloat((item.physicalToko - product.stock.toko).toFixed(2));
                            const hasDiff = diffGudang !== 0 || diffToko !== 0;

                            return (
                                <div
                                    key={product.id}
                                    className={cn(
                                        "rounded-2xl border bg-card p-4 transition-all",
                                        hasDiff && "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10"
                                    )}
                                >
                                    {/* Header: Product info + remove */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-muted/50 overflow-hidden shrink-0">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Package className="w-6 h-6 text-muted-foreground/20" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                                            <p className="text-xs text-muted-foreground font-mono">{product.barcode}</p>
                                            {isMulti && (
                                                <Badge variant="outline" className="mt-1 text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 border-blue-200">
                                                    📦 1 {mainLabel} = {ppb} {subLabel}
                                                </Badge>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive shrink-0"
                                            onClick={() => removeItem(product.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Stock comparison grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* GUDANG */}
                                        <div className="space-y-2 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                                    <Warehouse className="w-3.5 h-3.5" /> Gudang
                                                </Label>
                                                <span className="text-xs text-muted-foreground">
                                                    Sistem: <strong>{isMulti ? formatMultiUnitStock(product.stock.gudang, product.pcs_per_box, product.main_unit, product.sell_unit) : product.stock.gudang}</strong>
                                                </span>
                                            </div>

                                            {/* Physical count input */}
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground uppercase">Stok Fisik</Label>
                                                {isMulti ? (
                                                    <div className="flex gap-2 items-center">
                                                        <div className="flex-1 space-y-0.5">
                                                            <Input
                                                                type="number" min={0} step="any"
                                                                value={item.mainGudang || ''}
                                                                onChange={(e) => updateItem(product.id, 'mainGudang', parseFloat(e.target.value) || 0)}
                                                                className="h-9 text-center font-bold"
                                                                placeholder="0"
                                                            />
                                                            <p className="text-[10px] text-center text-muted-foreground">{mainLabel}</p>
                                                        </div>
                                                        <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                                                        <div className="flex-1 space-y-0.5">
                                                            <Input
                                                                type="number" min={0} step="any"
                                                                value={item.subGudang || ''}
                                                                onChange={(e) => updateItem(product.id, 'subGudang', parseFloat(e.target.value) || 0)}
                                                                className="h-9 text-center"
                                                                placeholder="0"
                                                            />
                                                            <p className="text-[10px] text-center text-muted-foreground">{subLabel}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Input
                                                        type="number" min={0} step="any"
                                                        value={item.subGudang || ''}
                                                        onChange={(e) => updateItem(product.id, 'subGudang', parseFloat(e.target.value) || 0)}
                                                        className="h-9"
                                                        placeholder="Jumlah fisik"
                                                    />
                                                )}
                                            </div>

                                            {/* Diff */}
                                            {diffGudang !== 0 && (
                                                <div className={cn(
                                                    "text-xs font-bold px-2 py-1 rounded-md text-center",
                                                    diffGudang > 0
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                )}>
                                                    Selisih: {formatDiff(diffGudang)} {isMulti ? subLabel : ''}
                                                </div>
                                            )}
                                            {diffGudang === 0 && (
                                                <div className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">
                                                    ✓ Sesuai
                                                </div>
                                            )}
                                        </div>

                                        {/* TOKO */}
                                        <div className="space-y-2 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                                    <Store className="w-3.5 h-3.5" /> Toko
                                                </Label>
                                                <span className="text-xs text-muted-foreground">
                                                    Sistem: <strong>{isMulti ? formatMultiUnitStock(product.stock.toko, product.pcs_per_box, product.main_unit, product.sell_unit) : product.stock.toko}</strong>
                                                </span>
                                            </div>

                                            {/* Physical count input */}
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground uppercase">Stok Fisik</Label>
                                                {isMulti ? (
                                                    <div className="flex gap-2 items-center">
                                                        <div className="flex-1 space-y-0.5">
                                                            <Input
                                                                type="number" min={0} step="any"
                                                                value={item.mainToko || ''}
                                                                onChange={(e) => updateItem(product.id, 'mainToko', parseFloat(e.target.value) || 0)}
                                                                className="h-9 text-center font-bold"
                                                                placeholder="0"
                                                            />
                                                            <p className="text-[10px] text-center text-muted-foreground">{mainLabel}</p>
                                                        </div>
                                                        <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                                                        <div className="flex-1 space-y-0.5">
                                                            <Input
                                                                type="number" min={0} step="any"
                                                                value={item.subToko || ''}
                                                                onChange={(e) => updateItem(product.id, 'subToko', parseFloat(e.target.value) || 0)}
                                                                className="h-9 text-center"
                                                                placeholder="0"
                                                            />
                                                            <p className="text-[10px] text-center text-muted-foreground">{subLabel}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Input
                                                        type="number" min={0} step="any"
                                                        value={item.subToko || ''}
                                                        onChange={(e) => updateItem(product.id, 'subToko', parseFloat(e.target.value) || 0)}
                                                        className="h-9"
                                                        placeholder="Jumlah fisik"
                                                    />
                                                )}
                                            </div>

                                            {/* Diff */}
                                            {diffToko !== 0 && (
                                                <div className={cn(
                                                    "text-xs font-bold px-2 py-1 rounded-md text-center",
                                                    diffToko > 0
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                )}>
                                                    Selisih: {formatDiff(diffToko)} {isMulti ? subLabel : ''}
                                                </div>
                                            )}
                                            {diffToko === 0 && (
                                                <div className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">
                                                    ✓ Sesuai
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Multi-unit total conversion */}
                                    {isMulti && (
                                        <div className="mt-2 p-2 px-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900 flex justify-between items-center text-xs">
                                            <span className="text-blue-600 dark:text-blue-400 font-medium italic">Total Konversi Fisik:</span>
                                            <div className="flex gap-4">
                                                <span>Gudang: <strong>{item.physicalGudang} {subLabel}</strong></span>
                                                <span>Toko: <strong>{item.physicalToko} {subLabel}</strong></span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Note */}
                                    <div className="mt-3">
                                        <Textarea
                                            value={item.note}
                                            onChange={(e) => updateItem(product.id, 'note', e.target.value)}
                                            placeholder="Catatan (opsional) — misal: rusak, hilang, salah input..."
                                            className="resize-none h-16 text-xs rounded-xl"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Submit Section */}
                {opnameItems.length > 0 && (
                    <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t pt-4 pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-muted-foreground">
                                <strong>{stats.totalItems}</strong> produk dicek
                                {stats.itemsWithDiff > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400 ml-2">
                                        • <strong>{stats.itemsWithDiff}</strong> ada selisih
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={handleReset}
                                    className="rounded-xl"
                                >
                                    Reset
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting || stats.itemsWithDiff === 0}
                                    className="rounded-xl min-w-[200px]"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Simpan Hasil Opname ({stats.itemsWithDiff} produk)
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
