
import { useState } from 'react';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useStockRequests } from '@/hooks/useStockRequests';
import MainLayout from '@/components/layout/MainLayout';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
;
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, FileText, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface StockRequest {
    id: string;
    request_number?: string;
    created_at: string;
    cashier_name: string;
    reason: string;
    status: string;
    items?: Array<{
        id: string;
        product?: { name: string };
        quantity: number;
        unit: string;
        note?: string;
    }>;
}

export default function StockApprovals() {
    const role = useRole();
    const { user, profile } = useAuth();
    const { requests, approveRequest, rejectRequest, isLoading } = useStockRequests();
    const [selectedRequest, setSelectedRequest] = useState<StockRequest | null>(null);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Filter for Main Office
    const pendingRequests = requests.filter((r: StockRequest) => r.status === 'pending_main_office');
    const pastRequests = requests.filter((r: StockRequest) => r.status !== 'pending_main_office');

    const handleApprove = async (request: StockRequest) => {
        if (!profile) return;
        setIsProcessing(true);
        try {
            await approveRequest.mutateAsync({
                requestId: request.id,
                mainOfficeId: user?.id || '',
                mainOfficeName: profile.name,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;
        setIsProcessing(true);
        try {
            await rejectRequest.mutateAsync({
                requestId: selectedRequest.id,
                reason: rejectReason,
            });
            setRejectDialogOpen(false);
            setRejectReason('');
            setSelectedRequest(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const pendingColumns: Column<StockRequest>[] = [
        {
            header: 'Waktu Pengajuan',
            accessorKey: 'created_at',
            cell: (item: StockRequest) => (
                <span className="text-sm">
                    {format(new Date(item.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                </span>
            )
        },
        {
            header: 'Kasir',
            accessorKey: 'cashier_name',
            cell: (item: StockRequest) => <span className="font-semibold">{item.cashier_name}</span>
        },
        {
            header: 'Alasan',
            accessorKey: 'reason',
            cell: (item: StockRequest) => <span className="text-sm">{item.reason || '-'}</span>
        },
        {
            header: 'Item',
            accessorKey: 'id',
            cell: (item: StockRequest) => (
                <ul className="list-disc list-inside text-sm">
                    {item.items?.map((i) => (
                        <li key={i.id}>
                            {i.product?.name} - {i.quantity} {i.unit}
                            {i.note && <span className="text-muted-foreground italic"> ({i.note})</span>}
                        </li>
                    ))}
                </ul>
            )
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item: StockRequest) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 h-8 font-medium"
                        onClick={() => handleApprove(item)}
                        disabled={isProcessing}
                    >
                        <Check className="w-4 h-4 mr-1.5" />
                        Setujui
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 font-medium"
                        onClick={() => {
                            setSelectedRequest(item);
                            setRejectDialogOpen(true);
                        }}
                        disabled={isProcessing}
                    >
                        <X className="w-4 h-4 mr-1.5" />
                        Tolak
                    </Button>
                </div>
            )
        }
    ];

    // Column definitions for past requests table
    const historyColumns: Column<StockRequest>[] = [
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (item: StockRequest) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(item.created_at), 'dd/MM/yyyy')}
                </span>
            )
        },
        {
            header: 'Nomor Dokumen',
            accessorKey: 'request_number',
            cell: (item: StockRequest) => (
                <span className="font-mono">{item.request_number || '-'}</span>
            )
        },
        {
            header: 'Kasir',
            accessorKey: 'cashier_name',
            cell: (item: StockRequest) => <span className="font-medium">{item.cashier_name}</span>
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (item: StockRequest) => (
                <Badge variant={item.status === 'rejected' ? 'destructive' : 'default'} className="capitalize">
                    {item.status.replace(/_/g, ' ')}
                </Badge>
            )
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item: StockRequest) => item.status !== 'rejected' && item.request_number ? (
                <Button size="sm" variant="ghost" title="Print Formulir">
                    <Printer className="w-4 h-4" />
                </Button>
            ) : null
        }
    ];

    if (role !== 'main_office' && role !== 'admin') {
        return <MainLayout title="Akses Ditolak" subtitle="Anda tidak memiliki akses ke halaman ini">{null}</MainLayout>;
    }

    return (
        <MainLayout
            title="Persetujuan Stok"
            subtitle="Kelola permintaan stok masuk dari kasir"
        >
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Menunggu"
                        value={pendingRequests.length}
                        icon={<FileText className="w-5 h-5" />}
                        subtitle={pendingRequests.length > 0 ? "perlu review" : undefined}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Disetujui"
                        value={requests.filter((r: StockRequest) => !['pending_main_office', 'rejected'].includes(r.status)).length}
                        icon={<Check className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Ditolak"
                        value={requests.filter((r: StockRequest) => r.status === 'rejected').length}
                        icon={<X className="w-5 h-5" />}
                        subtitleType="error"
                    />
                </StatsGrid>

                {/* Pending Requests Table */}
                <BeautifulTable
                    data={pendingRequests}
                    columns={pendingColumns}
                    title={
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-600" />
                            <span className="text-amber-700 dark:text-amber-500">Permintaan Menunggu Persetujuan</span>
                        </div>
                    }
                    hideSelection
                    hideExport
                    variant="premium"
                />

                {/* History Table using BeautifulTable */}
                <BeautifulTable
                    data={pastRequests}
                    columns={historyColumns}
                    title="Riwayat Persetujuan"
                    hideSelection
                    hideExport
                    variant="premium"
                />
            </div>

            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tolak Permintaan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Alasan Penolakan</Label>
                            <Textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Contoh: Stok barang kosong di gudang..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Batal</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={!rejectReason}>Tolak Permintaan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
