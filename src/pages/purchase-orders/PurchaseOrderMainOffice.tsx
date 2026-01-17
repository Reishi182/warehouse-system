import { useState, useMemo } from 'react';
import { Plus, FileText, Printer, Eye, Trash2, Package, Check, X } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useSuppliers } from '@/hooks/useSuppliers';
import {
    usePurchaseOrders,
    usePurchaseOrder,
    useCreatePurchaseOrder,
} from '@/hooks/usePurchaseOrders';
import { PurchaseOrder, PODestination, Product } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface POItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
    pending_auditor: { label: 'Menunggu Auditor', color: 'bg-yellow-100 text-yellow-700' },
    approved: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700' },
    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
    pending_receipt: { label: 'Menunggu Penerimaan', color: 'bg-purple-100 text-purple-700' },
    completed: { label: 'Selesai', color: 'bg-green-100 text-green-700' },
};

export default function PurchaseOrderMainOffice() {
    const { user, profile } = useAuth();
    const { products, loading: productsLoading } = useData();
    const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
    const { data: purchaseOrders = [], isLoading: posLoading } = usePurchaseOrders();
    const createPO = useCreatePurchaseOrder();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('all');

    // Form state
    const [supplierId, setSupplierId] = useState('');
    const [destination, setDestination] = useState<PODestination>('gudang');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<POItem[]>([]);

    // Add item state
    const [selectedProductId, setSelectedProductId] = useState('');
    const [itemQty, setItemQty] = useState(1);
    const [itemPrice, setItemPrice] = useState(0);

    const { data: selectedPO, isLoading: selectedPOLoading } = usePurchaseOrder(selectedPOId || '');

    const loading = productsLoading || suppliersLoading || posLoading;

    const filteredPOs = useMemo(() => {
        if (activeTab === 'all') return purchaseOrders;
        return purchaseOrders.filter(po => po.status === activeTab);
    }, [purchaseOrders, activeTab]);

    const totalAmount = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    }, [items]);

    const handleAddItem = () => {
        if (!selectedProductId || itemQty <= 0 || itemPrice <= 0) return;
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;

        const newItem: POItem = {
            id: crypto.randomUUID(),
            productId: product.id,
            productName: product.name,
            quantity: itemQty,
            unitPrice: itemPrice,
        };

        setItems([...items, newItem]);
        setSelectedProductId('');
        setItemQty(1);
        setItemPrice(0);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleCreatePO = async () => {
        if (!supplierId || items.length === 0) return;

        await createPO.mutateAsync({
            supplierId,
            destination,
            notes: notes || undefined,
            createdBy: user?.id || '',
            createdByName: profile?.name || '',
            items: items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            })),
        });

        // Reset form
        setSupplierId('');
        setDestination('gudang');
        setNotes('');
        setItems([]);
        setIsCreateOpen(false);
    };

    const handleViewPO = (po: PurchaseOrder) => {
        setSelectedPOId(po.id);
        setIsViewOpen(true);
    };

    const handlePrint = (po: PurchaseOrder) => {
        setSelectedPOId(po.id);
        setTimeout(() => {
            window.print();
        }, 500);
    };

    const columns: Column<PurchaseOrder>[] = [
        {
            header: 'No. PO',
            accessorKey: 'po_number',
            cell: (item) => <span className="font-mono font-medium">{item.po_number}</span>,
        },
        {
            header: 'Supplier',
            accessorKey: 'supplier',
            cell: (item) => <span>{item.supplier?.name || '-'}</span>,
        },
        {
            header: 'Tujuan',
            accessorKey: 'destination',
            cell: (item) => (
                <span className="capitalize">{item.destination}</span>
            ),
        },
        {
            header: 'Total',
            accessorKey: 'total_amount',
            cell: (item) => (
                <span className="font-semibold">Rp {item.total_amount.toLocaleString('id-ID')}</span>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (item) => {
                const status = statusLabels[item.status] || { label: item.status, color: 'bg-gray-100' };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.label}
                    </span>
                );
            },
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (item) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(item.created_at), 'dd MMM yyyy', { locale: localeId })}
                </span>
            ),
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item) => (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewPO(item)}>
                        <Eye className="w-4 h-4" />
                    </Button>
                    {(item.status === 'pending_receipt' || item.status === 'completed') && (
                        <Button size="sm" variant="outline" onClick={() => handlePrint(item)}>
                            <Printer className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    if (loading) {
        return (
            <MainLayout title="Purchase Order" subtitle="Kelola pembelian barang">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Purchase Order"
            subtitle="Kelola pembelian barang dari supplier"
            actions={
                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="rounded-xl text-xs sm:text-sm"
                >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Buat PO Baru</span>
                </Button>
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total PO"
                        value={purchaseOrders.length}
                        icon={<FileText className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Pending"
                        value={purchaseOrders.filter(p => p.status === 'pending_auditor').length}
                        icon={<Eye className="w-5 h-5" />}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Menunggu"
                        value={purchaseOrders.filter(p => p.status === 'pending_receipt').length}
                        icon={<Package className="w-5 h-5" />}
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Selesai"
                        value={purchaseOrders.filter(p => p.status === 'completed').length}
                        icon={<Check className="w-5 h-5" />}
                        subtitleType="success"
                    />
                </StatsGrid>

                {/* Header */}
                <div className="flex justify-between items-center">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="all">Semua</TabsTrigger>
                            <TabsTrigger value="pending_auditor">Pending</TabsTrigger>
                            <TabsTrigger value="pending_receipt">Menunggu</TabsTrigger>
                            <TabsTrigger value="completed">Selesai</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Table */}
                <BeautifulTable
                    data={filteredPOs}
                    columns={columns}
                    title="Daftar Purchase Order"
                    hideSelection
                    emptyState={{
                        icon: <FileText className="w-10 h-10" />,
                        title: "Belum Ada Purchase Order",
                        description: "Buat PO pertama untuk mulai pemesanan ke supplier.",
                        actionLabel: "Buat PO Baru",
                        onAction: () => setIsCreateOpen(true)
                    }}
                />

                {/* Create PO Dialog */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Buat Purchase Order Baru
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                            {/* Supplier & Destination */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Supplier *</Label>
                                    <Select value={supplierId} onValueChange={setSupplierId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tujuan Pengiriman *</Label>
                                    <Select value={destination} onValueChange={(v) => setDestination(v as PODestination)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gudang">Gudang</SelectItem>
                                            <SelectItem value="toko">Toko</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Add Item */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Tambah Item
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1 space-y-2">
                                            <Label>Produk</Label>
                                            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih produk" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-24 space-y-2">
                                            <Label>Qty</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={itemQty}
                                                onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                                            />
                                        </div>
                                        <div className="w-40 space-y-2">
                                            <Label>Harga Satuan</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={itemPrice}
                                                onChange={(e) => setItemPrice(parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <Button onClick={handleAddItem} disabled={!selectedProductId}>
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Items List */}
                            {items.length > 0 && (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Item PO ({items.length})</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {items.map((item, idx) => (
                                                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                    <div className="flex-1">
                                                        <p className="font-medium">{item.productName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {item.quantity} x Rp {item.unitPrice.toLocaleString('id-ID')} = Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}
                                                        </p>
                                                    </div>
                                                    <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(item.id)}>
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <div className="pt-3 border-t flex justify-between">
                                                <span className="font-semibold">Total</span>
                                                <span className="font-bold text-lg">Rp {totalAmount.toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label>Catatan (opsional)</Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Catatan tambahan..."
                                    rows={3}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 justify-end pt-4">
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleCreatePO}
                                    disabled={!supplierId || items.length === 0 || createPO.isPending}
                                >
                                    {createPO.isPending ? 'Menyimpan...' : 'Buat Purchase Order'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* View PO Dialog */}
                <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Detail Purchase Order</DialogTitle>
                        </DialogHeader>
                        {selectedPOLoading ? (
                            <div className="py-8 text-center text-muted-foreground">Memuat...</div>
                        ) : selectedPO ? (
                            <div className="space-y-4 mt-4" id="print-area">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">No. PO</p>
                                        <p className="font-mono font-bold">{selectedPO.po_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Status</p>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusLabels[selectedPO.status]?.color || ''}`}>
                                            {statusLabels[selectedPO.status]?.label || selectedPO.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Supplier</p>
                                        <p className="font-medium">{selectedPO.supplier?.name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tujuan</p>
                                        <p className="font-medium capitalize">{selectedPO.destination}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tanggal</p>
                                        <p>{format(new Date(selectedPO.created_at), 'dd MMMM yyyy', { locale: localeId })}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Dibuat Oleh</p>
                                        <p>{selectedPO.created_by_name || '-'}</p>
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-3">Produk</th>
                                                <th className="text-right p-3">Qty</th>
                                                <th className="text-right p-3">Harga</th>
                                                <th className="text-right p-3">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPO.items?.map(item => (
                                                <tr key={item.id} className="border-t">
                                                    <td className="p-3">{item.product_name}</td>
                                                    <td className="text-right p-3">{item.quantity}</td>
                                                    <td className="text-right p-3">Rp {item.unit_price.toLocaleString('id-ID')}</td>
                                                    <td className="text-right p-3 font-medium">Rp {item.total_price.toLocaleString('id-ID')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-muted/30">
                                            <tr>
                                                <td colSpan={3} className="text-right p-3 font-semibold">Total</td>
                                                <td className="text-right p-3 font-bold">Rp {selectedPO.total_amount.toLocaleString('id-ID')}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {selectedPO.notes && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Catatan</p>
                                        <p>{selectedPO.notes}</p>
                                    </div>
                                )}

                                {selectedPO.rejected_reason && (
                                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                        <p className="text-sm text-red-600">Alasan Ditolak</p>
                                        <p className="text-red-700">{selectedPO.rejected_reason}</p>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}
