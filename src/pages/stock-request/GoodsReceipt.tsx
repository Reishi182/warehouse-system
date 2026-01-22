
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
import { Camera, CheckCircle, PackageCheck, AlertTriangle, Loader2, Pen } from 'lucide-react';
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
import SignatureCanvas from '@/components/common/SignatureCanvas';

interface ReceivedItemState {
    productId: string;
    productName: string;
    quantityShipped: number;
    quantityReceived: number;
    quantityDamaged: number;
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
        })) || [];

        setReceivedItems(items);
        setIsDialogOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const updateReceivedItem = (index: number, field: 'quantityReceived' | 'quantityDamaged', value: number) => {
        setReceivedItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: Math.max(0, value) };
            return updated;
        });
    };

    const handleSignatureSave = useCallback((dataUrl: string) => {
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
                                                    <span>{i.quantity_shipped} pcs</span>
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Penerimaan Barang</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {/* Discrepancy Alert */}
                        {hasDiscrepancy && (
                            <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
                                <AlertTriangle className="w-4 h-4" />
                                <AlertDescription>
                                    <strong>Terdeteksi Selisih!</strong> Jumlah diterima berbeda dengan jumlah dikirim.
                                    Foto bukti dan tanda tangan <strong>WAJIB</strong> diisi.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Items with Qty Input */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Detail Penerimaan Per Item</Label>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="text-left p-3">Produk</th>
                                            <th className="text-center p-3 w-24">Dikirim</th>
                                            <th className="text-center p-3 w-28">Diterima</th>
                                            <th className="text-center p-3 w-28">Rusak</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {receivedItems.map((item, idx) => {
                                            const hasItemDiscrepancy = item.quantityReceived !== item.quantityShipped || item.quantityDamaged > 0;
                                            return (
                                                <tr key={item.productId} className={hasItemDiscrepancy ? 'bg-amber-50 dark:bg-amber-900/20' : ''}>
                                                    <td className="p-3 font-medium">{item.productName}</td>
                                                    <td className="p-3 text-center font-mono">{item.quantityShipped}</td>
                                                    <td className="p-3">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={item.quantityShipped}
                                                            value={item.quantityReceived}
                                                            onChange={e => updateReceivedItem(idx, 'quantityReceived', parseInt(e.target.value) || 0)}
                                                            className="text-center h-8"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={item.quantityReceived}
                                                            value={item.quantityDamaged}
                                                            onChange={e => updateReceivedItem(idx, 'quantityDamaged', parseInt(e.target.value) || 0)}
                                                            className="text-center h-8"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Photo Upload */}
                        <div className="space-y-2">
                            <Label>Upload Foto Bukti {hasDiscrepancy && <span className="text-red-500">*</span>}</Label>
                            <div
                                className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="max-h-48 rounded object-contain" />
                                ) : (
                                    <>
                                        <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Klik untuk ambil/upload foto</p>
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
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Pen className="w-4 h-4" />
                                    Tanda Tangan Penerima <span className="text-red-500">*</span>
                                </Label>
                                <SignatureCanvas
                                    onSave={handleSignatureSave}
                                    width={400}
                                    height={150}
                                />
                                {signatureDataUrl && (
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Tanda tangan tersimpan
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Note */}
                        <div className="space-y-2">
                            <Label>Catatan Penerimaan</Label>
                            <Textarea
                                placeholder="Kondisi barang, catatan khusus..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!canSubmit || receiveGoods.isPending}
                            className={hasDiscrepancy ? 'bg-amber-600 hover:bg-amber-700' : ''}
                        >
                            {receiveGoods.isPending ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memproses...</>
                            ) : hasDiscrepancy ? (
                                'Konfirmasi dengan Selisih'
                            ) : (
                                'Konfirmasi & Simpan'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
