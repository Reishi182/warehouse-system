import { useState } from 'react';
import { Check, X, Eye, FileText, ClipboardCheck } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import LocationBadge from '@/components/common/LocationBadge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import {
    usePurchaseOrders,
    usePurchaseOrder,
    useApprovePurchaseOrder,
    useRejectPurchaseOrder,
} from '@/hooks/usePurchaseOrders';
import { PurchaseOrder } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function PurchaseOrderAuditor() {
    const { user, profile } = useAuth();
    const { data: pendingPOs = [], isLoading } = usePurchaseOrders('pending_auditor');
    const approvePO = useApprovePurchaseOrder();
    const rejectPO = useRejectPurchaseOrder();

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const { data: selectedPO, isLoading: selectedPOLoading } = usePurchaseOrder(selectedPOId || '');

    const handleView = (po: PurchaseOrder) => {
        setSelectedPOId(po.id);
        setIsViewOpen(true);
    };

    const handleApprove = async (poId: string) => {
        await approvePO.mutateAsync({
            poId,
            auditorId: user?.id || '',
            auditorName: profile?.name || '',
        });
    };

    const openRejectDialog = (po: PurchaseOrder) => {
        setSelectedPOId(po.id);
        setRejectReason('');
        setIsRejectOpen(true);
    };

    const handleReject = async () => {
        if (!selectedPOId || !rejectReason.trim()) return;
        await rejectPO.mutateAsync({
            poId: selectedPOId,
            auditorId: user?.id || '',
            auditorName: profile?.name || '',
            reason: rejectReason,
        });
        setIsRejectOpen(false);
        setSelectedPOId(null);
        setRejectReason('');
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
            cell: (item) => <LocationBadge location={item.destination} />,
        },
        {
            header: 'Total',
            accessorKey: 'total_amount',
            cell: (item) => (
                <span className="font-semibold">Rp {item.total_amount.toLocaleString('id-ID')}</span>
            ),
        },
        {
            header: 'Dibuat Oleh',
            accessorKey: 'created_by_name',
            cell: (item) => <span>{item.created_by_name || '-'}</span>,
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (item) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(item.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                </span>
            ),
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item) => (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleView(item)}>
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => handleApprove(item.id)}
                        disabled={approvePO.isPending}
                        className="gap-1"
                    >
                        <Check className="w-4 h-4" />
                        Setujui
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive gap-1"
                        onClick={() => openRejectDialog(item)}
                    >
                        <X className="w-4 h-4" />
                        Tolak
                    </Button>
                </div>
            ),
        },
    ];

    if (isLoading) {
        return (
            <MainLayout title="Approval PO" subtitle="Persetujuan Purchase Order">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Approval PO" subtitle="Persetujuan Purchase Order dari Main Office">
            <div className="space-y-6">
                <StatsGrid columns={2}>
                    <StatsCard
                        title="Menunggu Persetujuan"
                        value={pendingPOs.length}
                        icon={<ClipboardCheck className="w-5 h-5" />}
                        subtitle="PO perlu review"
                    />
                    <StatsCard
                        title="Total Nilai"
                        value={`Rp ${pendingPOs.reduce((a, p) => a + p.total_amount, 0).toLocaleString()}`}
                        icon={<FileText className="w-5 h-5" />}
                        subtitle="Estimasi pengeluaran"
                    />
                </StatsGrid>

                {/* Table */}
                <BeautifulTable
                    data={pendingPOs}
                    columns={columns}
                    title="Purchase Order Pending"
                    hideSelection
                    emptyState={{
                        icon: <FileText className="w-10 h-10" />,
                        title: "Tidak Ada PO Pending",
                        description: "Semua purchase order sudah diproses. Tidak ada yang perlu disetujui."
                    }}
                />

                {/* View Dialog */}
                <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Detail Purchase Order
                            </DialogTitle>
                        </DialogHeader>
                        {selectedPOLoading ? (
                            <div className="py-8 text-center text-muted-foreground">Memuat...</div>
                        ) : selectedPO ? (
                            <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">No. PO</p>
                                        <p className="font-mono font-bold">{selectedPO.po_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tujuan</p>
                                        <p className="font-medium capitalize">{selectedPO.destination}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Supplier</p>
                                        <p className="font-medium">{selectedPO.supplier?.name || '-'}</p>
                                        {selectedPO.supplier?.address && (
                                            <p className="text-sm text-muted-foreground">{selectedPO.supplier.address}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Dibuat Oleh</p>
                                        <p>{selectedPO.created_by_name || '-'}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(selectedPO.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                                        </p>
                                    </div>
                                </div>

                                {/* Items Table */}
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
                                                    <td className="text-right p-3">{item.quantity} <span className="text-xs text-muted-foreground uppercase">{item.unit || 'pcs'}</span></td>
                                                    <td className="text-right p-3">Rp {item.unit_price.toLocaleString('id-ID')}</td>
                                                    <td className="text-right p-3 font-medium">Rp {item.total_price.toLocaleString('id-ID')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-muted/30">
                                            <tr>
                                                <td colSpan={3} className="text-right p-3 font-semibold">Total</td>
                                                <td className="text-right p-3 font-bold text-lg">Rp {selectedPO.total_amount.toLocaleString('id-ID')}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {selectedPO.notes && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Catatan</p>
                                        <p className="p-3 bg-muted/30 rounded-lg">{selectedPO.notes}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 justify-end pt-4 border-t">
                                    <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                                        Tutup
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="text-destructive gap-1"
                                        onClick={() => {
                                            setIsViewOpen(false);
                                            setIsRejectOpen(true);
                                        }}
                                    >
                                        <X className="w-4 h-4" />
                                        Tolak
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            handleApprove(selectedPO.id);
                                            setIsViewOpen(false);
                                        }}
                                        disabled={approvePO.isPending}
                                        className="gap-1"
                                    >
                                        <Check className="w-4 h-4" />
                                        Setujui PO
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>

                {/* Reject Dialog */}
                <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tolak Purchase Order</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Alasan Penolakan *</Label>
                                <Textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Masukkan alasan penolakan..."
                                    rows={4}
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
                                    Batal
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleReject}
                                    disabled={rejectPO.isPending || !rejectReason.trim()}
                                >
                                    {rejectPO.isPending ? 'Menolak...' : 'Tolak PO'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}
