import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import ProductImage from '@/components/common/ProductImage';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

interface StockAdjustDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (productId: string, adjustments: { gudang: number; toko: number }) => Promise<void>;
}

export function StockAdjustDialog({
    product,
    open,
    onOpenChange,
    onSave,
}: StockAdjustDialogProps) {
    const [adjustments, setAdjustments] = useState({ gudang: 0, toko: 0 });

    // Reset adjustments when dialog opens with different product
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            setAdjustments({ gudang: 0, toko: 0 });
        }
        onOpenChange(newOpen);
    };

    const handleSave = async () => {
        if (!product) return;
        if (adjustments.gudang === 0 && adjustments.toko === 0) return;

        // Pass the adjustments (deltas), not absolute values
        // The parent will use atomic RPCs to apply these
        await onSave(product.id, adjustments);
        onOpenChange(false);
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Sesuaikan Stok</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Product Info */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                        <ProductImage
                            src={product.image_url}
                            size="thumb"
                            className="w-12 h-12 rounded-lg"
                            placeholderClassName="w-12 h-12 rounded-lg bg-primary/10"
                        />
                        <div>
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.barcode}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Gudang Adjustment */}
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <Label className="text-sm">Gudang</Label>
                                <p className="text-xs text-muted-foreground">
                                    Saat ini: {product.stock.gudang}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => setAdjustments(prev => ({ ...prev, gudang: prev.gudang - 1 }))}
                                >
                                    <Minus className="w-4 h-4" />
                                </Button>
                                <Input
                                    type="number" step="any"
                                    value={adjustments.gudang}
                                    onChange={(e) => setAdjustments(prev => ({ ...prev, gudang: parseFloat(e.target.value) || 0 }))}
                                    className="w-20 text-center h-8 rounded-lg"
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => setAdjustments(prev => ({ ...prev, gudang: prev.gudang + 1 }))}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Toko Adjustment */}
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <Label className="text-sm">Toko</Label>
                                <p className="text-xs text-muted-foreground">
                                    Saat ini: {product.stock.toko}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => setAdjustments(prev => ({ ...prev, toko: prev.toko - 1 }))}
                                >
                                    <Minus className="w-4 h-4" />
                                </Button>
                                <Input
                                    type="number" step="any"
                                    value={adjustments.toko}
                                    onChange={(e) => setAdjustments(prev => ({ ...prev, toko: parseFloat(e.target.value) || 0 }))}
                                    className="w-20 text-center h-8 rounded-lg"
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => setAdjustments(prev => ({ ...prev, toko: prev.toko + 1 }))}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Preview new stock values */}
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                        <p className="text-xs text-muted-foreground mb-2">Stok baru setelah penyesuaian:</p>
                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div>
                                <p className="text-xs text-muted-foreground">Gudang</p>
                                <p className="font-bold text-primary">
                                    {Math.max(0, product.stock.gudang + adjustments.gudang)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Toko</p>
                                <p className="font-bold text-primary">
                                    {Math.max(0, product.stock.toko + adjustments.toko)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                        Batal
                    </Button>
                    <Button onClick={handleSave} className="rounded-xl">
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
