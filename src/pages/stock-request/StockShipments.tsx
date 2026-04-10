
import { useState } from 'react';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useStockRequests } from '@/hooks/useStockRequests';
import { useStockShipments } from '@/hooks/useStockShipments';
import MainLayout from '@/components/layout/MainLayout';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, ArrowRight, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function StockShipments() {
    const role = useRole();
    const { user, profile } = useAuth();
    const { requests } = useStockRequests();
    const { shipments, createShipment } = useStockShipments();

    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [shipmentItems, setShipmentItems] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Requests ready for shipment (approved by Main Office)
    const pendingRequests = requests.filter(r => r.status === 'pending_gudang');

    const openShipmentDialog = (request: any) => {
        setSelectedRequest(request);
        // Pre-fill with requested quantities
        setShipmentItems(request.items.map((item: any) => ({
            productId: item.product_id,
            name: item.product?.name,
            requestedQty: item.quantity,
            shipQty: item.quantity, // Default to full fulfillment
            unit: item.unit,
            currentStock: item.product?.stock_gudang || 0
        })));
        setIsDialogOpen(true);
    };

    const handleUpdateShipQty = (productId: string, qty: number) => {
        setShipmentItems(shipmentItems.map(i =>
            i.productId === productId ? { ...i, shipQty: qty } : i
        ));
    };

    const handleSubmitShipment = async () => {
        if (!selectedRequest) return;

        await createShipment.mutateAsync({
            requestId: selectedRequest.id,
            shippedBy: user?.id || '',
            items: shipmentItems.map(i => ({
                productId: i.productId,
                quantity: i.shipQty,
                unit: i.unit
            }))
        });

        setIsDialogOpen(false);
        setSelectedRequest(null);
    };

    if (role !== 'warehouse' && role !== 'admin') {
        return <MainLayout title="Akses Ditolak" subtitle="Hanya staf gudang yang dapat mengakses halaman ini">{null}</MainLayout>;
    }

    return (
        <MainLayout
            title="Pengiriman Stok"
            subtitle="Proses permintaan stok dan buat pengiriman"
        >
            <div className="space-y-8">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Siap Kirim"
                        value={pendingRequests.length}
                        icon={<Package className="w-5 h-5" />}
                        subtitle={pendingRequests.length > 0 ? "perlu diproses" : undefined}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Terkirim"
                        value={shipments.length}
                        icon={<Truck className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Pending Auditor"
                        value={shipments.filter(s => s.status === 'pending_auditor').length}
                        icon={<CheckCircle className="w-5 h-5" />}
                    />
                </StatsGrid>

                {/* Pending Requests Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Package className="w-5 h-5" /> Permintaan Siap Kirim
                    </h2>

                    {pendingRequests.length === 0 ? (
                        <Card className="bg-muted/30 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <CheckCircle className="w-10 h-10 mb-2 opacity-20" />
                                <p>Tidak ada permintaan yang perlu diproses saat ini.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingRequests.map(req => (
                                <Card key={req.id} className="relative overflow-hidden border-orange-200 dark:border-orange-900">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg">{req.cashier_name}</CardTitle>
                                                <p className="text-sm font-mono text-muted-foreground mt-1">{req.request_number}</p>
                                            </div>
                                            <Badge>Siap Kirim</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="bg-muted p-3 rounded text-sm">
                                                <p className="font-semibold mb-1">Daftar Barang ({req.items?.length}):</p>
                                                <ul className="list-disc list-inside text-muted-foreground">
                                                    {req.items?.slice(0, 3).map((i: any) => (
                                                        <li key={i.id}>{i.product?.name} ({i.quantity} {i.unit})</li>
                                                    ))}
                                                    {(req.items?.length || 0) > 3 && <li>...dan {req.items.length - 3} lainnya</li>}
                                                </ul>
                                            </div>
                                            <Button className="w-full" onClick={() => openShipmentDialog(req)}>
                                                <Truck className="w-4 h-4 mr-2" /> Proses Pengiriman
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                {/* Shipment History */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Truck className="w-5 h-5" /> Riwayat Pengiriman
                    </h2>
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Tanggal</th>
                                            <th className="px-4 py-3 text-left font-medium">No. Permintaan</th>
                                            <th className="px-4 py-3 text-left font-medium">Status</th>
                                            <th className="px-4 py-3 text-right font-medium">Total Item</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {shipments.map(ship => (
                                            <tr key={ship.id} className="hover:bg-muted/20">
                                                <td className="px-4 py-3">{format(new Date(ship.created_at), 'dd MMM yyyy HH:mm')}</td>
                                                <td className="px-4 py-3 font-mono">{ship.request?.request_number || '-'}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={ship.status === 'approved' ? 'default' : ship.status === 'needs_revision' ? 'destructive' : 'secondary'}>
                                                        {ship.status === 'pending_auditor' ? 'Verifikasi Auditor' : ship.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">{ship.items?.length} barang</td>
                                            </tr>
                                        ))}
                                        {shipments.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center py-6 text-muted-foreground">belum ada riwayat pengiriman</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Pengiriman Stok</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="bg-muted/40 p-3 rounded border">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Nomor Permintaan</p>
                                    <p className="font-mono font-medium">{selectedRequest?.request_number}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Tujuan</p>
                                    <p className="font-medium">Toko (Kasir: {selectedRequest?.cashier_name})</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Rincian Barang</h4>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Barang</th>
                                            <th className="px-3 py-2 text-center">Stok Gudang</th>
                                            <th className="px-3 py-2 text-center">Diminta</th>
                                            <th className="px-3 py-2 text-center w-[120px]">Dikirim</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {shipmentItems.map(item => (
                                            <tr key={item.productId}>
                                                <td className="px-3 py-2">
                                                    <p className="font-medium">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">{item.productId}</p>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={item.currentStock < item.shipQty ? "text-red-500 font-bold" : ""}>
                                                        {item.currentStock}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center">{item.requestedQty} {item.unit}</td>
                                                <td className="px-3 py-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={item.currentStock}
                                                        value={item.shipQty}
                                                        onChange={e => handleUpdateShipQty(item.productId, parseFloat(e.target.value) || 0)}
                                                        className="h-8 text-center"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSubmitShipment}>
                            <Truck className="w-4 h-4 mr-2" /> Konfirmasi Kirim
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
