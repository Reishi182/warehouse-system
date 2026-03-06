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
    const [boxQuantity, setBoxQuantity] = useState(0);
    const [pcsQuantity, setPcsQuantity] = useState(0);
    const [location, setLocation] = useState<Location>('gudang');
    const [confirmed, setConfirmed] = useState(false);

    const isMultiUnit = product?.has_multi_unit || false;
    const pcsPerBox = product?.pcs_per_box || 0;

    // Calculate total quantity for multi-unit
    const totalQuantity = isMultiUnit
        ? (pcsPerBox > 0 ? boxQuantity * pcsPerBox : 0) + pcsQuantity
        : pcsQuantity; // For non-multi-unit, pcsQuantity IS the quantity

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset state when closing
            setProduct(null);
            setBoxQuantity(0);
            setPcsQuantity(0);
            setConfirmed(false);
        }
        onOpenChange(newOpen);
    };

    const handleBarcodeScanned = (barcode: string) => {
        const foundProduct = getProductByBarcode(barcode);
        if (foundProduct) {
            setProduct(foundProduct);
            setConfirmed(false);
            setBoxQuantity(0);
            setPcsQuantity(0);
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
        if (!product || totalQuantity <= 0) {
            toast({
                title: 'Data tidak valid',
                description: 'Pilih produk dan masukkan jumlah yang valid',
                variant: 'destructive',
            });
            return;
        }

        onAddStock(product.id, totalQuantity, location);

        const desc = isMultiUnit && pcsPerBox > 0
            ? `${boxQuantity} box (${boxQuantity * pcsPerBox} pcs) + ${pcsQuantity} pcs = ${totalQuantity} pcs ke ${location}`
            : `${totalQuantity} ${product.name} ditambahkan ke ${location}`;

        toast({
            title: 'Stok berhasil ditambahkan',
            description: desc,
        });

        handleOpenChange(false);
    };

    // Helper to display stock in box + pcs format
    const formatStockDisplay = (stockCount: number) => {
        if (!isMultiUnit || !pcsPerBox || pcsPerBox <= 0) return null;
        const boxes = Math.floor(stockCount / pcsPerBox);
        const loose = stockCount % pcsPerBox;
        return `${boxes} box + ${loose} pcs`;
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
                                    {isMultiUnit && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                            📦 Multi-Unit{pcsPerBox > 0 ? ` · ${pcsPerBox} pcs/box` : ' · Box segel'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Current Stock Display */}
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="p-2 bg-muted/30 rounded-lg">
                                    <p className="text-lg font-bold">{product.stock.gudang}</p>
                                    <p className="text-xs text-muted-foreground">Gudang</p>
                                    {formatStockDisplay(product.stock.gudang) && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400">{formatStockDisplay(product.stock.gudang)}</p>
                                    )}
                                </div>
                                <div className="p-2 bg-muted/30 rounded-lg">
                                    <p className="text-lg font-bold">{product.stock.toko}</p>
                                    <p className="text-xs text-muted-foreground">Toko</p>
                                    {formatStockDisplay(product.stock.toko) && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400">{formatStockDisplay(product.stock.toko)}</p>
                                    )}
                                </div>
                            </div>

                            {/* Input Fields */}
                            {isMultiUnit ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>📦 Jumlah Box</Label>
                                            <Input
                                                type="number"
                                                value={boxQuantity || ''}
                                                onChange={(e) => setBoxQuantity(parseInt(e.target.value) || 0)}
                                                min={0}
                                                placeholder="0"
                                                className="rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>🔢 Pcs (lepasan)</Label>
                                            <Input
                                                type="number"
                                                value={pcsQuantity || ''}
                                                onChange={(e) => setPcsQuantity(parseInt(e.target.value) || 0)}
                                                min={0}
                                                placeholder="0"
                                                className="rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    {pcsPerBox > 0 && (boxQuantity > 0 || pcsQuantity > 0) && (
                                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-blue-700 dark:text-blue-300 text-center">
                                            {boxQuantity > 0 && <span>{boxQuantity} box × {pcsPerBox} = {boxQuantity * pcsPerBox} pcs</span>}
                                            {boxQuantity > 0 && pcsQuantity > 0 && <span> + {pcsQuantity} pcs</span>}
                                            {boxQuantity === 0 && pcsQuantity > 0 && <span>{pcsQuantity} pcs</span>}
                                            <span className="font-bold"> = Total {totalQuantity} pcs</span>
                                        </div>
                                    )}
                                    {!pcsPerBox && boxQuantity > 0 && (
                                        <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-700 dark:text-amber-300 text-center">
                                            ⚠️ Isi per box belum diatur. Hanya pcs lepasan yang terhitung.
                                        </div>
                                    )}
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
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Jumlah Masuk</Label>
                                        <Input
                                            type="number"
                                            value={pcsQuantity || ''}
                                            onChange={(e) => setPcsQuantity(parseInt(e.target.value) || 0)}
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
                            )}

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
                                        Konfirmasi: tambahkan <strong>{totalQuantity}</strong> unit ke <strong className="capitalize">{location}</strong>
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
                        disabled={!product || !confirmed || totalQuantity <= 0}
                        className="rounded-xl"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Tambah Stok
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
