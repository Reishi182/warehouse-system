
import { useState } from 'react';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useStockRequests } from '@/hooks/useStockRequests';
import MainLayout from '@/components/layout/MainLayout';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Permintaan Menunggu Persetujuan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pendingRequests.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Tidak ada permintaan stok yang menunggu persetujuan.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingRequests.map((request: StockRequest) => (
                                    <div key={request.id} className="border rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-between bg-card hover:bg-muted/10 transition-colors">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{format(new Date(request.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}</Badge>
                                                <span className="font-semibold text-lg">{request.cashier_name}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Alasan: {request.reason}</p>

                                            <div className="mt-2 text-sm bg-muted/50 p-2 rounded">
                                                <p className="font-semibold mb-1">Item:</p>
                                                <ul className="list-disc list-inside">
                                                    {request.items?.map((item) => (
                                                        <li key={item.id}>
                                                            {item.product?.name} - {item.quantity} {item.unit}
                                                            {item.note && <span className="text-muted-foreground italic"> ({item.note})</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 justify-center min-w-[150px]">
                                            <Button
                                                className="w-full bg-green-600 hover:bg-green-700"
                                                onClick={() => handleApprove(request)}
                                                disabled={isProcessing}
                                            >
                                                <Check className="w-4 h-4 mr-2" />
                                                Setujui
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                className="w-full"
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setRejectDialogOpen(true);
                                                }}
                                                disabled={isProcessing}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Tolak
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* History Table using BeautifulTable */}
                <BeautifulTable
                    data={pastRequests}
                    columns={historyColumns}
                    title="Riwayat Persetujuan"
                    hideSelection
                    hideExport
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
