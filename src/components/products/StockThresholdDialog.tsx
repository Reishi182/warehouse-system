import { useState, useEffect } from 'react';
import { Bell, Warehouse, Store, AlertTriangle, RotateCcw, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/useDataStore';
import { useAuth } from '@/contexts/AuthContext';
import { STOCK_THRESHOLDS } from '@/constants';
import { Product } from '@/types';
import { cn } from '@/lib/utils';

interface StockThresholdDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved?: () => void;
}

export default function StockThresholdDialog({
    product,
    open,
    onOpenChange,
    onSaved,
}: StockThresholdDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const updateProduct = useDataStore(s => s.updateProduct);

    const [minGudang, setMinGudang] = useState<number>(STOCK_THRESHOLDS.LOW_STOCK_GUDANG);
    const [minToko, setMinToko] = useState<number>(STOCK_THRESHOLDS.LOW_STOCK_TOKO);
    const [sendNotif, setSendNotif] = useState(true);
    const [saving, setSaving] = useState(false);

    // Populate when product changes
    useEffect(() => {
        if (product) {
            setMinGudang(
                product.min_stock_gudang && product.min_stock_gudang > 0
                    ? product.min_stock_gudang
                    : STOCK_THRESHOLDS.LOW_STOCK_GUDANG
            );
            setMinToko(
                product.min_stock_toko && product.min_stock_toko > 0
                    ? product.min_stock_toko
                    : STOCK_THRESHOLDS.LOW_STOCK_TOKO
            );
        }
    }, [product]);

    if (!product) return null;

    const isLowGudang = product.stock.gudang < minGudang;
    const isLowToko = product.stock.toko < minToko;

    const handleReset = () => {
        setMinGudang(STOCK_THRESHOLDS.LOW_STOCK_GUDANG);
        setMinToko(STOCK_THRESHOLDS.LOW_STOCK_TOKO);
    };

    const handleSave = async () => {
        if (minGudang < 0 || minToko < 0) {
            toast({ title: 'Batas minimal tidak boleh negatif', variant: 'destructive' });
            return;
        }

        setSaving(true);
        try {
            // 1. Update product thresholds via Supabase directly
            const { error } = await supabase
                .from('products')
                .update({
                    min_stock_gudang: minGudang,
                    min_stock_toko: minToko,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', product.id);

            if (error) throw error;

            // 2. Update local store
            if (updateProduct) {
                await updateProduct(product.id, {
                    min_stock_gudang: minGudang,
                    min_stock_toko: minToko,
                });
            }

            // 3. Send notifications if checked AND stock is currently below new threshold
            if (sendNotif && (isLowGudang || isLowToko)) {
                await sendLowStockNotification();
            }

            toast({
                title: '✅ Batas stok disimpan',
                description: `Gudang: ≥${minGudang}, Toko: ≥${minToko}`,
            });

            onSaved?.();
            onOpenChange(false);
        } catch (err) {
            console.error(err);
            toast({
                title: 'Gagal menyimpan',
                description: String(err),
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const sendLowStockNotification = async () => {
        if (!user?.id) return;

        const locations: string[] = [];
        if (product.stock.gudang < minGudang) locations.push(`Gudang: ${product.stock.gudang} (min: ${minGudang})`);
        if (product.stock.toko < minToko) locations.push(`Toko: ${product.stock.toko} (min: ${minToko})`);

        try {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id')
                .in('role', ['admin', 'warehouse', 'auditor']);

            if (profiles && profiles.length > 0) {
                const notifications = profiles.map(profile => ({
                    user_id: profile.user_id,
                    title: '⚠️ Stok Rendah',
                    message: `${product.name} stok di bawah batas. ${locations.join(' | ')}`,
                    type: 'warning' as const,
                    link: '/products',
                }));
                await supabase.from('notifications').insert(notifications);
            }
        } catch (err) {
            console.error('Failed to send notification:', err);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Atur Batas Stok Rendah
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* Product Info */}
                    <div className="p-3 rounded-xl bg-muted/40 border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{product.barcode}</p>
                        </div>
                        <div className="ml-auto flex gap-1.5 shrink-0">
                            <Badge variant="outline" className="gap-1 text-xs">
                                <Warehouse className="w-3 h-3" />
                                {product.stock.gudang}
                            </Badge>
                            <Badge variant="outline" className="gap-1 text-xs">
                                <Store className="w-3 h-3" />
                                {product.stock.toko}
                            </Badge>
                        </div>
                    </div>

                    {/* Threshold Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Gudang threshold */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <Warehouse className="w-3.5 h-3.5 text-blue-500" />
                                Min Stok Gudang
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                value={minGudang}
                                onChange={(e) => setMinGudang(parseInt(e.target.value) || 0)}
                                className={cn(
                                    'text-center font-semibold',
                                    isLowGudang && 'border-orange-400 focus-visible:ring-orange-400'
                                )}
                            />
                            <div className={cn(
                                'text-xs text-center px-2 py-1 rounded-lg',
                                isLowGudang
                                    ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                                    : 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                            )}>
                                {isLowGudang ? '⚠️ Di bawah batas' : '✅ Stok aman'}
                            </div>
                        </div>

                        {/* Toko threshold */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-emerald-500" />
                                Min Stok Toko
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                value={minToko}
                                onChange={(e) => setMinToko(parseInt(e.target.value) || 0)}
                                className={cn(
                                    'text-center font-semibold',
                                    isLowToko && 'border-orange-400 focus-visible:ring-orange-400'
                                )}
                            />
                            <div className={cn(
                                'text-xs text-center px-2 py-1 rounded-lg',
                                isLowToko
                                    ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                                    : 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                            )}>
                                {isLowToko ? '⚠️ Di bawah batas' : '✅ Stok aman'}
                            </div>
                        </div>
                    </div>

                    {/* Global default hint */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2 border">
                        <span>Default global: Gudang ≥{STOCK_THRESHOLDS.LOW_STOCK_GUDANG}, Toko ≥{STOCK_THRESHOLDS.LOW_STOCK_TOKO}</span>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center gap-1 text-primary hover:underline ml-2 shrink-0"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                        </button>
                    </div>

                    {/* Notification toggle */}
                    <div className={cn(
                        'flex items-center justify-between p-3 rounded-xl border transition-colors',
                        sendNotif
                            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                            : 'bg-muted/30'
                    )}>
                        <div className="flex items-center gap-2">
                            <Bell className={cn('w-4 h-4', sendNotif ? 'text-blue-600' : 'text-muted-foreground')} />
                            <div>
                                <p className={cn('text-sm font-medium', sendNotif ? 'text-blue-900 dark:text-blue-100' : '')}>
                                    Kirim Notifikasi
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {(isLowGudang || isLowToko)
                                        ? 'Notifikasi stok rendah ke admin & gudang'
                                        : 'Stok saat ini aman — notifikasi tidak akan dikirim'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSendNotif(!sendNotif)}
                            disabled={!isLowGudang && !isLowToko}
                            className={cn(
                                'relative w-11 h-6 rounded-full transition-colors shrink-0',
                                sendNotif && (isLowGudang || isLowToko) ? 'bg-blue-600' : 'bg-muted',
                                (!isLowGudang && !isLowToko) && 'opacity-40 cursor-not-allowed'
                            )}
                        >
                            <span className={cn(
                                'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
                                sendNotif && (isLowGudang || isLowToko) ? 'translate-x-5' : 'translate-x-0'
                            )} />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-2 border-t">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            <X className="w-4 h-4 mr-1" />
                            Batal
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
                            {saving ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Menyimpan...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Save className="w-4 h-4" />
                                    Simpan Batas
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
