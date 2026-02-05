import { useState } from 'react';
import { Plus, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

interface QuickSaleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddItem: (name: string, price: number, quantity: number) => void;
}

export function QuickSaleDialog({
    open,
    onOpenChange,
    onAddItem,
}: QuickSaleDialogProps) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState<number | ''>('');
    const [quantity, setQuantity] = useState<number | ''>(1);
    const [quantityInput, setQuantityInput] = useState('1'); // Raw input string for decimal support

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) return;
        if (!price || price <= 0) return;
        if (!quantity || quantity <= 0) return;

        onAddItem(name.trim(), price, quantity);

        // Reset form
        setName('');
        setPrice('');
        setQuantity(1);
        setQuantityInput('1');
        onOpenChange(false);
    };

    const handleReset = () => {
        setName('');
        setPrice('');
        setQuantity(1);
        setQuantityInput('1');
    };

    const isValid = name.trim() && price && price > 0 && quantity && quantity > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-2xl max-w-md p-0 overflow-hidden border-0 shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-br from-white to-amber-100 dark:from-slate-900 dark:to-amber-900/30 p-6 border-b">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                                <PackagePlus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">Quick Sale</DialogTitle>
                                <DialogDescription className="text-sm text-muted-foreground">
                                    Tambah item manual yang belum ada di database
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Item Name */}
                    <div className="space-y-2">
                        <Label htmlFor="item-name">Nama Barang</Label>
                        <Input
                            id="item-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Kabel USB 2 Meter"
                            className="h-11 rounded-xl"
                            autoFocus
                        />
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <Label htmlFor="item-price">Harga (Rp)</Label>
                        <Input
                            id="item-price"
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value ? parseInt(e.target.value) : '')}
                            placeholder="0"
                            className="h-11 rounded-xl"
                            min={0}
                        />
                        {price && price > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Rp {price.toLocaleString('id-ID')}
                            </p>
                        )}
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                        <Label htmlFor="item-qty">Jumlah</Label>
                        <Input
                            id="item-qty"
                            type="text"
                            inputMode="decimal"
                            value={quantityInput}
                            onChange={(e) => {
                                const val = e.target.value;
                                // Allow empty, numbers, and decimals (with . or ,)
                                if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                                    setQuantityInput(val);
                                    const parsed = parseFloat(val.replace(',', '.'));
                                    setQuantity(isNaN(parsed) || val === '' ? '' : parsed);
                                }
                            }}
                            placeholder="1"
                            className="h-11 rounded-xl"
                        />
                        {typeof quantity === 'number' && quantity > 0 && quantity % 1 !== 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                💡 Input desimal aktif (mis. untuk pipa, kabel dll)
                            </p>
                        )}
                    </div>

                    {/* Subtotal Preview */}
                    {isValid && (
                        <div className="p-4 rounded-xl bg-gradient-to-r from-white to-emerald-50 dark:from-slate-900 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Subtotal</span>
                                <span className="text-lg font-bold text-emerald-600">
                                    Rp {((price || 0) * (quantity || 0)).toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            className="flex-1 h-11 rounded-xl"
                        >
                            Reset
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isValid}
                            className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah ke Keranjang
                        </Button>
                    </div>

                    {/* Info */}
                    <p className="text-xs text-center text-muted-foreground">
                        ⚠️ Item manual tidak mengurangi stok dan tidak tercatat di inventory
                    </p>
                </form>
            </DialogContent>
        </Dialog>
    );
}
