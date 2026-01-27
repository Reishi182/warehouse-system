import { useState } from 'react';
import { Package, ArrowDownToLine, Plus } from 'lucide-react';
import { Product, Location } from '@/types';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface StockInDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddStock: (productId: string, quantity: number, location: Location) => void;
    getProductByBarcode: (barcode: string) => Product | undefined;
}

export function StockInDialog({
    open,
    onOpenChange,
    onAddStock,
    getProductByBarcode,
}: StockInDialogProps) {
    const { toast } = useToast();
    const [product, setProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [location, setLocation] = useState<Location>('gudang');
    const [confirmed, setConfirmed] = useState(false);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset state when closing
            setProduct(null);
            setQuantity(1);
            setConfirmed(false);
        }
        onOpenChange(newOpen);
    };

    const handleBarcodeScanned = (barcode: string) => {
        const foundProduct = getProductByBarcode(barcode);
        if (foundProduct) {
            setProduct(foundProduct);
            setConfirmed(false);
            toast({
                title: 'Produk ditemukan',
                description: foundProduct.name,
            });
        } else {
            setProduct(null);
            toast({
                title: 'Produk tidak ditemukan',
                description: 'Barcode: ' + barcode,
                variant: 'destructive',
            });
        }
    };

    const handleSubmit = () => {
        if (!product || quantity <= 0) {
            toast({
                title: 'Data tidak valid',
                description: 'Pilih produk dan masukkan jumlah yang valid',
                variant: 'destructive',
            });
            return;
        }

        onAddStock(product.id, quantity, location);

        toast({
            title: 'Stok berhasil ditambahkan',
            description: `${quantity} ${product.name} ditambahkan ke ${location}`,
        });

        handleOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowDownToLine className="w-5 h-5" />
                        Stok Masuk
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-[30px]">
                    <div>
                        <Label>Scan Barcode Produk</Label>
                        <BarcodeScanner onScan={handleBarcodeScanned} placeholder="Scan atau masukkan barcode..." />
                    </div>

                    {product && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Product Info */}
                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                                {product.image_url ? (
                                    <img src={product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Package className="w-6 h-6 text-primary" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">{product.barcode}</p>
                                </div>
                            </div>

                            {/* Current Stock Display */}
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="p-2 bg-muted/30 rounded-lg">
                                    <p className="text-lg font-bold">{product.stock.gudang}</p>
                                    <p className="text-xs text-muted-foreground">Gudang</p>
                                </div>
                                <div className="p-2 bg-muted/30 rounded-lg">
                                    <p className="text-lg font-bold">{product.stock.toko}</p>
                                    <p className="text-xs text-muted-foreground">Toko</p>
                                </div>
                            </div>

                            {/* Input Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Jumlah Masuk</Label>
                                    <Input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                        min={1}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Lokasi</Label>
                                    <Select value={location} onValueChange={(v: Location) => setLocation(v)}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="gudang">Gudang</SelectItem>
                                            <SelectItem value="toko">Toko</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Confirmation Checkbox */}
                            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={confirmed}
                                        onChange={(e) => setConfirmed(e.target.checked)}
                                        className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm">
                                        Konfirmasi: tambahkan <strong>{quantity}</strong> unit ke <strong className="capitalize">{location}</strong>
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {!product && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">Scan barcode produk untuk memulai</p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} className="rounded-xl">
                        Batal
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!product || !confirmed || quantity <= 0}
                        className="rounded-xl"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Tambah Stok
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
