
import { useState, type ChangeEvent } from 'react';
import { Plus } from 'lucide-react';
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
import { Location, Product, UserRole } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface AddProductDialogProps {
    onAdd: (product: {
        name: string;
        barcode: string;
        price: number;
        stock: { gudang: number; toko: number; lainnya: number };
        image_url?: string;
    }) => Promise<boolean>;
    getProductByBarcode: (barcode: string) => Product | undefined;
    userRole?: UserRole;
}

export default function AddProductDialog({ onAdd, getProductByBarcode, userRole }: AddProductDialogProps) {
    const { toast } = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [productImageFile, setProductImageFile] = useState<File | null>(null);
    const [productImagePreviewUrl, setProductImagePreviewUrl] = useState<string | null>(null);
    const [newProduct, setNewProduct] = useState({
        name: '',
        barcode: '',
        price: 0,
        quantity: 0,
        location: 'gudang' as Location,
    });

    // Only auditor and admin can set initial stock
    const canSetStock = userRole === 'admin' || userRole === 'auditor';

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({
                title: 'File tidak valid',
                description: 'Pilih file gambar (jpg/png/webp)',
                variant: 'destructive',
            });
            return;
        }

        const maxBytes = 5 * 1024 * 1024;
        if (file.size > maxBytes) {
            toast({
                title: 'Ukuran terlalu besar',
                description: 'Maksimal ukuran foto 5MB',
                variant: 'destructive',
            });
            return;
        }

        if (productImagePreviewUrl) {
            URL.revokeObjectURL(productImagePreviewUrl);
        }

        setProductImageFile(file);
        setProductImagePreviewUrl(URL.createObjectURL(file));
    };

    const handleAddProduct = async () => {
        if (!newProduct.name || !newProduct.barcode) {
            toast({
                title: 'Data tidak lengkap',
                description: 'Nama dan barcode wajib diisi',
                variant: 'destructive',
            });
            return;
        }

        if (getProductByBarcode(newProduct.barcode)) {
            toast({
                title: 'Barcode sudah ada',
                description: 'Barcode ini sudah digunakan produk lain',
                variant: 'destructive',
            });
            return;
        }

        let imageUrl: string | undefined = undefined;
        if (productImageFile) {
            const originalName = productImageFile.name;
            const ext = originalName.includes('.') ? originalName.split('.').pop() : 'jpg';
            const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const fileName = `${newProduct.barcode}-${uniqueId}.${ext}`;
            const filePath = `products/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, productImageFile, { upsert: false, contentType: productImageFile.type });

            if (uploadError) {
                toast({ title: 'Gagal upload foto', description: uploadError.message, variant: 'destructive' });
                return;
            }

            const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(filePath);
            imageUrl = publicUrl.publicUrl;
        }

        const ok = await onAdd({
            name: newProduct.name,
            barcode: newProduct.barcode,
            price: newProduct.price,
            stock: canSetStock ? {
                gudang: newProduct.location === 'gudang' ? newProduct.quantity : 0,
                toko: newProduct.location === 'toko' ? newProduct.quantity : 0,
                lainnya: newProduct.location === 'lainnya' ? newProduct.quantity : 0,
            } : { gudang: 0, toko: 0, lainnya: 0 }, // Kasir/Gudang cannot set initial stock
            image_url: imageUrl,
        });

        if (!ok) return;

        toast({
            title: 'Produk ditambahkan',
            description: `${newProduct.name} berhasil ditambahkan`,
        });

        setNewProduct({ name: '', barcode: '', price: 0, quantity: 0, location: 'gudang' });
        setProductImageFile(null);
        if (productImagePreviewUrl) {
            URL.revokeObjectURL(productImagePreviewUrl);
        }
        setProductImagePreviewUrl(null);
        setDialogOpen(false);
    };

    const handleOpenChange = (open: boolean) => {
        setDialogOpen(open);
        if (!open) {
            setProductImageFile(null);
            if (productImagePreviewUrl) {
                URL.revokeObjectURL(productImagePreviewUrl);
            }
            setProductImagePreviewUrl(null);
        }
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Produk
                </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
                <DialogHeader>
                    <DialogTitle>Tambah Produk Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Nama Produk</Label>
                        <Input
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                            placeholder="Masukkan nama produk"
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Barcode</Label>
                        <Input
                            value={newProduct.barcode}
                            onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                            placeholder="Masukkan atau scan barcode"
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Harga</Label>
                        <Input
                            type="number"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
                            min={0}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Foto Produk</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="rounded-xl"
                        />
                        {productImagePreviewUrl && (
                            <div className="rounded-lg border overflow-hidden bg-muted/30">
                                <img
                                    src={productImagePreviewUrl}
                                    alt="Preview"
                                    className="w-full h-40 object-cover"
                                />
                            </div>
                        )}
                    </div>
                    {canSetStock && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Jumlah Awal</Label>
                                <Input
                                    type="number"
                                    value={newProduct.quantity}
                                    onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 0 })}
                                    min={0}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lokasi</Label>
                                <Select
                                    value={newProduct.location}
                                    onValueChange={(value: Location) => setNewProduct({ ...newProduct, location: value })}
                                >
                                    <SelectTrigger className="rounded-xl h-10 border-gray-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="gudang" className="cursor-pointer rounded-lg my-1">Gudang</SelectItem>
                                        <SelectItem value="toko" className="cursor-pointer rounded-lg my-1">Toko</SelectItem>
                                        <SelectItem value="lainnya" className="cursor-pointer rounded-lg my-1">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    {!canSetStock && (
                        <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-xl">
                            💡 Stok awal akan diatur ke 0. Minta Auditor untuk menyesuaikan stok.
                        </p>
                    )}
                    <Button onClick={handleAddProduct} className="w-full rounded-xl">
                        Simpan Produk
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
