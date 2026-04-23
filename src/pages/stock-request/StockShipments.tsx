
import { useState } from 'react';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useStockRequests } from '@/hooks/useStockRequests';
import { useStockShipments } from '@/hooks/useStockShipments';
import MainLayout from '@/components/layout/MainLayout';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, CheckCircle, Eye, FileText, User, Calendar, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';

// ─── Read-only Detail Dialog ──────────────────────────────────────────────────
function RequestDetailDialog({ request }: { request: any }) {
    const [open, setOpen] = useState(false);

    const statusLabel = (status: string) => {
        if (status === 'pending_gudang') return { label: 'Siap Proses', cls: 'bg-orange-100 text-orange-800 border-orange-200' };
        if (status === 'pending_receipt') return { label: 'Dalam Perjalanan', cls: 'bg-blue-100 text-blue-800 border-blue-200' };
        if (status === 'completed') return { label: 'Selesai', cls: 'bg-green-100 text-green-800 border-green-200' };
        if (status === 'cancelled') return { label: 'Dibatalkan', cls: 'bg-red-100 text-red-800 border-red-200' };
        if (status === 'rejected') return { label: 'Ditolak', cls: 'bg-red-100 text-red-800 border-red-200' };
        return { label: status, cls: 'bg-gray-100 text-gray-800 border-gray-200' };
    };

    const { label, cls } = statusLabel(request.status);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all">
                    <Eye className="w-3.5 h-3.5" /> Detail
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
                {/* Header Gradient */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-6 text-white grid gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Package className="w-32 h-32" />
                    </div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <h2 className="text-2xl font-bold">Detail Permintaan Stok</h2>
                            <p className="text-orange-100 flex items-center gap-1.5 mt-1 text-sm font-medium">
                                <FileText className="w-4 h-4" />
                                {request.request_number || '-'}
                            </p>
                        </div>
                        <Badge className={`${cls} border font-semibold`}>{label}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2 relative z-10">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
                            <span className="text-xs text-orange-200 block mb-0.5">Kasir Peminta</span>
                            <span className="font-semibold flex items-center gap-1.5">
                                <User className="w-4 h-4" /> {request.cashier_name}
                            </span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
                            <span className="text-xs text-orange-200 block mb-0.5">Waktu Permintaan</span>
                            <span className="font-semibold flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {request.created_at
                                    ? format(new Date(request.created_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })
                                    : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-orange-500" />
                            Daftar Barang yang Diminta ({request.items?.length || 0} item)
                        </h3>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/80 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold border-b border-gray-100 dark:border-gray-700">Nama Produk</th>
                                        <th className="px-4 py-3 font-semibold border-b border-gray-100 dark:border-gray-700 text-center">Jumlah Diminta</th>
                                        <th className="px-4 py-3 font-semibold border-b border-gray-100 dark:border-gray-700 text-center">Stok Gudang</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {request.items?.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                                {item.product?.name || item.product_id}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 font-bold px-2.5 py-1 rounded-lg min-w-[3rem]">
                                                    {item.quantity}
                                                </span>
                                                <span className="ml-1.5 text-xs text-gray-500">{item.unit}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-semibold ${(item.product?.stock_gudang ?? 0) < item.quantity ? 'text-red-500' : 'text-green-600'}`}>
                                                    {item.product?.stock_gudang ?? '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="py-4 px-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Tutup Detail</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StockShipments() {
    const role = useRole();
    const { user } = useAuth();
    const { requests } = useStockRequests();
    const { createShipment } = useStockShipments();

    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [shipmentItems, setShipmentItems] = useState<any[]>([]);
    const [isShipDialogOpen, setIsShipDialogOpen] = useState(false);

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
                <div className="flex items-center gap-2">
                    {/* Detail button always visible */}
                    <RequestDetailDialog request={req} />

                    {/* Proses Kirim only for pending_gudang */}
                    {req.status === 'pending_gudang' && (
                        <Button
                            size="sm"
                            className="h-8 gap-1.5 shrink-0 bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                            onClick={() => openShipmentDialog(req)}
                        >
                            <Truck className="w-3.5 h-3.5" />
                            Proses Kirim
                        </Button>
                    )}

                    {/* Completed indicator */}
                    {req.status !== 'pending_gudang' && (
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {req.status === 'completed' ? 'Selesai' :
                             req.status === 'pending_receipt' ? 'Dikirim' :
                             req.status === 'cancelled' ? 'Dibatalkan' : 'Ditolak'}
                        </span>
                    )}
                </div>
            )
        }
    ];

    const openShipmentDialog = (request: any) => {
        setSelectedRequest(request);
        setShipmentItems(request.items.map((item: any) => ({
            productId: item.product_id,
            name: item.product?.name,
            requestedQty: item.quantity,
            shipQty: item.quantity,
            unit: item.unit,
            currentStock: item.product?.stock_gudang || 0
        })));
        setIsShipDialogOpen(true);
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

        setIsShipDialogOpen(false);
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

            {/* ─── Proses Kirim Dialog ─────────────────────────────────────── */}
            <Dialog open={isShipDialogOpen} onOpenChange={setIsShipDialogOpen}>
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
                        <Button variant="outline" onClick={() => setIsShipDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSubmitShipment}>
                            <Truck className="w-4 h-4 mr-2" /> Konfirmasi Kirim
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
