import { useState } from 'react';
import { Package, Clock, CheckCircle, XCircle, AlertTriangle, Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { useBackorders, useFulfillBackorder, useCancelBackorder } from '@/hooks/useBackorders';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Backorder, BackorderStatus } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const statusLabels: Record<BackorderStatus, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
    partial: { label: 'Sebagian', color: 'bg-blue-100 text-blue-700', icon: <AlertTriangle className="w-4 h-4" /> },
    fulfilled: { label: 'Selesai', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
    cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
};

export default function Backorders() {
    const { user, profile } = useAuth();
    const { products } = useData();
    const [activeTab, setActiveTab] = useState<string>('pending');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedBackorder, setSelectedBackorder] = useState<Backorder | null>(null);
    const [fulfillQty, setFulfillQty] = useState(0);
    const [cancelReason, setCancelReason] = useState('');

    const statusFilter: BackorderStatus[] | undefined =
        activeTab === 'all' ? undefined :
            activeTab === 'active' ? ['pending', 'partial'] :
                [activeTab as BackorderStatus];

    const { data: backorders = [], isLoading } = useBackorders(statusFilter);
    const fulfillBackorder = useFulfillBackorder();
    const cancelBackorder = useCancelBackorder();

    // Filter by search
    const filteredBackorders = backorders.filter(bo =>
        bo.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bo.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bo.backorder_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get available stock for a product
    const getAvailableStock = (productId: string | undefined | null, location: string) => {
        if (!productId) return 0;
        const product = products.find(p => p.id === productId);
        if (!product) return 0;
        return location === 'gudang' ? product.stock.gudang : product.stock.toko;
    };

    const handleOpenFulfill = (bo: Backorder) => {
        const remaining = bo.quantity_ordered - bo.quantity_fulfilled;
        const available = getAvailableStock(bo.product_id, bo.stock_location);
        setSelectedBackorder(bo);
        setFulfillQty(Math.min(remaining, available));
        setFulfillDialogOpen(true);
    };

    const handleOpenCancel = (bo: Backorder) => {
        setSelectedBackorder(bo);
        setCancelReason('');
        setCancelDialogOpen(true);
    };

    const handleFulfill = async () => {
        if (!selectedBackorder || fulfillQty <= 0) return;

        await fulfillBackorder.mutateAsync({
            backorderId: selectedBackorder.id,
            quantityToFulfill: fulfillQty,
            fulfilledBy: user?.id || '',
            fulfilledByName: profile?.name || '',
        });

        setFulfillDialogOpen(false);
        setSelectedBackorder(null);
    };

    const handleCancel = async () => {
        if (!selectedBackorder || !cancelReason.trim()) return;

        await cancelBackorder.mutateAsync({
            backorderId: selectedBackorder.id,
            reason: cancelReason,
            cancelledBy: user?.id || '',
            cancelledByName: profile?.name || '',
        });

        setCancelDialogOpen(false);
        setSelectedBackorder(null);
    };

    const columns: Column<Backorder>[] = [
        {
            header: 'No. Backorder',
            accessorKey: 'backorder_number',
            cell: (item) => (
                <div>
                    <span className="font-mono font-medium">{item.backorder_number}</span>
                    <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                    </p>
                </div>
            ),
        },
        {
            header: 'Customer',
            accessorKey: 'customer_name',
            cell: (item) => (
                <div>
                    <span className="font-medium">{item.customer_name}</span>
                    {item.customer_phone && (
                        <p className="text-xs text-muted-foreground">{item.customer_phone}</p>
                    )}
                </div>
            ),
        },
        {
            header: 'Produk',
            accessorKey: 'product_name',
            cell: (item) => (
                <div>
                    <span>{item.product_name}</span>
                    {item.barcode && (
                        <p className="text-xs text-muted-foreground font-mono">{item.barcode}</p>
                    )}
                </div>
            ),
        },
        {
            header: 'Qty',
            cell: (item) => {
                const remaining = item.quantity_ordered - item.quantity_fulfilled;
                return (
                    <div className="text-center">
                        <span className="font-semibold">{item.quantity_fulfilled}/{item.quantity_ordered}</span>
                        {remaining > 0 && (
                            <p className="text-xs text-orange-600">Sisa: {remaining}</p>
                        )}
                    </div>
                );
            },
        },
        {
            header: 'Stok Tersedia',
            cell: (item) => {
                const available = getAvailableStock(item.product_id, item.stock_location);
                const remaining = item.quantity_ordered - item.quantity_fulfilled;
                const canFulfill = available >= remaining;
                return (
                    <div className={`text-center font-semibold ${canFulfill ? 'text-green-600' : 'text-orange-600'}`}>
                        {available} ({item.stock_location})
                    </div>
                );
            },
        },
        {
            header: 'Total',
            cell: (item) => {
                const remaining = item.quantity_ordered - item.quantity_fulfilled;
                const total = remaining * item.unit_price;
                return (
                    <span className="font-semibold">Rp {total.toLocaleString('id-ID')}</span>
                );
            },
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (item) => {
                const status = statusLabels[item.status];
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.icon}
                        {status.label}
                    </span>
                );
            },
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item) => {
                if (item.status === 'fulfilled' || item.status === 'cancelled') {
                    return <span className="text-xs text-muted-foreground">-</span>;
                }

                const available = getAvailableStock(item.product_id, item.stock_location);
                const canFulfill = available > 0;

                return (
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => handleOpenFulfill(item)}
                            disabled={!canFulfill}
                        >
                            Fulfill
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCancel(item)}
                        >
                            Batal
                        </Button>
                    </div>
                );
            },
        },
    ];

    if (isLoading) {
        return (
            <MainLayout title="Backorder" subtitle="Kelola pesanan tertunda">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    const pendingCount = backorders.filter(b => b.status === 'pending').length;
    const partialCount = backorders.filter(b => b.status === 'partial').length;
    const fulfilledCount = backorders.filter(b => b.status === 'fulfilled').length;

    return (
        <MainLayout title="Backorder" subtitle="Kelola pesanan tertunda (stok kurang)">
            <div className="space-y-6">
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total Backorder"
                        value={backorders.length}
                        icon={<Package className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Menunggu"
                        value={pendingCount}
                        icon={<Clock className="w-5 h-5" />}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Sebagian"
                        value={partialCount}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Selesai"
                        value={fulfilledCount}
                        icon={<CheckCircle className="w-5 h-5" />}
                        subtitleType="success"
                    />
                </StatsGrid>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="active">Aktif</TabsTrigger>
                            <TabsTrigger value="pending">Menunggu</TabsTrigger>
                            <TabsTrigger value="partial">Sebagian</TabsTrigger>
                            <TabsTrigger value="fulfilled">Selesai</TabsTrigger>
                            <TabsTrigger value="all">Semua</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari customer/produk..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Table */}
                <BeautifulTable
                    data={filteredBackorders}
                    columns={columns}
                    title="Daftar Backorder"
                    hideSelection
                    emptyState={{
                        icon: <Package className="w-10 h-10" />,
                        title: "Tidak Ada Backorder",
                        description: "Semua pesanan sudah terpenuhi.",
                    }}
                />
            </div>

            {/* Fulfill Dialog */}
            <Dialog open={fulfillDialogOpen} onOpenChange={setFulfillDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Fulfill Backorder</DialogTitle>
                    </DialogHeader>
                    {selectedBackorder && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted/30 rounded-lg">
                                <p className="font-semibold">{selectedBackorder.product_name}</p>
                                <p className="text-sm text-muted-foreground">
                                    Customer: {selectedBackorder.customer_name}
                                </p>
                                <p className="text-sm">
                                    Sisa: {selectedBackorder.quantity_ordered - selectedBackorder.quantity_fulfilled} pcs
                                </p>
                                <p className="text-sm">
                                    Stok tersedia: {getAvailableStock(selectedBackorder.product_id, selectedBackorder.stock_location)} pcs
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Jumlah yang akan dipenuhi</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={Math.min(
                                        selectedBackorder.quantity_ordered - selectedBackorder.quantity_fulfilled,
                                        getAvailableStock(selectedBackorder.product_id, selectedBackorder.stock_location)
                                    )}
                                    value={fulfillQty}
                                    onChange={(e) => setFulfillQty(parseInt(e.target.value) || 0)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Total: Rp {(fulfillQty * selectedBackorder.unit_price).toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFulfillDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleFulfill}
                            disabled={fulfillQty <= 0 || fulfillBackorder.isPending}
                        >
                            {fulfillBackorder.isPending ? 'Memproses...' : 'Fulfill'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Batalkan Backorder</DialogTitle>
                    </DialogHeader>
                    {selectedBackorder && (
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                <p className="font-semibold text-red-700">{selectedBackorder.product_name}</p>
                                <p className="text-sm text-red-600">
                                    Sisa {selectedBackorder.quantity_ordered - selectedBackorder.quantity_fulfilled} pcs akan dibatalkan
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Alasan pembatalan *</Label>
                                <Textarea
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Contoh: Customer tidak jadi beli"
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                            Kembali
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={!cancelReason.trim() || cancelBackorder.isPending}
                        >
                            {cancelBackorder.isPending ? 'Membatalkan...' : 'Batalkan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
