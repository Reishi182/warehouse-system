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
import { useToast } from '@/hooks/use-toast';
import { Product, UserRole } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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
    });
    const [stockForm, setStockForm] = useState({
        gudang: 0,
        toko: 0,
        lainnya: 0,
    });
    const [editProductImageFile, setEditProductImageFile] = useState<File | null>(null);
    const [editProductImagePreviewUrl, setEditProductImagePreviewUrl] = useState<string | null>(null);

    const canEditStock = userRole === 'admin' || userRole === 'auditor'; // Only auditor and admin can edit stock

    useEffect(() => {
        if (product) {
            setEditForm({
                name: product.name,
                barcode: product.barcode,
                price: product.price,
            });
            setStockForm({
                gudang: product.stock.gudang,
                toko: product.stock.toko,
                lainnya: product.stock.lainnya,
            });
        }
    }, [product]);

    const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({ title: 'File tidak valid', description: 'Pilih file gambar (jpg/png/webp)', variant: 'destructive' });
            return;
        }

        const maxBytes = 5 * 1024 * 1024;
        if (file.size > maxBytes) {
            toast({ title: 'Ukuran terlalu besar', description: 'Maksimal ukuran foto 5MB', variant: 'destructive' });
            return;
        }

        if (editProductImagePreviewUrl) {
            URL.revokeObjectURL(editProductImagePreviewUrl);
        }

        setEditProductImageFile(file);
        setEditProductImagePreviewUrl(URL.createObjectURL(file));
    };

    const handleUpdateProduct = async () => {
        if (!product) return;

        if (!editForm.name.trim() || !editForm.barcode.trim()) {
            toast({ title: 'Data tidak lengkap', description: 'Nama dan barcode wajib diisi', variant: 'destructive' });
            return;
        }

        const exists = products.find(p => p.barcode === editForm.barcode.trim() && p.id !== product.id);
        if (exists) {
            toast({ title: 'Barcode sudah ada', description: 'Barcode ini sudah digunakan produk lain', variant: 'destructive' });
            return;
        }

        let imageUrl: string | undefined = undefined;
        if (editProductImageFile) {
            const originalName = editProductImageFile.name;
            const ext = originalName.includes('.') ? originalName.split('.').pop() : 'jpg';
            const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const fileName = `${editForm.barcode.trim()}-${uniqueId}.${ext}`;
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
            barcode: editForm.barcode.trim(),
            price: editForm.price,
            image_url: imageUrl === undefined ? product.image_url : imageUrl,
        };

        // Add stock updates if user can edit stock
        if (canEditStock) {
            updates.stock = {
                gudang: stockForm.gudang,
                toko: stockForm.toko,
                lainnya: stockForm.lainnya,
            };
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
                    <div className="space-y-2">
                        <Label>Nama Produk</Label>
                        <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Barcode</Label>
                        <Input
                            value={editForm.barcode}
                            onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Harga</Label>
                        <Input
                            type="number"
                            min={0}
                            value={editForm.price}
                            onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                            className="rounded-xl"
                        />
                    </div>

                    {/* Stock Fields - Only for warehouse/admin */}
                    {canEditStock && (
                        <div className="space-y-3 p-4 rounded-xl bg-muted/50 border">
                            <Label className="text-sm font-semibold">Stok</Label>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Gudang</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={stockForm.gudang}
                                        onChange={(e) => setStockForm({ ...stockForm, gudang: parseInt(e.target.value) || 0 })}
                                        className="rounded-lg h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Toko</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={stockForm.toko}
                                        onChange={(e) => setStockForm({ ...stockForm, toko: parseInt(e.target.value) || 0 })}
                                        className="rounded-lg h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Lainnya</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={stockForm.lainnya}
                                        onChange={(e) => setStockForm({ ...stockForm, lainnya: parseInt(e.target.value) || 0 })}
                                        className="rounded-lg h-9"
                                    />
                                </div>
                            </div>
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
