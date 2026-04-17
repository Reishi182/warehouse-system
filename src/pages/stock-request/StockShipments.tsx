
import { useState } from 'react';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useStockRequests } from '@/hooks/useStockRequests';
import { useStockShipments } from '@/hooks/useStockShipments';
import MainLayout from '@/components/layout/MainLayout';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
;

export default function StockShipments() {
    const role = useRole();
    const { user, profile } = useAuth();
    const { requests } = useStockRequests();
    const { shipments, createShipment } = useStockShipments();

    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [shipmentItems, setShipmentItems] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const columns: Column<any>[] = [
        {
            header: 'Waktu Permintaan',
            accessorKey: 'created_at',
            cell: (req) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{format(new Date(req.created_at), 'dd MMM yyyy')}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(req.created_at), 'HH:mm')}</span>
                </div>
            )
        },
        {
            header: 'Nomor Permintaan',
            accessorKey: 'request_number',
            cell: (req) => (
                <Badge variant="outline" className="font-mono bg-primary/5 text-primary border-primary/20 uppercase font-bold">
                    {req.request_number || '-'}
                </Badge>
            )
        },
        {
            header: 'Kasir Peminta',
            accessorKey: 'cashier_name',
            cell: (req) => <span className="font-medium text-sm">{req.cashier_name}</span>
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (req) => {
                if (req.status === 'pending_gudang') return <Badge variant="warning" className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400">Siap Proses</Badge>;
                if (req.status === 'pending_receipt') return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">Dalam Perjalanan</Badge>;
                if (req.status === 'completed') return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400">Selesai</Badge>;
                if (req.status === 'cancelled') return <Badge variant="destructive">Dibatalkan</Badge>;
                if (req.status === 'rejected') return <Badge variant="destructive">Ditolak</Badge>;
                return <Badge variant="secondary">{req.status}</Badge>;
            }
        },
        {
            header: 'Jumlah Item',
            sortable: false,
            filterable: false,
            cell: (req) => (
                <Badge variant="secondary" className="text-xs font-medium">
                    <Package className="w-3 h-3 mr-1" />
                    {req.items?.length || 0} barang
                </Badge>
            )
        },
        {
            header: 'Aksi',
            sortable: false,
            filterable: false,
            cell: (req) => (
                req.status === 'pending_gudang' ? (
                    <Button size="sm" className="h-8 gap-1.5 shrink-0 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => openShipmentDialog(req)}>
                        <Truck className="w-3.5 h-3.5" />
                        Proses Kirim
                    </Button>
                ) : (
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-500" /> Selesai
                    </span>
                )
            )
        }
    ];

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
                <StatsGrid columns={2}>
                    <StatsCard
                        title="Siap Proses"
                        value={requests.filter(r => r.status === 'pending_gudang').length}
                        icon={<Package className="w-5 h-5" />}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Selesai"
                        value={requests.filter(r => r.status === 'completed').length}
                        icon={<CheckCircle className="w-5 h-5 text-green-500" />}
                        subtitleType="success"
                    />
                </StatsGrid>

                {/* Unified Requests Table */}
                <BeautifulTable
                    data={requests}
                    columns={columns}
                    title={
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            <span>Daftar Permintaan Stok</span>
                        </div>
                    }
                    hideSelection
                    hideExport={false}
                    variant="premium"
                    exportFilename="daftar-permintaan-stok"
                    emptyState={{
                        icon: <Package className="w-7 h-7" />,
                        title: 'Tidak ada permintaan',
                        description: 'Belum ada permintaan stok dari kasir.',
                    }}
                />
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
