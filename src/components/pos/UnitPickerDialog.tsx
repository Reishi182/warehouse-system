import { Product } from '@/types';
import { getUnitPrice, formatRupiah, getUnitLabel } from '@/lib/multiUnit';
import { Package, Hash } from 'lucide-react';
import { AppModal } from '@/components/ui/app-modal';

// Dynamic unit type — 'main' for the larger packaging unit, 'sub' for the base unit
export type SellUnit = 'main' | 'sub';

interface UnitPickerDialogProps {
    open: boolean;
    onClose: () => void;
    product: Product | null;
    onSelect: (unit: SellUnit) => void;
}

export function UnitPickerDialog({ open, onClose, product, onSelect }: UnitPickerDialogProps) {
    if (!product) return null;

    const mainPrice = getUnitPrice(product, 'main');
    const subPrice = getUnitPrice(product, 'sub');
    const pcsPerBox = product.pcs_per_box;
    const mainLabel = getUnitLabel(product, 'main');
    const subLabel = getUnitLabel(product, 'sub');

    return (
        <AppModal
            open={open}
            onClose={onClose}
            title="Pilih Satuan"
            description={product.name}
            size="xs"
            noPadding
        >
            <div className="px-6 pb-6 space-y-3">
                {/* Main unit option (e.g. BOX, SAK, ROLL) */}
                <button
                    onClick={() => onSelect('main')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 group text-left"
                >
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground">{mainLabel}</div>
                        <div className="text-xs text-muted-foreground">
                            {pcsPerBox ? `Isi ${pcsPerBox} ${subLabel} per ${mainLabel}` : `${mainLabel} segel`}
                        </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="font-bold text-primary text-lg">{formatRupiah(mainPrice)}</div>
                        <div className="text-[10px] text-muted-foreground">/{mainLabel.toLowerCase()}</div>
                    </div>
                </button>

                {/* Sub unit option (e.g. PCS, KG, METER) */}
                <button
                    onClick={() => onSelect('sub')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 group text-left"
                >
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Hash className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground">{subLabel} / Eceran</div>
                        <div className="text-xs text-muted-foreground">Satuan satuan</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="font-bold text-primary text-lg">{formatRupiah(subPrice)}</div>
                        <div className="text-[10px] text-muted-foreground">/{subLabel.toLowerCase()}</div>
                    </div>
                </button>
            </div>
        </AppModal>
    );
}
