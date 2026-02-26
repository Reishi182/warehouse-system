import { Product } from '@/types';
import { getUnitPrice, formatRupiah, getUnitMultiplier } from '@/lib/multiUnit';
import { Package, Hash } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

export type SellUnit = 'box' | 'pcs';

interface UnitPickerDialogProps {
    open: boolean;
    onClose: () => void;
    product: Product | null;
    onSelect: (unit: SellUnit) => void;
}

export function UnitPickerDialog({ open, onClose, product, onSelect }: UnitPickerDialogProps) {
    if (!product) return null;

    const boxPrice = getUnitPrice(product, 'box');
    const pcsPrice = getUnitPrice(product, 'pcs');
    const pcsPerBox = product.pcs_per_box;

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[380px] rounded-2xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-lg font-bold">
                        Pilih Satuan
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        {product.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-3">
                    {/* Box option */}
                    <button
                        onClick={() => onSelect('box')}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 group text-left"
                    >
                        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground">Box</div>
                            <div className="text-xs text-muted-foreground">
                                {pcsPerBox ? `Isi ${pcsPerBox} pcs per box` : 'Box segel'}
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="font-bold text-primary text-lg">
                                {formatRupiah(boxPrice)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">/box</div>
                        </div>
                    </button>

                    {/* Pcs option */}
                    <button
                        onClick={() => onSelect('pcs')}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 group text-left"
                    >
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <Hash className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground">Pcs / Eceran</div>
                            <div className="text-xs text-muted-foreground">
                                Satuan satuan
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="font-bold text-primary text-lg">
                                {formatRupiah(pcsPrice)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">/pcs</div>
                        </div>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
