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
import { formatStockDisplay } from '@/lib/multiUnit';

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
    const [mainQty, setMainQty] = useState(0);
    const [subQty, setSubQty] = useState(0);
    const [location, setLocation] = useState<Location>('gudang');
    const [confirmed, setConfirmed] = useState(false);

    const isMultiUnit = product?.has_multi_unit || false;
    const conversionRate = product?.pcs_per_box || 0;
    const mainLabel = (product?.main_unit || 'box').toUpperCase();
    const subLabel = (product?.sell_unit || 'pcs').toUpperCase();

    // Calculate total quantity in base units
    const totalQuantity = isMultiUnit
        ? (conversionRate > 0 ? mainQty * conversionRate : 0) + subQty
        : subQty; // For non-multi-unit, subQty IS the quantity

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset state when closing
            setProduct(null);
            setMainQty(0);
            setSubQty(0);
            setConfirmed(false);
        }
        onOpenChange(newOpen);
    };

    const handleBarcodeScanned = (barcode: string) => {
        const foundProduct = getProductByBarcode(barcode);
        if (foundProduct) {
            setProduct(foundProduct);
            setConfirmed(false);
            setMainQty(0);
            setSubQty(0);
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

        const desc = isMultiUnit && conversionRate > 0
            ? `${mainQty} ${mainLabel} (${mainQty * conversionRate} ${subLabel}) + ${subQty} ${subLabel} = ${totalQuantity} ${subLabel} ke ${location}`
            : `${totalQuantity} ${product.name} ditambahkan ke ${location}`;

        toast({
            title: 'Stok berhasil ditambahkan',
            description: desc,
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
                                    {isMultiUnit && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                            📦 Multi-Unit{conversionRate > 0 ? ` · ${conversionRate} ${subLabel}/${mainLabel}` : ` · ${mainLabel} segel`}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Current Stock Display */}
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="p-2 bg-muted/30 rounded-lg">
                                    <p className="text-lg font-bold">{product.stock.gudang}</p>
                                    <p className="text-xs text-muted-foreground">Gudang</p>
                                    {isMultiUnit && conversionRate > 0 && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            {formatStockDisplay(product.stock.gudang, product)}
                                        </p>
                                    )}
                                </div>
                                <div className="p-2 bg-muted/30 rounded-lg">
                                    <p className="text-lg font-bold">{product.stock.toko}</p>
                                    <p className="text-xs text-muted-foreground">Toko</p>
                                    {isMultiUnit && conversionRate > 0 && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            {formatStockDisplay(product.stock.toko, product)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Input Fields */}
                            {isMultiUnit ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>📦 Jumlah {mainLabel}</Label>
                                            <Input
                                                type="number" step="any"
                                                value={mainQty || ''}
                                                onChange={(e) => setMainQty(parseFloat(e.target.value) || 0)}
                                                min={0}
                                                placeholder="0"
                                                className="rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>🔢 {subLabel} (lepasan)</Label>
                                            <Input
                                                type="number" step="any"
                                                value={subQty || ''}
                                                onChange={(e) => setSubQty(parseFloat(e.target.value) || 0)}
                                                min={0}
                                                placeholder="0"
                                                className="rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    {conversionRate > 0 && (mainQty > 0 || subQty > 0) && (
                                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-blue-700 dark:text-blue-300 text-center">
                                            {mainQty > 0 && <span>{mainQty} {mainLabel} × {conversionRate} = {mainQty * conversionRate} {subLabel}</span>}
                                            {mainQty > 0 && subQty > 0 && <span> + {subQty} {subLabel}</span>}
                                            {mainQty === 0 && subQty > 0 && <span>{subQty} {subLabel}</span>}
                                            <span className="font-bold"> = Total {totalQuantity} {subLabel}</span>
                                        </div>
                                    )}
                                    {!conversionRate && mainQty > 0 && (
                                        <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-700 dark:text-amber-300 text-center">
                                            ⚠️ Isi per {mainLabel} belum diatur. Hanya {subLabel} lepasan yang terhitung.
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
                                            type="number" step="any"
                                            value={subQty || ''}
                                            onChange={(e) => setSubQty(parseFloat(e.target.value) || 0)}
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
