
import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import { Plus, Camera, X, SwitchCamera } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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
import { compressImageToFile, formatFileSize } from '@/lib/imageCompression';

// Helper function to sanitize barcode for file naming (remove invalid characters)
const sanitizeForFileName = (str: string): string => {
    return str.replace(/[^a-zA-Z0-9-_]/g, '_');
};
// Supported barcode formats
const SUPPORTED_FORMATS = [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.CODE_93,
    Html5QrcodeSupportedFormats.ITF,
    Html5QrcodeSupportedFormats.CODABAR,
];

interface AddProductDialogProps {
    onAdd: (product: {
        name: string;
        barcode: string;
        price: number;
        stock: { gudang: number; toko: number };
        image_url?: string;
        sell_by_quantity?: boolean;
        sell_unit?: string;
        has_multi_unit?: boolean;
        pcs_per_box?: number | null;
        box_price?: number | null;
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
        sell_by_quantity: false,
        sell_unit: 'meter',
        has_multi_unit: false,
        pcs_per_box: 0,
        box_price: 0,
    });

    // Camera scanner state
    const [showCamera, setShowCamera] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [useFrontCamera, setUseFrontCamera] = useState(false);
    const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

    // Debounce refs to prevent multiple detections
    const isProcessingRef = useRef(false);
    const lastScannedRef = useRef<string>('');
    const lastScannedTimeRef = useRef<number>(0);
    const scannerContainerId = 'add-product-scanner-container';

    // Admin and auditor can set stock to any location, cashier can only set stock to toko
    const canSetStock = userRole === 'admin' || userRole === 'auditor' || userRole === 'cashier';
    const canChooseLocation = userRole === 'admin' || userRole === 'auditor';
    const isCashier = userRole === 'cashier';

    // Camera scanner functions
    const stopScanner = useCallback(async () => {
        if (html5QrcodeRef.current) {
            try {
                const state = html5QrcodeRef.current.getState();
                if (state === 2) { // SCANNING state
                    await html5QrcodeRef.current.stop();
                }
                html5QrcodeRef.current.clear();
            } catch (error) {
                console.error('Error stopping scanner:', error);
            }
            html5QrcodeRef.current = null;
        }
        setIsScanning(false);
    }, []);

    const startScanner = useCallback(async () => {
        setCameraError(null);
        setIsScanning(true);
        // Reset processing state when starting scanner
        isProcessingRef.current = false;

        try {
            const html5Qrcode = new Html5Qrcode(scannerContainerId, {
                formatsToSupport: SUPPORTED_FORMATS,
                verbose: false,
            });
            html5QrcodeRef.current = html5Qrcode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                aspectRatio: 1.0,
            };

            await html5Qrcode.start(
                { facingMode: useFrontCamera ? 'user' : 'environment' },
                config,
                (decodedText) => {
                    const now = Date.now();

                    // Debounce: Skip if already processing or same barcode within 2 seconds
                    if (isProcessingRef.current) {
                        return;
                    }

                    if (lastScannedRef.current === decodedText &&
                        now - lastScannedTimeRef.current < 2000) {
                        return;
                    }

                    // Mark as processing to prevent further callbacks
                    isProcessingRef.current = true;
                    lastScannedRef.current = decodedText;
                    lastScannedTimeRef.current = now;

                    // Barcode scanned successfully
                    setNewProduct(prev => ({ ...prev, barcode: decodedText }));
                    toast({
                        title: 'Barcode terdeteksi!',
                        description: decodedText,
                    });
                    stopScanner();
                    setShowCamera(false);
                },
                () => {
                    // Ignore QR scan errors (continuous scanning)
                }
            );
        } catch (error) {
            console.error('Camera error:', error);
            setCameraError(
                error instanceof Error
                    ? error.message
                    : 'Tidak dapat mengakses kamera. Pastikan browser memiliki izin kamera.'
            );
            setIsScanning(false);
        }
    }, [useFrontCamera, stopScanner, toast]);

    // Start scanner when camera dialog opens
    useEffect(() => {
        if (showCamera) {
            const timer = setTimeout(() => {
                startScanner();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [showCamera, startScanner]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, [stopScanner]);

    const toggleCamera = async () => {
        if (html5QrcodeRef.current && isScanning) {
            await stopScanner();
            setUseFrontCamera(!useFrontCamera);
            setTimeout(() => {
                startScanner();
            }, 100);
        }
    };

    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
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

        const maxBytes = 10 * 1024 * 1024; // Allow up to 10MB input, we'll compress it
        if (file.size > maxBytes) {
            toast({
                title: 'Ukuran terlalu besar',
                description: 'Maksimal ukuran foto 10MB',
                variant: 'destructive',
            });
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

            if (productImagePreviewUrl) {
                URL.revokeObjectURL(productImagePreviewUrl);
            }

            setProductImageFile(compressedFile);
            setProductImagePreviewUrl(URL.createObjectURL(compressedFile));

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
            if (productImagePreviewUrl) {
                URL.revokeObjectURL(productImagePreviewUrl);
            }
            setProductImageFile(file);
            setProductImagePreviewUrl(URL.createObjectURL(file));
        }
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
            const fileName = `${sanitizeForFileName(newProduct.barcode)}-${uniqueId}.${ext}`;
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
            stock: canSetStock ? (isCashier ? {
                // Cashier can only set stock to toko
                gudang: 0,
                toko: newProduct.quantity,
            } : {
                // Admin/auditor can choose location
                gudang: newProduct.location === 'gudang' ? newProduct.quantity : 0,
                toko: newProduct.location === 'toko' ? newProduct.quantity : 0,
            }) : { gudang: 0, toko: 0 },
            image_url: imageUrl,
            sell_by_quantity: newProduct.sell_by_quantity,
            sell_unit: newProduct.sell_by_quantity ? newProduct.sell_unit : 'pcs',
            has_multi_unit: newProduct.has_multi_unit,
            pcs_per_box: newProduct.has_multi_unit && newProduct.pcs_per_box > 0 ? newProduct.pcs_per_box : null,
            box_price: newProduct.has_multi_unit && newProduct.box_price > 0 ? newProduct.box_price : null,
        });

        if (!ok) return;

        toast({
            title: 'Produk ditambahkan',
            description: `${newProduct.name} berhasil ditambahkan`,
        });

        setNewProduct({ name: '', barcode: '', price: 0, quantity: 0, location: 'gudang', sell_by_quantity: false, sell_unit: 'meter', has_multi_unit: false, pcs_per_box: 0, box_price: 0 });
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
            stopScanner();
            setShowCamera(false);
        }
    };

    return (
        <>
            <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button className="rounded-xl text-xs sm:text-sm">
                        <Plus className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Tambah Produk</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
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
                            <div className="flex gap-2">
                                <Input
                                    value={newProduct.barcode}
                                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                                    placeholder="Masukkan atau scan barcode"
                                    className="rounded-xl flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowCamera(true)}
                                    className="rounded-xl h-10 w-10 flex-shrink-0"
                                    title="Scan dengan kamera"
                                >
                                    <Camera className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Ketik manual atau tekan tombol kamera untuk scan
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>{newProduct.sell_by_quantity ? `Harga per ${newProduct.sell_unit}` : 'Harga'}</Label>
                            <Input
                                type="number"
                                value={newProduct.price}
                                onChange={(e) => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
                                min={0}
                                className="rounded-xl"
                            />
                        </div>
                        {/* Variable unit toggle */}
                        <div className="space-y-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="sell-by-quantity"
                                    checked={newProduct.sell_by_quantity}
                                    onChange={(e) => setNewProduct({ ...newProduct, sell_by_quantity: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <Label htmlFor="sell-by-quantity" className="cursor-pointer text-amber-800 dark:text-amber-200">
                                    📏 Jual per Satuan (meter/kg/gram)
                                </Label>
                            </div>
                            {newProduct.sell_by_quantity && (
                                <div className="space-y-2 pl-7">
                                    <Label className="text-sm">Satuan</Label>
                                    <Select
                                        value={newProduct.sell_unit}
                                        onValueChange={(value) => setNewProduct({ ...newProduct, sell_unit: value })}
                                    >
                                        <SelectTrigger className="rounded-xl h-10 border-amber-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="meter" className="cursor-pointer rounded-lg my-1">Meter</SelectItem>
                                            <SelectItem value="cm" className="cursor-pointer rounded-lg my-1">Centimeter</SelectItem>
                                            <SelectItem value="kg" className="cursor-pointer rounded-lg my-1">Kilogram</SelectItem>
                                            <SelectItem value="gram" className="cursor-pointer rounded-lg my-1">Gram</SelectItem>
                                            <SelectItem value="liter" className="cursor-pointer rounded-lg my-1">Liter</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        💡 Stok dan penjualan dalam {newProduct.sell_unit}
                                    </p>
                                </div>
                            )}
                        </div>
                        {/* Multi-unit toggle (Box + Pcs) */}
                        <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="has-multi-unit"
                                    checked={newProduct.has_multi_unit}
                                    onChange={(e) => setNewProduct({ ...newProduct, has_multi_unit: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <Label htmlFor="has-multi-unit" className="cursor-pointer text-blue-800 dark:text-blue-200">
                                    📦 Jual per Box + Pcs (Multi-Unit)
                                </Label>
                            </div>
                            {newProduct.has_multi_unit && (
                                <div className="space-y-3 pl-7">
                                    <div className="space-y-1">
                                        <Label className="text-sm">Isi per Box (pcs)</Label>
                                        <Input
                                            type="number"
                                            value={newProduct.pcs_per_box || ''}
                                            onChange={(e) => setNewProduct({ ...newProduct, pcs_per_box: parseInt(e.target.value) || 0 })}
                                            placeholder="Misal: 70"
                                            min={0}
                                            className="rounded-xl border-blue-200"
                                        />
                                        <p className="text-xs text-blue-700 dark:text-blue-300">
                                            💡 Kosongkan jika tidak tahu isi per box (box segel)
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">Harga per Box (Rp)</Label>
                                        <Input
                                            type="number"
                                            value={newProduct.box_price || ''}
                                            onChange={(e) => setNewProduct({ ...newProduct, box_price: parseInt(e.target.value) || 0 })}
                                            placeholder="Misal: 50000"
                                            min={0}
                                            className="rounded-xl border-blue-200"
                                        />
                                        <p className="text-xs text-blue-700 dark:text-blue-300">
                                            💡 Kosongkan untuk auto-hitung (harga pcs × isi per box)
                                        </p>
                                    </div>
                                </div>
                            )}
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
                            <div className={canChooseLocation ? "grid grid-cols-2 gap-4" : ""}>
                                <div className="space-y-2">
                                    <Label>{isCashier ? 'Stok Toko' : 'Jumlah Awal'}</Label>
                                    <Input
                                        type="number"
                                        value={newProduct.quantity}
                                        onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 0 })}
                                        min={0}
                                        className="rounded-xl"
                                    />
                                    {isCashier && (
                                        <p className="text-xs text-muted-foreground">
                                            💡 Kasir hanya dapat menambah stok toko
                                        </p>
                                    )}
                                </div>
                                {canChooseLocation && (
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
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
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

            {/* Camera Scanner Dialog */}
            <Dialog open={showCamera} onOpenChange={(open) => {
                if (!open) {
                    stopScanner();
                }
                setShowCamera(open);
            }}>
                <DialogContent className="rounded-2xl p-0 overflow-hidden max-w-md">
                    <div className="relative">
                        {/* Camera View */}
                        <div className="relative bg-black aspect-square">
                            <div id={scannerContainerId} className="w-full h-full" />

                            {/* Loading State */}
                            {isScanning && !cameraError && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-64 h-40 border-2 border-primary rounded-lg opacity-50" />
                                </div>
                            )}

                            {/* Error State */}
                            {cameraError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
                                    <div className="text-center text-white">
                                        <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p className="text-sm mb-4">{cameraError}</p>
                                        <Button
                                            variant="secondary"
                                            onClick={startScanner}
                                        >
                                            Coba Lagi
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Controls Overlay */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full"
                                    onClick={toggleCamera}
                                    title="Ganti Kamera"
                                >
                                    <SwitchCamera className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full"
                                    onClick={() => {
                                        stopScanner();
                                        setShowCamera(false);
                                    }}
                                    title="Tutup"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="p-4 bg-background">
                            <p className="text-center text-sm text-muted-foreground">
                                Arahkan kamera ke barcode produk
                            </p>
                            <p className="text-center text-xs text-muted-foreground mt-1">
                                Mendukung: EAN-13, EAN-8, UPC-A/E, Code-128/39/93, ITF, Codabar, QR
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
