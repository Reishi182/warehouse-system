
import { useState, useRef, useCallback } from 'react';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useStockRequests } from '@/hooks/useStockRequests';
import { useStockShipments } from '@/hooks/useStockShipments';
import { useGoodsReceipt } from '@/hooks/useGoodsReceipt';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, CheckCircle, PackageCheck, AlertTriangle, Loader2, Pen, Search, Barcode, Minus, Plus, Boxes } from 'lucide-react';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SignaturePad from '@/components/common/SignaturePad';
import { compressImageToFile } from '@/lib/imageCompression';

interface ReceivedItemState {
    productId: string;
    productName: string;
    quantityShipped: number;
    quantityReceived: number;
    quantityDamaged: number;
    unit?: string | null;
    scannedBarcode?: string;
}

export default function GoodsReceipt() {
    const role = useRole();
    const { user, profile } = useAuth();

    const { requests } = useStockRequests();
    const { receiveGoods } = useGoodsReceipt();
    const { shipments } = useStockShipments();

    const incomingShipments = shipments.filter(s =>
        s.status === 'approved' &&
        s.request?.cashier_id === user?.id &&
        s.request?.status === 'pending_receipt'
    );

    const [selectedShipment, setSelectedShipment] = useState<any>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [receivedItems, setReceivedItems] = useState<ReceivedItemState[]>([]);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleOpenReceipt = (shipment: any) => {
        setSelectedShipment(shipment);
        setPhotoFile(null);
        setPhotoPreview(null);
        setNote('');
        setSignatureDataUrl(null);

        // Initialize received items with shipped quantities
        const items: ReceivedItemState[] = shipment.items?.map((item: any) => ({
            productId: item.product_id,
            productName: item.product?.name || 'Unknown',
            quantityShipped: item.quantity_shipped,
            quantityReceived: item.quantity_shipped, // Default to shipped qty
            quantityDamaged: 0,
            unit: item.unit,
        })) || [];

        setReceivedItems(items);
        setIsDialogOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Auto-compress image
                const compressedFile = await compressImageToFile(file, {
                    maxWidth: 1200,
                    maxHeight: 1200,
                    quality: 0.8,
                });
                setPhotoFile(compressedFile);
                setPhotoPreview(URL.createObjectURL(compressedFile));
            } catch {
                // Fallback to original
                setPhotoFile(file);
                setPhotoPreview(URL.createObjectURL(file));
            }
        }
    };

    const updateReceivedItem = (index: number, field: 'quantityReceived' | 'quantityDamaged' | 'scannedBarcode', value: string | number) => {
        setReceivedItems(prev => {
            const updated = [...prev];
            if (field === 'scannedBarcode') {
                updated[index] = { ...updated[index], [field]: value };
            } else {
                updated[index] = { ...updated[index], [field]: Math.max(0, Number(value)) };
            }
            return updated;
        });
    };

    const handleSignatureSave = useCallback((dataUrl: string | null) => {
        setSignatureDataUrl(dataUrl);
    }, []);

    // Check if there's any discrepancy
    const hasDiscrepancy = receivedItems.some(
        item => item.quantityReceived !== item.quantityShipped || item.quantityDamaged > 0
    );

    // Validation
    const canSubmit = photoFile &&
        (!hasDiscrepancy || (hasDiscrepancy && signatureDataUrl));

    const handleSubmit = async () => {
        if (!selectedShipment || !photoFile) return;

        await receiveGoods.mutateAsync({
            requestId: selectedShipment.stock_request_id,
            shipmentId: selectedShipment.id,
            receivedBy: user?.id || '',
            receivedByName: profile?.name || 'Unknown',
            photoFile: photoFile,
            note: note,
            signatureDataUrl: signatureDataUrl || undefined,
            items: receivedItems,
        });

        setIsDialogOpen(false);
    };

    if (role !== 'cashier' && role !== 'admin') {
        return <MainLayout title="Akses Ditolak" subtitle="Hanya kasir/kepala toko yang dapat mengakses halaman ini">{null}</MainLayout>;
    }

    return (
        <MainLayout
            title="Penerimaan Barang"
            subtitle="Konfirmasi penerimaan barang dari gudang"
        >
            <div className="space-y-6">
                <section>
                    <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                        <PackageCheck className="w-6 h-6" /> Barang Masuk (Perlu Konfirmasi)
                    </h2>

                    {incomingShipments.length === 0 ? (
                        <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                            <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
                            <p className="text-muted-foreground">Tidak ada barang masuk yang perlu dikonfirmasi saat ini.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {incomingShipments.map(shipment => (
                                <Card key={shipment.id} className="border-green-200 dark:border-green-900 border-l-4 border-l-green-500 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Pengiriman Gudang</CardTitle>
                                        <CardDescription className="font-mono text-xs">{shipment.request?.request_number}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="text-sm">
                                            <p className="text-muted-foreground">Dikirim pada:</p>
                                            <p className="font-medium">{format(new Date(shipment.shipped_at), 'dd MMM HH:mm')}</p>
                                        </div>
                                        <div className="bg-muted p-2 rounded text-xs space-y-1">
                                            <p className="font-semibold">{shipment.items?.length} Item:</p>
                                            {shipment.items?.slice(0, 3).map((i: any) => (
                                                <div key={i.id} className="flex justify-between">
                                                    <span>{i.product?.name}</span>
                                                    <span>{i.quantity_shipped} {i.unit || 'pcs'}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Button className="w-full" onClick={() => handleOpenReceipt(shipment)}>
                                            Konfirmasi Terima
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-50/50 dark:bg-slate-900/50 border-none">
                    {/* Header */}
                    <div className="bg-white dark:bg-slate-900 border-b border-border/60 p-5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <PackageCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                    Konfirmasi Penerimaan Barang
                                </DialogTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Masukkan jumlah barang yang diterima dan kondisi barang rusak (jika ada).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="overflow-y-auto flex-1 p-5 space-y-5 custom-scrollbar">
                        {/* Discrepancy Alert */}
                        {hasDiscrepancy && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50/80 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900/30 rounded-xl animate-fade-in">
                                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-amber-850 dark:text-amber-300 text-sm">Terdeteksi Selisih Penerimaan</p>
                                    <p className="text-xs text-amber-700 dark:text-amber-450 mt-0.5">
                                        Jumlah diterima berbeda dengan jumlah dikirim. Foto bukti dan tanda tangan <strong>WAJIB</strong> diisi.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Daftar Barang Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <Boxes className="w-4 h-4 text-indigo-500" />
                                Daftar Barang
                            </h3>

                            <div className="space-y-3">
                                {receivedItems.map((item, idx) => {
                                    const hasItemDiscrepancy = item.quantityReceived !== item.quantityShipped || item.quantityDamaged > 0;
                                    const receivePercent = item.quantityShipped > 0 ? Math.min(100, (item.quantityReceived / item.quantityShipped) * 100) : 100;

                                    return (
                                        <div
                                            key={item.productId}
                                            className={`rounded-xl border transition-all duration-200 overflow-hidden bg-card hover:border-slate-300 dark:hover:border-slate-700 ${
                                                item.quantityDamaged > 0
                                                    ? 'border-l-4 border-l-red-500 border-red-100 dark:border-red-900/30'
                                                    : item.quantityReceived !== item.quantityShipped
                                                    ? 'border-l-4 border-l-amber-500 border-amber-100 dark:border-amber-900/30'
                                                    : 'border-l-4 border-l-emerald-500 border-border'
                                            }`}
                                        >
                                            {/* Progress bar indicator */}
                                            <div className="h-0.5 bg-slate-100 dark:bg-slate-800">
                                                <div
                                                    className={`h-full transition-all duration-500 ${
                                                        item.quantityDamaged > 0 
                                                            ? 'bg-red-500' 
                                                            : receivePercent >= 100 
                                                            ? 'bg-emerald-500' 
                                                            : 'bg-amber-400'
                                                    }`}
                                                    style={{ width: `${receivePercent}%` }}
                                                />
                                            </div>

                                            <div className="p-4 space-y-3">
                                                {/* Header item */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                            item.quantityDamaged > 0
                                                                ? 'bg-red-50 text-red-600 dark:bg-red-955/30 dark:text-red-400'
                                                                : item.quantityReceived !== item.quantityShipped
                                                                ? 'bg-amber-50 text-amber-600 dark:bg-amber-955/30 dark:text-amber-400'
                                                                : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}>
                                                            {idx + 1}
                                                        </div>
                                                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 leading-tight">
                                                            {item.productName}
                                                        </p>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <Badge variant="outline" className="rounded-full text-xs font-semibold px-2.5 py-0.5 bg-slate-50 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/50">
                                                            Dipesan: {item.quantityShipped} {item.unit?.toUpperCase() || 'PCS'}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Barcode scanner */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                                                        Barcode Produk Baru (Wajib)
                                                    </Label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                                            <Search className="w-4 h-4" />
                                                        </div>
                                                        <Input
                                                            placeholder="Scan atau ketik barcode..."
                                                            className="pl-9 pr-10 h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 focus-visible:ring-indigo-500"
                                                            value={item.scannedBarcode || ''}
                                                            onChange={(e) => updateReceivedItem(idx, 'scannedBarcode', e.target.value)}
                                                        />
                                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-slate-400 hover:text-slate-650">
                                                            <Camera className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                    {item.scannedBarcode && (
                                                        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-500 mt-1 font-mono font-semibold">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            <span>{item.scannedBarcode}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Inputs Row with Steppers */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Received Stepper */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-450 flex items-center gap-1">
                                                            Diterima
                                                        </Label>
                                                        <div className="flex items-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateReceivedItem(idx, 'quantityReceived', Math.max(0, item.quantityReceived - 1))}
                                                                className="h-10 w-10 border border-r-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-l-lg flex items-center justify-center transition-colors text-slate-500"
                                                            >
                                                                <Minus className="w-3.5 h-3.5" />
                                                            </button>
                                                            <div className="relative flex-1">
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    max={item.quantityShipped}
                                                                    value={item.quantityReceived}
                                                                    onChange={e => updateReceivedItem(idx, 'quantityReceived', parseFloat(e.target.value) || 0)}
                                                                    className="h-10 text-center font-bold text-base rounded-none border-x-0 border-slate-200 dark:border-slate-800 focus:border-indigo-450 focus:ring-0 focus-visible:ring-0"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateReceivedItem(idx, 'quantityReceived', Math.min(item.quantityShipped, item.quantityReceived + 1))}
                                                                className="h-10 w-10 border border-l-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-r-lg flex items-center justify-center transition-colors text-slate-500"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Damaged Stepper */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold text-red-650 dark:text-red-400 flex items-center gap-1">
                                                            Rusak
                                                        </Label>
                                                        <div className="flex items-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateReceivedItem(idx, 'quantityDamaged', Math.max(0, item.quantityDamaged - 1))}
                                                                className="h-10 w-10 border border-r-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-l-lg flex items-center justify-center transition-colors text-slate-500"
                                                            >
                                                                <Minus className="w-3.5 h-3.5" />
                                                            </button>
                                                            <div className="relative flex-1">
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    max={item.quantityReceived}
                                                                    value={item.quantityDamaged}
                                                                    onChange={e => updateReceivedItem(idx, 'quantityDamaged', parseFloat(e.target.value) || 0)}
                                                                    className={`h-10 text-center font-bold text-base rounded-none border-x-0 border-slate-200 dark:border-slate-800 focus:border-red-450 focus:ring-0 focus-visible:ring-0 ${
                                                                        item.quantityDamaged > 0 ? 'text-red-600 dark:text-red-455 border-y-red-200 dark:border-y-red-900/30' : ''
                                                                    }`}
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateReceivedItem(idx, 'quantityDamaged', Math.min(item.quantityReceived, item.quantityDamaged + 1))}
                                                                className="h-10 w-10 border border-l-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-r-lg flex items-center justify-center transition-colors text-slate-500"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Photo Upload Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] space-y-2">
                            <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Upload Foto Bukti {hasDiscrepancy && <span className="text-red-500">*</span>}
                            </Label>
                            <div
                                className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="max-h-48 rounded-lg object-contain border bg-slate-50" />
                                ) : (
                                    <>
                                        <Camera className="w-8 h-8 text-indigo-500 mb-2" />
                                        <p className="text-sm text-slate-650 dark:text-slate-300 font-medium">Klik untuk ambil/upload foto</p>
                                        <p className="text-xs text-slate-400 mt-1">Mendukung format PNG, JPG, atau JPEG</p>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>

                        {/* Signature - only required if discrepancy */}
                        {hasDiscrepancy && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] space-y-3">
                                <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <Pen className="w-4 h-4 text-indigo-500" />
                                    Tanda Tangan Penerima <span className="text-red-500">*</span>
                                </Label>
                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950/20">
                                    <SignaturePad
                                        onSignatureChange={handleSignatureSave}
                                        width={400}
                                        height={150}
                                    />
                                </div>
                                {signatureDataUrl && (
                                    <p className="text-xs text-green-600 flex items-center gap-1 font-semibold">
                                        <CheckCircle className="w-3.5 h-3.5" /> Tanda tangan berhasil tersimpan
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Note */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] space-y-2">
                            <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                Catatan Penerimaan
                            </Label>
                            <Textarea
                                placeholder="Kondisi fisik barang, catatan khusus, dsb..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                rows={3}
                                className="rounded-xl resize-none border-slate-200 dark:border-slate-800 focus:border-indigo-300 focus:ring-indigo-200 bg-slate-50/50 dark:bg-slate-950/20"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 border-t border-border/60 bg-white dark:bg-slate-900 p-4 flex gap-3 justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="rounded-xl px-5 border-slate-200 dark:border-slate-800 font-semibold"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!canSubmit || receiveGoods.isPending}
                            className={`rounded-xl px-6 gap-2 font-semibold border-0 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] ${
                                hasDiscrepancy
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-200/50'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-200/50'
                            }`}
                        >
                            {receiveGoods.isPending ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memproses...</>
                            ) : hasDiscrepancy ? (
                                <><AlertTriangle className="w-4.5 h-4.5" /> Konfirmasi dengan Selisih</>
                            ) : (
                                <><CheckCircle className="w-4.5 h-4.5" /> Konfirmasi & Tambah Stok</>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
