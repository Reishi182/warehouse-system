import { useState, useRef } from 'react';
import { Plus, Package, ImagePlus, X, Upload } from 'lucide-react';
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
const SELL_UNITS = [
    { value: 'pcs', label: 'PCS' },
    { value: 'pail', label: 'PAIL' },
    { value: 'set', label: 'SET' },
    { value: 'meter', label: 'METER' },
    { value: 'bks', label: 'BKS (Bungkus)' },
    { value: 'btg', label: 'BTG (Batang)' },
    { value: 'roll', label: 'ROLL' },
    { value: 'kg', label: 'KG' },
    { value: 'pack', label: 'PACK' },
    { value: 'psg', label: 'PSG (Pasang)' },
    { value: 'gram', label: 'GRAM' },
    { value: 'sak', label: 'SAK' },
    { value: 'krg', label: 'KRG (Karung)' },
    { value: 'ikat', label: 'IKAT' },
    { value: 'kubik', label: 'KUBIK' },
    { value: 'lusin', label: 'LUSIN' },
    { value: 'box', label: 'BOX' },
    { value: 'cm', label: 'CM' },
    { value: 'ons', label: 'ONS' },
    { value: 'liter', label: 'LITER' },
];

interface AddProductDialogProps {
    onAdd: (product: {
        name: string;
        barcode: string;
        price: number;
        stock: { gudang: number; toko: number };
        image_url?: string;
        has_multi_unit?: boolean;
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

    // Unit fields
    const [sellUnit, setSellUnit] = useState('pcs');
    const [sellByQuantity, setSellByQuantity] = useState(false);

    // Multi-unit fields
    const [hasMultiUnit, setHasMultiUnit] = useState(false);
    const [pcsPerBox, setPcsPerBox] = useState<number | null>(null);
    const [boxPrice, setBoxPrice] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast({ title: 'File terlalu besar', description: 'Maksimal 2MB', variant: 'destructive' });
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
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
        setPcsPerBox(null);
        setBoxPrice(null);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast({ title: 'Nama produk wajib diisi', variant: 'destructive' });
            return;
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

        // Upload image if selected
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

        const success = await onAdd({
            name: name.trim(),
            barcode: finalBarcode,
            price,
            stock: { gudang: stockGudang, toko: stockToko },
            image_url: uploadedImageUrl,
            sell_unit: sellUnit,
            sell_by_quantity: sellByQuantity,
            has_multi_unit: hasMultiUnit,
            pcs_per_box: hasMultiUnit ? pcsPerBox : null,
            box_price: hasMultiUnit ? boxPrice : null,
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
                        <Label>Harga Jual (Rp)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={price}
                            onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                        />
                    </div>

                    {/* Sell Unit */}
                    <div className="space-y-2">
                        <Label>Jual Satuan</Label>
                        <Select value={sellUnit} onValueChange={setSellUnit}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih satuan" />
                            </SelectTrigger>
                            <SelectContent>
                                {SELL_UNITS.map(u => (
                                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sell by quantity toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
                        <div>
                            <p className="text-sm font-medium">Jual per {sellUnit.toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">
                                Customer bisa beli desimal (misal 0.5 {sellUnit})
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Stok Gudang</Label>
                            <Input
                                type="number"
                                min={0}
                                value={stockGudang}
                                onChange={(e) => setStockGudang(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Stok Toko</Label>
                            <Input
                                type="number"
                                min={0}
                                value={stockToko}
                                onChange={(e) => setStockToko(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    {/* Multi-unit toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
                        <div>
                            <p className="text-sm font-medium">Multi-Unit (Box/Pcs)</p>
                            <p className="text-xs text-muted-foreground">Produk bisa dijual per box & per pcs</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setHasMultiUnit(!hasMultiUnit)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${hasMultiUnit ? 'bg-primary' : 'bg-muted'}`}
                        >
                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${hasMultiUnit ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {hasMultiUnit && (
                        <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                            <div className="space-y-2">
                                <Label>Isi per Box</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={pcsPerBox ?? ''}
                                    onChange={(e) => setPcsPerBox(parseInt(e.target.value) || null)}
                                    placeholder="Jumlah pcs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Harga per Box (Rp)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={boxPrice ?? ''}
                                    onChange={(e) => setBoxPrice(parseInt(e.target.value) || null)}
                                    placeholder="Harga box"
                                />
                            </div>
                        </div>
                    )}

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
