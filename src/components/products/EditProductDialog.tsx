import { useState, useEffect, type ChangeEvent } from 'react';
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
import { Product, UserRole } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { compressImageToFile, formatFileSize } from '@/lib/imageCompression';
import { cn } from '@/lib/utils';

// Helper function to sanitize barcode for file naming (remove invalid characters)
const sanitizeForFileName = (str: string): string => {
    return str.replace(/[^a-zA-Z0-9-_]/g, '_');
};

interface EditProductDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (id: string, updates: Partial<Product>) => Promise<void>;
    products: Product[];
    userRole?: UserRole;
}

export default function EditProductDialog({
    product,
    open,
    onOpenChange,
    onUpdate,
    products,
    userRole
}: EditProductDialogProps) {
    const { toast } = useToast();
    const [editForm, setEditForm] = useState({
        name: '',
        barcode: '',
        price: 0,
        has_multi_unit: false,
        pcs_per_box: 0,
        box_price: 0,
        sell_by_quantity: false,
        sell_unit: 'pcs',
    });
    const [stockForm, setStockForm] = useState({
        gudang: 0,
        toko: 0,
        gudangBox: 0,
        gudangPcs: 0,
        tokoBox: 0,
        tokoPcs: 0,
    });
    const [editProductImageFile, setEditProductImageFile] = useState<File | null>(null);
    const [editProductImagePreviewUrl, setEditProductImagePreviewUrl] = useState<string | null>(null);

    const canEditStock = userRole === 'admin' || userRole === 'auditor' || userRole === 'cashier' || userRole === 'warehouse' || userRole === 'main_office';
    const canEditAllLocations = userRole === 'admin' || userRole === 'auditor' || userRole === 'main_office';
    const canEditGudang = canEditAllLocations || userRole === 'warehouse';
    const canEditToko = canEditAllLocations || userRole === 'cashier';

    useEffect(() => {
        if (product) {
            setEditForm({
                name: product.name,
                barcode: product.barcode.startsWith('TEMP-') ? '' : product.barcode,
                price: product.price,
                has_multi_unit: product.has_multi_unit || false,
                pcs_per_box: product.pcs_per_box || 0,
                box_price: product.box_price || 0,
                sell_by_quantity: product.sell_by_quantity || false,
                sell_unit: product.sell_unit || 'pcs',
            });
            const pcsPerBox = product.pcs_per_box || 0;
            const isMulti = product.has_multi_unit && pcsPerBox > 0;
            setStockForm({
                gudang: product.stock.gudang,
                toko: product.stock.toko,
                gudangBox: isMulti ? Math.floor(product.stock.gudang / pcsPerBox) : 0,
                gudangPcs: isMulti ? product.stock.gudang % pcsPerBox : product.stock.gudang,
                tokoBox: isMulti ? Math.floor(product.stock.toko / pcsPerBox) : 0,
                tokoPcs: isMulti ? product.stock.toko % pcsPerBox : product.stock.toko,
            });
        }
    }, [product]);

    // Recalculate box/pcs breakdown when pcs_per_box changes during editing
    useEffect(() => {
        if (!editForm.has_multi_unit) return;
        const ppb = editForm.pcs_per_box;
        if (ppb > 0) {
            setStockForm(prev => ({
                ...prev,
                gudangBox: Math.floor(prev.gudang / ppb),
                gudangPcs: prev.gudang % ppb,
                tokoBox: Math.floor(prev.toko / ppb),
                tokoPcs: prev.toko % ppb,
            }));
        } else {
            // No pcs_per_box: put everything in pcs
            setStockForm(prev => ({
                ...prev,
                gudangBox: 0,
                gudangPcs: prev.gudang,
                tokoBox: 0,
                tokoPcs: prev.toko,
            }));
        }
    }, [editForm.pcs_per_box, editForm.has_multi_unit]);

    const handleEditImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({ title: 'File tidak valid', description: 'Pilih file gambar (jpg/png/webp)', variant: 'destructive' });
            return;
        }

        const maxBytes = 10 * 1024 * 1024; // Allow up to 10MB input, we'll compress it
        if (file.size > maxBytes) {
            toast({ title: 'Ukuran terlalu besar', description: 'Maksimal ukuran foto 10MB', variant: 'destructive' });
            return;
        }

        try {
            // Auto-compress image
            const compressedFile = await compressImageToFile(file, {
                maxWidth: 800,
                maxHeight: 800,
                quality: 0.8,
                format: 'image/webp',
            });

            if (editProductImagePreviewUrl) {
                URL.revokeObjectURL(editProductImagePreviewUrl);
            }

            setEditProductImageFile(compressedFile);
            setEditProductImagePreviewUrl(URL.createObjectURL(compressedFile));

            // Show compression info
            if (file.size !== compressedFile.size) {
                toast({
                    title: 'Gambar dikompres',
                    description: `${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)}`,
                });
            }
        } catch (error) {
            console.error('Compression failed:', error);
            // Fallback to original file
            if (editProductImagePreviewUrl) {
                URL.revokeObjectURL(editProductImagePreviewUrl);
            }
            setEditProductImageFile(file);
            setEditProductImagePreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUpdateProduct = async () => {
        if (!product) return;

        if (!editForm.name.trim()) {
            toast({ title: 'Data tidak lengkap', description: 'Nama produk wajib diisi', variant: 'destructive' });
            return;
        }

        // If barcode field is empty and original was temp, keep the temp barcode
        const finalBarcode = editForm.barcode.trim() || product.barcode;

        // Check for duplicate barcode (only for real barcodes, skip if keeping same temp barcode)
        if (!finalBarcode.startsWith('TEMP-') || finalBarcode !== product.barcode) {
            const exists = products.find(p => p.barcode === finalBarcode && p.id !== product.id);
            if (exists) {
                toast({ title: 'Barcode sudah ada', description: 'Barcode ini sudah digunakan produk lain', variant: 'destructive' });
                return;
            }
        }

        let imageUrl: string | undefined = undefined;
        if (editProductImageFile) {
            const originalName = editProductImageFile.name;
            const ext = originalName.includes('.') ? originalName.split('.').pop() : 'jpg';
            const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const fileName = `${sanitizeForFileName(finalBarcode)}-${uniqueId}.${ext}`;
            const filePath = `products/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, editProductImageFile, { upsert: false, contentType: editProductImageFile.type });

            if (uploadError) {
                toast({ title: 'Gagal upload foto', description: uploadError.message, variant: 'destructive' });
                return;
            }

            const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(filePath);
            imageUrl = publicUrl.publicUrl;
        }

        const updates: Partial<Product> = {
            name: editForm.name.trim(),
            barcode: finalBarcode,
            price: editForm.price,
            image_url: imageUrl === undefined ? product.image_url : imageUrl,
            sell_by_quantity: editForm.sell_by_quantity,
            sell_unit: editForm.sell_by_quantity ? editForm.sell_unit : 'pcs',
            has_multi_unit: editForm.has_multi_unit,
            pcs_per_box: editForm.has_multi_unit && editForm.pcs_per_box > 0 ? editForm.pcs_per_box : null,
            box_price: editForm.has_multi_unit && editForm.box_price > 0 ? editForm.box_price : null,
        };

        // Add stock updates if user can edit stock
        if (canEditStock) {
            if (canEditAllLocations) {
                // Admin/auditor can edit both locations
                updates.stock = {
                    gudang: stockForm.gudang,
                    toko: stockForm.toko,
                };
            } else if (canEditGudang) {
                // Warehouse can only edit gudang
                updates.stock = {
                    gudang: stockForm.gudang,
                    toko: product.stock.toko, // Keep original toko value
                };
            } else if (canEditToko) {
                // Cashier can only edit toko
                updates.stock = {
                    gudang: product.stock.gudang, // Keep original gudang value
                    toko: stockForm.toko,
                };
            }
        }

        await onUpdate(product.id, updates);

        toast({ title: 'Produk diperbarui', description: `${editForm.name} berhasil diperbarui` });
        onOpenChange(false);
    };

    const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
        if (!open) {
            setEditProductImageFile(null);
            if (editProductImagePreviewUrl) {
                URL.revokeObjectURL(editProductImagePreviewUrl);
            }
            setEditProductImagePreviewUrl(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Produk</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    {/* Temp barcode reminder */}
                    {product?.barcode.startsWith('TEMP-') && (
                        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl border border-yellow-200 dark:border-yellow-800">
                            <span className="text-lg">⚠️</span>
                            <div>
                                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Barcode belum diisi!</p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                                    Produk ini belum memiliki barcode. Silakan masukkan barcode di bawah jika sudah tersedia.
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>Nama Produk</Label>
                        <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{product?.barcode.startsWith('TEMP-') ? '🔴 Barcode (wajib diisi!)' : 'Barcode'}</Label>
                        <Input
                            value={editForm.barcode}
                            onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                            className={cn("rounded-xl", product?.barcode.startsWith('TEMP-') && "border-yellow-400 focus:border-yellow-500 ring-yellow-400")}
                            placeholder={product?.barcode.startsWith('TEMP-') ? 'Masukkan barcode produk...' : undefined}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{editForm.sell_by_quantity ? `Harga per ${editForm.sell_unit}` : 'Harga'}</Label>
                        <Input
                            type="number"
                            min={0}
                            value={editForm.price}
                            onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                            className="rounded-xl"
                        />
                    </div>

                    {/* Variable unit toggle */}
                    <div className="space-y-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="edit-sell-by-quantity"
                                checked={editForm.sell_by_quantity}
                                onChange={(e) => setEditForm({ ...editForm, sell_by_quantity: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300"
                            />
                            <Label htmlFor="edit-sell-by-quantity" className="cursor-pointer text-amber-800 dark:text-amber-200">
                                📏 Jual per Satuan (meter/kg/gram)
                            </Label>
                        </div>
                        {editForm.sell_by_quantity && (
                            <div className="space-y-2 pl-7">
                                <Label className="text-sm">Satuan</Label>
                                <Select
                                    value={editForm.sell_unit}
                                    onValueChange={(value) => setEditForm({ ...editForm, sell_unit: value })}
                                >
                                    <SelectTrigger className="rounded-xl h-10 border-amber-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="meter" className="cursor-pointer rounded-lg my-1">Meter</SelectItem>
                                        <SelectItem value="cm" className="cursor-pointer rounded-lg my-1">Centimeter</SelectItem>
                                        <SelectItem value="kg" className="cursor-pointer rounded-lg my-1">Kilogram</SelectItem>
                                        <SelectItem value="gram" className="cursor-pointer rounded-lg my-1">Gram</SelectItem>
                                        <SelectItem value="ons" className="cursor-pointer rounded-lg my-1">Ons</SelectItem>
                                        <SelectItem value="liter" className="cursor-pointer rounded-lg my-1">Liter</SelectItem>
                                        <SelectItem value="pcs" className="cursor-pointer rounded-lg my-1">Pcs</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    💡 Stok dan penjualan dalam {editForm.sell_unit}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Multi-unit toggle (Box + Pcs) */}
                    <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="edit-has-multi-unit"
                                checked={editForm.has_multi_unit}
                                onChange={(e) => setEditForm({ ...editForm, has_multi_unit: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300"
                            />
                            <Label htmlFor="edit-has-multi-unit" className="cursor-pointer text-blue-800 dark:text-blue-200">
                                📦 Jual per Box + Pcs (Multi-Unit)
                            </Label>
                        </div>
                        {editForm.has_multi_unit && (
                            <div className="space-y-3 pl-7">
                                <div className="space-y-1">
                                    <Label className="text-sm">Isi per Box (pcs)</Label>
                                    <Input
                                        type="number"
                                        value={editForm.pcs_per_box || ''}
                                        onChange={(e) => setEditForm({ ...editForm, pcs_per_box: parseInt(e.target.value) || 0 })}
                                        placeholder="Misal: 70"
                                        min={0}
                                        className="rounded-xl border-blue-200"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm">Harga per Box (Rp)</Label>
                                    <Input
                                        type="number"
                                        value={editForm.box_price || ''}
                                        onChange={(e) => setEditForm({ ...editForm, box_price: parseInt(e.target.value) || 0 })}
                                        placeholder="Misal: 50000"
                                        min={0}
                                        className="rounded-xl border-blue-200"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {canEditStock && (
                        <div className="space-y-3 p-4 rounded-xl bg-muted/50 border">
                            <Label className="text-sm font-semibold">Stok</Label>
                            {!canEditAllLocations && (
                                <p className="text-xs text-muted-foreground">
                                    💡 {userRole === 'cashier' ? 'Kasir hanya dapat mengedit stok toko' : 'Gudang hanya dapat mengedit stok gudang'}
                                </p>
                            )}
                            {editForm.has_multi_unit ? (
                                <div className="space-y-3">
                                    {editForm.pcs_per_box <= 0 && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
                                            ⚠️ Isi "Isi per Box" di atas untuk bisa input per box. Saat ini input sebagai total pcs saja.
                                        </p>
                                    )}
                                    {/* Gudang */}
                                    {canEditGudang && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Gudang</Label>
                                            {editForm.pcs_per_box > 0 ? (
                                                <>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <Label className="text-[10px] text-blue-600">📦 Box</Label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={stockForm.gudangBox || ''}
                                                                onChange={(e) => {
                                                                    const boxes = parseFloat(e.target.value) || 0;
                                                                    const total = boxes * editForm.pcs_per_box + stockForm.gudangPcs;
                                                                    setStockForm({ ...stockForm, gudangBox: boxes, gudang: total });
                                                                }}
                                                                placeholder="0"
                                                                className="rounded-lg h-9"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-[10px] text-blue-600">🔢 Pcs (lepasan)</Label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={stockForm.gudangPcs || ''}
                                                                onChange={(e) => {
                                                                    const pcs = parseFloat(e.target.value) || 0;
                                                                    const total = stockForm.gudangBox * editForm.pcs_per_box + pcs;
                                                                    setStockForm({ ...stockForm, gudangPcs: pcs, gudang: total });
                                                                }}
                                                                placeholder="0"
                                                                className="rounded-lg h-9"
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-blue-600 dark:text-blue-400">= {stockForm.gudang} pcs total</p>
                                                </>
                                            ) : (
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={stockForm.gudang || ''}
                                                    onChange={(e) => {
                                                        const total = parseFloat(e.target.value) || 0;
                                                        setStockForm({ ...stockForm, gudang: total, gudangPcs: total, gudangBox: 0 });
                                                    }}
                                                    placeholder="Total pcs"
                                                    className="rounded-lg h-9"
                                                />
                                            )}
                                        </div>
                                    )}
                                    {/* Toko */}
                                    {canEditToko && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Toko</Label>
                                            {editForm.pcs_per_box > 0 ? (
                                                <>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <Label className="text-[10px] text-blue-600">📦 Box</Label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={stockForm.tokoBox || ''}
                                                                onChange={(e) => {
                                                                    const boxes = parseFloat(e.target.value) || 0;
                                                                    const total = boxes * editForm.pcs_per_box + stockForm.tokoPcs;
                                                                    setStockForm({ ...stockForm, tokoBox: boxes, toko: total });
                                                                }}
                                                                placeholder="0"
                                                                className="rounded-lg h-9"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-[10px] text-blue-600">🔢 Pcs (lepasan)</Label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={stockForm.tokoPcs || ''}
                                                                onChange={(e) => {
                                                                    const pcs = parseFloat(e.target.value) || 0;
                                                                    const total = stockForm.tokoBox * editForm.pcs_per_box + pcs;
                                                                    setStockForm({ ...stockForm, tokoPcs: pcs, toko: total });
                                                                }}
                                                                placeholder="0"
                                                                className="rounded-lg h-9"
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-blue-600 dark:text-blue-400">= {stockForm.toko} pcs total</p>
                                                </>
                                            ) : (
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={stockForm.toko || ''}
                                                    onChange={(e) => {
                                                        const total = parseFloat(e.target.value) || 0;
                                                        setStockForm({ ...stockForm, toko: total, tokoPcs: total, tokoBox: 0 });
                                                    }}
                                                    placeholder="Total pcs"
                                                    className="rounded-lg h-9"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={canEditAllLocations ? "grid grid-cols-2 gap-3" : ""}>
                                    {canEditGudang && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Gudang</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={stockForm.gudang}
                                                onChange={(e) => setStockForm({ ...stockForm, gudang: parseFloat(e.target.value) || 0 })}
                                                className="rounded-lg h-9"
                                            />
                                        </div>
                                    )}
                                    {canEditToko && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Toko</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={stockForm.toko}
                                                onChange={(e) => setStockForm({ ...stockForm, toko: parseFloat(e.target.value) || 0 })}
                                                className="rounded-lg h-9"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Foto Produk (opsional)</Label>
                        <Input type="file" accept="image/*" onChange={handleEditImageChange} className="rounded-xl" />
                        {editProductImagePreviewUrl && (
                            <div className="rounded-xl border overflow-hidden bg-muted/30">
                                <img src={editProductImagePreviewUrl} alt="Preview" className="w-full h-40 object-cover" />
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                            Batal
                        </Button>
                        <Button onClick={handleUpdateProduct} className="rounded-xl">
                            Simpan
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
