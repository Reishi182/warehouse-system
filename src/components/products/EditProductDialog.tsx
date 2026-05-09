import { useState, useEffect, useRef } from 'react';
import { Pencil, Package, X, Upload, Layers, Plus, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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

import { useProductUnits, unitsToSelectOptions } from '@/hooks/useProductUnits';

interface EditProductDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (id: string, updates: Partial<Product>) => Promise<boolean>;
    products: Product[];
    userRole: UserRole;
}

export default function EditProductDialog({
    product,
    open,
    onOpenChange,
    onUpdate,
    products,
    userRole,
}: EditProductDialogProps) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    const { data: unitsData } = useProductUnits();
    const SELL_UNITS = unitsToSelectOptions(unitsData || []);

    // Form state
    const [name, setName] = useState('');
    const [barcode, setBarcode] = useState('');
    const [price, setPrice] = useState(0);
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Unit fields
    const [sellUnit, setSellUnit] = useState('pcs');
    const [sellByQuantity, setSellByQuantity] = useState(false);

    // Multi-unit fields (flexible)
    const [hasMultiUnit, setHasMultiUnit] = useState(false);
    const [mainUnit, setMainUnit] = useState('box');
    const [pcsPerBox, setPcsPerBox] = useState<number | null>(null);
    const [boxPrice, setBoxPrice] = useState<number | null>(null);

    const [bulkQuantity, setBulkQuantity] = useState<number | null>(null);
    const [bulkPrice, setBulkPrice] = useState<number | null>(null);

    // Stock fields
    const [stockGudang, setStockGudang] = useState(0);
    const [stockToko, setStockToko] = useState(0);

    // Visual Stock Helpers for Multi-Unit
    const [mainStockGudang, setMainStockGudang] = useState(0);
    const [subStockGudang, setSubStockGudang] = useState(0);
    const [mainStockToko, setMainStockToko] = useState(0);
    const [subStockToko, setSubStockToko] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const mainUnitLabel = SELL_UNITS.find(u => u.value === mainUnit)?.label ?? (mainUnit || '').toUpperCase();
    const subUnitLabel = SELL_UNITS.find(u => u.value === sellUnit)?.label ?? (sellUnit || '').toUpperCase();
    const computedBoxPrice = pcsPerBox && price ? price * pcsPerBox : null;

    // Populate form when product changes
    useEffect(() => {
        if (product) {
            setName(product.name);
            setBarcode(product.barcode);
            setPrice(product.price);
            setImageUrl(product.image_url || '');
            setImageFile(null);
            setImagePreview(product.image_url || null);
            setSellUnit(product.sell_unit || 'pcs');
            setSellByQuantity(product.sell_by_quantity || false);
            setHasMultiUnit(product.has_multi_unit || false);
            setMainUnit(product.main_unit || 'box');
            setPcsPerBox(product.pcs_per_box ?? null);
            setBoxPrice(product.box_price ?? null);
            setBulkQuantity(product.bulk_quantity ?? null);
            setBulkPrice(product.bulk_price ?? null);
            setStockGudang(product.stock.gudang);
            setStockToko(product.stock.toko);

            // Calculate breakdowns for multi-unit
            if (product.has_multi_unit && product.pcs_per_box) {
                setMainStockGudang(Math.floor(product.stock.gudang / product.pcs_per_box));
                setSubStockGudang(product.stock.gudang % product.pcs_per_box);
                setMainStockToko(Math.floor(product.stock.toko / product.pcs_per_box));
                setSubStockToko(product.stock.toko % product.pcs_per_box);
            } else {
                setMainStockGudang(0);
                setSubStockGudang(0);
                setMainStockToko(0);
                setSubStockToko(0);
            }
        }
    }, [product]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const { compressImageToFile, formatFileSize } = await import('@/lib/imageCompression');
            
            const originalSize = file.size;
            const compressedFile = await compressImageToFile(file, {
                maxWidth: 800,
                maxHeight: 800,
                quality: 0.7,
                format: 'image/webp'
            });
            
            const compressedSize = compressedFile.size;
            const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(0);
            
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
            
            if (originalSize > 500 * 1024) {
                toast({ 
                    title: 'Gambar dikompres', 
                    description: `Ukuran dikurangi ${reduction}% (${formatFileSize(compressedSize)})`,
                });
            }
        } catch (error) {
            console.error('Compression failed:', error);
            if (file.size > 2 * 1024 * 1024) {
                toast({ title: 'File terlalu besar', description: 'Maksimal 2MB', variant: 'destructive' });
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        if (!product) return;
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

        // Check duplicate barcode (excluding current product)
        const finalBarcode = barcode.trim() || product.barcode;
        if (!finalBarcode.startsWith('TEMP-')) {
            const duplicate = products.find(p => p.id !== product.id && p.barcode === finalBarcode);
            if (duplicate) {
                toast({ title: 'Barcode sudah digunakan', description: `Produk: ${duplicate.name}`, variant: 'destructive' });
                return;
            }
        }

        setSaving(true);

        let uploadedImageUrl: string | null = imageUrl || null;

        // Upload new image if selected
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

        const updates: Partial<Product> = {
            name: name.trim(),
            barcode: finalBarcode,
            price,
            image_url: uploadedImageUrl || null,
            sell_unit: sellUnit,
            sell_by_quantity: sellByQuantity,
            has_multi_unit: hasMultiUnit,
            main_unit: hasMultiUnit ? mainUnit : null,
            pcs_per_box: hasMultiUnit ? pcsPerBox : null,
            box_price: hasMultiUnit ? finalBoxPrice : null,
            bulk_quantity: bulkQuantity,
            bulk_price: bulkPrice,
            stock: { gudang: stockGudang, toko: stockToko }
        };

        const success = await onUpdate(product.id, updates);

        setSaving(false);

        if (success) {
            onOpenChange(false);
            toast({ title: 'Berhasil', description: `Produk ${name.trim()} berhasil diperbarui` });
        }
        // If !success, updateProduct already showed an error toast — keep dialog open
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="w-5 h-5" />
                        Edit Produk
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
                            placeholder="Barcode produk"
                        />
                        {barcode.startsWith('TEMP-') && (
                            <p className="text-xs text-amber-600">⚠️ Barcode ini bersifat sementara</p>
                        )}
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <Label>Harga Jual (Rp) per Sub-Unit</Label>
                        <Input isCurrency
                            type="number"
                            min={0}
                            value={price}
                            onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                            disabled={userRole === 'warehouse'}
                            className={userRole === 'warehouse' ? 'opacity-50 cursor-not-allowed' : ''}
                        />
                        {userRole === 'warehouse' ? (
                            <p className="text-xs text-amber-600">⚠️ Role Gudang tidak dapat mengubah harga</p>
                        ) : (
                            <p className="text-xs text-muted-foreground">Harga jual per {subUnitLabel}</p>
                        )}
                    </div>

                    {/* Sub Unit */}
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
                    </div>

                    {/* Stock Adjustment */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Package className="w-4 h-4 text-primary" />
                            <Label className="font-bold">Penyesuaian Stok</Label>
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
                            <div className="p-2 px-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900 flex justify-between items-center text-xs">
                                <span className="text-blue-600 dark:text-blue-400 font-medium italic">Total Konversi:</span>
                                <div className="flex gap-4">
                                    <span>Gudang: <strong>{stockGudang} {subUnitLabel}</strong></span>
                                    <span>Toko: <strong>{stockToko} {subUnitLabel}</strong></span>
                                </div>
                            </div>
                        )}
                        <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900">
                            <strong>⚠️ Perhatian:</strong> Mengubah stok di sini akan langsung memperbarui saldo stok. Gunakan dengan bijak untuk koreksi data.
                        </p>
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
                                            disabled={userRole === 'warehouse'}
                                            className={userRole === 'warehouse' ? 'opacity-50 cursor-not-allowed' : ''}
                                        />
                                    </div>
                                </div>

                                {computedBoxPrice && !boxPrice && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                        💡 Harga per {mainUnitLabel} akan otomatis = {price.toLocaleString('id-ID')} × {pcsPerBox} = <strong>Rp {computedBoxPrice.toLocaleString('id-ID')}</strong>
                                    </p>
                                )}

                                {pcsPerBox && (
                                    <div className="p-2 bg-white dark:bg-background/50 rounded-lg text-xs text-muted-foreground border">
                                        <strong>Contoh:</strong> Beli 1 {mainUnitLabel} → kurangi stok {pcsPerBox} {subUnitLabel}  •  
                                        Harga 1 {mainUnitLabel} = Rp {(boxPrice ?? computedBoxPrice ?? 0).toLocaleString('id-ID')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bulk Pricing */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Layers className="w-4 h-4 text-orange-500" />
                            <Label className="font-bold">Harga Grosir (Bulk Purchase)</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 border-2">
                            <div className="space-y-2">
                                <Label className="text-orange-900 dark:text-orange-100">Minimal Pembelian</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={bulkQuantity ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setBulkQuantity(val === '' ? null : parseInt(val));
                                    }}
                                    placeholder="Contoh: 5"
                                />
                                <p className="text-xs text-muted-foreground text-orange-700/70 dark:text-orange-300/70">Dalam satuan {subUnitLabel}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-orange-900 dark:text-orange-100">Total Harga (Rp)</Label>
                                <Input isCurrency
                                    type="number"
                                    min={0}
                                    value={bulkPrice ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setBulkPrice(val === '' ? null : parseInt(val));
                                    }}
                                    placeholder="Total: 10000"
                                    disabled={userRole === 'warehouse'}
                                    className={userRole === 'warehouse' ? 'opacity-50 cursor-not-allowed' : ''}
                                />
                            </div>
                            {bulkQuantity && bulkPrice ? (
                                <div className="col-span-2 p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg text-xs text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800/60">
                                    💡 <strong>Otomatis:</strong> Jika beli <strong>{bulkQuantity} {subUnitLabel}</strong> atau lebih, harga per {subUnitLabel} menjadi <strong>Rp {(bulkPrice / bulkQuantity).toLocaleString('id-ID')}</strong>.
                                </div>
                            ) : null}
                        </div>
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
                                        onClick={() => { setImageFile(null); setImagePreview(null); setImageUrl(''); }}
                                        className="absolute top-1 right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                    >
                                        <Upload className="w-5 h-5" />
                                        <span className="text-[10px] mt-1">Galeri</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => cameraInputRef.current?.click()}
                                        className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                    >
                                        <Camera className="w-5 h-5" />
                                        <span className="text-[10px] mt-1">Kamera</span>
                                    </button>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                            <div className="flex-1">
                                <Input
                                    value={imageUrl}
                                    onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value || null); }}
                                    placeholder="Atau masukkan URL gambar"
                                    className="text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
                            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
