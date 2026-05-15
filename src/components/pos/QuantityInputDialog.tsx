import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SellUnit } from '@/components/pos/UnitPickerDialog';
import { getUnitLabel, getUnitPrice } from '@/lib/multiUnit';

interface QuantityInputDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    onConfirm: (quantity: number) => void;
    /** When set, derive unit label and price from this sell unit (for multi-unit products) */
    selectedUnit?: SellUnit | null;
}

export default function QuantityInputDialog({
    open,
    onOpenChange,
    product,
    onConfirm,
    selectedUnit,
}: QuantityInputDialogProps) {
    const [quantity, setQuantity] = useState('');

    // Reset quantity when dialog opens with new product
    useEffect(() => {
        if (open && product) {
            setQuantity('');
        }
    }, [open, product]);

    if (!product) return null;

    const unit = selectedUnit
        ? getUnitLabel(product, selectedUnit)
        : (product.sell_unit || 'pcs');

    const price = selectedUnit
        ? getUnitPrice(product, selectedUnit)
        : (product.price || 0);

    const numericQty = parseFloat(quantity) || 0;
    const total = numericQty * price;

    const handleConfirm = () => {
        if (numericQty > 0) {
            onConfirm(numericQty);
            onOpenChange(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && numericQty > 0) {
            handleConfirm();
        }
    };

    const quickQtys = [0.5, 1, 1.5, 2, 2.5, 3, 5, 10];

    return (
        <AppModal
            open={open}
            onClose={() => onOpenChange(false)}
            title={product.name}
            size="xs"
            footer={
                <Button
                    onClick={handleConfirm}
                    disabled={numericQty <= 0}
                    className="w-full rounded-xl h-12 text-lg"
                >
                    Tambah ke Keranjang
                </Button>
            }
        >
            <div className="space-y-4">
                {/* Price per unit info */}
                <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        Rp {price.toLocaleString('id-ID')}
                    </p>
                    <p className="text-sm text-muted-foreground">per {unit}</p>
                </div>

                {/* Quantity input */}
                <div className="space-y-2">
                    <Label>Berapa {unit}?</Label>
                    <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Masukkan jumlah ${unit}`}
                        step="0.1"
                        min="0"
                        autoFocus
                        className="rounded-xl text-lg h-12 text-center font-semibold"
                    />
                </div>

                {/* Quick quantity buttons */}
                <div className="flex flex-wrap gap-2">
                    {quickQtys.map((q) => (
                        <Button
                            key={q}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setQuantity(q.toString())}
                            className="rounded-lg flex-1 min-w-[50px]"
                        >
                            {q}
                        </Button>
                    ))}
                </div>

                {/* Total preview */}
                {numericQty > 0 && (
                    <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                            Rp {total.toLocaleString('id-ID')}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {numericQty} {unit} × Rp {price.toLocaleString('id-ID')}
                        </p>
                    </div>
                )}
            </div>
        </AppModal>
    );
}
