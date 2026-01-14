
import { useState, useRef } from 'react';
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
import { Camera, Upload, CheckCircle, PackageCheck } from 'lucide-react';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function GoodsReceipt() {
    const role = useRole();
    const { user } = useAuth();

    // Use shipments hook to get shipments with status 'approved' (meaning Auditor approved, ready for receipt)
    // Actually, based on workflow, the request status is 'pending_receipt' after auditor approval.
    // We can fetch requests in 'pending_receipt' status assigned to this cashier.
    const { requests } = useStockRequests();
    const { receiveGoods } = useGoodsReceipt();

    // Get shipments data to show details - simplified by using requests which already have shipment info relation?
    // Current request query joins items, but not shipment directly. 
    // Let's filter requests that are 'pending_receipt'

    // Fetch shipments to link? Or use useStockShipments list filtered?
    const { shipments } = useStockShipments(); // This gets all shipments

    const incomingShipments = shipments.filter(s =>
        s.status === 'approved' && // Auditor approved
        s.request?.cashier_id === user?.id && // For this cashier
        s.request?.status === 'pending_receipt' // Not yet completed
    );

    const [selectedShipment, setSelectedShipment] = useState<any>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleOpenReceipt = (shipment: any) => {
        setSelectedShipment(shipment);
        setPhotoFile(null);
        setPhotoPreview(null);
        setNote('');
        setIsDialogOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        if (!selectedShipment || !photoFile) return;

        await receiveGoods.mutateAsync({
            requestId: selectedShipment.stock_request_id,
            shipmentId: selectedShipment.id,
            receivedBy: user?.id || '',
            photoFile: photoFile,
            note: note
        });

        setIsDialogOpen(false);
    };

    if (role !== 'cashier' && role !== 'admin') {
        return <MainLayout title="Akses Ditolak" subtitle="Hanya kasir yang dapat mengakses halaman ini">{null}</MainLayout>;
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

                {/* Completed History could go here */}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Bukti Penerimaan Barang</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-700 dark:text-blue-300">
                            Pastikan barang yang diterima sudah sesuai dengan data pengiriman. Stok toko akan otomatis bertambah setelah konfirmasi.
                        </div>

                        <div className="space-y-2">
                            <Label>Upload Foto Bukti (Faktur/Barang)</Label>
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

                        <div className="space-y-2">
                            <Label>Catatan Penerimaan</Label>
                            <Textarea
                                placeholder="Kondisi barang baik, diterima oleh..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSubmit} disabled={!photoFile || receiveGoods.isPending}>
                            {receiveGoods.isPending ? 'Memproses...' : 'Konfirmasi & Simpan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
