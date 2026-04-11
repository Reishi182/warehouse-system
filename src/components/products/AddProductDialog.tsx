import { useState, useRef } from 'react';
import { Plus, Package, X, Upload, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Product, UserRole } from '@/types';

// All available sell units matching the database seed
import { useProductUnits, unitsToSelectOptions } from '@/hooks/useProductUnits';

interface AddProductDialogProps {
    onAdd: (product: {
        name: string;
        barcode: string;
        price: number;
        stock: { gudang: number; toko: number };
        image_url?: string;
        has_multi_unit?: boolean;
        main_unit?: string | null;
        pcs_per_box?: number | null;
        box_price?: number | null;
        sell_by_quantity?: boolean;
        sell_unit?: string;
    }) => Promise<boolean>;
    getProductByBarcode: (barcode: string) => Product | undefined;
    userRole: UserRole;
}

export default function AddProductDialog({ onAdd, getProductByBarcode, userRole }: AddProductDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [barcode, setBarcode] = useState('');
    const [price, setPrice] = useState(0);
    const [stockGudang, setStockGudang] = useState(0);
    const [stockToko, setStockToko] = useState(0);
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const { data: unitsData } = useProductUnits();
    const SELL_UNITS = unitsToSelectOptions(unitsData || []);

    // Unit fields
    const [sellUnit, setSellUnit] = useState('pcs');
    const [sellByQuantity, setSellByQuantity] = useState(false);

    const [hasMultiUnit, setHasMultiUnit] = useState(false);
    const [mainUnit, setMainUnit] = useState('box');   // the LARGER unit
    const [pcsPerBox, setPcsPerBox] = useState<number | null>(null);   // qty of sub-unit per main-unit
    const [boxPrice, setBoxPrice] = useState<number | null>(null);     // price per main-unit

    // Visual Stock Helpers for Multi-Unit
    const [mainStockGudang, setMainStockGudang] = useState(0);
    const [subStockGudang, setSubStockGudang] = useState(0);
    const [mainStockToko, setMainStockToko] = useState(0);
    const [subStockToko, setSubStockToko] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-suggest main unit label
    const mainUnitLabel = SELL_UNITS.find(u => u.value === mainUnit)?.label ?? (mainUnit || '').toUpperCase();
    const subUnitLabel = SELL_UNITS.find(u => u.value === sellUnit)?.label ?? (sellUnit || '').toUpperCase();
    const computedBoxPrice = pcsPerBox && price ? price * pcsPerBox : null;

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Show loading state for compression if needed, but it's usually fast
        try {
            const { compressImageToFile, formatFileSize } = await import('@/lib/imageCompression');
            
            const originalSize = file.size;
            const compressedFile = await compressImageToFile(file, {
                maxWidth: 800,
                maxHeight: 800,
                quality: 0.7, // Slightly lower quality for better compression
                format: 'image/webp'
            });
            
            const compressedSize = compressedFile.size;
            const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(0);
            
            console.log(`[ImageCompression] ${formatFileSize(originalSize)} -> ${formatFileSize(compressedSize)} (${reduction}% reduction)`);
            
            if (compressedSize > 2 * 1024 * 1024) {
                toast({ 
                    title: 'File masih terlalu besar', 
                    description: `Setelah dikompres ukuran masih ${formatFileSize(compressedSize)}. Gunakan gambar yang lebih kecil.`, 
                    variant: 'destructive' 
                });
                return;
            }

            setImageFile(compressedFile);
            setImagePreview(URL.createObjectURL(compressedFile));
            
            if (originalSize > 500 * 1024) { // Only show toast if original was > 500KB
                toast({ 
                    title: 'Gambar dikompres', 
                    description: `Ukuran dikurangi ${reduction}% (${formatFileSize(compressedSize)})`,
                });
            }
        } catch (error) {
            console.error('Compression failed:', error);
            // Fallback to original file if compression fails but it's under limit
            if (file.size > 2 * 1024 * 1024) {
                toast({ title: 'File terlalu besar', description: 'Maksimal 2MB', variant: 'destructive' });
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const resetForm = () => {
        setName('');
        setBarcode('');
        setPrice(0);
        setStockGudang(0);
        setStockToko(0);
        setImageUrl('');
        setImageFile(null);
        setImagePreview(null);
        setSellUnit('pcs');
        setSellByQuantity(false);
        setHasMultiUnit(false);
        setMainUnit('box');
        setPcsPerBox(null);
        setBoxPrice(null);
        setMainStockGudang(0);
        setSubStockGudang(0);
        setMainStockToko(0);
        setSubStockToko(0);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast({ title: 'Nama produk wajib diisi', variant: 'destructive' });
            return;
        }

        // Validate multi-unit
        if (hasMultiUnit) {
            if (!mainUnit) {
                toast({ title: 'Unit besar wajib dipilih', variant: 'destructive' });
                return;
            }
            if (mainUnit === sellUnit) {
                toast({ title: 'Unit besar harus berbeda dengan sub-unit', variant: 'destructive' });
                return;
            }
            if (!pcsPerBox || pcsPerBox <= 0) {
                toast({ title: `Isi per ${mainUnitLabel} harus diisi`, variant: 'destructive' });
                return;
            }
        }

        // Generate temp barcode if empty
        const finalBarcode = barcode.trim() || `TEMP-${Date.now()}`;

        // Check duplicate barcode (only if not temp)
        if (!finalBarcode.startsWith('TEMP-')) {
            const existing = getProductByBarcode(finalBarcode);
            if (existing) {
                toast({ title: 'Barcode sudah digunakan', description: `Produk: ${existing.name}`, variant: 'destructive' });
                return;
            }
        }

        setSaving(true);

        let uploadedImageUrl = imageUrl || undefined;

        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const filePath = `products/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, imageFile);

            if (!uploadError) {
                const { data: urlData } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(filePath);
                uploadedImageUrl = urlData.publicUrl;
            }
        }

        const finalBoxPrice = hasMultiUnit ? (boxPrice ?? computedBoxPrice) : null;

        const success = await onAdd({
            name: name.trim(),
            barcode: finalBarcode,
            price,
            stock: { gudang: stockGudang, toko: stockToko },
            image_url: uploadedImageUrl,
            sell_unit: sellUnit,
            sell_by_quantity: sellByQuantity,
            has_multi_unit: hasMultiUnit,
            main_unit: hasMultiUnit ? mainUnit : null,
            pcs_per_box: hasMultiUnit ? pcsPerBox : null,
            box_price: hasMultiUnit ? finalBoxPrice : null,
        });

        setSaving(false);

        if (success) {
            resetForm();
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
                <Button className="rounded-xl text-xs sm:text-sm">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Tambah Produk</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Tambah Produk Baru
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-5 mt-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label>Nama Produk *</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nama produk"
                        />
                    </div>

                    {/* Barcode */}
                    <div className="space-y-2">
                        <Label>Barcode</Label>
                        <Input
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                            placeholder="Scan atau ketik barcode (kosongkan untuk auto)"
                        />
                        <p className="text-xs text-muted-foreground">Kosongkan jika belum punya barcode</p>
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <Label>Harga Jual (Rp) per Sub-Unit</Label>
                        <Input isCurrency
                            type="number"
                            min={0}
                            value={price}
                            onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                        />
                        <p className="text-xs text-muted-foreground">Ini adalah harga jual per {subUnitLabel}</p>
                    </div>

                    {/* Sub Unit (sell_unit) */}
                    <div className="space-y-2">
                        <Label>Sub-Unit (Satuan Dasar)</Label>
                        <Select value={sellUnit} onValueChange={setSellUnit}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih satuan dasar" />
                            </SelectTrigger>
                            <SelectContent>
                                {SELL_UNITS.map(u => (
                                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Satuan terkecil produk ini (misal: PCS, KG, METER)</p>
                    </div>

                    {/* Sell by quantity toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
                        <div>
                            <p className="text-sm font-medium">Jual per {sellUnit.toUpperCase()} (desimal)</p>
                            <p className="text-xs text-muted-foreground">
                                Customer bisa beli pecahan (misal 0.5 {sellUnit})
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSellByQuantity(!sellByQuantity)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${sellByQuantity ? 'bg-primary' : 'bg-muted'}`}
                        >
                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${sellByQuantity ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Stock */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Package className="w-4 h-4 text-primary" />
                            <Label className="font-bold">Input Stock Awal</Label>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Stock Gudang */}
                            <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stok Gudang</Label>
                                {hasMultiUnit ? (
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1 space-y-1">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={mainStockGudang || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setMainStockGudang(val);
                                                    setStockGudang((val * (pcsPerBox || 1)) + subStockGudang);
                                                }}
                                                className="h-9 text-center font-bold"
                                                placeholder="0"
                                            />
                                            <p className="text-[10px] text-center text-muted-foreground uppercase">{mainUnitLabel}</p>
                                        </div>
                                        <Plus className="w-3 h-3 text-muted-foreground" />
                                        <div className="flex-1 space-y-1">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={subStockGudang || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setSubStockGudang(val);
                                                    setStockGudang((mainStockGudang * (pcsPerBox || 1)) + val);
                                                }}
                                                className="h-9 text-center"
                                                placeholder="0"
                                            />
                                            <p className="text-[10px] text-center text-muted-foreground uppercase">{subUnitLabel}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <Input
                                        type="number"
                                        min={0}
                                        value={stockGudang}
                                        onChange={(e) => setStockGudang(parseFloat(e.target.value) || 0)}
                                    />
                                )}
                            </div>

                            {/* Stock Toko */}
                            <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-muted-foreground/10">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stok Toko</Label>
                                {hasMultiUnit ? (
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1 space-y-1">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={mainStockToko || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setMainStockToko(val);
                                                    setStockToko((val * (pcsPerBox || 1)) + subStockToko);
                                                }}
                                                className="h-9 text-center font-bold"
                                                placeholder="0"
                                            />
                                            <p className="text-[10px] text-center text-muted-foreground uppercase">{mainUnitLabel}</p>
                                        </div>
                                        <Plus className="w-3 h-3 text-muted-foreground" />
                                        <div className="flex-1 space-y-1">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={subStockToko || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setSubStockToko(val);
                                                    setStockToko((mainStockToko * (pcsPerBox || 1)) + val);
                                                }}
                                                className="h-9 text-center"
                                                placeholder="0"
                                            />
                                            <p className="text-[10px] text-center text-muted-foreground uppercase">{subUnitLabel}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <Input
                                        type="number"
                                        min={0}
                                        value={stockToko}
                                        onChange={(e) => setStockToko(parseFloat(e.target.value) || 0)}
                                    />
                                )}
                            </div>
                        </div>
                        
                        {hasMultiUnit && (
                            <div className="p-2 px-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900 flex justify-between items-center text-xs">
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium italic">Total Konversi:</span>
                                <div className="flex gap-4">
                                    <span>Gudang: <strong>{stockGudang} {subUnitLabel}</strong></span>
                                    <span>Toko: <strong>{stockToko} {subUnitLabel}</strong></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── MULTI-UNIT SECTION ── */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-blue-600" />
                                <div>
                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Multi-Unit</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                        Aktifkan jika produk bisa dijual di 2 satuan berbeda
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setHasMultiUnit(!hasMultiUnit)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${hasMultiUnit ? 'bg-blue-600' : 'bg-muted'}`}
                            >
                                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${hasMultiUnit ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {hasMultiUnit && (
                            <div className="p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 space-y-4">
                                {/* Flow diagram */}
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="px-2 py-1 bg-blue-600 text-white rounded-md font-medium text-xs">
                                        {mainUnitLabel || 'Unit Besar'}
                                    </span>
                                    <span className="text-muted-foreground">→ berisi</span>
                                    <span className="px-2 py-1 bg-emerald-600 text-white rounded-md font-medium text-xs">
                                        {pcsPerBox ?? '?'} {subUnitLabel}
                                    </span>
                                    {boxPrice || computedBoxPrice ? (
                                        <>
                                            <span className="text-muted-foreground">→ Rp</span>
                                            <span className="font-semibold text-blue-700 dark:text-blue-300 text-xs">
                                                {(boxPrice ?? computedBoxPrice ?? 0).toLocaleString('id-ID')}
                                            </span>
                                        </>
                                    ) : null}
                                </div>

                                {/* Main unit selector */}
                                <div className="space-y-2">
                                    <Label className="text-blue-900 dark:text-blue-100">Unit Besar (Kemasan)</Label>
                                    <Select value={mainUnit} onValueChange={setMainUnit}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih unit besar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SELL_UNITS.filter(u => u.value !== sellUnit).map(u => (
                                                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Misal: jika sub-unit = KG, unit besar bisa SAK / KRG / PACK
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Qty per main unit */}
                                    <div className="space-y-2">
                                        <Label className="text-blue-900 dark:text-blue-100">
                                            Isi per {mainUnitLabel} ({subUnitLabel})
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="any"
                                            value={pcsPerBox ?? ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setPcsPerBox(val === '' ? null : parseFloat(val));
                                            }}
                                            placeholder={`Jumlah ${subUnitLabel}`}
                                        />
                                    </div>

                                    {/* Price per main unit */}
                                    <div className="space-y-2">
                                        <Label className="text-blue-900 dark:text-blue-100">
                                            Harga per {mainUnitLabel} (Rp)
                                        </Label>
                                        <Input isCurrency
                                            type="number"
                                            min={0}
                                            value={boxPrice ?? ''}
                                            onChange={(e) => setBoxPrice(parseInt(e.target.value) || null)}
                                            placeholder={computedBoxPrice ? `Auto: ${computedBoxPrice.toLocaleString('id-ID')}` : 'Opsional'}
                                        />
                                    </div>
                                </div>

                                {/* Auto-price hint */}
                                {computedBoxPrice && !boxPrice && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                        💡 Harga per {mainUnitLabel} akan otomatis = {price.toLocaleString('id-ID')} × {pcsPerBox} = <strong>Rp {computedBoxPrice.toLocaleString('id-ID')}</strong>
                                    </p>
                                )}

                                {/* Example */}
                                {pcsPerBox && (
                                    <div className="p-2 bg-white dark:bg-background/50 rounded-lg text-xs text-muted-foreground border">
                                        <strong>Contoh:</strong> Beli 1 {mainUnitLabel} → kurangi stok {pcsPerBox} {subUnitLabel}  •  
                                        Harga 1 {mainUnitLabel} = Rp {(boxPrice ?? computedBoxPrice ?? 0).toLocaleString('id-ID')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <Label>Foto Produk</Label>
                        <div className="flex items-center gap-3">
                            {imagePreview ? (
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                                        className="absolute top-1 right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                >
                                    <Upload className="w-5 h-5" />
                                    <span className="text-[10px] mt-1">Upload</span>
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                            <div className="flex-1">
                                <Input
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="Atau masukkan URL gambar"
                                    className="text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                            Batal
                        </Button>
                        <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
                            {saving ? 'Menyimpan...' : 'Simpan Produk'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
