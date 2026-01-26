import { useState, useMemo } from 'react';
import { Check, X, Package, Clock, AlertCircle } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useStockReturns } from '@/hooks/useStockReturns';
import { StockReturn } from '@/types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function StockReturnApproval() {
    const { user, profile } = useAuth();
    const role = useRole();
    const { returns, isLoading, approveReturn, rejectReturn } = useStockReturns();

    const [selectedReturn, setSelectedReturn] = useState<StockReturn | null>(null);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Filter pending returns
    const pendingReturns = useMemo(() => {
        return returns.filter(r => r.status === 'pending_main_office');
    }, [returns]);

    // All processed returns
    const processedReturns = useMemo(() => {
        return returns.filter(r => r.status !== 'pending_main_office').slice(0, 20);
    }, [returns]);

    const handleApprove = (returnData: StockReturn) => {
        if (!user || !profile) return;

        approveReturn.mutate({
            returnId: returnData.id,
            mainOfficeId: user.id,
            mainOfficeName: profile.name
        });
    };

    const openRejectDialog = (returnData: StockReturn) => {
        setSelectedReturn(returnData);
        setRejectReason('');
        setRejectDialogOpen(true);
    };

    const handleReject = () => {
        if (!selectedReturn || !rejectReason.trim()) return;

        rejectReturn.mutate({
            returnId: selectedReturn.id,
            reason: rejectReason.trim()
        }, {
            onSuccess: () => {
                setRejectDialogOpen(false);
                setSelectedReturn(null);
                setRejectReason('');
            }
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_main_office':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Menunggu</Badge>;
            case 'approved':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Disetujui</Badge>;
            case 'rejected':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Ditolak</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Access control - only main_office and admin
    if (role !== 'main_office' && role !== 'admin') {
        return (
            <MainLayout title="Akses Ditolak" subtitle="Hanya Main Office yang dapat mengakses halaman ini">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Approval Retur ke Gudang"
            subtitle="Review dan setujui pengajuan retur dari kasir"
        >
            <div className="space-y-6">
                {/* Pending Approvals */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-yellow-500" />
                            Menunggu Persetujuan
                            {pendingReturns.length > 0 && (
                                <Badge variant="secondary" className="ml-2">{pendingReturns.length}</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Pengajuan retur barang dari toko ke gudang yang perlu diproses
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading...</div>
                        ) : pendingReturns.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                Tidak ada pengajuan yang menunggu persetujuan
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingReturns.map(ret => (
                                    <div key={ret.id} className="border rounded-lg overflow-hidden">
                                        {/* Header */}
                                        <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{ret.cashier_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(ret.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => openRejectDialog(ret)}
                                                    disabled={rejectReturn.isPending}
                                                >
                                                    <X className="h-4 w-4 mr-1" /> Tolak
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleApprove(ret)}
                                                    disabled={approveReturn.isPending}
                                                >
                                                    <Check className="h-4 w-4 mr-1" /> Setujui
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Reason */}
                                        <div className="px-4 py-2 bg-blue-50 border-b">
                                            <p className="text-sm"><strong>Alasan:</strong> {ret.reason}</p>
                                        </div>

                                        {/* Items Table */}
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Produk</TableHead>
                                                    <TableHead className="text-center w-28">Stok Toko</TableHead>
                                                    <TableHead className="text-center w-28">Jumlah Retur</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {ret.items?.map(item => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium">{item.product?.name}</p>
                                                                <p className="text-xs text-muted-foreground">{item.product?.barcode}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="secondary">{item.product?.stock?.toko ?? '-'}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className="bg-orange-100 text-orange-700">{item.quantity}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Processed History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Riwayat Retur
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {processedReturns.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Belum ada riwayat
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {processedReturns.map(ret => (
                                    <div key={ret.id} className="border rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-medium text-sm">{ret.return_number || 'Draft'}</span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    oleh {ret.cashier_name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(ret.status)}
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(ret.created_at), 'dd MMM yyyy', { locale: idLocale })}
                                                </span>
                                            </div>
                                        </div>
                                        {ret.status === 'approved' && ret.main_office_name && (
                                            <p className="text-xs text-green-600 mt-1">
                                                Disetujui oleh {ret.main_office_name}
                                            </p>
                                        )}
                                        {ret.status === 'rejected' && ret.rejected_reason && (
                                            <p className="text-xs text-red-600 mt-1">
                                                Ditolak: {ret.rejected_reason}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            Tolak Pengajuan Retur
                        </DialogTitle>
                        <DialogDescription>
                            Berikan alasan mengapa pengajuan retur ini ditolak.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Alasan Penolakan</Label>
                            <Textarea
                                placeholder="Contoh: Stok toko masih normal, tidak perlu retur..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!rejectReason.trim() || rejectReturn.isPending}
                        >
                            {rejectReturn.isPending ? 'Memproses...' : 'Tolak Pengajuan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
